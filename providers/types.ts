export type ImageProviderId =
  | "gpt-image"
  | "gemini"
  | "flux"
  | "ideogram"
  | "comfyui"
  | "sdxl"
  | "qwen";

export type ProviderKind = "hosted-api" | "self-hosted-api";

/**
 * 运行期的 Provider 选择。
 *
 * **这里没有 apiKey，是刻意的。** 密钥由 vite 服务端从 .env 读取并在转发时
 * 注入请求头（见 providers/apiProxyMap.ts），浏览器全程不持有凭据。
 * 想加回 apiKey 字段前先想清楚：那意味着密钥要重新进入客户端包。
 */
export interface ImageProviderConfig {
  provider: ImageProviderId;
  /** 模型名。非机密，可留空走 Provider 默认值 */
  model?: string;
  timeoutMs?: number;
  /** 非机密的调节项，来自 VITE_ 前缀的环境变量 */
  extra?: Record<string, string | number | boolean>;
}

export type ImageOutputFormat = "png";
export type ImageBackgroundMode = "transparent";
export type ImageSize = `${number}x${number}`;

export interface GenerateImageInput {
  prompt: string;
  negativePrompt?: string;
  size?: ImageSize;
  format?: ImageOutputFormat;
  background?: ImageBackgroundMode;
  seed?: number;
  steps?: number;
  guidanceScale?: number;
  metadata?: Record<string, string | number | boolean | string[]>;
}

export interface GenerateImageResult {
  provider: ImageProviderId;
  mimeType: "image/png";
  base64: string;
  dataUrl: string;
  model?: string;
  width?: number;
  height?: number;
  raw?: unknown;
}

export interface ImageProviderAdapter {
  id: ImageProviderId;
  displayName: string;
  generateImage(input: GenerateImageInput, config: ImageProviderConfig): Promise<GenerateImageResult>;
}

export interface ImageProviderDefinition {
  id: ImageProviderId;
  displayName: string;
  kind: ProviderKind;
  description: string;
  defaultModel?: string;
  /**
   * 该模型能否直接产出透明底 PNG。
   *
   * 海报右侧图形必须透明，声明为 false 的 Provider 会在客户端补一次去背
   * （src/services/visual-generation/backgroundRemoval.ts）。
   * 保守起见默认按 false 处理——多去一次背只是稍慢，漏掉则海报上会出现色块。
   * 接入真实适配器时按模型实际能力填写。
   */
  supportsTransparentBackground: boolean;
}
