export type PosterMode = "feature" | "ai";

export type VisualKey =
  | "graphic1"
  | "graphic2"
  | "graphic3"
  | "graphic4"
  | "graphic5";

export type VisualSelection = VisualKey | "auto";

/** 右侧图形从哪里来。渲染层与编辑器共用，因此放在领域类型里。 */
export type GraphicSource = "ai" | "library" | "upload";

export type TextAlign = "left" | "center" | "right";

export type TextAnchor = "baseline" | "center";

export interface PosterCopy {
  titleBlue: string;
  titleDark?: string;
  subtitle?: string;
  notice?: string;
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
  description: string;
  /** 该图形更适合哪一版海报。用于在素材图库里标注推荐，不限制选择 */
  preferredModes: PosterMode[];
  naturalSize: {
    width: number;
    height: number;
  };
  posterBounds: VisualBounds;
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
  visuals: VisualAsset[];
}

export type VisualTextValueMap = Record<string, string>;
