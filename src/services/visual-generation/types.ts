import type { GenerateImageResult, ImageProviderConfig } from "../../../providers";
import type { PromptGraphicText } from "../../../prompt/promptBuilder";
import type { PromptSceneKey } from "../../../prompt/scenePrompt";
import type { PosterMode } from "../../shared/poster/types";

export interface VisualGenerationInput {
  mode: PosterMode;
  titleBlue: string;
  titleDark?: string;
  featurePoints: readonly string[];
  keywords?: string;
  graphicText?: PromptGraphicText;
}

export interface VisualGenerationTrace {
  extractedKeywords: string[];
  matchedKeywords: string[];
  matchedCategories: string[];
  sceneKey: PromptSceneKey;
  sceneName: string;
  visualElements: string[];
}

export interface VisualGenerationPlan {
  prompt: string;
  negativePrompt: string;
  trace: VisualGenerationTrace;
}

export interface VisualGenerationRequest extends VisualGenerationInput {
  providerConfig: ImageProviderConfig;
}

export interface VisualGenerationResult {
  image: GenerateImageResult;
  trace: VisualGenerationTrace;
}
