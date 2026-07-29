import { apiKeyField, optionalBaseUrlField, modelField, timeoutField } from "./configFields";
import { createDeferredImageProvider } from "./shared";
import type { ImageProviderAdapter, ImageProviderDefinition } from "./types";

export const IDEOGRAM_PROVIDER: ImageProviderDefinition = {
  id: "ideogram",
  displayName: "Ideogram",
  kind: "hosted-api",
  description: "Ideogram image provider adapter. API details are configured by operators.",
  configFields: [apiKeyField, optionalBaseUrlField, modelField, timeoutField]
};

export function createIdeogramProvider(): ImageProviderAdapter {
  return createDeferredImageProvider(IDEOGRAM_PROVIDER);
}
