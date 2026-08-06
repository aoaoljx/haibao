export type ImageProviderId =
  | "gpt-image"
  | "gemini"
  | "flux"
  | "ideogram"
  | "comfyui"
  | "sdxl"
  | "qwen";

export type ProviderKind = "hosted-api" | "self-hosted-api";

export type ProviderConfigFieldType = "text" | "password" | "url" | "number" | "textarea";

export interface ProviderConfigField {
  key: keyof ImageProviderConfig | `extra.${string}`;
  label: string;
  type: ProviderConfigFieldType;
  required: boolean;
  placeholder?: string;
  description?: string;
}

export interface ImageProviderConfig {
  provider: ImageProviderId;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  workflowId?: string;
  apiVersion?: string;
  timeoutMs?: number;
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
  configFields: readonly ProviderConfigField[];
}
