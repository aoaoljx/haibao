import { apiKeyField, optionalBaseUrlField, modelField, timeoutField } from "./configFields";
import {
  createPngResult,
  normalizeImageInput,
  normalizeProviderConfig,
  proxyUrl
} from "./shared";
import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageProviderAdapter,
  ImageProviderConfig,
  ImageProviderDefinition,
  ProviderConfigField
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

const promptExtendField: ProviderConfigField = {
  key: "extra.promptExtend",
  label: "智能改写 Prompt",
  type: "text",
  required: false,
  placeholder: "true",
  description: "是否开启智能改写。设为 true 时模型自动优化提示词，设为 false 则使用原始提示词。"
};

const watermarkField: ProviderConfigField = {
  key: "extra.watermark",
  label: "添加水印",
  type: "text",
  required: false,
  placeholder: "false",
  description: "是否在图像右下角添加 Qwen-Image 水印，默认 false。"
};

export const QWEN_PROVIDER: ImageProviderDefinition = {
  id: "qwen",
  displayName: "千问百炼 (Qwen-Image)",
  kind: "hosted-api",
  description:
    "阿里云百炼平台千问文生图（Qwen-Image）Provider，支持 qwen-image-max / qwen-image-turbo / qwen-image 及 2.0 系列模型，通过 DashScope API 异步调用。",
  defaultModel: DEFAULT_MODEL,
  configFields: [
    {
      ...apiKeyField,
      label: "DashScope API Key",
      placeholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
      description: "在阿里云百炼平台获取的 API Key，仅用于当前图片生成请求。"
    },
    {
      ...optionalBaseUrlField,
      placeholder: DEFAULT_BASE_URL,
      description: "DashScope API 地址，一般无需修改。"
    },
    {
      ...modelField,
      required: false,
      placeholder: DEFAULT_MODEL,
      description:
        "模型名称，可选：qwen-image-max、qwen-image-turbo、qwen-image、qwen-image-2.0-max、qwen-image-2.0-turbo、qwen-image-2.0。"
    },
    timeoutField,
    promptExtendField,
    watermarkField
  ]
};

/** 将标准 ImageSize 映射为千问支持的尺寸 */
function mapToQwenSize(size: string): string {
  const [w, h] = size.split("x").map(Number);
  if (!w || !h) return QWEN_SUPPORTED_SIZES[0];

  const targetRatio = w / h;
  let bestSize = QWEN_SUPPORTED_SIZES[0];
  let bestDiff = Infinity;

  for (const s of QWEN_SUPPORTED_SIZES) {
    const [sw, sh] = s.split("×").map(Number);
    if (!sw || !sh) continue;
    const ratio = sw / sh;
    const diff = Math.abs(ratio - targetRatio);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSize = s;
    }
  }

  return bestSize;
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
  apiKey: string,
  timeoutMs: number
): Promise<{ imageUrl: string; actualPrompt?: string }> {
  const deadline = Date.now() + timeoutMs;
  const pollUrl = `${baseUrl.replace(/\/+$/, "")}/tasks/${taskId}`;

  while (Date.now() < deadline) {
    const response = await fetch(proxyUrl(pollUrl), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

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

      const apiKey = normalizedConfig.apiKey;
      if (!apiKey) {
        throw new Error(
          "千问百炼 Provider 需要配置 DashScope API Key，请在界面中填写。"
        );
      }

      const baseUrl = (normalizedConfig.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
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
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable"
        },
        body: JSON.stringify(requestBody)
      });

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
      const { imageUrl, actualPrompt } = await pollTaskResult(
        baseUrl,
        taskId,
        apiKey,
        timeoutMs
      );

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
