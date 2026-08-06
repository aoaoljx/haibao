import { fitContain } from "@/shared/poster/geometry";
import { graphicTextValue } from "@/shared/poster/graphicText";
import { getVisualByKey } from "@/shared/poster/visualMapping";
import type {
  GraphicSource,
  PosterCopy,
  PosterMode,
  VisualAsset,
  VisualKey,
  VisualTextRenderSlot,
  VisualTextValueMap
} from "@/shared/poster/types";

export type PosterImages = {
  featureBg: HTMLImageElement;
  logo: HTMLImageElement;
  logoAi: HTMLImageElement;
  productBadge: HTMLImageElement;
} & Record<VisualKey, HTMLImageElement>;

export interface PosterRenderInput {
  aiGeneratedImage?: HTMLImageElement | null;
  /** 运营上传的图片，graphicSource 为 upload 时使用 */
  uploadedImage?: HTMLImageElement | null;
  /** 右侧图形取自哪里。渲染必须跟着它走，否则界面选择与画布不一致 */
  graphicSource: GraphicSource;
  mode: PosterMode;
  copy: PosterCopy;
  visualKey: VisualKey;
  graphicText: Record<VisualKey, VisualTextValueMap>;
  images: PosterImages;
}

/**
 * 决定右侧图形用哪张图。
 *
 * 只有素材图库的图能叠加图形文字——文字槽位坐标是按这几张固定素材标定的，
 * 套到 AI 出图或用户上传的图上只会错位。
 */
interface ResolvedVisualSource {
  image: HTMLImageElement;
  /** 是否为素材库资源（决定能否叠加图形文字，以及是否等比缩放） */
  isLibraryAsset: boolean;
}

/**
 * 两版海报的全部差异。
 *
 * 布局、坐标、字号完全一致，只有配色、Logo、背景和少量装饰不同。
 * 此前是两套复制的绘制函数（drawFeaturePoints / drawFeaturePointsDark 等），
 * 改一处必须记得改另一处——git 上连续几个 commit 都在追这类不同步。
 */
interface PosterTheme {
  /** 背景：贴图或渐变 */
  background: { kind: "image"; asset: "featureBg" } | { kind: "gradient"; stops: string[] };
  /** 左上角 Logo。fixed 沿用既有固定尺寸；aspect 按原始比例对齐高度 */
  logo:
    | { asset: "logo"; fit: "fixed"; width: number; height: number }
    | { asset: "logoAi"; fit: "aspect"; height: number; fallbackWidth: number; fallbackHeight: number };
  titlePrimary: string;
  /** 强调标题的填充。渐变按文字实际宽度现场构造 */
  titleAccent: { kind: "solid"; color: string } | { kind: "gradient"; stops: string[] };
  subtitleColor: string;
  /** 副标题起始 x。feature 版对特定标题有历史微调，保留原行为 */
  subtitleX: (primaryTitle: string) => number;
  featurePoint: { bullet: string; label: string; description: string };
  notice: { style: "badge"; color: string } | { style: "plain"; color: string };
  /** 深色版专属装饰 */
  decorations: { particles: boolean; tagline: boolean };
  visualShadow: { color: string; blur: number } | null;
}

const POSTER_THEMES: Record<PosterMode, PosterTheme> = {
  feature: {
    background: { kind: "image", asset: "featureBg" },
    logo: { asset: "logo", fit: "fixed", width: 1495, height: 200 },
    titlePrimary: "#2180f7",
    titleAccent: { kind: "solid", color: "#0c1f75" },
    subtitleColor: "#0c1f75",
    // 「统一…」开头的标题会被前面的图形压住，历史上单独右移过，保留
    subtitleX: (primaryTitle) => (primaryTitle.includes("统一") ? 430 : 160),
    featurePoint: { bullet: "#3a5684", label: "#324e7b", description: "#324e7b" },
    notice: { style: "badge", color: "#34527f" },
    decorations: { particles: false, tagline: false },
    visualShadow: null
  },
  ai: {
    background: { kind: "gradient", stops: ["#0a0e27", "#0f1535", "#1a1f4e"] },
    logo: { asset: "logoAi", fit: "aspect", height: 200, fallbackWidth: 660, fallbackHeight: 208 },
    titlePrimary: "#ffffff",
    titleAccent: { kind: "gradient", stops: ["#7026f4", "#258bf8", "#50c7da"] },
    subtitleColor: "rgba(255, 255, 255, 0.85)",
    subtitleX: () => 160,
    featurePoint: {
      bullet: "rgba(112, 38, 244, 0.8)",
      label: "#ffffff",
      description: "rgba(255, 255, 255, 0.7)"
    },
    notice: { style: "plain", color: "rgba(255, 255, 255, 0.6)" },
    decorations: { particles: true, tagline: true },
    visualShadow: { color: "rgba(112, 38, 244, 0.5)", blur: 60 }
  }
};


