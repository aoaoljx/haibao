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
  /** AI 生成的右侧图形，存在时覆盖素材图库中的对应图片 */
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
    // 功能发布海报 - 使用原 logo
    const bg = images.featureBg;
    ctx.drawImage(bg, 0, 0, 3840, 1920);
    ctx.drawImage(images.logo, 154, 135, 1495, 200);
    ctx.drawImage(images.productBadge, 160, 470, 585, 198);
    renderFeature();
  } else {
    // AI 功能发布海报 - 使用新 logo（白色版本）
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
   * 参考 Gammance 风格：深色背景、渐变标题、右侧 3D 图形、底部功能卡片
   */
  function renderAiDark() {
    // 1. 绘制深色渐变背景
    const bgGradient = ctx.createLinearGradient(0, 0, 3840, 1920);
    bgGradient.addColorStop(0, "#0a0e27");
    bgGradient.addColorStop(0.5, "#0f1535");
    bgGradient.addColorStop(1, "#1a1f4e");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 3840, 1920);

    // 2. 绘制科技感粒子效果（装饰）
    drawTechParticles();

    // 3. 绘制 Logo - 新 logo（白色版本）尺寸 660x208，调整位置和大小
    ctx.save();
    const logoWidth = 1000;
    const logoHeight = Math.round((208 / 660) * logoWidth);
    ctx.drawImage(images.logoAi, 154, 100, logoWidth, logoHeight);
    ctx.restore();

    // 4. 绘制标题 - 白色大字 + 蓝紫渐变
    const titleY = 450;
    const titleBlue = val("titleBlue") || "AI 辅助";
    const titleDark = val("titleDark") || "生成测试用例";
    
    // 第一行标题 - 白色
    ctx.font = font(200, 900, false);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(titleBlue, 160, titleY);
    
    // 第二行标题 - 蓝紫渐变
    const gradientY = titleY + 240;
    const gradient = ctx.createLinearGradient(160, gradientY - 150, 160 + ctx.measureText(titleDark).width, gradientY - 150);
    gradient.addColorStop(0, "#7026f4");
    gradient.addColorStop(0.5, "#258bf8");
    gradient.addColorStop(1, "#50c7da");
    ctx.fillStyle = gradient;
    ctx.fillText(titleDark, 160, gradientY);

    // 5. 绘制副标题
    const subtitle = val("subtitle") || "邀您抢先体验";
    ctx.font = font(90, 500, false);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText(subtitle, 160, gradientY + 180);

    // 6. 绘制功能点 - 右侧垂直排列，带图标
    drawFeaturePointsDark(420, 1200);

    // 7. 绘制底部提示语
    const notice = val("notice") || "让您专注于业务创造，而非重复工作";
    if (notice) {
      ctx.font = font(64, 400, false);
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText(notice, 160, 1720);
    }

    // 8. 绘制底部标语
    drawBottomTagline();

    // 9. 绘制右侧图形
    drawVisualDark();
  }

  /** 绘制科技感粒子背景 */
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

  /** 绘制深色风格的功能点列表 */
  function drawFeaturePointsDark(startX: number, maxHeight: number) {
    const rows = copy.featurePoints.map((point) => point.trim()).filter(Boolean);
    if (!rows.length) return;

    const count = rows.length;
    const startY = 420;
    const lineGap = Math.min(200, Math.floor(maxHeight / Math.max(count, 1)));
    const iconSize = 80;
    const textSize = 72;

    let y = startY;
    for (const row of rows) {
      const [label, ...rest] = row.split(/[:：]/);
      const text = rest.join("：");

      ctx.beginPath();
      ctx.arc(startX + 40, y + 40, iconSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(112, 38, 244, 0.6)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(startX + 40, y + 40, iconSize / 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(37, 139, 248, 0.4)";
      ctx.fill();

      ctx.font = font(textSize, 700, false);
      ctx.fillStyle = "#ffffff";
      const prefix = text ? `${label}：` : row;
      ctx.fillText(prefix, startX + 120, y + 60);

      if (text) {
        const lw = ctx.measureText(prefix).width;
        ctx.font = font(textSize * 0.85, 400, false);
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        fitTextDark(text, startX + 120 + lw + 20, y + 55, 1400 - lw, textSize * 0.85);
      }

      y += lineGap;
    }
  }

  function fitTextDark(text: string, x: number, y: number, maxWidth: number, px: number) {
    let value = text;
    ctx.font = font(px, 400, false);
    while (ctx.measureText(value).width > maxWidth && value.length > 3) {
      value = value.slice(0, -2);
    }
    ctx.fillText(value.length < text.length ? `${value}…` : value, x, y);
  }

  /** 绘制底部标语 */
  function drawBottomTagline() {
    ctx.font = font(48, 600, false);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText("GLOBAL PERSPECTIVE.  SMART TECHNOLOGY.  CLEAR ADVANTAGE.", 160, 1820);
  }

  /** 绘制深色风格的右侧图形 */
  function drawVisualDark() {
    const visual = getVisualByKey(input.visualKey);
    const aiImg = input.aiGeneratedImage;

    const darkBox = {
      x: 2100,
      y: 400,
      w: 1500,
      h: 1200
    };

    if (aiImg) {
      ctx.save();
      ctx.shadowColor = "rgba(112, 38, 244, 0.5)";
      ctx.shadowBlur = 60;
      ctx.drawImage(aiImg, darkBox.x, darkBox.y, darkBox.w, darkBox.h);
      ctx.restore();
      return;
    }

    const img = images[visual.key];
    ctx.save();
    ctx.shadowColor = "rgba(37, 139, 248, 0.4)";
    ctx.shadowBlur = 50;
    ctx.drawImage(img, darkBox.x, darkBox.y, darkBox.w, darkBox.h);
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
    text: string,
    x: number,
    baseline: number,
    size: number,
    maxWidth: number,
    italic: boolean,
    align: CanvasTextAlign = "left"
  ) {
    drawPlainGraphicText(text, x, baseline, size, maxWidth, "#ffffff", true, align, italic, {
      shadowColor: "rgba(0, 40, 120, 0.45)",
      shadowBlur: Math.max(5, size * 0.08),
      shadowOffsetY: Math.max(4, size * 0.08)
    });
  }

  function drawPlainGraphicText(
    text: string,
    x: number,
    baseline: number,
    size: number,
    maxWidth: number,
    color: string,
    bold = true,
    align: CanvasTextAlign = "left",
    italic = false,
    shadow: {
      shadowColor: string;
      shadowBlur: number;
      shadowOffsetY: number;
    } | null = null
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
    text: string,
    x: number,
    centerY: number,
    size: number,
    maxWidth: number,
    color = "#ffffff",
    stroke = "rgba(48, 101, 220, 0.55)"
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
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill?: string | CanvasGradient,
    stroke?: string,
    line = 1
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = line;
      ctx.stroke();
    }
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
