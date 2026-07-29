import { baseUrlField, optionalApiKeyField, optionalModelField, timeoutField, workflowIdField } from "./configFields";
import { createDeferredImageProvider } from "./shared";
import type { ImageProviderAdapter, ImageProviderDefinition } from "./types";

export const SDXL_PROVIDER: ImageProviderDefinition = {
  id: "sdxl",
  displayName: "SDXL",
  kind: "self-hosted-api",
  description: "SDXL-compatible provider adapter. Endpoint and model are configured by operators.",
  configFields: [baseUrlField, optionalModelField, workflowIdField, optionalApiKeyField, timeoutField]
};

export function createSdxlProvider(): ImageProviderAdapter {
  return createDeferredImageProvider(SDXL_PROVIDER);
}
