import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageProviderAdapter,
  ImageProviderConfig,
  ImageProviderDefinition
} from "./types";

export const DEFAULT_IMAGE_SIZE = "1536x1536";
export const DEFAULT_PROVIDER_TIMEOUT_MS = 120000;

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
