import type { GenerateImageResult, ImageProviderConfig } from "../../../providers";
import type { PromptSceneKey } from "../../../prompt/scenePrompt";
import type { ModeVisualStyleKey } from "../../../prompt/stylePrompt";
import type { PosterMode } from "../../shared/poster/types";

export interface VisualGenerationInput {
  mode: PosterMode;
  titleBlue: string;
  titleDark?: string;
  featurePoints: readonly string[];
  keywords?: string;
}

export interface VisualGenerationTrace {
  extractedKeywords: string[];
  matchedKeywords: string[];
  matchedCategories: string[];
  sceneKey: PromptSceneKey;
  sceneName: string;
  styleKey: ModeVisualStyleKey;
  styleName: string;
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