export function renderPoster(canvas: HTMLCanvasElement, input: PosterRenderInput) {
  const maybeContext = canvas.getContext("2d");
  if (!maybeContext) return;
  const ctx: CanvasRenderingContext2D = maybeContext;

  const { copy, images, mode } = input;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const theme = POSTER_THEMES[mode];
  renderWithTheme();

  /**
   * 两版海报共用同一套布局与坐标，只有 theme 里声明的那些差异不同。
   * 绘制顺序即图层顺序，不要随意调整。
   */
  function renderWithTheme() {
    drawBackground();
    if (theme.decorations.particles) drawTechParticles();
    drawLogo();
    ctx.drawImage(images.productBadge, 160, 470, 585, 198);
    drawTitles();
    drawSubtitle();
    drawFeaturePoints(1180, 430);
    if (val("notice")) drawNotice();
    if (theme.decorations.tagline) drawBottomTagline();
    drawVisualInto(theme.visualShadow);
  }

  function drawBackground() {
    if (theme.background.kind === "image") {
      ctx.drawImage(images[theme.background.asset], 0, 0, 3840, 1920);
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, 3840, 1920);
    const { stops } = theme.background;
    stops.forEach((color, index) => {
      gradient.addColorStop(index / Math.max(1, stops.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 3840, 1920);
  }

  function drawLogo() {
    const logo = theme.logo;

    if (logo.fit === "fixed") {
      ctx.drawImage(images[logo.asset], 154, 135, logo.width, logo.height);
      return;
    }

    // 按原始比例对齐高度，避免拉伸变形
    const naturalW = images[logo.asset].naturalWidth || logo.fallbackWidth;
    const naturalH = images[logo.asset].naturalHeight || logo.fallbackHeight;
    const width = Math.round(naturalW * (logo.height / naturalH));
    ctx.drawImage(images[logo.asset], 154, 135, width, logo.height);
  }

  function drawTitles() {
    const primary = val("titleBlue") || "功能主标题";
    const accent = val("titleDark");

    ctx.font = font(accent ? 174 : 184, 800, true);
    ctx.fillStyle = theme.titlePrimary;
    ctx.fillText(primary, 160, 930);

    if (!accent) return;

    const accentX = 160 + ctx.measureText(primary).width + 45;
    ctx.fillStyle = resolveAccentFill(accentX, ctx.measureText(accent).width);
    ctx.fillText(accent, accentX, 930);
  }

  function resolveAccentFill(x: number, width: number): string | CanvasGradient {
    if (theme.titleAccent.kind === "solid") return theme.titleAccent.color;

    const gradient = ctx.createLinearGradient(x, 930 - 140, x + width, 930 - 140);
    const { stops } = theme.titleAccent;
    stops.forEach((color, index) => {
      gradient.addColorStop(index / Math.max(1, stops.length - 1), color);
    });
    return gradient;
  }

  function drawSubtitle() {
    const subtitle = val("subtitle");
    if (!subtitle) return;

    ctx.font = font(130, 800, true);
    ctx.fillStyle = theme.subtitleColor;
    ctx.fillText(subtitle, theme.subtitleX(val("titleBlue") || "功能主标题"), 1285);
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

  function drawBottomTagline() {
    ctx.font = font(42, 600, false);
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText("GLOBAL PERSPECTIVE.  SMART TECHNOLOGY.  CLEAR ADVANTAGE.", 160, 1820);
  }

  /**
   * 右侧图形 - 与功能发布海报相同位置
   */
  /**
   * 解析当前该画哪张图。
   *
   * 选中的来源没有可用图片时回落到素材库——运营刚切到「AI 自动生成」还没点生成、
   * 或切到「上传图片」还没选文件时，右侧仍然有东西可看，而不是开天窗。
   */
  function resolveVisualSource(): ResolvedVisualSource {
    const visual = getVisualByKey(input.visualKey);

    if (input.graphicSource === "ai" && input.aiGeneratedImage) {
      return { image: input.aiGeneratedImage, isLibraryAsset: false };
    }

    if (input.graphicSource === "upload" && input.uploadedImage) {
      return { image: input.uploadedImage, isLibraryAsset: false };
    }

    return { image: images[visual.key], isLibraryAsset: true };
  }

  /**
   * 右侧图形的统一绘制入口。深浅两版海报共用，只有阴影不同——
   * 此前是两份复制的实现，改一处必须记得改另一处。
   */
  function drawVisualInto(shadow: { color: string; blur: number } | null) {
    const visual = getVisualByKey(input.visualKey);
    const box = visual.posterBounds;
    const { image, isLibraryAsset } = resolveVisualSource();

    ctx.save();
    if (shadow) {
      ctx.shadowColor = shadow.color;
      ctx.shadowBlur = shadow.blur;
    }

    if (isLibraryAsset) {
      // 素材库资源就是按槽位裁好的，直接铺满
      ctx.drawImage(image, box.x, box.y, box.w, box.h);
    } else {
      // 外来图片比例不可控，等比放入并居中，绝不拉伸
      const fitted = fitContain(image.naturalWidth, image.naturalHeight, box);
      ctx.drawImage(image, fitted.x, fitted.y, fitted.w, fitted.h);
    }
    ctx.restore();

    // 文字槽位是按素材库图片标定的，只有用素材库图时才叠加
    if (isLibraryAsset) {
      drawGraphicText(visual, image);
    }
  }

  /**
   * 功能点列表。行数越多字号和行距自动收紧，宁可缩小也不裁掉。
   * 配色来自 theme——深浅两版此前是两份复制的实现。
   */
  function drawFeaturePoints(startY: number, maxHeight: number) {
    const rows = copy.featurePoints.map((point) => point.trim()).filter(Boolean);
    if (!rows.length) return;

    const count = rows.length;
    const textSize = Math.max(
      46,
      Math.min(70, Math.floor(((maxHeight - Math.max(0, count - 1) * 28) / count) * 0.58))
    );
    const lineGap = Math.max(96, Math.min(178, Math.floor(maxHeight / count)));
    const colors = theme.featurePoint;
    let y = startY + textSize;

    for (const row of rows) {
      const [label, ...rest] = row.split(/[:：]/);
      const text = rest.join("：");

      ctx.fillStyle = colors.bullet;
      ctx.beginPath();
      ctx.arc(168, y - textSize * 0.38, Math.max(8, textSize * 0.16), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.label;
      ctx.font = font(textSize, 800, false);
      const prefix = text ? `${label}：` : row;
      ctx.fillText(prefix, 218, y);

      if (text) {
        const lw = ctx.measureText(prefix).width;
        ctx.font = font(textSize, 500, false);
        ctx.fillStyle = colors.description;
        fitText(text, 218 + lw + 18, y, 1760 - lw, textSize);
      }

      y += lineGap;
    }
  }

  /** 超宽时截断并补省略号 */
  function fitText(text: string, x: number, y: number, maxWidth: number, px: number) {
    let value = text;
    ctx.font = font(px, 500, false);
    while (ctx.measureText(value).width > maxWidth && value.length > 3) {
      value = value.slice(0, -2);
    }
    ctx.fillText(value.length < text.length ? `${value}…` : value, x, y);
  }

  function drawNotice() {
    if (theme.notice.style === "badge") {
      roundRect(168, 1660, 87, 88, 28, "#ffc600");
      ctx.fillStyle = "#fff";
      ctx.font = font(48, 800, false);
      ctx.fillText("♥", 205, 1724);
    }

    ctx.fillStyle = theme.notice.color;
    ctx.font = font(72, 800, false);
    ctx.fillText(val("notice"), 320, 1725);
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
      const text = graphicTextValue(visual, input.graphicText[visual.key], slot.fieldId);
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

    switch (slot.styleToken) {
      case "embossedWhite":
        drawEmbossedWhiteText(text, x, y, size, maxWidth, false, slot.align);
        return;
      case "embossedWhiteItalic":
        drawEmbossedWhiteText(text, x, y, size, maxWidth, true, slot.align);
        return;
      case "stackedWhite":
        drawStackedGraphicText(text, x, y, size, maxWidth);
        return;
      case "stackedLightBlue":
        drawStackedGraphicText(text, x, y, size, maxWidth, "#f6fbff", "#4b85fb");
        return;
      case "plainWhite":
        drawPlainGraphicText(text, x, y, size, maxWidth, "#ffffff", true, slot.align);
        return;
      case "plainBlueItalic":
        drawPlainGraphicText(text, x, y, size, maxWidth, "#3c79c8", true, slot.align, true);
        return;
      case "plainBlue": {
        const isCoderTitle = visual.key === "graphic4" && slot.fieldId === "coder";
        const color = slot.fieldId === "status" ? "#4d88f7" : "#3474c2";
        drawPlainGraphicText(
          text, x, y, size, maxWidth, color, !isCoderTitle, slot.align, isCoderTitle
        );
        return;
      }
      default:
        // 数据里新增了样式但忘了加分支时，此前会静默不画
        // （embossedWhiteItalic 就这样让 graphic1/graphic2 的品牌文字一直没出来）。
        // 宁可用默认样式画出来，也不要让运营看不见自己填的字。
        drawPlainGraphicText(text, x, y, size, maxWidth, "#ffffff", true, slot.align);
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
