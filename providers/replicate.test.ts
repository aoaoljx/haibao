import { describe, expect, it } from "vitest";
import { REPLICATE_PROVIDER, mapToReplicateAspectRatio } from "./replicate";
import { mapToGptImageSize } from "./gptImage";
import { deriveRequestSize } from "../src/shared/poster/geometry";
import { visualMapping } from "../src/shared/poster/visualMapping";

function ratioOf(value: string, separator: string) {
  const [w, h] = value.split(separator).map(Number);
  return w / h;
}

describe("mapToReplicateAspectRatio", () => {
  it("输出 Replicate 接受的比例字符串格式", () => {
    for (const visual of visualMapping.visuals) {
      const ratio = mapToReplicateAspectRatio(deriveRequestSize(visual.posterBounds));
      expect(ratio).toMatch(/^\d+:\d+$/);
    }
  });

  it("挑最接近的比例", () => {
    expect(mapToReplicateAspectRatio("1000x1000")).toBe("1:1");
    expect(mapToReplicateAspectRatio("1920x1080")).toBe("16:9");
    expect(mapToReplicateAspectRatio("1080x1920")).toBe("9:16");
  });

  it("横向槽位不会被映射成竖图", () => {
    for (const visual of visualMapping.visuals) {
      const bounds = visual.posterBounds;
      expect(bounds.w / bounds.h).toBeGreaterThan(1);
      expect(ratioOf(mapToReplicateAspectRatio(deriveRequestSize(bounds)), ":")).toBeGreaterThan(1);
    }
  });

  it("非法输入退回第一个候选而不是崩溃", () => {
    expect(mapToReplicateAspectRatio("abc")).toBe("1:1");
    expect(mapToReplicateAspectRatio("0x0")).toBe("1:1");
  });

  /**
   * Replicate 的比例档位（9 种）比 gpt-image（3 种）细得多，
   * 对海报这些窄幅槽位贴合度明显更好。这是选它扩面的实际收益之一。
   */
  it("在海报槽位上比 gpt-image 更贴合", () => {
    for (const visual of visualMapping.visuals) {
      const bounds = visual.posterBounds;
      const slotRatio = bounds.w / bounds.h;
      const requested = deriveRequestSize(bounds);

      const replicateError = Math.abs(
        ratioOf(mapToReplicateAspectRatio(requested), ":") / slotRatio - 1
      );
      const gptError = Math.abs(ratioOf(mapToGptImageSize(requested), "x") / slotRatio - 1);

      expect(replicateError, `${visual.key}`).toBeLessThanOrEqual(gptError);
    }
  });
});

describe("REPLICATE_PROVIDER 定义", () => {
  it("声明不支持透明底——Flux/SDXL 都不产透明通道，需走客户端去背", () => {
    expect(REPLICATE_PROVIDER.supportsTransparentBackground).toBe(false);
  });

  it("已接入且有默认模型", () => {
    expect(REPLICATE_PROVIDER.implemented).toBe(true);
    expect(REPLICATE_PROVIDER.defaultModel).toBeTruthy();
  });

  it("默认模型用 owner/name 形式，符合 Replicate 的模型 ID 规范", () => {
    expect(REPLICATE_PROVIDER.defaultModel).toMatch(/^[\w.-]+\/[\w.-]+$/);
  });
});
