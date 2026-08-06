export type ImageProviderId =
  | "gpt-image"
  | "replicate"
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

/**
 * 返回图片的实际媒体类型。
 *
 * 海报要的是带透明通道的图，png 与 webp 都满足。之所以不写死 png：
 * 部分模型（如 Replicate 上的 flux-schnell）默认吐 webp，
 * 即使传了 output_format 也未必都遵守。dataUrl 的前缀必须与真实字节一致，
 * 否则浏览器解码会出问题。
 *
 * 导出海报时 canvas 会统一重新编码成 PNG，所以中间格式不影响最终产物。
 */
export type ImageMimeType = "image/png" | "image/webp" | "image/jpeg";

export interface GenerateImageResult {
  provider: ImageProviderId;
  /**
   * 这张图**实际**是不是透明底。
   *
   * 注意与 `ImageProviderDefinition.supportsTransparentBackground` 的区别：
   * 那个是静态声明，这个是本次调用的真实结果。同一个 Provider 指向不同端点
   * （官方 API vs 中转站）能力可能不同，所以要不要去背必须看这个值。
   */
  transparentBackground: boolean;
  mimeType: ImageMimeType;
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
  /**
   * 是否已接入真实适配器。
   *
   * false 表示只在注册表里占位，调用会抛「adapter is not connected yet」。
   * 界面据此过滤——**填了 Key 但适配器没接的模型不会出现在下拉里**，
   * 免得运营选中后才发现用不了。
   *
   * 改这个值时记得同步换掉 createDeferredImageProvider()，
   * providers/registry.test.ts 会校验两者一致。
   */
  implemented: boolean;
}
