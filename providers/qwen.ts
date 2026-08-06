import {
  createPngResult,
  normalizeImageInput,
  normalizeProviderConfig,
  pickClosestSize,
  proxyUrl
} from "./shared";
import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageProviderAdapter,
  ImageProviderConfig,
  ImageProviderDefinition
} from "./types";

/**
 * 千问百炼（Qwen-Image）文生图 Provider
 *
 * 支持模型：
 * - qwen-image-max / qwen-image-turbo / qwen-image
 * - qwen-image-2.0-max / qwen-image-2.0-turbo / qwen-image-2.0
 *
 * API 文档：https://help.aliyun.com/zh/model-studio/qwen-image-api
 *
 * 调用流程（异步）：
 * 1. POST 创建任务 → 获取 task_id
 * 2. 轮询任务状态 → SUCCEEDED 时获取图片 URL
 * 3. 下载图片 → 转 base64 返回
 */

const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";
const DEFAULT_MODEL = "qwen-image-max";
const POLL_INTERVAL_MS = 3000;

/** 千问支持的尺寸列表 */
const QWEN_SUPPORTED_SIZES: string[] = [
  "1664×1664",
  "1472×1104",
  "1328×1328",
  "1104×1472",
  "1920×1080",
  "1080×1920"
];

export const QWEN_PROVIDER: ImageProviderDefinition = {
  id: "qwen",
  displayName: "千问百炼 (Qwen-Image)",
  kind: "hosted-api",
  // DashScope 文生图不产透明通道，返回的是不透明底图，需要客户端去背
  supportsTransparentBackground: false,
  description:
    "阿里云百炼平台千问文生图（Qwen-Image）Provider，支持 qwen-image-max / qwen-image-turbo / qwen-image 及 2.0 系列模型，通过 DashScope API 异步调用。",
  defaultModel: DEFAULT_MODEL
};

/** 将标准 ImageSize 映射为千问支持的尺寸（导出仅为可测。注意千问用全角 ×） */
export function mapToQwenSize(size: string): string {
  return pickClosestSize(size, QWEN_SUPPORTED_SIZES, "×");
}

/** 从 URL 下载图片并转为 base64 */
async function downloadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载图片失败: HTTP ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("无法解析图片 base64 数据"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("读取图片数据失败"));
    reader.readAsDataURL(blob);
  });
}

/** 轮询任务状态直到完成 */
async function pollTaskResult(
  baseUrl: string,
  taskId: string,
  timeoutMs: number
): Promise<{ imageUrl: string; actualPrompt?: string }> {
  const deadline = Date.now() + timeoutMs;
  const pollUrl = `${baseUrl.replace(/\/+$/, "")}/tasks/${taskId}`;

  while (Date.now() < deadline) {
    // 不带 Authorization：密钥由 vite 代理从 .env 注入
    const response = await fetch(proxyUrl(pollUrl), { method: "GET" });

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "DashScope 拒绝了请求（未授权）。请检查 .env 里的 DASHSCOPE_API_KEY 是否正确，改完需重启服务。"
      );
    }

    if (!response.ok) {
      throw new Error(
        `查询任务状态失败: HTTP ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const output = data.output;
    const status = output?.task_status;

    if (status === "SUCCEEDED") {
      const results = output.results;
      if (!results || results.length === 0) {
        throw new Error("任务成功但未返回图片结果");
      }
      return {
        imageUrl: results[0].url,
        actualPrompt: output.actual_prompt
      };
    }

    if (status === "FAILED") {
      const errorMsg = output?.message || output?.code || "未知错误";
      throw new Error(`千问图片生成任务失败: ${errorMsg}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`千问图片生成超时（${timeoutMs}ms），请稍后重试`);
}

export function createQwenProvider(): ImageProviderAdapter {
  return {
    id: QWEN_PROVIDER.id,
    displayName: QWEN_PROVIDER.displayName,

    async generateImage(
      input: GenerateImageInput,
      config: ImageProviderConfig
    ): Promise<GenerateImageResult> {
      const normalizedInput = normalizeImageInput(input);
      const normalizedConfig = normalizeProviderConfig(config);

      // 这里不校验也不携带 API Key：密钥由 vite 服务端从 .env 读取并在转发时注入。
      // 浏览器发出的请求本身不带凭据，鉴权失败会以 401 的形式回来。
      const baseUrl = DEFAULT_BASE_URL;
      const model = normalizedConfig.model || DEFAULT_MODEL;
      const timeoutMs = normalizedConfig.timeoutMs || 120000;

      const extra = normalizedConfig.extra || {};
      const promptExtend = extra["promptExtend"] !== undefined
        ? String(extra["promptExtend"]).toLowerCase() === "true"
        : false;
      const watermark = extra["watermark"] !== undefined
        ? String(extra["watermark"]).toLowerCase() === "true"
        : false;

      const requestBody: Record<string, unknown> = {
        model,
        input: {
          prompt: normalizedInput.prompt,
          n: 1,
          prompt_extend: promptExtend,
          watermark
        }
      };

      if (normalizedInput.negativePrompt) {
        (requestBody.input as Record<string, unknown>).negative_prompt =
          normalizedInput.negativePrompt;
      }

      const qwenSize = mapToQwenSize(normalizedInput.size);
      (requestBody.input as Record<string, unknown>).size = qwenSize;

      if (normalizedInput.seed !== undefined) {
        (requestBody.input as Record<string, unknown>).seed = normalizedInput.seed;
      }

      // 1. 提交异步任务（通过代理）
      const submitUrl = `${baseUrl}/services/aigc/text2image/image-synthesis`;
      const submitResponse = await fetch(proxyUrl(submitUrl), {
        method: "POST",
        headers: {
          // 无 Authorization：由 vite 代理注入
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable"
        },
        body: JSON.stringify(requestBody)
      });

      if (submitResponse.status === 401 || submitResponse.status === 403) {
        throw new Error(
          "DashScope 拒绝了请求（未授权）。请检查 .env 里的 DASHSCOPE_API_KEY 是否已填且正确，改完需重启服务。"
        );
      }

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(
          `千问 API 提交失败: HTTP ${submitResponse.status} - ${errorText}`
        );
      }

      const submitData = await submitResponse.json();
      const taskId = submitData.output?.task_id;
      if (!taskId) {
        throw new Error(
          `千问 API 未返回 task_id: ${JSON.stringify(submitData)}`
        );
      }

      // 2. 轮询任务结果
      const { imageUrl, actualPrompt } = await pollTaskResult(baseUrl, taskId, timeoutMs);

      // 3. 下载图片并转为 base64
      const base64 = await downloadImageAsBase64(imageUrl);

      const [sizeW, sizeH] = qwenSize.split("×").map(Number);

      return createPngResult({
        provider: "qwen",
        base64,
        model,
        width: sizeW,
        height: sizeH,
        raw: {
          task_id: taskId,
          actual_prompt: actualPrompt,
          size: qwenSize,
          prompt_extend: promptExtend
        }
      });
    }
  };
}
