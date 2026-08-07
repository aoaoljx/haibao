import {
  BASE_NEGATIVE_PROMPT,
  FEATURE_LIBRARY_STYLE_PROMPT,
  buildBasePromptBlock,
  section
} from "./basePrompt";
import { resolveSceneByKeywords } from "./keywordMapping";
import { DEFAULT_SCENE_KEY, getScenePrompt, type PromptSceneKey } from "./scenePrompt";
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

  const prompt = [
    buildBasePromptBlock(),
    ...(input.mode === "feature"
      ? [section("正常功能发布固定图库风格", [FEATURE_LIBRARY_STYLE_PROMPT])]
      : []),
    section("场景模板", [
      `模板名称：${scene.name}`,
      `适用语义：${scene.usage}`,
      ...scene.composition
    ]),
    section("核心元素", scene.elements),
    section("关键词自动选择的视觉元素", selectedVisualElements),
    section("系统提取的功能关键词", systemKeywords.length ? systemKeywords : ["企业级效能平台"]),
    section("最终输出", [
      // 不要让模型去「画」透明——它会画一格一格的棋盘格图案来表示透明，
      // 实测出来的图 alpha 全是 255，那片假格子还会以噪点形式残留在去背结果里。
      // 透明是 API 层的事（background 参数），这里只要求一个干净、单一、
      // 容易抠掉的纯白底。
      "画面只包含可放在海报右侧的2.5D主视觉资产，主体周围是纯白色的空白底。",
      "背景必须是完全均匀的纯白，没有任何图案、格子、纹理、渐变或投影底纹，便于后续抠除。",
      "图形内部不得生成可读文字、字母、Logo 或水印，只用图形符号表达功能语义。",
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
