import rawMapping from "./visualMapping.json";
import type { VisualAsset, VisualKey, VisualMapping } from "./types";

export const visualMapping = rawMapping as VisualMapping;

export const visualKeys = visualMapping.visuals.map((visual) => visual.key);

export function getVisualByKey(key: VisualKey): VisualAsset {
  const visual = visualMapping.visuals.find((item) => item.key === key);
  if (!visual) {
    throw new Error(`Missing visual mapping for ${key}`);
  }
  return visual;
}
