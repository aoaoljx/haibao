import { createDeferredImageProvider } from "./shared";
import type { ImageProviderAdapter, ImageProviderDefinition } from "./types";

export const COMFYUI_PROVIDER: ImageProviderDefinition = {
  id: "comfyui",
  displayName: "ComfyUI",
  kind: "self-hosted-api",
  // ComfyUI 视工作流而定，带抠图节点的工作流可产透明底；接入时按实际工作流填写
  supportsTransparentBackground: false,
  description: "ComfyUI workflow provider adapter. Endpoint and workflow are configured by operators.",
};

export function createComfyUiProvider(): ImageProviderAdapter {
  return createDeferredImageProvider(COMFYUI_PROVIDER);
}
