import { describe, expect, it } from "vitest";
import { mapToQwenSize } from "./qwen";
import { deriveRequestSize } from "../src/shared/poster/geometry";
import { visualMapping } from "../src/shared/poster/visualMapping";

function ratioOf(size: string, separator: string) {
  const [w, h] = size.split(separator).map(Number);
  return w / h;
}

describe("mapToQwenSize", () => {
  it("挑选比例最接近的受支持尺寸", () => {
    expect(mapToQwenSize("1920x1080")).toBe("1920×1080");
    expect(mapToQwenSize("1024x1024")).toBe("1664×1664");
    expect(mapToQwenSize("1080x1920")).toBe("1080×1920");
  });

  it("非法输入退回默认尺寸而不是崩溃", () => {
    expect(mapToQwenSize("abc")).toBe("1664×1664");
    expect(mapToQwenSize("0x0")).toBe("1664×1664");
  });

  it("端到端：槽位比例经过派生与映射后，误差显著小于旧的固定 1:1", () => {
    for (const visual of visualMapping.visuals) {
      const bounds = visual.posterBounds;
      const slotRatio = bounds.w / bounds.h;

      const mapped = mapToQwenSize(deriveRequestSize(bounds));
      const newError = Math.abs(ratioOf(mapped, "×") / slotRatio - 1);

      // 旧实现固定请求 1536x1536，映射后是 1664×1664（1:1）
      const oldError = Math.abs(1 / slotRatio - 1);

      expect(newError).toBeLessThan(oldError);
    }
  });

  it("残余比例误差由 fitContain 吸收，因此只需保证不再是整幅方图", () => {
    // 槽位普遍在 1.24:1~1.55:1，映射结果不应再落到 1:1
    for (const visual of visualMapping.visuals) {
      const mapped = mapToQwenSize(deriveRequestSize(visual.posterBounds));
      expect(ratioOf(mapped, "×")).not.toBeCloseTo(1, 2);
    }
  });
});
