import { toProxyPath } from "./apiProxyMap";
import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageProviderAdapter,
  ImageProviderConfig,
  ImageProviderDefinition
} from "./types";

export const DEFAULT_IMAGE_SIZE = "1536x1536";
export const DEFAULT_PROVIDER_TIMEOUT_MS = 120000;

/**
 * 将外部 API 的完整 URL 改写为同源代理路径，绕开浏览器 CORS 限制。
 *
 * 代理前缀只替代 origin，pathname 原样保留：
 *   https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis
 *   → /api/dashscope/api/v1/services/aigc/text2image/image-synthesis
 *
 * 转发层（vite server/preview 的 proxy、生产环境的 Nginx）负责剥掉 `/api/dashscope`
 * 前缀后转发到 https://dashscope.aliyuncs.com，还原出完全一致的路径。
 * 映射表见 ./apiProxyMap.ts —— 那是唯一真相源。
 */
export function proxyUrl(fullUrl: string): string {
  // 非浏览器环境没有同源代理可用，直连
  if (typeof window === "undefined") return fullUrl;
  return toProxyPath(fullUrl) ?? fullUrl;
}

export function normalizeImageInput(input: GenerateImageInput): Required<
  Pick<GenerateImageInput, "prompt" | "size" | "format" | "background">
> &
  GenerateImageInput {
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("generateImage() requires a non-empty prompt.");
  }

  return {
    ...input,
    prompt,
    size: input.size || DEFAULT_IMAGE_SIZE,
    format: "png",
    background: "transparent"
  };
}

/**
 * 从模型支持的固定尺寸里挑比例最接近请求值的那个。
 *
 * 各家文生图都只接受有限的几种尺寸，和海报槽位的比例不可能次次对上。
 * 这里只负责挑最接近的，残余误差由渲染层的 fitContain 吸收成透明留白，
 * 绝不拉伸。
 *
 * @param separator 尺寸字符串里的分隔符。千问用全角 ×，OpenAI 用小写 x。
 */
export function pickClosestSize(
  requestedSize: string,
  supportedSizes: readonly string[],
  separator = "x"
): string {
  const fallback = supportedSizes[0];
  const requested = parseRatio(requestedSize, "x");
  if (!requested) return fallback;

  let best = fallback;
  let bestDiff = Infinity;

  for (const candidate of supportedSizes) {
    const ratio = parseRatio(candidate, separator);
    if (!ratio) continue;

    const diff = Math.abs(ratio - requested);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = candidate;
    }
  }

  return best;
}

function parseRatio(size: string, separator: string): number | null {
  const [w, h] = size.split(separator).map(Number);
  return w > 0 && h > 0 ? w / h : null;
}

export function normalizeProviderConfig(config: ImageProviderConfig): ImageProviderConfig {
  return {
    ...config,
    timeoutMs: config.timeoutMs || DEFAULT_PROVIDER_TIMEOUT_MS
  };
}

export function createPngResult(params: {
  provider: GenerateImageResult["provider"];
  base64: string;
  model?: string;
  width?: number;
  height?: number;
  raw?: unknown;
}): GenerateImageResult {
  return {
    provider: params.provider,
    mimeType: "image/png",
    base64: params.base64,
    dataUrl: `data:image/png;base64,${params.base64}`,
    model: params.model,
    width: params.width,
    height: params.height,
    raw: params.raw
  };
}

export function createDeferredImageProvider(definition: ImageProviderDefinition): ImageProviderAdapter {
  return {
    id: definition.id,
    displayName: definition.displayName,
    async generateImage(input, config) {
      normalizeImageInput(input);
      normalizeProviderConfig(config);
      throw new Error(
        `${definition.displayName} provider is registered but its HTTP adapter is not connected yet.`
      );
    }
  };
}
