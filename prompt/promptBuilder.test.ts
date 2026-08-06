import { describe, expect, it } from "vitest";
import { buildVisualPrompt } from "./promptBuilder";
import { BASE_NEGATIVE_PROMPT } from "./basePrompt";

const INPUT = {
  mode: "feature" as const,
  titleBlue: "代码在线编辑",
  titleDark: "功能发布",
  featurePoints: ["代码评论：标签化管理"]
};

describe("不要让模型去画透明", () => {
  /**
   * 回归：Prompt 里原本写着「生成一张透明背景PNG」，模型把它理解成
   * 画一格一格的棋盘格图案来*表示*透明——实测出图 alpha 全是 255，
   * 根本没有透明通道，而那片假格子还会以噪点形式残留在去背结果里。
   *
   * 透明是 API 层的事（background 参数），Prompt 只该要一个干净好抠的纯白底。
   */
  it("不再要求模型输出透明背景 PNG", () => {
    const { prompt } = buildVisualPrompt(INPUT);
    expect(prompt).not.toContain("透明背景PNG");
  });

  it("改为明确要求均匀纯白底", () => {
    const { prompt } = buildVisualPrompt(INPUT);
    expect(prompt).toContain("纯白");
    expect(prompt).toMatch(/没有任何图案、格子、纹理/);
  });

  it("负向词里挡住棋盘格这类假透明画法", () => {
    const { negativePrompt } = buildVisualPrompt(INPUT);
    for (const banned of ["棋盘格", "透明网格", "格子背景"]) {
      expect(negativePrompt).toContain(banned);
    }
  });

  it("负向词表本身也包含这些条目", () => {
    for (const banned of ["棋盘格", "透明网格", "格子背景", "马赛克底纹"]) {
      expect(BASE_NEGATIVE_PROMPT).toContain(banned);
    }
  });
});

describe("Prompt 的其它约束没被破坏", () => {
  it("仍然禁止生成海报底图与左侧文案区", () => {
    const { prompt } = buildVisualPrompt(INPUT);
    expect(prompt).toContain("不要生成海报底图");
    expect(prompt).toContain("左侧文案区域");
  });

  it("仍然带上命中的场景模板", () => {
    const built = buildVisualPrompt(INPUT);
    expect(built.sceneKey).toBe("code");
    expect(built.prompt).toContain(built.sceneName);
  });

  it("图形文字只作为留白规划，不要求模型生成可读文字", () => {
    const { prompt } = buildVisualPrompt({
      ...INPUT,
      graphicText: { topText: "iDevflow", buttonText: "提交" }
    });
    expect(prompt).toContain("不要直接生成可读文字");
  });
});
