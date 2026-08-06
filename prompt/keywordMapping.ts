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

/**
 * 主标题在打分里的倍率。
 *
 * 主标题就是这张海报讲的那件事，是最强的主题信号；功能点是支撑细节。
 * 此前两者等权，导致功能点里零散的词把场景带偏——实测「代码在线编辑」
 * 这张，只看标题会正确命中「代码编辑」，一旦带上三条功能点
 * （含 评审/审核/质量/标签/变更/管理，横跨 6 个类目），
 * 累计分数就压过标题，翻成了「发布上线」，出图变成火箭发射。
 *
 * 注意只加权 titleBlue。titleDark 通常是「功能发布」这类固定后缀，
 * 每张海报都有，加权它等于给所有海报注入发布类关键词。
 */
const TITLE_WEIGHT = 3;

interface ScoringField {
  corpus: string;
  weight: number;
}

/**
 * 按来源拆成带权重的语料。
 *
 * 同一个关键词在标题和功能点里都出现时会各计一次分——那确实是更强的证据。
 */
function buildScoringFields(input: KeywordResolveInput): ScoringField[] {
  const title = normalizeKeywords([input.titleBlue]).join(" ").toLowerCase();
  const supporting = normalizeKeywords([
    input.titleDark,
    input.subtitle,
    input.notice,
    input.keywords,
    ...(input.featurePoints || [])
  ])
    .join(" ")
    .toLowerCase();

  return [
    { corpus: title, weight: TITLE_WEIGHT },
    { corpus: supporting, weight: 1 }
  ];
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
  const fields = buildScoringFields(input);
  const scores = new Map<PromptSceneKey, number>();
  const matchedKeywords: string[] = [];
  const visualElements: string[] = [];
  const matchedCategories: string[] = [];

  for (const group of KEYWORD_RULES) {
    let groupMatched = false;
    for (const keyword of group.keywords) {
      const needle = keyword.toLowerCase();
      let keywordScore = 0;

      for (const field of fields) {
        if (field.corpus.includes(needle)) keywordScore += group.weight * field.weight;
      }

      if (!keywordScore) continue;
      scores.set(group.sceneKey, (scores.get(group.sceneKey) || 0) + keywordScore);
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
