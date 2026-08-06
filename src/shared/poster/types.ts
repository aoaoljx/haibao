export type PosterMode = "feature" | "ai";

export type VisualKey =
  | "graphic1"
  | "graphic2"
  | "graphic3"
  | "graphic4"
  | "graphic5"
  | "graphic6";

export type VisualSelection = VisualKey | "auto";

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
  visibleBounds?: VisualBounds;
  posterBounds: VisualBounds;
  keywords: string[];
  promptHints: string[];
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
