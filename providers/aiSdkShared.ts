import { API_PROXY_ENTRIES, splitBaseUrl } from "./apiProxyMap";
import { createImageResult, normalizeMimeType } from "./shared";
import type { GenerateImageResult, ImageProviderId } from "./types";

/**
 * 经 Vercel AI SDK 调用图片模型的公共部分。
 *
 * 每家的差异只在「装哪个包、怎么造 model 实例、传 size 还是 aspectRatio」，
 * 而超时控制、结果包装、错误翻译三件事完全一样，收在这里。
 * 新接一个 AI SDK provider 时只写差异部分即可。
 */

/** AI SDK 的 ImageModel。这里不引入它的类型，避免为了类型把 SDK 拉进首屏包。 */
type ImageModelLike = unknown;

/** providerOptions 的值必须可 JSON 序列化，AI SDK 会按此校验 */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ProviderOptionsMap = Record<string, Record<string, JsonValue>>;

export interface AiSdkGenerationParams {
  provider: ImageProviderId;
  model: ImageModelLike;
  modelId: string;
  prompt: string;
  /** size 与 aspectRatio 互斥，取决于该 provider 接受哪种 */
  size?: `${number}x${number}`;
  aspectRatio?: `${number}:${number}`;
  providerOptions?: ProviderOptionsMap;
  /** 本次是否按透明底请求。会原样反映到结果里，决定后续要不要客户端去背 */
  transparentBackground?: boolean;
  timeoutMs: number;
  /** 用于回报的期望尺寸。模型未必严格遵守，仅作参考 */
  width?: number;
  height?: number;
  /** 鉴权失败时提示运营去改哪个环境变量 */
  apiKeyEnvVar: string;
  displayName: string;
}

export async function runAiSdkImageGeneration(
  params: AiSdkGenerationParams
): Promise<GenerateImageResult> {
  // 动态引入：AI SDK 体积可观，只在真正生成时才加载，不进首屏包
  const { generateImage } = await import("ai");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);

  try {
    const { image } = await generateImage({
      // AI SDK 的 ImageModel 类型没有对外暴露成可直接标注的形式，
      // 这里的 model 由各 provider 用自己的工厂造出，类型是对的
      model: params.model as never,
      prompt: params.prompt,
      ...(params.size ? { size: params.size } : {}),
      ...(params.aspectRatio ? { aspectRatio: params.aspectRatio } : {}),
      ...(params.providerOptions ? { providerOptions: params.providerOptions } : {}),
      abortSignal: controller.signal
    });

    return createImageResult({
      provider: params.provider,
      transparentBackground: params.transparentBackground ?? false,
      base64: image.base64,
      // 用模型实际返回的类型，而不是一厢情愿写死 png——
      // dataUrl 前缀与真实字节不符会导致解码异常
      mimeType: normalizeMimeType(image.mediaType),
      model: params.modelId,
      width: params.width,
      height: params.height
    });
  } catch (error) {
    throw translateAiSdkError(error, params);
  } finally {
    clearTimeout(timer);
  }
}

/** 把 SDK 抛出的错误翻译成运营看得懂、且能据此行动的提示 */
export function translateAiSdkError(
  error: unknown,
  params: Pick<AiSdkGenerationParams, "timeoutMs" | "apiKeyEnvVar" | "displayName">
): Error {
  if (error instanceof Error && error.name === "AbortError") {
    return new Error(`${params.displayName} 生成超时（${params.timeoutMs}ms），请稍后重试。`);
  }

  const message = error instanceof Error ? error.message : String(error);

  if (/401|403|api key|api token|unauthor/i.test(message)) {
    return new Error(
      `${params.displayName} 拒绝了请求（未授权）。请检查 .env 里的 ${params.apiKeyEnvVar} 是否正确，改完需重启服务。`
    );
  }

  if (/429|rate limit/i.test(message)) {
    return new Error(`${params.displayName} 触发限流，请稍后重试。`);
  }

  return new Error(`${params.displayName} 生成失败：${message}`);
}

/**
 * 拼出走同源代理的 baseURL。
 *
 * AI SDK 要求绝对地址，而我们要让请求经过 vite 代理——密钥在那里注入，
 * 浏览器不持有凭据。所以用「当前 origin + 代理前缀 + 端点的路径部分」。
 *
 * 路径部分必须由客户端带上：转发层只负责把前缀换成目标 origin，
 * 剩下的原样透传。两边都从同一个端点配置推导，避免不同步。
 *
 *   端点 https://codexone.aieania.tech/v1
 *   → 客户端 baseURL  http://127.0.0.1:3000/api/openai/v1
 *   → 转发后          https://codexone.aieania.tech/v1/images/generations
 */
export function proxiedBaseUrl(host: string): string {
  const entry = API_PROXY_ENTRIES.find((item) => item.host === host);
  if (!entry) {
    throw new Error(`${host} 未登记在 apiProxyMap 中，无法走同源代理`);
  }

  // 端点地址不是机密，用 VITE_ 前缀让客户端也能读到
  const configured = entry.baseUrlEnvVar
    ? (import.meta.env[entry.baseUrlEnvVar] as string | undefined)
    : undefined;
  const { apiPath } = splitBaseUrl(
    configured?.trim() || entry.defaultBaseUrl || `https://${entry.host}`
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${entry.proxyPrefix}${apiPath}`;
}
