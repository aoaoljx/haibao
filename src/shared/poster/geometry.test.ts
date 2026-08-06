import { describe, expect, it } from "vitest";
import { deriveRequestSize, fitContain } from "./geometry";
import { visualMapping } from "./visualMapping";
import type { VisualBounds } from "./types";

function ratio({ w, h }: { w: number; h: number }) {
  return w / h;
}

function parseSize(size: string): VisualBounds {
  const [w, h] = size.split("x").map(Number);
  return { x: 0, y: 0, w, h };
}

describe("fitContain", () => {
  const box: VisualBounds = { x: 100, y: 200, w: 1000, h: 500 };

  it("宽图受宽度限制，上下留白且居中", () => {
    const fitted = fitContain(2000, 500, box);
    expect(fitted).toEqual({ x: 100, y: 325, w: 1000, h: 250 });
  });

  it("高图受高度限制，左右留白且居中", () => {
    const fitted = fitContain(500, 2000, box);
    expect(fitted).toEqual({ x: 537.5, y: 200, w: 125, h: 500 });
  });

  it("绝不改变原图宽高比", () => {
    for (const [w, h] of [[1664, 1664], [1472, 1104], [1920, 1080], [1080, 1920]]) {
      const fitted = fitContain(w, h, box);
      expect(ratio(fitted)).toBeCloseTo(w / h, 6);
    }
  });

  it("永远不超出槽位", () => {
    for (const [w, h] of [[4000, 100], [100, 4000], [1, 1]]) {
      const fitted = fitContain(w, h, box);
      expect(fitted.w).toBeLessThanOrEqual(box.w + 1e-9);
      expect(fitted.h).toBeLessThanOrEqual(box.h + 1e-9);
      expect(fitted.x).toBeGreaterThanOrEqual(box.x - 1e-9);
      expect(fitted.y).toBeGreaterThanOrEqual(box.y - 1e-9);
    }
  });

  it("尺寸不可用时退回填满槽位，不把图丢掉", () => {
    // 图片还没 decode 时 naturalWidth 是 0
    expect(fitContain(0, 0, box)).toEqual(box);
    expect(fitContain(Number.NaN, 100, box)).toEqual(box);
  });
});

describe("deriveRequestSize", () => {
  it("请求比例贴近槽位比例", () => {
    for (const visual of visualMapping.visuals) {
      const bounds = visual.posterBounds;
      const requested = parseSize(deriveRequestSize(bounds));
      // 对齐到 64 的倍数会带来少量偏差，控制在 5% 内
      expect(Math.abs(ratio(requested) / ratio(bounds) - 1)).toBeLessThan(0.05);
    }
  });

  it("边长对齐到 64 的倍数", () => {
    for (const visual of visualMapping.visuals) {
      const { w, h } = parseSize(deriveRequestSize(visual.posterBounds));
      expect(w % 64).toBe(0);
      expect(h % 64).toBe(0);
    }
  });

  it("总像素规模受控，不会请求超大图", () => {
    for (const visual of visualMapping.visuals) {
      const { w, h } = parseSize(deriveRequestSize(visual.posterBounds));
      expect(w * h).toBeLessThan(1536 * 1536 * 1.15);
      expect(w * h).toBeGreaterThan(1536 * 1536 * 0.85);
    }
  });

  it("退化输入不产生 0 或负数边长", () => {
    const { w, h } = parseSize(deriveRequestSize({ x: 0, y: 0, w: 0, h: 0 }));
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
  });

  it("修正了此前硬编码 1:1 造成的比例错配", () => {
    // graphic1 槽位约 1.24:1，旧实现固定请求 1536x1536
    const bounds = visualMapping.visuals[0].posterBounds;
    const requested = parseSize(deriveRequestSize(bounds));
    const oldMismatch = Math.abs(1 / ratio(bounds) - 1);
    const newMismatch = Math.abs(ratio(requested) / ratio(bounds) - 1);
    expect(newMismatch).toBeLessThan(oldMismatch);
  });
});
