import { COMFYUI_PROVIDER, createComfyUiProvider } from "./comfyui";
import { FLUX_PROVIDER, createFluxProvider } from "./flux";
import { GEMINI_PROVIDER, createGeminiProvider } from "./gemini";
import { GPT_IMAGE_PROVIDER, createGptImageProvider } from "./gptImage";
import { IDEOGRAM_PROVIDER, createIdeogramProvider } from "./ideogram";
import { SDXL_PROVIDER, createSdxlProvider } from "./sdxl";
import type { ImageProviderAdapter, ImageProviderDefinition, ImageProviderId } from "./types";

export const IMAGE_PROVIDER_IDS = [
  "gpt-image",
  "gemini",
  "flux",
  "ideogram",
  "comfyui",
  "sdxl"
] as const satisfies readonly ImageProviderId[];

export const IMAGE_PROVIDER_DEFINITIONS: Record<ImageProviderId, ImageProviderDefinition> = {
  "gpt-image": GPT_IMAGE_PROVIDER,
  gemini: GEMINI_PROVIDER,
  flux: FLUX_PROVIDER,
  ideogram: IDEOGRAM_PROVIDER,
  comfyui: COMFYUI_PROVIDER,
  sdxl: SDXL_PROVIDER
};

const IMAGE_PROVIDER_FACTORIES: Record<ImageProviderId, () => ImageProviderAdapter> = {
  "gpt-image": createGptImageProvider,
  gemini: createGeminiProvider,
  flux: createFluxProvider,
  ideogram: createIdeogramProvider,
  comfyui: createComfyUiProvider,
  sdxl: createSdxlProvider
};

export function isImageProviderId(value: string): value is ImageProviderId {
  return IMAGE_PROVIDER_IDS.includes(value as ImageProviderId);
}

export function getImageProviderDefinition(provider: ImageProviderId): ImageProviderDefinition {
  return IMAGE_PROVIDER_DEFINITIONS[provider];
}

export function listImageProviderDefinitions(): ImageProviderDefinition[] {
  return IMAGE_PROVIDER_IDS.map((provider) => IMAGE_PROVIDER_DEFINITIONS[provider]);
}

export function createImageProvider(provider: ImageProviderId): ImageProviderAdapter {
  return IMAGE_PROVIDER_FACTORIES[provider]();
}
