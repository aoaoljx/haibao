import { describe, expect, it } from "vitest";
import { renderPoster, type PosterImages, type PosterRenderInput } from "./posterRenderer";
import { getVisualByKey } from "@/shared/poster/visualMapping";
import type { GraphicSource, PosterMode } from "@/shared/poster/types";

/**
 * 记录型 canvas context：只记下绘制调用，不真的画。
 *
 * 让渲染逻辑能脱离浏览器直接测——真正要断言的是"画了哪张图、画在哪"，
 * 而不是像素结果。
 */
interface DrawImageCall {
  image: FakeImage;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FakeImage {
  id: string;
  naturalWidth: number;
  naturalHeight: number;
}

function createFakeImage(id: string, width = 1000, height = 800): FakeImage {
  return { id, naturalWidth: width, naturalHeight: height };
}

interface TextDraw {
  text: string;
  fillStyle: unknown;
  x: number;
  y: number;
}

function createRecordingCanvas() {
  const drawImageCalls: DrawImageCall[] = [];
  const filledText: string[] = [];
  const textDraws: TextDraw[] = [];
  const fillStyles: unknown[] = [];
  const gradients: { stops: string[] }[] = [];

  const makeGradient = () => {
    const record = { stops: [] as string[] };
    gradients.push(record);
    return {
      __gradient: true,
      addColorStop: (_offset: number, color: string) => {
        record.stops.push(color);
      }
    };
  };

  const ctx = {
    canvas: { width: 3840, height: 1920 },
    // 记录用
    drawImage: (image: FakeImage, x: number, y: number, w: number, h: number) => {
      drawImageCalls.push({ image, x, y, w, h });
    },
    fillText: (text: string, x: number, y: number) => {
      filledText.push(text);
      textDraws.push({ text, fillStyle: ctx.fillStyle, x, y });
    },
    strokeText: (text: string) => {
      filledText.push(text);
    },
    measureText: (text: string) => ({ width: text.length * 10 }),
    createLinearGradient: () => makeGradient(),
    // 其余调用只需存在
    clearRect: () => {},
    fillRect: () => {
      fillStyles.push(ctx.fillStyle);
    },
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    arc: () => {},
    arcTo: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fill: () => {},
    stroke: () => {},
    font: "",
    fillStyle: "" as unknown,
    strokeStyle: "" as unknown,
    lineWidth: 0,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetY: 0
  };

  const canvas = {
    width: 3840,
    height: 1920,
    getContext: () => ctx
  } as unknown as HTMLCanvasElement;

  return { canvas, drawImageCalls, filledText, textDraws, fillStyles, gradients };
}

const libraryImages: Record<string, FakeImage> = {
  featureBg: createFakeImage("featureBg", 3840, 1920),
  aiBg: createFakeImage("aiBg", 3840, 1920),
  logo: createFakeImage("logo"),
  logoAi: createFakeImage("logoAi", 1495, 200),
  productBadge: createFakeImage("productBadge"),
  aiProductBadge: createFakeImage("aiProductBadge", 584, 198),
  aiHero: createFakeImage("aiHero", 1703, 1308),
  graphic1: createFakeImage("graphic1"),
  graphic2: createFakeImage("graphic2"),
  graphic3: createFakeImage("graphic3"),
  graphic4: createFakeImage("graphic4"),
  graphic5: createFakeImage("graphic5")
};

function buildInput(overrides: Partial<PosterRenderInput> = {}): PosterRenderInput {
  return {
    mode: "feature" as PosterMode,
    copy: {
      titleBlue: "代码在线编辑",
      titleDark: "功能发布",
      subtitle: "",
      notice: "",
      featurePoints: ["代码评论：标签化管理"]
    },
    visualKey: "graphic1",
    graphicSource: "library" as GraphicSource,
    images: libraryImages as unknown as PosterImages,
    aiGeneratedImage: null,
    uploadedImage: null,
    ...overrides
  };
}

/** 取右侧图形那次绘制：它落在 posterBounds 附近，x 明显偏右 */
function findVisualDraw(calls: DrawImageCall[]) {
  return calls.filter((call) => call.x > 1500).at(-1);
}

describe("renderPoster 的图形来源分支", () => {
  it("来源为素材图库时画素材图，并铺满槽位", () => {
    const { canvas, drawImageCalls } = createRecordingCanvas();
    renderPoster(canvas, buildInput({ graphicSource: "library", visualKey: "graphic1" }));

    const box = getVisualByKey("graphic1").posterBounds;
    const draw = findVisualDraw(drawImageCalls);

    expect(draw?.image.id).toBe("graphic1");
    expect(draw).toMatchObject({ x: box.x, y: box.y, w: box.w, h: box.h });
  });

  it("来源为 AI 且已生成时画 AI 图", () => {
    const aiImage = createFakeImage("ai-generated", 1472, 1104);
    const { canvas, drawImageCalls } = createRecordingCanvas();
    renderPoster(
      canvas,
      buildInput({
        graphicSource: "ai",
        aiGeneratedImage: aiImage as unknown as HTMLImageElement
      })
    );

    expect(findVisualDraw(drawImageCalls)?.image.id).toBe("ai-generated");
  });

  it("已生成过 AI 图但切回素材图库时，画的是素材图——这是此前的 bug", () => {
    const aiImage = createFakeImage("ai-generated", 1472, 1104);
    const { canvas, drawImageCalls } = createRecordingCanvas();
    renderPoster(
      canvas,
      buildInput({
        graphicSource: "library",
        aiGeneratedImage: aiImage as unknown as HTMLImageElement
      })
    );

    expect(findVisualDraw(drawImageCalls)?.image.id).toBe("graphic1");
  });

  it("来源为上传时画上传的图", () => {
    const uploaded = createFakeImage("uploaded", 900, 900);
    const { canvas, drawImageCalls } = createRecordingCanvas();
    renderPoster(
      canvas,
      buildInput({
        graphicSource: "upload",
        uploadedImage: uploaded as unknown as HTMLImageElement
      })
    );

    expect(findVisualDraw(drawImageCalls)?.image.id).toBe("uploaded");
  });

  it("选了 AI 但还没生成时按海报类型显示默认图，不开天窗", () => {
    const feature = createRecordingCanvas();
    renderPoster(
      feature.canvas,
      buildInput({ graphicSource: "ai", aiGeneratedImage: null })
    );

    const ai = createRecordingCanvas();
    renderPoster(
      ai.canvas,
      buildInput({
        mode: "ai",
        visualKey: "graphic5",
        graphicSource: "ai",
        aiGeneratedImage: null
      })
    );

    expect(findVisualDraw(feature.drawImageCalls)?.image.id).toBe("graphic1");
    expect(findVisualDraw(ai.drawImageCalls)?.image.id).toBe("aiHero");
  });
});

describe("renderPoster 的外来图片等比绘制", () => {
  it("AI 图按等比放入槽位，不拉伸", () => {
    const aiImage = createFakeImage("ai-generated", 1000, 1000); // 1:1
    const { canvas, drawImageCalls } = createRecordingCanvas();
    renderPoster(
      canvas,
      buildInput({
        graphicSource: "ai",
        visualKey: "graphic1",
        aiGeneratedImage: aiImage as unknown as HTMLImageElement
      })
    );

    const box = getVisualByKey("graphic1").posterBounds;
    const draw = findVisualDraw(drawImageCalls);

    // 槽位约 1.24:1，方图必须保持 1:1 且不超出槽位
    expect(draw!.w / draw!.h).toBeCloseTo(1, 5);
    expect(draw!.w).toBeLessThanOrEqual(box.w);
    expect(draw!.h).toBeLessThanOrEqual(box.h);
    // 居中
    expect(draw!.x + draw!.w / 2).toBeCloseTo(box.x + box.w / 2, 5);
  });

  it("素材图仍铺满槽位（它本来就是按槽位裁好的）", () => {
    const { canvas, drawImageCalls } = createRecordingCanvas();
    renderPoster(canvas, buildInput({ graphicSource: "library", visualKey: "graphic3" }));

    const box = getVisualByKey("graphic3").posterBounds;
    const draw = findVisualDraw(drawImageCalls);
    expect(draw).toMatchObject({ w: box.w, h: box.h });
  });
});

describe("素材图库图形直接渲染", () => {
  it.each(["graphic1", "graphic2", "graphic3", "graphic4", "graphic5"] as const)(
    "%s 只绘制素材本身，不再额外叠加图形文字",
    (visualKey) => {
      const { canvas, filledText } = createRecordingCanvas();
      renderPoster(canvas, buildInput({ graphicSource: "library", visualKey }));

      expect(filledText).not.toContain("iDevflow");
      expect(filledText).not.toContain("测试用例");
    }
  );
});

describe("renderPoster 两种模式都能画出标题", () => {
  it.each(["feature", "ai"] as PosterMode[])("%s 模式画出主标题", (mode) => {
    const { canvas, filledText } = createRecordingCanvas();
    renderPoster(canvas, buildInput({ mode }));

    expect(filledText).toContain("代码在线编辑");
    expect(filledText).toContain("功能发布");
  });
});

describe("AI 版沿用布局并呈现参考图的深蓝科技视觉", () => {
  const withNotice = { notice: "让您专注于业务创造" };

  function render(mode: PosterMode) {
    const recording = createRecordingCanvas();
    renderPoster(
      recording.canvas,
      buildInput({
        mode,
        copy: { ...buildInput().copy, ...withNotice }
      })
    );
    return recording;
  }

  it("AI 主标题使用渐变，普通版仍是纯蓝色", () => {
    const feature = render("feature").textDraws.find((d) => d.text === "代码在线编辑");
    const aiRecording = render("ai");
    const ai = aiRecording.textDraws.find((d) => d.text === "代码在线编辑");

    expect(feature?.fillStyle).toBe("#2180f7");
    expect(ai?.fillStyle).toHaveProperty("__gradient", true);
    expect(aiRecording.gradients.some((g) => g.stops.includes("#52e3dd"))).toBe(true);
  });

  it("强调标题在 AI 版使用白色", () => {
    const feature = render("feature");
    const ai = render("ai");

    expect(feature.textDraws.find((d) => d.text === "功能发布")?.fillStyle).toBe("#0c1f75");
    expect(ai.textDraws.find((d) => d.text === "功能发布")?.fillStyle).toBe("#ffffff");
  });

  it("AI 参考图不绘制功能点列表", () => {
    const feature = render("feature").textDraws.find((d) => d.text.includes("标签化管理"));
    const ai = render("ai").textDraws.find((d) => d.text.includes("标签化管理"));

    expect(feature?.fillStyle).toBe("#324e7b");
    expect(ai).toBeUndefined();
  });

  it("提示语：普通版带心形徽标，AI 版从左侧直接绘制白字", () => {
    const feature = render("feature");
    const ai = render("ai");

    expect(feature.filledText).toContain("♥");
    expect(ai.filledText).not.toContain("♥");
    expect(ai.textDraws.find((d) => d.text === withNotice.notice)).toMatchObject({
      fillStyle: "#ffffff",
      x: 160
    });
  });

  it("参考图不绘制额外英文底部标语", () => {
    const hasTagline = (texts: string[]) => texts.some((t) => t.includes("GLOBAL PERSPECTIVE"));

    expect(hasTagline(render("ai").filledText)).toBe(false);
    expect(hasTagline(render("feature").filledText)).toBe(false);
  });

  it("AI 版使用参考图提供的白色品牌 Logo", () => {
    const featureLogo = render("feature").drawImageCalls.find((c) => c.image.id === "logo");
    const aiLogo = render("ai").drawImageCalls.find((c) => c.image.id === "logoAi");

    expect(featureLogo).toMatchObject({ w: 1495, h: 200 });
    expect(aiLogo).toMatchObject({ w: 1495, h: 200 });
  });

  it("两版使用各自的背景贴图", () => {
    const feature = render("feature");
    const ai = render("ai");

    expect(feature.drawImageCalls.some((c) => c.image.id === "featureBg")).toBe(true);
    expect(ai.drawImageCalls.some((c) => c.image.id === "aiBg")).toBe(true);
    expect(ai.drawImageCalls.some((c) => c.image.id === "featureBg")).toBe(false);
  });

  it("AI 版使用紫色标签，位置仍与普通版一致", () => {
    const feature = render("feature").drawImageCalls.find((c) => c.image.id === "productBadge");
    const ai = render("ai").drawImageCalls.find((c) => c.image.id === "aiProductBadge");

    expect(feature).toMatchObject({ x: 160, y: 470, w: 585, h: 198 });
    expect(ai).toMatchObject({ x: 160, y: 470, w: 585, h: 198 });
  });
});
