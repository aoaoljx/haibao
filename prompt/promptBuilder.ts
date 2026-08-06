import { BASE_NEGATIVE_PROMPT, buildBasePromptBlock, section } from "./basePrompt";
import { resolveSceneByKeywords } from "./keywordMapping";
import { DEFAULT_SCENE_KEY, getScenePrompt, type PromptSceneKey } from "./scenePrompt";
import { getModeVisualStylePrompt, type ModeVisualStyleKey } from "./stylePrompt";
import type { PosterMode } from "../src/shared/poster/types";

export interface VisualPromptBuildInput {
  mode: PosterMode;
  titleBlue?: string;
  titleDark?: string;
  subtitle?: string;
  notice?: string;
  featurePoints?: readonly string[];
  keywords?: string;
  sceneKey?: PromptSceneKey;
}

export interface BuiltVisualPrompt {
  sceneKey: PromptSceneKey;
  sceneName: string;
  styleKey: ModeVisualStyleKey;
  styleName: string;
  prompt: string;
  negativePrompt: string;
  systemKeywords: string[];
  matchedKeywords: string[];
  visualElements: string[];
  matchedCategories: string[];
}

export function buildVisualPrompt(input: VisualPromptBuildInput): BuiltVisualPrompt {
  const keywordResult = resolveSceneByKeywords(input);
  const sceneKey = input.sceneKey || keywordResult.sceneKey || DEFAULT_SCENE_KEY;
  const scene = getScenePrompt(sceneKey);
  const modeStyle = getModeVisualStylePrompt(input.mode);
  const systemKeywords = keywordResult.normalizedKeywords;
  const selectedVisualElements = keywordResult.visualElements.length
    ? keywordResult.visualElements
    : [...scene.elements];

  const prompt = [
    buildBasePromptBlock(),
    section("模式视觉风格", [modeStyle.name, ...modeStyle.instructions]),
    section("场景模板", [
      `模板名称：${scene.name}`,
      `适用语义：${scene.usage}`,
      ...scene.composition
    ]),
    section("核心元素", scene.elements),
    section("关键词自动选择的视觉元素", selectedVisualElements),
    section("系统提取的功能关键词", systemKeywords.length ? systemKeywords : ["企业级效能平台"]),
    section("文字与品牌约束", [
      "不要生成任何可读中文、英文、数字、品牌名称或Logo。",
      "需要表达界面信息时，仅使用抽象短线、点阵、几何块与不可读占位符。",
      "主体应作为完整视觉成品直接使用，不再预留可编辑文字槽位。"
    ]),
    section("最终输出", [
      "生成一张透明背景PNG，画面只包含一个可放在海报右侧的完整主视觉资产。",
      "不要生成海报底图、纯色背景、渐变背景、左侧文案区域或额外装饰边框。",
      "不要输出解释，不要输出多方案，不要输出Prompt文本。"
    ])
  ].join("\n\n");

  return {
    sceneKey,
    sceneName: scene.name,
    styleKey: modeStyle.key,
    styleName: modeStyle.name,
    prompt,
    negativePrompt: [...BASE_NEGATIVE_PROMPT, ...modeStyle.avoid, ...scene.avoid].join("，"),
    systemKeywords,
    matchedKeywords: keywordResult.matchedKeywords,
    visualElements: selectedVisualElements,
    matchedCategories: keywordResult.matchedCategories
  };
}
