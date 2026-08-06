import { describe, expect, it } from "vitest";
import { createDefaultTextValues, graphicTextValue, toPromptTextSlots } from "./graphicText";
import { getVisualByKey, visualMapping } from "./visualMapping";

describe("graphicTextValue", () => {
  it("未设置时回落到字段默认值", () => {
    const visual = getVisualByKey("graphic1");
    expect(graphicTextValue(visual, undefined, "brand")).toBe("iDevflow");
    expect(graphicTextValue(visual, {}, "action")).toBe("提交");
  });

  it("设置后取设置值", () => {
    const visual = getVisualByKey("graphic1");
    expect(graphicTextValue(visual, { brand: "效能平台" }, "brand")).toBe("效能平台");
  });

  it("空字符串是有效值，不该被默认值顶掉", () => {
    // 运营主动清空槽位文字是合法操作
    const visual = getVisualByKey("graphic1");
    expect(graphicTextValue(visual, { brand: "" }, "brand")).toBe("");
  });

  it("未知字段返回空串而不是崩溃", () => {
    expect(graphicTextValue(getVisualByKey("graphic5"), {}, "nope")).toBe("");
  });
});

describe("toPromptTextSlots", () => {
  it("brand 占顶部，action 进按钮", () => {
    const visual = getVisualByKey("graphic1");
    const slots = toPromptTextSlots(visual, createDefaultTextValues(visual));
    expect(slots.topText).toBe("iDevflow");
    expect(slots.buttonText).toBe("提交");
  });

  it("多个 card 字段合并进 label", () => {
    const visual = getVisualByKey("graphic3");
    const slots = toPromptTextSlots(visual, createDefaultTextValues(visual));
    expect(slots.label).toBe("路标版本、敏捷交付");
    expect(slots.buttonText).toBe("点击发布");
    expect(slots.badgeText).toBe("验证中"); // status 兜底 badge
  });

  it("没有 brand 时由 title 顶上", () => {
    const visual = getVisualByKey("graphic5");
    const slots = toPromptTextSlots(visual, createDefaultTextValues(visual));
    expect(slots.topText).toBe("测试用例");
  });

  it("badge 优先于 status", () => {
    const visual = getVisualByKey("graphic4");
    const slots = toPromptTextSlots(visual, createDefaultTextValues(visual));
    expect(slots.badgeText).toBe("AI");
    expect(slots.topText).toBe("DF Coder"); // 无 brand，title 顶上
  });

  it("每张素材图都能折算出槽位且不抛错", () => {
    for (const visual of visualMapping.visuals) {
      const slots = toPromptTextSlots(visual, createDefaultTextValues(visual));
      expect(typeof slots.topText).toBe("string");
      expect(typeof slots.label).toBe("string");
      expect(typeof slots.buttonText).toBe("string");
      expect(typeof slots.badgeText).toBe("string");
    }
  });

  it("值全空时返回空槽位而不是 undefined", () => {
    const visual = getVisualByKey("graphic3");
    const slots = toPromptTextSlots(visual, { milestone: "", delivery: "", publish: "", status: "" });
    expect(slots).toEqual({ topText: "", label: "", buttonText: "", badgeText: "" });
  });
});

describe("createDefaultTextValues", () => {
  it("覆盖该图的全部可编辑字段", () => {
    for (const visual of visualMapping.visuals) {
      const values = createDefaultTextValues(visual);
      expect(Object.keys(values).sort()).toEqual(
        visual.editableTextFields.map((f) => f.id).sort()
      );
    }
  });

  it("每个渲染槽位都能找到对应字段", () => {
    // 槽位引用了不存在的字段就会画出空文字，这里挡住
    for (const visual of visualMapping.visuals) {
      const fieldIds = new Set(visual.editableTextFields.map((f) => f.id));
      for (const slot of visual.renderSlots) {
        expect(fieldIds.has(slot.fieldId), `${visual.key}/${slot.fieldId}`).toBe(true);
      }
    }
  });
});
