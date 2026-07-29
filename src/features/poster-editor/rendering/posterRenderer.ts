import { getVisualByKey } from "@/shared/poster/visualMapping";
import type {
  PosterCopy,
  PosterMode,
  VisualAsset,
  VisualKey,
  VisualTextRenderSlot,
  VisualTextValueMap
} from "@/shared/poster/types";

export type PosterImages = {
  featureBg: HTMLImageElement;
  aiBg: HTMLImageElement;
  logo: HTMLImageElement;
  logoAi: HTMLImageElement;
  productBadge: HTMLImageElement;
} & Record<VisualKey, HTMLImageElement>;

export interface PosterRenderInput {
  aiGeneratedImage?: HTMLImageElement | null;
  mode: PosterMode;
  copy: PosterCopy;
  visualKey: VisualKey;
  graphicText: Record<VisualKey, VisualTextValueMap>;
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

  /**
   * AI 功能发布海报 - 深色科技风格
   * 布局与功能发布海报完全一致，仅背景和颜色方案不同
   */
  function renderAiDark() {
    // 1. 深色渐变背景
    const bgGradient = ctx.createLinearGradient(0, 0, 3840, 1920);
    bgGradient.addColorStop(0, "#0a0e27");
    bgGradient.addColorStop(0.5, "#0f1535");
    bgGradient.addColorStop(1, "#1a1f4e");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 3840, 1920);

    // 2. 科技感粒子装饰
    drawTechParticles();

    // 3. Logo - 保持原始比例，不拉伸变形
    ctx.save();
    const logoAiNaturalW = images.logoAi.naturalWidth || 660;
    const logoAiNaturalH = images.logoAi.naturalHeight || 208;
    const logoAiScale = 200 / logoAiNaturalH; // 高度对齐到 200px
    const logoAiW = Math.round(logoAiNaturalW * logoAiScale);
    const logoAiH = 200;
    ctx.drawImage(images.logoAi, 154, 135, logoAiW, logoAiH);
    ctx.restore();

    // 4. 标题区 - 与功能发布海报相同位置
    const titleBlue = val("titleBlue") || "AI 辅助";
    const titleDark = val("titleDark") || "生成测试用例";

    // 第一行标题 - 白色大字，位置 y=930
    ctx.font = font(titleDark ? 174 : 184, 800, true);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(titleBlue, 160, 930);

    // 第二行标题 - 蓝紫渐变，位置 y=930
    if (titleDark) {
      const tw = ctx.measureText(titleBlue).width;
      const gradient = ctx.createLinearGradient(
        160 + tw + 45, 930 - 140,
        160 + tw + 45 + ctx.measureText(titleDark).width, 930 - 140
      );
      gradient.addColorStop(0, "#7026f4");
      gradient.addColorStop(0.5, "#258bf8");
      gradient.addColorStop(1, "#50c7da");
      ctx.fillStyle = gradient;
      ctx.fillText(titleDark, 160 + tw + 45, 930);
    }

    // 5. 产品标签 - 与功能发布海报相同位置
    ctx.drawImage(images.productBadge, 160, 470, 585, 198);

    // 6. 副标题 - 位置 y=1285
    if (val("subtitle")) {
      ctx.font = font(130, 800, true);
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillText(val("subtitle"), 160, 1285);
    }

    // 7. 功能点 - 与功能发布海报相同位置
    drawFeaturePointsDark(1180, 430);

    // 8. 底部提示语 - 位置 y=1725
    if (val("notice")) {
      ctx.font = font(72, 800, false);
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText(val("notice"), 320, 1725);
    }

    // 9. 底部标语
    drawBottomTagline();

