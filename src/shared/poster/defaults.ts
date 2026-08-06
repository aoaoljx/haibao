import type {
  PosterCopy,
  PosterMode,
  VisualKey,
  VisualSelection
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
    selection: "graphic6",
    copy: {
      titleBlue: "AI辅助",
      titleDark: "生成测试用例",
      subtitle: "邀您抢先体验",
      notice: "让您专注于业务创造，而非重复工作",
      tag: "beta版",
      featurePoints: []
    }
  }
};

export function clonePosterCopy(copy: PosterCopy): PosterCopy {
  return {
    ...copy,
    featurePoints: [...copy.featurePoints]
  };
}
