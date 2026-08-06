import { apiKeyField, optionalBaseUrlField, modelField, timeoutField } from "./configFields";
import { createDeferredImageProvider } from "./shared";
import type { ImageProviderAdapter, ImageProviderDefinition } from "./types";

export const GPT_IMAGE_PROVIDER: ImageProviderDefinition = {
  id: "gpt-image",
  displayName: "GPT Image",
  kind: "hosted-api",
  // gpt-image-1 支持 background=transparent，接真实适配器并传参后可改为 true
  supportsTransparentBackground: false,
  description: "OpenAI GPT Image provider adapter. API details are configured by operators.",
  configFields: [apiKeyField, optionalBaseUrlField, modelField, timeoutField]
};

export function createGptImageProvider(): ImageProviderAdapter {
  return createDeferredImageProvider(GPT_IMAGE_PROVIDER);
}
