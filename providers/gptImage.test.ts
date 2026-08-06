import { describe, expect, it } from "vitest";
import { GPT_IMAGE_PROVIDER, mapToGptImageSize } from "./gptImage";
import { pickClosestSize } from "./shared";
import { deriveRequestSize } from "../src/shared/poster/geometry";
import { visualMapping } from "../src/shared/poster/visualMapping";

function ratioOf(size: string, separator = "x") {
  const [w, h] = size.split(separator).map(Number);
  return w / h;
}

describe("pickClosestSize", () => {
  const sizes = ["1024x1024", "1536x1024", "1024x1536"];

  it("挑比例最接近的受支持尺寸", () => {
    expect(pickClosestSize("2000x2000", sizes)).toBe("1024x1024");
    expect(pickClosestSize("1920x1080", sizes)).toBe("1536x1024");
    expect(pickClosestSize("1080x1920", sizes)).toBe("1024x1536");
  });

  it("非法输入退回第一个受支持尺寸而不是崩溃", () => {
    expect(pickClosestSize("abc", sizes)).toBe("1024x1024");
    expect(pickClosestSize("0x0", sizes)).toBe("1024x1024");
    expect(pickClosestSize("", sizes)).toBe("1024x1024");
  });

  it("支持不同分隔符——千问用全角 ×", () => {
    const qwenSizes = ["1664×1664", "1472×1104", "1920×1080"];
    expect(pickClosestSize("1920x1080", qwenSizes, "×")).toBe("1920×1080");
    expect(pickClosestSize("1024x1024", qwenSizes, "×")).toBe("1664×1664");
  });

  it("跳过格式非法的候选项", () => {
    expect(pickClosestSize("1920x1080", ["bad", "1536x1024"])).toBe("1536x1024");
  });
});

describe("mapToGptImageSize", () => {
  it("每个海报槽位都能映射到受支持尺寸", () => {
    for (const visual of visualMapping.visuals) {
      const mapped = mapToGptImageSize(deriveRequestSize(visual.posterBounds));
      expect(["1024x1024", "1536x1024", "1024x1536"]).toContain(mapped);
    }
  });

  it("永远选中候选里比例最接近的那个", () => {
    // 这才是这个函数的契约。至于最接近的够不够接近，取决于模型给了几种尺寸。
    const supported = ["1024x1024", "1536x1024", "1024x1536"];

    for (const visual of visualMapping.visuals) {
      const requested = deriveRequestSize(visual.posterBounds);
      const chosen = mapToGptImageSize(requested);

      const errorOf = (size: string) => Math.abs(ratioOf(size) - ratioOf(requested));
      const bestPossible = Math.min(...supported.map(errorOf));

      expect(errorOf(chosen)).toBeCloseTo(bestPossible, 10);
    }
  });

  it("竖直槽位会映射到竖图", () => {
    // 当前海报槽位都是横的，但这个函数不该假设这一点
    expect(ratioOf(mapToGptImageSize("1000x2000"))).toBeLessThan(1);
  });

  /**
   * 已知限制：gpt-image 只有 3 种尺寸（1:1、1.5:1、0.67:1），
   * 比千问的 5 种不同比例还少。
   *
   * graphic1 / graphic2 的槽位约 1.24:1，最接近的候选是 1:1，误差约 24%；
   * 千问能选到 1.333:1，误差仅约 9%。也就是说**这一项上千问反而更贴合**。
   *
   * 误差不会造成变形——渲染层的 fitContain 会把它吸收成透明留白，
   * 但图形在槽位里会显得偏小。选模型时要把这点算进去。
   */
  it("记录 gpt-image 在窄幅槽位上的比例损失", () => {
    const narrow = visualMapping.visuals.find((v) => v.key === "graphic1");
    const slotRatio = narrow!.posterBounds.w / narrow!.posterBounds.h;
    const mapped = ratioOf(mapToGptImageSize(deriveRequestSize(narrow!.posterBounds)));

    expect(slotRatio).toBeCloseTo(1.24, 1);
    expect(mapped).toBe(1); // 落到方图
    expect(Math.abs(mapped / slotRatio - 1)).toBeGreaterThan(0.15);
  });
});

describe("GPT_IMAGE_PROVIDER 定义", () => {
  it("声明原生支持透明底——适配器确实传了 background=transparent", () => {
    // 这条声明决定了生成后跳过客户端去背，写错会导致海报上出现色块
    expect(GPT_IMAGE_PROVIDER.supportsTransparentBackground).toBe(true);
  });

  it("有默认模型，运营不填也能用", () => {
    expect(GPT_IMAGE_PROVIDER.defaultModel).toBeTruthy();
  });
});
