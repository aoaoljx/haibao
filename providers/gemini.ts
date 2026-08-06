import { createDeferredImageProvider } from "./shared";
import type { ImageProviderAdapter, ImageProviderDefinition } from "./types";

export const GEMINI_PROVIDER: ImageProviderDefinition = {
  id: "gemini",
  displayName: "Gemini",
  kind: "hosted-api",
  supportsTransparentBackground: false,
  description: "Google Gemini image provider adapter. API details are configured by operators.",
};

export function createGeminiProvider(): ImageProviderAdapter {
  return createDeferredImageProvider(GEMINI_PROVIDER);
}
