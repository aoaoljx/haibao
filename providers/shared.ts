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
 * API 代理映射表：将外部 API 的完整 base URL 映射为 Vite 代理路径前缀
 * 开发环境下通过 Vite proxy 转发请求，避免浏览器 CORS 限制
 */
const PROXY_MAP: Array<{ host: string; proxyPrefix: string }> = [
  { host: "dashscope.aliyuncs.com", proxyPrefix: "/api/dashscope" },
  { host: "api.openai.com", proxyPrefix: "/api/openai" },
  { host: "generativelanguage.googleapis.com", proxyPrefix: "/api/gemini" },
  { host: "api.bfl.ml", proxyPrefix: "/api/flux" },
  { host: "api.ideogram.ai", proxyPrefix: "/api/ideogram" }
];

/**
 * 将外部 API 的完整 URL 转换为 Vite 代理路径
 *
 * 例如：
 *   https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis
 *   → /api/dashscope/services/aigc/text2image/image-synthesis
 *
 * Vite 代理会将 /api/dashscope 转发到 https://dashscope.aliyuncs.com/api/v1
 */
export function proxyUrl(fullUrl: string): string {
  // 非浏览器环境直接返回
  if (typeof window === "undefined") return fullUrl;

  try {
    const url = new URL(fullUrl);
    for (const { host, proxyPrefix } of PROXY_MAP) {
      if (url.hostname === host) {
        // 移除 hostname 和协议，保留路径部分，拼接到代理前缀后
        return `${proxyPrefix}${url.pathname}${url.search}`;
      }
    }
  } catch {
    // URL 解析失败，回退到直连
  }

  return fullUrl;
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
