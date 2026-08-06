import { getVisualByKey } from "@/shared/poster/visualMapping";
import type {
  PosterCopy,
  PosterMode,
  VisualKey
} from "@/shared/poster/types";

const FEATURE_VISUAL_OFFSET_X = 180;

export type PosterImages = {
  featureBg: HTMLImageElement;
  aiBg: HTMLImageElement;
  logo: HTMLImageElement;
  logoAi: HTMLImageElement;
  productBadge: HTMLImageElement;
  aiProductBadge: HTMLImageElement;
} & Record<VisualKey, HTMLImageElement>;

export interface PosterRenderInput {
  aiGeneratedImage?: HTMLImageElement | null;
  mode: PosterMode;
  copy: PosterCopy;
  visualKey: VisualKey;
  images: PosterImages;
}

export function renderPoster(canvas: HTMLCanvasElement, input: PosterRenderInput) {
  const maybeContext = canvas.getContext("2d");
  if (!maybeContext) return;
  const ctx: CanvasRenderingContext2D = maybeContext;

  const { copy, images, mode } = input;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (mode === "feature") {
    const bg = images.featureBg;
    ctx.drawImage(bg, 0, 0, 3840, 1920);
    ctx.drawImage(images.logo, 154, 135, 1495, 200);
    ctx.drawImage(images.productBadge, 160, 470, 585, 198);
    renderFeature();
  } else {
    renderAiDark();
  }

  function renderFeature() {
    const blue = val("titleBlue") || "功能主标题";
    const dark = val("titleDark");
    ctx.font = font(dark ? 174 : 184, 800, true);
    ctx.fillStyle = "#2180f7";
    ctx.fillText(blue, 160, 930);
    if (dark) {
      const tw = ctx.measureText(blue).width;
      ctx.fillStyle = "#0c1f75";
      ctx.fillText(dark, 160 + tw + 45, 930);
    }
    if (val("subtitle")) {
      ctx.font = font(130, 800, true);
      ctx.fillStyle = "#0c1f75";
      ctx.fillText(val("subtitle"), blue.includes("统一") ? 430 : 160, 1285);
    }
    drawFeaturePoints(1180, 430);
    if (val("notice")) drawNotice();
    drawVisual();
  }

  /** AI 功能发布海报：沿用既有画布结构，组合专用品牌素材。 */
  function renderAiDark() {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(images.aiBg, 0, 0, 3840, 1920);

    // 图五中的 Logo 和产品标签均按素材原始比例放大两倍。
    ctx.drawImage(images.logoAi, 160, 118, 1496, 200);
    ctx.drawImage(images.aiProductBadge, 160, 462, 584, 198);

    const titleBlue = val("titleBlue") || "AI 辅助";
    const titleDark = val("titleDark") || "生成测试用例";

    ctx.font = font(titleDark ? 174 : 184, 800, true);
    const titleBlueWidth = ctx.measureText(titleBlue).width;
    const titleGradient = ctx.createLinearGradient(160, 0, 160 + titleBlueWidth, 0);
    titleGradient.addColorStop(0, "#42e1d5");
    titleGradient.addColorStop(0.48, "#27a8f7");
    titleGradient.addColorStop(1, "#9a79ff");
    ctx.fillStyle = titleGradient;
    ctx.fillText(titleBlue, 160, 940);

    if (titleDark) {
      ctx.fillStyle = "#ffffff";
      ctx.fillText(titleDark, 160 + titleBlueWidth + 28, 940);
    }

    if (val("subtitle")) {
      ctx.font = font(130, 800, true);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(val("subtitle"), 160, 1205);
    }

    // 默认参考稿不显示功能点；运营添加后仍保留原有编辑能力。
    drawFeaturePointsDark(1280, 260);

    if (val("notice")) {
      ctx.font = font(82, 500, false);
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.fillText(val("notice"), 160, 1650);
    }

    drawVisualDark();
  }

  /**
   * 深色风格功能点 - 与功能发布海报相同布局
   */
  function drawFeaturePointsDark(startY: number, maxHeight: number) {
    const rows = copy.featurePoints.map((point) => point.trim()).filter(Boolean);
    if (!rows.length) return;

    const count = rows.length;
    const textSize = Math.max(
      46,
      Math.min(70, Math.floor(((maxHeight - Math.max(0, count - 1) * 28) / count) * 0.58))
    );
    const lineGap = Math.max(96, Math.min(178, Math.floor(maxHeight / count)));
    let y = startY + textSize;

    for (const row of rows) {
      const [label, ...rest] = row.split(/[:：]/);
      const text = rest.join("：");

      // 圆点 - 与功能发布海报相同
      ctx.fillStyle = "rgba(112, 38, 244, 0.8)";
      ctx.beginPath();
      ctx.arc(168, y - textSize * 0.38, Math.max(8, textSize * 0.16), 0, Math.PI * 2);
      ctx.fill();

      // 标签文字
      ctx.fillStyle = "#ffffff";
      ctx.font = font(textSize, 800, false);
      const prefix = text ? `${label}：` : row;
      ctx.fillText(prefix, 218, y);

      // 描述文字
      if (text) {
        const lw = ctx.measureText(prefix).width;
        ctx.font = font(textSize, 500, false);
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        fitTextDark(text, 218 + lw + 18, y, 1760 - lw, textSize);
      }

      y += lineGap;
    }
  }

  function fitTextDark(text: string, x: number, y: number, maxWidth: number, px: number) {
    let value = text;
    ctx.font = font(px, 500, false);
    while (ctx.measureText(value).width > maxWidth && value.length > 3) {
      value = value.slice(0, -2);
    }
    ctx.fillText(value.length < text.length ? `${value}…` : value, x, y);
  }

  function drawVisualDark() {
    const visual = getVisualByKey(input.visualKey);
    const aiImg = input.aiGeneratedImage;
    const box = visual.posterBounds; // 使用相同的 posterBounds

    if (aiImg) {
      ctx.drawImage(aiImg, box.x, box.y, box.w, box.h);
      return;
    }

    const img = images[visual.key];
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
  }

  function drawFeaturePoints(startY: number, maxHeight: number) {
    const rows = copy.featurePoints.map((point) => point.trim()).filter(Boolean);
    if (!rows.length) return;
    const count = rows.length;
    const textSize = Math.max(
      46,
      Math.min(70, Math.floor(((maxHeight - Math.max(0, count - 1) * 28) / count) * 0.58))
    );
    const lineGap = Math.max(96, Math.min(178, Math.floor(maxHeight / count)));
    let y = startY + textSize;
    for (const row of rows) {
      const [label, ...rest] = row.split(/[:：]/);
      const text = rest.join("：");
      ctx.fillStyle = "#3a5684";
      ctx.beginPath();
      ctx.arc(168, y - textSize * 0.38, Math.max(8, textSize * 0.16), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#324e7b";
      ctx.font = font(textSize, 800, false);
      const prefix = text ? `${label}：` : row;
      ctx.fillText(prefix, 218, y);
      if (text) {
        const lw = ctx.measureText(prefix).width;
        ctx.font = font(textSize, 500, false);
        fitText(text, 218 + lw + 18, y, 1760 - lw, textSize);
      }
      y += lineGap;
    }
  }

  function fitText(text: string, x: number, y: number, maxWidth: number, px: number) {
    let value = text;
    ctx.font = font(px, 500, false);
    while (ctx.measureText(value).width > maxWidth && value.length > 3) {
      value = value.slice(0, -2);
    }
    ctx.fillText(value.length < text.length ? `${value}…` : value, x, y);
  }

  function drawNotice() {
    roundRect(168, 1660, 87, 88, 28, "#ffc600");
    ctx.fillStyle = "#fff";
    ctx.font = font(48, 800, false);
    ctx.fillText("♥", 205, 1724);
    ctx.fillStyle = "#34527f";
    ctx.font = font(72, 800, false);
    ctx.fillText(val("notice"), 320, 1725);
  }

  function drawTag(text: string, titleX: number, titleY: number, titleWidth: number) {
    ctx.font = font(52, 800, false);
    const tagWidth = Math.max(255, Math.ceil(ctx.measureText(text).width + 70));
    const tagHeight = 120;
    const titleRight = titleX + titleWidth;
    const pointerX = Math.min(3200, Math.max(titleX + 920, titleRight - 42));
    const x = Math.max(titleX + 900, pointerX - 54);
    const y = titleY - 170;
    const pointerTop = y + tagHeight - 4;
    ctx.save();
    ctx.shadowColor = "rgba(210, 117, 35, 0.42)";
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 26;
    const fill = ctx.createLinearGradient(x, y, x + tagWidth, y + tagHeight);
    fill.addColorStop(0, "#ffd33f");
    fill.addColorStop(0.46, "#ffb43d");
    fill.addColorStop(1, "#ff722c");
    roundRect(x, y, tagWidth, tagHeight, 10, fill);
    ctx.beginPath();
    ctx.moveTo(pointerX, pointerTop);
    ctx.lineTo(pointerX + 44, pointerTop);
    ctx.lineTo(pointerX + 18, pointerTop + 54);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#fff";
    ctx.fillText(text, x + 30, y + 78);
    ctx.restore();
  }

  function drawVisual() {
    const visual = getVisualByKey(input.visualKey);
    const aiImg = input.aiGeneratedImage;
    const box = visual.posterBounds;
    const x = box.x + FEATURE_VISUAL_OFFSET_X;

    if (aiImg) {
      ctx.drawImage(aiImg, x, box.y, box.w, box.h);
      return;
    }

    const img = images[visual.key];
    ctx.drawImage(img, x, box.y, box.w, box.h);
  }

  function roundRect(
    x: number, y: number, w: number, h: number, r: number,
    fill?: string | CanvasGradient, stroke?: string, line = 1
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
  }

  function val(field: keyof PosterCopy) {
    const value = copy[field];
    return typeof value === "string" ? value.trim() : "";
  }

}

function font(px: number, weight = 800, italic = true) {
  return `${italic ? "italic " : ""}${weight} ${px}px "PingFang SC", "Microsoft YaHei", Arial, sans-serif`;
}
