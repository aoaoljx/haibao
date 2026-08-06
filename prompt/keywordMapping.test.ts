import { describe, expect, it } from "vitest";
import { resolveSceneByKeywords } from "./keywordMapping";

/**
 * 场景选择的核心约束：**主标题是海报主题的最强信号**。
 *
 * 功能点是支撑细节，词多且杂，此前与标题等权，会把场景带偏。
 */

const FEATURE = { mode: "feature" } as const;

describe("主标题主导场景选择", () => {
  it.each([
    ["代码在线编辑", "code"],
    ["单点登录", "login"],
    ["测试用例管理", "testing"],
    ["需求看板", "requirement"],
    ["数据库管理", "database"],
    ["版本分支管理", "version"],
    ["发布上线", "release"]
  ])("「%s」命中 %s 场景", (titleBlue, expected) => {
    const result = resolveSceneByKeywords({
      ...FEATURE,
      titleBlue,
      titleDark: "功能发布"
    });
    expect(result.sceneKey).toBe(expected);
  });

  /**
   * 回归：这组输入此前会被功能点带偏成「发布上线」，出图变成火箭发射。
   * 功能点里的 评审/审核/质量/标签/变更/管理 横跨 6 个类目，
   * 累计分数压过了标题。
   */
  it("功能点词多且杂时，仍以标题为准", () => {
    const result = resolveSceneByKeywords({
      ...FEATURE,
      titleBlue: "代码在线编辑",
      titleDark: "功能发布",
      featurePoints: [
        "代码在线编辑：轻量代码变更，在线编辑高效完成",
        "代码评论：评审信息不杂乱，标签化管理一目了然",
        "代码审核：代码审核自动匹配，代码质量更可控"
      ]
    });

    expect(result.sceneKey).toBe("code");
  });

  it.each([
    ["单点登录", "login", ["统一认证：一次登录访问全部系统", "权限同步：账号变更自动下发，审计可追溯"]],
    ["测试用例管理", "testing", ["用例库：分层管理，版本可追溯", "执行报告：失败自动归因，发布前一键校验"]],
    ["数据库管理", "database", ["表结构变更：审核后自动同步各环境", "慢查询分析：定位性能瓶颈"]]
  ])("「%s」带功能点后仍命中 %s", (titleBlue, expected, featurePoints) => {
    const result = resolveSceneByKeywords({
      ...FEATURE,
      titleBlue,
      titleDark: "功能发布",
      featurePoints: featurePoints as string[]
    });
    expect(result.sceneKey).toBe(expected);
  });
});

describe("标题加权的边界", () => {
  /**
   * titleDark 通常是「功能发布」这类固定后缀，每张海报都有。
   * 给它加权等于给所有海报注入发布类关键词——这正是要避免的。
   */
  it("固定后缀「功能发布」不被加权，不会把所有海报推向发布场景", () => {
    const withSuffix = resolveSceneByKeywords({
      ...FEATURE,
      titleBlue: "单点登录",
      titleDark: "功能发布"
    });
    const withoutSuffix = resolveSceneByKeywords({
      ...FEATURE,
      titleBlue: "单点登录"
    });

    expect(withSuffix.sceneKey).toBe("login");
    expect(withSuffix.sceneKey).toBe(withoutSuffix.sceneKey);
  });

  it("标题主导但不独裁：标题本身歧义时，功能点仍能起决定作用", () => {
    // 「流水线编排」同时命中「流水线」和「编排」
    const titleOnly = resolveSceneByKeywords({ ...FEATURE, titleBlue: "流水线编排" });
    const withPoints = resolveSceneByKeywords({
      ...FEATURE,
      titleBlue: "流水线编排",
      featurePoints: ["可视化编排：拖拽即可搭建构建流程", "并行执行：多阶段并发"]
    });

    expect(titleOnly.sceneKey).toBe("devops");
    expect(withPoints.sceneKey).toBe("workflow");
  });

  it("运营手填的关键词仍然有效", () => {
    const result = resolveSceneByKeywords({
      ...FEATURE,
      titleBlue: "全新体验", // 标题本身不含任何领域词
      keywords: "数据库 索引 查询"
    });
    expect(result.sceneKey).toBe("database");
  });

  it("一个关键词都没命中时回落到该模式的默认场景", () => {
    expect(resolveSceneByKeywords({ ...FEATURE, titleBlue: "全新体验" }).sceneKey).toBe(
      "requirement"
    );
    expect(resolveSceneByKeywords({ mode: "ai", titleBlue: "全新体验" }).sceneKey).toBe("ai");
  });
});

describe("返回的诊断信息", () => {
  it("命中的关键词与类目照常返回，供界面展示", () => {
    const result = resolveSceneByKeywords({
      ...FEATURE,
      titleBlue: "代码在线编辑",
      featurePoints: ["代码评论：标签化管理"]
    });

    expect(result.matchedKeywords.length).toBeGreaterThan(0);
    expect(result.matchedCategories).toContain("code-development");
    expect(result.visualElements.length).toBeGreaterThan(0);
  });

  it("关键词不重复", () => {
    const result = resolveSceneByKeywords({
      ...FEATURE,
      titleBlue: "代码",
      featurePoints: ["代码：代码代码"]
    });
    expect(new Set(result.matchedKeywords).size).toBe(result.matchedKeywords.length);
  });
});