    // 10. 右侧图形 - 与功能发布海报相同位置
    drawVisualDark();
  }

  function drawTechParticles() {
    ctx.save();
    const particles = [
      { x: 3200, y: 600, r: 4, color: "rgba(112, 38, 244, 0.6)" },
      { x: 3400, y: 800, r: 3, color: "rgba(37, 139, 248, 0.5)" },
      { x: 3100, y: 1000, r: 5, color: "rgba(80, 199, 218, 0.4)" },
      { x: 3500, y: 500, r: 3, color: "rgba(112, 38, 244, 0.5)" },
      { x: 3300, y: 1200, r: 4, color: "rgba(37, 139, 248, 0.6)" },
    ];
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(112, 38, 244, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(3200, 600);
    ctx.lineTo(3400, 800);
    ctx.lineTo(3100, 1000);
    ctx.stroke();
    ctx.restore();
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

  function drawBottomTagline() {
    ctx.font = font(42, 600, false);
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText("GLOBAL PERSPECTIVE.  SMART TECHNOLOGY.  CLEAR ADVANTAGE.", 160, 1820);
  }

  /**
   * 右侧图形 - 与功能发布海报相同位置
   */
  function drawVisualDark() {
    const visual = getVisualByKey(input.visualKey);
    const aiImg = input.aiGeneratedImage;
    const box = visual.posterBounds; // 使用相同的 posterBounds

    if (aiImg) {
      ctx.save();
      ctx.shadowColor = "rgba(112, 38, 244, 0.5)";
      ctx.shadowBlur = 60;
      ctx.drawImage(aiImg, box.x, box.y, box.w, box.h);
      ctx.restore();
      return;
    }

    const img = images[visual.key];
    ctx.save();
    ctx.shadowColor = "rgba(37, 139, 248, 0.4)";
    ctx.shadowBlur = 50;
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
    ctx.restore();
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

    if (aiImg) {
      ctx.drawImage(aiImg, box.x, box.y, box.w, box.h);
      return;
    }

    const img = images[visual.key];
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
    drawGraphicText(visual, img);
  }

  function drawGraphicText(visual: VisualAsset, img: HTMLImageElement) {
    if (!visual.editableTextFields.length) return;
    const box = visual.posterBounds;
    const naturalWidth = img.naturalWidth || visual.naturalSize.width;
    const naturalHeight = img.naturalHeight || visual.naturalSize.height;
    const scaleX = box.w / naturalWidth;
    const scaleY = box.h / naturalHeight;
    const tx = (x: number) => box.x + x * scaleX;
    const ty = (y: number) => box.y + y * scaleY;
    ctx.save();
    for (const slot of visual.renderSlots) {
      const text = graphicTextValue(visual, slot.fieldId);
      drawGraphicSlot(visual, slot, text, tx(slot.x), ty(slot.y), scaleX);
    }
    ctx.restore();
  }

  function drawGraphicSlot(
    visual: VisualAsset,
    slot: VisualTextRenderSlot,
    text: string,
    x: number,
    y: number,
    scale: number
  ) {
    const size = slot.fontSize * scale;
    const maxWidth = slot.maxWidth * scale;

    if (slot.styleToken === "embossedWhite") {
      drawEmbossedWhiteText(text, x, y, size, maxWidth, false, slot.align);
      return;
    }
    if (slot.styleToken === "stackedWhite") {
      drawStackedGraphicText(text, x, y, size, maxWidth);
      return;
    }
    if (slot.styleToken === "stackedLightBlue") {
      drawStackedGraphicText(text, x, y, size, maxWidth, "#f6fbff", "#4b85fb");
      return;
    }
    if (slot.styleToken === "plainWhite") {
      drawPlainGraphicText(text, x, y, size, maxWidth, "#ffffff", true, slot.align);
      return;
    }
    if (slot.styleToken === "plainBlueItalic") {
      drawPlainGraphicText(text, x, y, size, maxWidth, "#3c79c8", true, slot.align, true);
      return;
    }
    if (slot.styleToken === "plainBlue") {
      const isCoderTitle = visual.key === "graphic4" && slot.fieldId === "coder";
      const color = slot.fieldId === "status" ? "#4d88f7" : "#3474c2";
      drawPlainGraphicText(text, x, y, size, maxWidth, color, !isCoderTitle, slot.align, isCoderTitle);
    }
  }

  function drawEmbossedWhiteText(
    text: string, x: number, baseline: number, size: number, maxWidth: number,
    italic: boolean, align: CanvasTextAlign = "left"
  ) {
    drawPlainGraphicText(text, x, baseline, size, maxWidth, "#ffffff", true, align, italic, {
      shadowColor: "rgba(0, 40, 120, 0.45)",
      shadowBlur: Math.max(5, size * 0.08),
      shadowOffsetY: Math.max(4, size * 0.08)
    });
  }

  function drawPlainGraphicText(
    text: string, x: number, baseline: number, size: number, maxWidth: number,
    color: string, bold = true, align: CanvasTextAlign = "left", italic = false,
    shadow: { shadowColor: string; shadowBlur: number; shadowOffsetY: number } | null = null
  ) {
    ctx.save();
    ctx.font = font(size, bold ? 800 : 700, italic);
    ctx.fillStyle = color;
    if (shadow) {
      ctx.shadowColor = shadow.shadowColor;
      ctx.shadowBlur = shadow.shadowBlur;
      ctx.shadowOffsetY = shadow.shadowOffsetY;
    }
    const value = compactToWidth(text, maxWidth);
    let drawX = x;
    if (align === "center") drawX = x + (maxWidth - ctx.measureText(value).width) / 2;
    ctx.fillText(value, drawX, baseline);
    ctx.restore();
  }

  function drawStackedGraphicText(
    text: string, x: number, centerY: number, size: number, maxWidth: number,
    color = "#ffffff", stroke = "rgba(48, 101, 220, 0.55)"
  ) {
    const raw = compactText(text, 8);
    const lines = raw.length > 4 ? [raw.slice(0, 4), raw.slice(4)] : splitInHalf(raw);
    ctx.save();
    ctx.font = font(size, 800, true);
    ctx.lineWidth = Math.max(3, size * 0.06);
    ctx.strokeStyle = stroke;
    ctx.fillStyle = color;
    ctx.shadowColor = "rgba(0, 70, 160, 0.22)";
    ctx.shadowBlur = Math.max(5, size * 0.08);
    ctx.shadowOffsetY = Math.max(3, size * 0.04);
    const gap = size * 1.08;
    const startY = centerY - ((lines.length - 1) * gap) / 2;
    lines.forEach((line, index) => {
      const value = compactToWidth(line, maxWidth);
      const drawX = x + (maxWidth - ctx.measureText(value).width) / 2;
      const y = startY + index * gap;
      ctx.strokeText(value, drawX, y);
      ctx.fillText(value, drawX, y);
    });
    ctx.restore();
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

  function graphicTextValue(visual: VisualAsset, fieldId: string) {
    const field = visual.editableTextFields.find((item) => item.id === fieldId);
    return input.graphicText[visual.key]?.[fieldId] ?? field?.defaultValue ?? "";
  }

  function compactToWidth(text: string, maxWidth: number) {
    let value = String(text || "");
    while (ctx.measureText(value).width > maxWidth && value.length > 1) {
      value = value.slice(0, -1);
    }
    return value;
  }
}

function font(px: number, weight = 800, italic = true) {
  return `${italic ? "italic " : ""}${weight} ${px}px "PingFang SC", "Microsoft YaHei", Arial, sans-serif`;
}

function compactText(text: string, maxLength: number) {
  const clean = String(text || "").replace(/\s+/g, "");
  return clean.length > maxLength ? clean.slice(0, maxLength) : clean;
}

function splitInHalf(text: string) {
  if (text.length <= 2) return [text];
  const mid = Math.ceil(text.length / 2);
  return [text.slice(0, mid), text.slice(mid)];
}
