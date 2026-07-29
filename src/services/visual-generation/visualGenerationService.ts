import { buildVisualPrompt } from "../../../prompt/promptBuilder";
import { generateImage } from "../../../providers";
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

export async function generateVisualImage(
  request: VisualGenerationRequest
): Promise<VisualGenerationResult> {
  const plan = buildVisualGenerationPlan(request);
  const image = await generateImage(
    {
      prompt: plan.prompt,
      negativePrompt: plan.negativePrompt,
      size: "1536x1536",
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
