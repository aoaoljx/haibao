import type { PosterMode } from "../src/shared/poster/types";
import { DEFAULT_SCENE_KEY, type PromptSceneKey } from "./scenePrompt";
import visualMappingConfig from "./visualMapping.json";

export interface VisualMappingGroup {
  category: string;
  sceneKey: PromptSceneKey;
  weight: number;
  keywords: readonly string[];
  visualElements: readonly string[];
}

export interface VisualMappingConfig {
  schemaVersion: string;
  description: string;
  defaults: Record<PosterMode, PromptSceneKey>;
  groups: readonly VisualMappingGroup[];
}

export const VISUAL_MAPPING = visualMappingConfig as VisualMappingConfig;
export const KEYWORD_RULES = VISUAL_MAPPING.groups;

export interface KeywordResolveInput {
  mode: PosterMode;
  titleBlue?: string;
  titleDark?: string;
  subtitle?: string;
  notice?: string;
  featurePoints?: readonly string[];
  keywords?: string;
}

export interface KeywordResolveResult {
  sceneKey: PromptSceneKey;
  normalizedKeywords: string[];
  matchedKeywords: string[];
  visualElements: string[];
  matchedCategories: string[];
}

export function resolveSceneByKeywords(input: KeywordResolveInput): KeywordResolveResult {
  const normalizedKeywords = normalizeKeywords([
    input.titleBlue,
    input.titleDark,
    input.subtitle,
    input.notice,
    input.keywords,
    ...(input.featurePoints || [])
  ]);
  const corpus = normalizedKeywords.join(" ").toLowerCase();
  const scores = new Map<PromptSceneKey, number>();
  const matchedKeywords: string[] = [];
  const visualElements: string[] = [];
  const matchedCategories: string[] = [];

  for (const group of KEYWORD_RULES) {
    let groupMatched = false;
    for (const keyword of group.keywords) {
      if (!corpus.includes(keyword.toLowerCase())) continue;
      scores.set(group.sceneKey, (scores.get(group.sceneKey) || 0) + group.weight);
      matchedKeywords.push(keyword);
      groupMatched = true;
    }

    if (!groupMatched) continue;
    matchedCategories.push(group.category);
    visualElements.push(...group.visualElements);
  }

  let sceneKey = VISUAL_MAPPING.defaults[input.mode] || DEFAULT_SCENE_KEY;
  let bestScore = 0;
  for (const [key, score] of scores) {
    if (score > bestScore) {
      sceneKey = key;
      bestScore = score;
    }
  }

  return {
    sceneKey,
    normalizedKeywords,
    matchedKeywords: unique(matchedKeywords),
    visualElements: unique(visualElements).slice(0, 18),
    matchedCategories: unique(matchedCategories)
  };
}

export function normalizeKeywords(values: readonly unknown[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = String(value || "")
      .replace(/[，,。.;；:：/|｜、\n\r\t]+/g, " ")
      .trim();
    if (!text) continue;

    for (const item of text.split(/\s+/)) {
      const normalized = item.trim();
      const key = normalized.toLowerCase();
      if (!normalized || seen.has(key)) continue;
      seen.add(key);
      result.push(normalized);
    }
  }

  return result.slice(0, 24);
}

function unique(values: readonly string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}
