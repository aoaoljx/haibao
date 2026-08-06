import { describe, expect, it } from "vitest";
import { renderPoster, type PosterImages, type PosterRenderInput } from "./posterRenderer";
import { createDefaultGraphicTextState } from "@/shared/poster/defaults";
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
  logo: createFakeImage("logo"),
  logoAi: createFakeImage("logoAi", 660, 208),
  productBadge: createFakeImage("productBadge"),
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
    graphicText: createDefaultGraphicTextState(),
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

  it("选了 AI 但还没生成时回落到素材图，不开天窗", () => {
    const { canvas, drawImageCalls } = createRecordingCanvas();
    renderPoster(canvas, buildInput({ graphicSource: "ai", aiGeneratedImage: null }));

    expect(findVisualDraw(drawImageCalls)?.image.id).toBe("graphic1");
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

describe("renderPoster 的图形文字叠加", () => {
  it("素材图上叠加图形文字", () => {
    const { canvas, filledText } = createRecordingCanvas();
    renderPoster(canvas, buildInput({ graphicSource: "library", visualKey: "graphic1" }));

    expect(filledText).toContain("iDevflow");
    expect(filledText).toContain("提交");
  });

  it("运营改过的文字生效——此前面板改了画布没反应", () => {
    const graphicText = createDefaultGraphicTextState();
    graphicText.graphic1 = { ...graphicText.graphic1, brand: "效能平台", action: "发布" };

    const { canvas, filledText } = createRecordingCanvas();
    renderPoster(canvas, buildInput({ graphicSource: "library", graphicText }));

    expect(filledText).toContain("效能平台");
    expect(filledText).toContain("发布");
    expect(filledText).not.toContain("iDevflow");
  });

  it("AI 图上不叠加图形文字——槽位坐标是按素材图标定的", () => {
    const aiImage = createFakeImage("ai-generated", 1472, 1104);
    const { canvas, filledText } = createRecordingCanvas();
    renderPoster(
      canvas,
      buildInput({
        graphicSource: "ai",
        aiGeneratedImage: aiImage as unknown as HTMLImageElement
      })
    );

    expect(filledText).not.toContain("iDevflow");
  });

  it("AI 模式下素材图同样叠加图形文字——此前深色海报完全不画", () => {
    const { canvas, filledText } = createRecordingCanvas();
    renderPoster(
      canvas,
      buildInput({ mode: "ai", graphicSource: "library", visualKey: "graphic5" })
    );

    expect(filledText).toContain("测试用例");
  });
});

describe("每张素材图的文字槽位都真的被画出来", () => {
  // 回归：graphic1/graphic2 的 brand 槽位用了 embossedWhiteItalic，
  // 而渲染器没有对应分支，品牌文字一直静默丢失。
  it.each(["graphic1", "graphic2", "graphic3", "graphic4", "graphic5"] as const)(
    "%s 的每个槽位文字都出现在画布上",
    (visualKey) => {
      const { canvas, filledText } = createRecordingCanvas();
      renderPoster(canvas, buildInput({ graphicSource: "library", visualKey }));

      const visual = getVisualByKey(visualKey);
      for (const slot of visual.renderSlots) {
        const field = visual.editableTextFields.find((item) => item.id === slot.fieldId);
        const expected = field?.defaultValue ?? "";
        if (!expected) continue;

        // stacked 样式会把文字拆成两行绘制，逐字符核对更稳
        const joined = filledText.join("");
        for (const char of expected.replace(/\s/g, "")) {
          expect(joined, `${visualKey}/${slot.fieldId} 的「${expected}」未画出`).toContain(char);
        }
      }
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

/**
 * 深浅两版此前是两套复制的绘制函数，现在由 theme 驱动同一套代码。
 * 这组用例锁住"合并没有把两版拉平"——差异必须还在。
 */
describe("theme 合并后两版海报的差异仍然保留", () => {
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

  it("主标题配色两版不同", () => {
    const feature = render("feature").textDraws.find((d) => d.text === "代码在线编辑");
    const ai = render("ai").textDraws.find((d) => d.text === "代码在线编辑");

    expect(feature?.fillStyle).toBe("#2180f7");
    expect(ai?.fillStyle).toBe("#ffffff");
  });

  it("强调标题：浅色版纯色，深色版渐变", () => {
    const feature = render("feature");
    const ai = render("ai");

    expect(feature.textDraws.find((d) => d.text === "功能发布")?.fillStyle).toBe("#0c1f75");
    // 深色版用渐变对象填充，且色标就是主题里那三个
    expect(ai.textDraws.find((d) => d.text === "功能发布")?.fillStyle).toHaveProperty(
      "__gradient",
      true
    );
    expect(ai.gradients.some((g) => g.stops.includes("#7026f4"))).toBe(true);
  });

  it("功能点描述配色两版不同", () => {
    const feature = render("feature").textDraws.find((d) => d.text.includes("标签化管理"));
    const ai = render("ai").textDraws.find((d) => d.text.includes("标签化管理"));

    expect(feature?.fillStyle).toBe("#324e7b");
    expect(ai?.fillStyle).toBe("rgba(255, 255, 255, 0.7)");
  });

  it("提示语：浅色版带心形徽标，深色版只有文字", () => {
    expect(render("feature").filledText).toContain("♥");
    expect(render("ai").filledText).not.toContain("♥");
  });

  it("底部标语只在深色版出现", () => {
    const hasTagline = (texts: string[]) => texts.some((t) => t.includes("GLOBAL PERSPECTIVE"));

    expect(hasTagline(render("ai").filledText)).toBe(true);
    expect(hasTagline(render("feature").filledText)).toBe(false);
  });

  it("Logo 两版用不同素材，深色版保持原始比例", () => {
    const featureLogo = render("feature").drawImageCalls.find((c) => c.image.id === "logo");
    const aiLogo = render("ai").drawImageCalls.find((c) => c.image.id === "logoAi");

    expect(featureLogo).toMatchObject({ w: 1495, h: 200 });
    // logoAi 原始 660x208，高度对齐到 200 后宽度应约 635，而不是被拉成 1495
    expect(aiLogo?.h).toBe(200);
    expect(aiLogo?.w).toBeCloseTo(Math.round(660 * (200 / 208)), 0);
  });

  it("背景：浅色版贴图，深色版渐变", () => {
    const feature = render("feature");
    const ai = render("ai");

    expect(feature.drawImageCalls.some((c) => c.image.id === "featureBg")).toBe(true);
    expect(ai.drawImageCalls.some((c) => c.image.id === "featureBg")).toBe(false);
    expect(ai.gradients.some((g) => g.stops.includes("#0a0e27"))).toBe(true);
  });

  it("两版的产品标签位置一致——布局本就该共用", () => {
    const pick = (mode: PosterMode) =>
      render(mode).drawImageCalls.find((c) => c.image.id === "productBadge");

    expect(pick("feature")).toMatchObject({ x: 160, y: 470, w: 585, h: 198 });
    expect(pick("ai")).toMatchObject({ x: 160, y: 470, w: 585, h: 198 });
  });
});
