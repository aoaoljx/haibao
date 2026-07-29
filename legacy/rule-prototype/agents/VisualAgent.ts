import { buildVisualPrompt } from "../services/promptBuilder";
import type {
  PosterCopy,
  VisualAgentResult,
  VisualAsset,
  VisualKey,
  VisualMapping,
  VisualRequest,
  VisualTextValueMap
} from "../types/visual";

const VISUAL_KEYS: VisualKey[] = ["graphic1", "graphic2", "graphic3", "graphic4", "graphic5"];

export class VisualAgent {
  constructor(private readonly mapping: VisualMapping) {}

  generate(request: VisualRequest): VisualAgentResult {
    const visual = this.resolveVisual(request);
    const editableText = this.resolveEditableText(request, visual);
    return {
      visual,
      editableText,
      prompt: buildVisualPrompt(request, visual, editableText),
      reason: this.describeReason(request, visual),
      generatedBy: "local-rule",
      noAiApi: true
    };
  }

  private resolveVisual(request: VisualRequest): VisualAsset {
    const explicit = request.selection;
    if (explicit && explicit !== "auto" && VISUAL_KEYS.includes(explicit)) {
      return this.getVisual(explicit);
    }

    const corpus = toCorpus(request.copy);
    const priority = this.mapping.matchPriority[request.mode] || VISUAL_KEYS;
    let best: VisualAsset | undefined;
    let bestScore = 0;

    for (const key of priority) {
      const visual = this.getVisual(key);
      const score = scoreVisual(corpus, visual);
      if (score > bestScore) {
        best = visual;
        bestScore = score;
      }
    }

    return best || this.getVisual(this.mapping.fallback[request.mode]);
  }

  private resolveEditableText(request: VisualRequest, visual: VisualAsset): VisualTextValueMap {
    const suggestions = suggestGraphicText(visual.key, request.copy);
    const existing = request.graphicText?.[visual.key] || {};
    const result: VisualTextValueMap = {};

    for (const field of visual.editableTextFields) {
      result[field.id] = existing[field.id] ?? suggestions[field.id] ?? field.defaultValue;
    }

    return result;
  }

  private describeReason(request: VisualRequest, visual: VisualAsset) {
    if (request.selection && request.selection !== "auto") {
      return `用户手动选择了${visual.name}`;
    }
    return `根据标题、功能点和底部文案本地匹配到${visual.name}`;
  }

  private getVisual(key: VisualKey): VisualAsset {
    const visual = this.mapping.visuals.find((item) => item.key === key);
    if (!visual) {
      throw new Error(`Missing visual mapping for ${key}`);
    }
    return visual;
  }
}

function scoreVisual(corpus: string, visual: VisualAsset) {
  let score = 0;
  for (const keyword of visual.keywords) {
    if (corpus.includes(keyword.toLowerCase())) score += keyword.length > 2 ? 2 : 1;
  }
  return score;
}

function toCorpus(copy: PosterCopy) {
  return [
    copy.titleBlue,
    copy.titleDark,
    copy.subtitle,
    copy.notice,
    copy.tag,
    ...(copy.featurePoints || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function suggestGraphicText(key: VisualKey, copy: PosterCopy): VisualTextValueMap {
  const title = compact(`${copy.titleBlue || ""}${copy.titleDark || ""}`, 12);
  const blueTitle = compact(copy.titleBlue, 8);
  const darkTitle = compact(copy.titleDark, 10);
  const corpus = toCorpus(copy);

  if (key === "graphic1") {
    return {
      brand: "iDevflow",
      action: inferActionText(corpus, "提交")
    };
  }

  if (key === "graphic2") {
    return {
      brand: "iDevflow",
      action: inferActionText(corpus, "登录")
    };
  }

  if (key === "graphic3") {
    return {
      milestone: corpus.includes("需求") ? "需求路标" : "路标版本",
      delivery: /发布|上线|版本/.test(corpus) ? "版本交付" : "敏捷交付",
      publish: corpus.includes("上线") ? "点击上线" : "点击发布",
      status: /完成|成功/.test(corpus) ? "已验证" : "验证中"
    };
  }

  if (key === "graphic4") {
    return {
      ai: /ai/i.test(title) ? "AI" : compact(copy.titleBlue || "AI", 4),
      coder: darkTitle || title || "DF Coder"
    };
  }

  if (key === "graphic5") {
    return {
      title: darkTitle || title || blueTitle || "测试用例"
    };
  }

  return {};
}

function inferActionText(text: string, fallback: string) {
  if (/登录|单点|sso|认证|账号/.test(text)) return "登录";
  if (/发布|上线|部署/.test(text)) return "发布";
  if (/提交|评审|审核|合并/.test(text)) return "提交";
  if (/保存|编辑|修改/.test(text)) return "保存";
  return fallback;
}

function compact(value?: string, maxLength = 12) {
  const normalized = String(value || "").replace(/\s+/g, "");
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}
