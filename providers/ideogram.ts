import { createDeferredImageProvider } from "./shared";
import type { ImageProviderAdapter, ImageProviderDefinition } from "./types";

export const IDEOGRAM_PROVIDER: ImageProviderDefinition = {
  id: "ideogram",
  displayName: "Ideogram",
  kind: "hosted-api",
  supportsTransparentBackground: false,
  description: "Ideogram image provider adapter. API details are configured by operators.",
};

export function createIdeogramProvider(): ImageProviderAdapter {
  return createDeferredImageProvider(IDEOGRAM_PROVIDER);
}
