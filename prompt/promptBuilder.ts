import { BASE_NEGATIVE_PROMPT, buildBasePromptBlock, section } from "./basePrompt";
import { resolveSceneByKeywords } from "./keywordMapping";
import { DEFAULT_SCENE_KEY, getScenePrompt, type PromptSceneKey } from "./scenePrompt";
import type { PosterMode } from "../src/shared/poster/types";

export interface PromptGraphicText {
  topText?: string;
  label?: string;
  buttonText?: string;
  badgeText?: string;
}

export interface VisualPromptBuildInput {
  mode: PosterMode;
  titleBlue?: string;
  titleDark?: string;
  subtitle?: string;
  notice?: string;
  featurePoints?: readonly string[];
  keywords?: string;
  sceneKey?: PromptSceneKey;
  graphicText?: PromptGraphicText;
}

export interface BuiltVisualPrompt {
  sceneKey: PromptSceneKey;
  sceneName: string;
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
  const systemKeywords = keywordResult.normalizedKeywords;
  const selectedVisualElements = keywordResult.visualElements.length
    ? keywordResult.visualElements
    : [...scene.elements];
  const graphicText = normalizeGraphicText(input.graphicText);

  const prompt = [
    buildBasePromptBlock(),
    section("场景模板", [
      `模板名称：${scene.name}`,
      `适用语义：${scene.usage}`,
      ...scene.composition
    ]),
    section("核心元素", scene.elements),
    section("关键词自动选择的视觉元素", selectedVisualElements),
    section("可覆盖文字槽位", scene.textSlots),
    section("系统提取的功能关键词", systemKeywords.length ? systemKeywords : ["企业级效能平台"]),
    section("后续文字覆盖计划", [
      `顶部文字槽位：${graphicText.topText || "保留为空槽位"}`,
      `标签槽位：${graphicText.label || "保留为空槽位"}`,
      `按钮文字槽位：${graphicText.buttonText || "保留为空槽位"}`,
      `徽章文字槽位：${graphicText.badgeText || "保留为空槽位"}`,
      "以上文字只用于规划留白和视觉槽位，不要直接生成可读文字。"
    ]),
    section("最终输出", [
      // 不要让模型去「画」透明——它会画一格一格的棋盘格图案来表示透明，
      // 实测出来的图 alpha 全是 255，那片假格子还会以噪点形式残留在去背结果里。
      // 透明是 API 层的事（background 参数），这里只要求一个干净、单一、
      // 容易抠掉的纯白底。
      "画面只包含可放在海报右侧的2.5D主视觉资产，主体周围是纯白色的空白底。",
      "背景必须是完全均匀的纯白，没有任何图案、格子、纹理、渐变或投影底纹，便于后续抠除。",
      "主视觉必须适合后续由系统叠加顶部文字、标签、按钮文字和徽章文字。",
      "不要生成海报底图、纯色背景、渐变背景或左侧文案区域。",
      "不要输出解释，不要输出多方案，不要输出Prompt文本。"
    ])
  ].join("\n\n");

  return {
    sceneKey,
    sceneName: scene.name,
    prompt,
    negativePrompt: [...BASE_NEGATIVE_PROMPT, ...scene.avoid].join("，"),
    systemKeywords,
    matchedKeywords: keywordResult.matchedKeywords,
    visualElements: selectedVisualElements,
    matchedCategories: keywordResult.matchedCategories
  };
}

function normalizeGraphicText(graphicText: PromptGraphicText = {}): Required<PromptGraphicText> {
  return {
    topText: clean(graphicText.topText),
    label: clean(graphicText.label),
    buttonText: clean(graphicText.buttonText),
    badgeText: clean(graphicText.badgeText)
  };
}

function clean(value?: string) {
  return String(value || "").trim().slice(0, 24);
}
