import type { GenerateImageResult, ImageProviderConfig } from "../../../providers";
import type { PromptGraphicText } from "../../../prompt/promptBuilder";
import type { PromptSceneKey } from "../../../prompt/scenePrompt";
import type { PosterMode, VisualBounds } from "../../shared/poster/types";

export interface VisualGenerationInput {
  mode: PosterMode;
  titleBlue: string;
  titleDark?: string;
  featurePoints: readonly string[];
  keywords?: string;
  graphicText?: PromptGraphicText;
  /**
   * 生成的图形最终要落进的海报槽位。用来反推请求尺寸，让生成比例贴近绘制比例。
   * 不传则按槽位的典型比例兜底。
   */
  targetBounds?: VisualBounds;
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
  /**
   * 是否在模型不支持透明底时于客户端去背。默认开启——
   * 海报右侧图形必须透明，不去背就会在海报上留下一个色块。
   */
  removeBackground?: boolean;
}

export interface VisualGenerationResult {
  image: GenerateImageResult;
  trace: VisualGenerationTrace;
  /** 本次结果是否经过客户端去背，用于在界面上如实告知运营 */
  backgroundRemoved: boolean;
}
