import { createDeferredImageProvider } from "./shared";
import type { ImageProviderAdapter, ImageProviderDefinition } from "./types";

export const SDXL_PROVIDER: ImageProviderDefinition = {
  id: "sdxl",
  displayName: "SDXL",
  kind: "self-hosted-api",
  implemented: false,
  supportsTransparentBackground: false,
  description: "SDXL-compatible provider adapter. Endpoint and model are configured by operators.",
};

export function createSdxlProvider(): ImageProviderAdapter {
  return createDeferredImageProvider(SDXL_PROVIDER);
}
