import { baseUrlField, optionalApiKeyField, optionalModelField, timeoutField, workflowIdField } from "./configFields";
import { createDeferredImageProvider } from "./shared";
import type { ImageProviderAdapter, ImageProviderDefinition } from "./types";

export const COMFYUI_PROVIDER: ImageProviderDefinition = {
  id: "comfyui",
  displayName: "ComfyUI",
  kind: "self-hosted-api",
  description: "ComfyUI workflow provider adapter. Endpoint and workflow are configured by operators.",
  configFields: [baseUrlField, workflowIdField, optionalApiKeyField, optionalModelField, timeoutField]
};

export function createComfyUiProvider(): ImageProviderAdapter {
  return createDeferredImageProvider(COMFYUI_PROVIDER);
}
