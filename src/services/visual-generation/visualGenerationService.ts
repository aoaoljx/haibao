import { buildVisualPrompt } from "../../../prompt/promptBuilder";
import { generateImage } from "../../../providers";
import { deriveRequestSize } from "../../shared/poster/geometry";
import type { VisualBounds } from "../../shared/poster/types";
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
    keywords: [input.keywords, ...extractedKeywords].filter(Boolean).join(" "),
    graphicText: input.graphicText
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

  return {
    image,
    trace: plan.trace
  };
}
