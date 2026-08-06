import { createDefaultTextValues } from "./graphicText";
import { visualMapping } from "./visualMapping";
import type {
  PosterCopy,
  PosterMode,
  VisualKey,
  VisualSelection,
  VisualTextValueMap
} from "./types";

export interface PosterPreset {
  copy: PosterCopy;
  selection: VisualSelection;
}

export const posterPresets: Record<PosterMode, PosterPreset> = {
  feature: {
    selection: "graphic1",
    copy: {
      titleBlue: "代码在线编辑",
      titleDark: "功能发布",
      subtitle: "",
      notice: "",
      tag: "",
      featurePoints: [
        "代码在线编辑：轻量代码变更，在线编辑高效完成",
        "代码评论：评审信息不杂乱，标签化管理一目了然",
        "代码审核：代码审核自动匹配，代码质量更可控"
      ]
    }
  },
  ai: {
    selection: "graphic5",
    copy: {
      titleBlue: "AI辅助",
      titleDark: "生成测试用例",
      subtitle: "邀您抢先体验",
      notice: "让您专注于业务创造，而非重复工作",
      tag: "beta版",
      featurePoints: [
        "测试用例生成：根据需求自动生成核心测试场景",
        "智能补全：覆盖边界条件，减少重复编写"
      ]
    }
  }
};

export function clonePosterCopy(copy: PosterCopy): PosterCopy {
  return {
    ...copy,
    featurePoints: [...copy.featurePoints]
  };
}

export function createDefaultGraphicTextState(): Record<VisualKey, VisualTextValueMap> {
  return Object.fromEntries(
    visualMapping.visuals.map((visual) => [visual.key, createDefaultTextValues(visual)])
  ) as Record<VisualKey, VisualTextValueMap>;
}
