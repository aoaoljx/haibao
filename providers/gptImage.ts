import { API_PROXY_ENTRIES } from "./apiProxyMap";
import { createPngResult, normalizeImageInput, normalizeProviderConfig, pickClosestSize } from "./shared";
import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageProviderAdapter,
  ImageProviderConfig,
  ImageProviderDefinition
} from "./types";

/**
 * OpenAI gpt-image Provider，走 Vercel AI SDK。
 *
 * 相比自己写 HTTP 调用，AI SDK 的价值是：换成 Replicate / Vertex / Luma 等
 * 只要换一个 model 实例，请求与返回的归一化都由它负责。
 *
 * 与千问最大的差别是**原生支持透明底**，不需要客户端去背——
 * 海报右侧图形正是要透明 PNG，少一层有损处理。
 */

const DEFAULT_MODEL = "gpt-image-1";

/**
 * gpt-image 只接受这几种尺寸。和千问一样是离散的，
 * 挑最接近的比例，残余误差由渲染层 fitContain 吸收。
 */
const GPT_IMAGE_SUPPORTED_SIZES = ["1024x1024", "1536x1024", "1024x1536"] as const;

export const GPT_IMAGE_PROVIDER: ImageProviderDefinition = {
  id: "gpt-image",
  displayName: "OpenAI GPT Image",
  kind: "hosted-api",
  // gpt-image 支持 background=transparent，下面确实传了，所以这里为 true
  supportsTransparentBackground: true,
  description:
    "OpenAI gpt-image 文生图 Provider，经 Vercel AI SDK 调用，原生输出透明底 PNG。",
  defaultModel: DEFAULT_MODEL
};

/** 导出仅为可测 */
export function mapToGptImageSize(size: string): string {
  return pickClosestSize(size, GPT_IMAGE_SUPPORTED_SIZES);
}

/**
 * AI SDK 要求 baseURL 是绝对地址，但我们要让请求走同源代理
 * （密钥由 vite 服务端注入，浏览器不持有）。所以拼上当前 origin。
 */
function resolveProxiedBaseUrl(): string {
  const entry = API_PROXY_ENTRIES.find((item) => item.host === "api.openai.com");
  const prefix = entry?.proxyPrefix ?? "/api/openai";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${prefix}/v1`;
}

export function createGptImageProvider(): ImageProviderAdapter {
  return {
    id: GPT_IMAGE_PROVIDER.id,
    displayName: GPT_IMAGE_PROVIDER.displayName,

    async generateImage(
      input: GenerateImageInput,
      config: ImageProviderConfig
    ): Promise<GenerateImageResult> {
      const normalizedInput = normalizeImageInput(input);
      const normalizedConfig = normalizeProviderConfig(config);
      const model = normalizedConfig.model || DEFAULT_MODEL;

      // 动态引入：AI SDK 约 360kB，只在真正用这个 Provider 生成时才加载，
      // 不拖慢首屏（页面本身还要加载好几张大尺寸海报素材）。
      const [{ createOpenAI }, { generateImage: aiGenerateImage }] = await Promise.all([
        import("@ai-sdk/openai"),
        import("ai")
      ]);

      const openai = createOpenAI({
        baseURL: resolveProxiedBaseUrl(),
        // 真正的密钥由 vite 代理注入并覆盖这个头，这里只是满足 SDK 的必填校验
        apiKey: "injected-by-dev-server"
      });

      const size = mapToGptImageSize(normalizedInput.size) as `${number}x${number}`;
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        normalizedConfig.timeoutMs ?? 120000
      );

      try {
        const { image } = await aiGenerateImage({
          model: openai.image(model),
          prompt: normalizedInput.prompt,
          size,
          abortSignal: controller.signal,
          providerOptions: {
            openai: {
              // 海报右侧图形必须透明底
              background: "transparent",
              outputFormat: "png"
            }
          }
        });

        const [width, height] = size.split("x").map(Number);
        return createPngResult({
          provider: "gpt-image",
          base64: image.base64,
          model,
          width,
          height
        });
      } catch (error) {
        throw translateError(error, normalizedConfig.timeoutMs ?? 120000);
      } finally {
        clearTimeout(timer);
      }
    }
  };
}

/** 把 SDK 抛出的错误翻译成运营看得懂、且能据此行动的提示 */
function translateError(error: unknown, timeoutMs: number): Error {
  if (error instanceof Error && error.name === "AbortError") {
    return new Error(`图片生成超时（${timeoutMs}ms），请稍后重试。`);
  }

  const message = error instanceof Error ? error.message : String(error);

  if (/401|403|api key|unauthor/i.test(message)) {
    return new Error(
      "OpenAI 拒绝了请求（未授权）。请检查 .env 里的 OPENAI_API_KEY 是否正确，改完需重启服务。"
    );
  }

  if (/429|rate limit/i.test(message)) {
    return new Error("OpenAI 触发限流，请稍后重试。");
  }

  return new Error(`图片生成失败：${message}`);
}
