import { proxiedBaseUrl, runAiSdkImageGeneration } from "./aiSdkShared";
import { normalizeImageInput, normalizeProviderConfig, pickClosestSize } from "./shared";
import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageProviderAdapter,
  ImageProviderConfig,
  ImageProviderDefinition
} from "./types";

/**
 * Replicate Provider，走 Vercel AI SDK。
 *
 * 一个适配器覆盖面最广的一个：Replicate 上托管了 Flux、SDXL 等几乎所有
 * 开源图像模型，换模型只要改 .env 里的模型名，不用再写适配器。
 *
 * 两处与别家不同：
 * - 接受的是 **aspectRatio**（"16:9" 这种）而不是 size
 * - 多数模型默认吐 **webp**，所以显式传 output_format=png
 */

/** flux-schnell：快且便宜，适合海报图形这种要多试几版的场景 */
const DEFAULT_MODEL = "black-forest-labs/flux-schnell";
const API_HOST = "api.replicate.com";
const API_KEY_ENV_VAR = "REPLICATE_API_TOKEN";

/**
 * Replicate 常见模型支持的比例。
 *
 * 比 gpt-image 的 3 档细，海报槽位（约 1.24:1~1.55:1）能落到 5:4 或 3:2，
 * 贴合度好不少。
 */
const REPLICATE_SUPPORTED_ASPECT_RATIOS = [
  "1:1",
  "16:9",
  "21:9",
  "3:2",
  "2:3",
  "4:5",
  "5:4",
  "9:16",
  "9:21"
] as const;

export const REPLICATE_PROVIDER: ImageProviderDefinition = {
  id: "replicate",
  displayName: "Replicate",
  kind: "hosted-api",
  implemented: true,
  // Flux / SDXL 都不产透明通道，需要客户端去背
  supportsTransparentBackground: false,
  description:
    "Replicate 托管的开源图像模型（Flux、SDXL 等），经 Vercel AI SDK 调用。换模型只需改环境变量里的模型名。",
  defaultModel: DEFAULT_MODEL
};

/** 把请求尺寸折算成 Replicate 接受的比例字符串。导出仅为可测。 */
export function mapToReplicateAspectRatio(size: string): `${number}:${number}` {
  return pickClosestSize(
    size,
    REPLICATE_SUPPORTED_ASPECT_RATIOS,
    ":"
  ) as `${number}:${number}`;
}

export function createReplicateProvider(): ImageProviderAdapter {
  return {
    id: REPLICATE_PROVIDER.id,
    displayName: REPLICATE_PROVIDER.displayName,

    async generateImage(
      input: GenerateImageInput,
      config: ImageProviderConfig
    ): Promise<GenerateImageResult> {
      const normalizedInput = normalizeImageInput(input);
      const normalizedConfig = normalizeProviderConfig(config);
      const modelId = normalizedConfig.model || DEFAULT_MODEL;
      const timeoutMs = normalizedConfig.timeoutMs ?? 120000;

      const { createReplicate } = await import("@ai-sdk/replicate");
      const replicate = createReplicate({
        baseURL: proxiedBaseUrl(API_HOST),
        // 真正的令牌由 vite 代理注入并覆盖这个头，这里只是满足 SDK 的必填校验
        apiToken: "injected-by-dev-server"
      });

      return runAiSdkImageGeneration({
        provider: "replicate",
        model: replicate.image(modelId),
        modelId,
        prompt: normalizedInput.prompt,
        aspectRatio: mapToReplicateAspectRatio(normalizedInput.size),
        timeoutMs,
        apiKeyEnvVar: API_KEY_ENV_VAR,
        displayName: REPLICATE_PROVIDER.displayName,
        providerOptions: {
          replicate: {
            // 默认是 webp，海报要带透明通道的 PNG
            output_format: "png",
            // 我们的 Prompt Engine 本来就产出负向词，这里能用上
            // （gpt-image 不支持，只能丢掉）
            ...(normalizedInput.negativePrompt
              ? { negative_prompt: normalizedInput.negativePrompt }
              : {}),
            // SDK 同步等待预测完成的上限，和整体超时保持一致
            maxWaitTimeInSeconds: Math.ceil(timeoutMs / 1000)
          }
        }
      });
    }
  };
}
