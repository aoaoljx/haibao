export type PosterMode = "feature" | "ai";

export type VisualKey =
  | "graphic1"
  | "graphic2"
  | "graphic3"
  | "graphic4"
  | "graphic5";

export type VisualSelection = VisualKey | "auto";

export type TextAlign = "left" | "center" | "right";

export type TextAnchor = "baseline" | "center";

export interface PosterCopy {
  titleBlue: string;
  titleDark?: string;
  subtitle?: string;
  notice?: string;
  tag?: string;
  featurePoints: string[];
}

export interface VisualBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VisualTextField {
  id: string;
  label: string;
  role: "brand" | "action" | "card" | "status" | "badge" | "title";
  defaultValue: string;
  maxLength?: number;
}

export interface VisualTextRenderSlot {
  fieldId: string;
  x: number;
  y: number;
  anchor: TextAnchor;
  fontSize: number;
  maxWidth: number;
  align: TextAlign;
  styleToken: string;
}

export interface VisualAsset {
  key: VisualKey;
  name: string;
  assetPath: string;
  sourceAssetPath?: string;
  description: string;
  preferredModes: PosterMode[];
  naturalSize: {
    width: number;
    height: number;
  };
  posterBounds: VisualBounds;
  keywords: string[];
  promptHints: string[];
  editableTextFields: VisualTextField[];
  renderSlots: VisualTextRenderSlot[];
}

export interface VisualMapping {
  schemaVersion: string;
  positioning: {
    name: string;
    aiScope: string;
  };
  canvas: {
    width: number;
    height: number;
  };
  fallback: Record<PosterMode, VisualKey>;
  matchPriority: Record<PosterMode, VisualKey[]>;
  visuals: VisualAsset[];
}

export type VisualTextValueMap = Record<string, string>;

export type VisualTextState = Partial<Record<VisualKey, VisualTextValueMap>>;

export type VisualTouchedState = Partial<Record<VisualKey, Record<string, boolean>>>;

export interface VisualRequest {
  mode: PosterMode;
  selection?: VisualSelection;
  copy: PosterCopy;
  graphicText?: VisualTextState;
  touchedGraphicText?: VisualTouchedState;
}

export interface VisualPrompt {
  visualKey: VisualKey;
  visualName: string;
  subject: string;
  sourceCopy: {
    title: string;
    subtitle?: string;
    notice?: string;
    featurePoints: string[];
  };
  editableText: VisualTextValueMap;
  style: {
    perspective: "2.5D";
    palette: string[];
    lighting: string;
    material: string;
    brandTone: string;
  };
  composition: {
    canvas: {
      width: number;
      height: number;
    };
    rightVisualBounds: VisualBounds;
    keepLeftTextAreaManual: true;
  };
  positivePrompt: string;
  negativePrompt: string;
}

export interface VisualAgentResult {
  visual: VisualAsset;
  editableText: VisualTextValueMap;
  prompt: VisualPrompt;
  reason: string;
  generatedBy: "local-rule";
  noAiApi: true;
}
