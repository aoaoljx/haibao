import { createImageProvider, isImageProviderId } from "./registry";
import { normalizeImageInput, normalizeProviderConfig } from "./shared";
import type { GenerateImageInput, GenerateImageResult, ImageProviderConfig } from "./types";

export async function generateImage(
  input: GenerateImageInput,
  config: ImageProviderConfig
): Promise<GenerateImageResult> {
  if (!isImageProviderId(config.provider)) {
    throw new Error(`Unsupported image provider: ${config.provider}`);
  }

  const normalizedInput = normalizeImageInput(input);
  const normalizedConfig = normalizeProviderConfig(config);
  const provider = createImageProvider(normalizedConfig.provider);
  return provider.generateImage(normalizedInput, normalizedConfig);
}
