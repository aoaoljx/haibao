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
 * OpenAI gpt-image Provider，走 Vercel AI SDK。
 *
 * 与千问最大的差别是**原生支持透明底**，不需要客户端去背——
 * 海报右侧图形正是要透明 PNG，少一层有损处理。
 * 代价是尺寸档位比千问更粗，见下方常量的注释。
 */

const DEFAULT_MODEL = "gpt-image-1";
const API_HOST = "api.openai.com";
const API_KEY_ENV_VAR = "OPENAI_API_KEY";

/**
 * gpt-image 只接受这三种尺寸——比千问的 5 种比例还少。
 * 海报槽位约 1.24:1~1.55:1，窄的那几个只能落到 1:1，图形会偏小。
 * 挑最接近的比例，残余误差由渲染层 fitContain 吸收成透明留白，绝不拉伸。
 */
const GPT_IMAGE_SUPPORTED_SIZES = ["1024x1024", "1536x1024", "1024x1536"] as const;

export const GPT_IMAGE_PROVIDER: ImageProviderDefinition = {
  id: "gpt-image",
  displayName: "OpenAI GPT Image",
  kind: "hosted-api",
  implemented: true,
  // 下面确实传了 background=transparent，所以这里为 true
  supportsTransparentBackground: true,
  description:
    "OpenAI gpt-image 文生图 Provider，经 Vercel AI SDK 调用，原生输出透明底 PNG。",
  defaultModel: DEFAULT_MODEL
};

/** 导出仅为可测 */
export function mapToGptImageSize(size: string): string {
  return pickClosestSize(size, GPT_IMAGE_SUPPORTED_SIZES);
}

export function createGptImageProvider(): ImageProviderAdapter {
  return {
    id: GPT_IMAGE_PROVIDER.id,
    displayName: GPT_IMAGE_PROVIDER.displayName,

    async generateImage(
      input: GenerateImageInput,
      config: ImageProviderConfig
    ): Promise<GenerateImageResult> {
      const normalizedInput = normalizeImageInput(input);
      const normalizedConfig = normalizeProviderConfig(config);
      const modelId = normalizedConfig.model || DEFAULT_MODEL;

      const { createOpenAI } = await import("@ai-sdk/openai");
      const openai = createOpenAI({
        baseURL: proxiedBaseUrl(API_HOST, "/v1"),
        // 真正的密钥由 vite 代理注入并覆盖这个头，这里只是满足 SDK 的必填校验
        apiKey: "injected-by-dev-server"
      });

      const size = mapToGptImageSize(normalizedInput.size) as `${number}x${number}`;
      const [width, height] = size.split("x").map(Number);

      return runAiSdkImageGeneration({
        provider: "gpt-image",
        model: openai.image(modelId),
        modelId,
        prompt: normalizedInput.prompt,
        size,
        width,
        height,
        timeoutMs: normalizedConfig.timeoutMs ?? 120000,
        apiKeyEnvVar: API_KEY_ENV_VAR,
        displayName: GPT_IMAGE_PROVIDER.displayName,
        providerOptions: {
          openai: {
            // 海报右侧图形必须透明底
            background: "transparent",
            outputFormat: "png"
          }
        }
      });
    }
  };
}
