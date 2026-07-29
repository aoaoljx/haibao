import { normalizeKeywords } from "../../../prompt/keywordMapping";
import type { VisualGenerationInput } from "./types";

export function extractVisualKeywords(input: VisualGenerationInput) {
  return normalizeKeywords([
    input.titleBlue,
    input.titleDark,
    input.keywords,
    ...input.featurePoints
  ]);
}
