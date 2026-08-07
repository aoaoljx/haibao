import { buildVisualPrompt } from "../../../prompt/promptBuilder";
import { generateImage } from "../../../providers";
import { deriveRequestSize } from "../../shared/poster/geometry";
import type { VisualBounds } from "../../shared/poster/types";
import { removeImageBackground } from "./backgroundRemoval.browser";
import { extractVisualKeywords } from "./keywordExtractor";
import type {
  VisualGenerationInput,
  VisualGenerationPlan,
  VisualGenerationRequest,
  VisualGenerationResult
} from "./types";

export function buildVisualGenerationPlan(input: VisualGenerationInput): VisualGenerationPlan {
  const extractedKeywords = extractVisualKeywords(input);
  const builtPrompt = buildVisualPrompt({
    mode: input.mode,
    titleBlue: input.titleBlue,
    titleDark: input.titleDark,
    featurePoints: input.featurePoints,
    keywords: [input.keywords, ...extractedKeywords].filter(Boolean).join(" ")
  });

  return {
    prompt: builtPrompt.prompt,
    negativePrompt: builtPrompt.negativePrompt,
    trace: {
      extractedKeywords,
      matchedKeywords: builtPrompt.matchedKeywords,
      matchedCategories: builtPrompt.matchedCategories,
      sceneKey: builtPrompt.sceneKey,
      sceneName: builtPrompt.sceneName,
      visualElements: builtPrompt.visualElements
    }
  };
}

/**
 * 槽位未知时的兜底比例，取自素材库里几个右侧图形的中位比例（约 1.35:1）。
 * 比过去硬编码的 1:1 贴近实际得多。
 */
const FALLBACK_TARGET_BOUNDS: VisualBounds = { x: 0, y: 0, w: 1728, h: 1280 };

export async function generateVisualImage(
  request: VisualGenerationRequest
): Promise<VisualGenerationResult> {
  const plan = buildVisualGenerationPlan(request);
  const size = deriveRequestSize(request.targetBounds || FALLBACK_TARGET_BOUNDS);

  const image = await generateImage(
    {
      prompt: plan.prompt,
      negativePrompt: plan.negativePrompt,
      size,
      format: "png",
      background: "transparent",
      metadata: {
        sceneKey: plan.trace.sceneKey,
        sceneName: plan.trace.sceneName,
        matchedCategories: plan.trace.matchedCategories
      }
    },
    request.providerConfig
  );

  // 海报右侧图形必须透明底。没拿到透明底就在客户端补一次去背，
  // 否则贴到海报上就是一个不透明色块。
  //
  // 判断依据是本次调用的**实际结果**而不是 Provider 的静态声明——
  // 同一个 Provider 指向官方 API 还是中转站，能力可能不同。
  const shouldRemoveBackground =
    request.removeBackground !== false && !image.transparentBackground;

  if (!shouldRemoveBackground) {
    return { image, trace: plan.trace, backgroundRemoved: false };
  }

  const removal = await removeImageBackground(image.dataUrl);
  if (!removal) {
    // 去背结果不可信（几乎没去掉，或把主体也吃了）时保留原图，
    // 由运营在预览里自行判断，不做静默的破坏性处理
    return { image, trace: plan.trace, backgroundRemoved: false };
  }

  return {
    image: {
      ...image,
      dataUrl: removal.dataUrl,
      base64: removal.dataUrl.slice(removal.dataUrl.indexOf(",") + 1)
    },
    trace: plan.trace,
    backgroundRemoved: true
  };
}
