import { apiKeyField, optionalBaseUrlField, modelField, timeoutField } from "./configFields";
import { createDeferredImageProvider } from "./shared";
import type { ImageProviderAdapter, ImageProviderDefinition } from "./types";

export const FLUX_PROVIDER: ImageProviderDefinition = {
  id: "flux",
  displayName: "Flux",
  kind: "hosted-api",
  description: "Flux-compatible image provider adapter. API details are configured by operators.",
  configFields: [apiKeyField, optionalBaseUrlField, modelField, timeoutField]
};

export function createFluxProvider(): ImageProviderAdapter {
  return createDeferredImageProvider(FLUX_PROVIDER);
}
