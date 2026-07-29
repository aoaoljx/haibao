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
  configFields: readonly ProviderConfigField[];
}
