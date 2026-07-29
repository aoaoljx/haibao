import type {
  VisualAsset,
  VisualPrompt,
  VisualRequest,
  VisualTextValueMap
} from "../types/visual";

const STYLE_PALETTE = ["#2180F7", "#0C1F75", "#FFFFFF", "#50C7DA", "#7A5CFF"];

const NEGATIVE_PROMPT = [
  "不要生成左侧标题、功能点、提示语或其他运营文案",
  "不要改变海报左侧编辑区的排版",
  "不要使用写实摄影、深色复杂背景、卡通人物或过度装饰",
  "不要覆盖INOVANCE和iDevFlow品牌区域"
].join("；");

export function buildVisualPrompt(
  request: VisualRequest,
  visual: VisualAsset,
  editableText: VisualTextValueMap = {}
): VisualPrompt {
  const title = joinTitle(request.copy.titleBlue, request.copy.titleDark);
  const featurePoints = cleanList(request.copy.featurePoints);
  const subject = title || compact(featurePoints[0], 16) || visual.name;
  const sourceText = [title, request.copy.subtitle, request.copy.notice, ...featurePoints]
    .filter(Boolean)
    .join("；");

  const positivePrompt = [
    `为「${subject}」生成右侧2.5D品牌主视觉`,
    `参考${visual.name}的构图和视觉语言：${visual.description}`,
    `核心元素：${visual.promptHints.join("、")}`,
    sourceText ? `运营已提供文案语义参考：${sourceText}` : "",
    "蓝白科技感、玻璃拟态卡片、柔和投影、轻量渐变、企业级SaaS质感",
    "只生成右侧主视觉区域，保留左侧文案由运营手动编辑"
  ]
    .filter(Boolean)
    .join("；");

  return {
    visualKey: visual.key,
    visualName: visual.name,
    subject,
    sourceCopy: {
      title,
      subtitle: clean(request.copy.subtitle),
      notice: clean(request.copy.notice),
      featurePoints
    },
    editableText,
    style: {
      perspective: "2.5D",
      palette: STYLE_PALETTE,
      lighting: "soft top-left highlights with blue ambient glow",
      material: "glass panels, rounded SaaS cards, subtle bevels",
      brandTone: "efficient, reliable, clean enterprise productivity"
    },
    composition: {
      canvas: {
        width: 3840,
        height: 1920
      },
      rightVisualBounds: visual.posterBounds,
      keepLeftTextAreaManual: true
    },
    positivePrompt,
    negativePrompt: NEGATIVE_PROMPT
  };
}

function joinTitle(titleBlue?: string, titleDark?: string) {
  return [clean(titleBlue), clean(titleDark)].filter(Boolean).join("");
}

function clean(value?: string) {
  return String(value || "").trim();
}

function cleanList(values: string[] = []) {
  return values.map(clean).filter(Boolean);
}

function compact(value?: string, maxLength = 12) {
  const normalized = clean(value).replace(/\s+/g, "");
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}
