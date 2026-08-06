import type { VisualAsset, VisualTextValueMap } from "./types";

/**
 * Prompt Engine 用的通用文字槽位视图。
 *
 * 每张素材图的可编辑字段各不相同（graphic3 有四个，graphic5 只有一个），
 * 但 Prompt 只需要知道"大致有哪几类槽位要留白"，所以按 role 归并成四类。
 */
export interface PromptTextSlots {
  topText: string;
  label: string;
  buttonText: string;
  badgeText: string;
}

/**
 * 取某个字段的当前值，运营没改过就用默认值。
 */
export function graphicTextValue(
  visual: VisualAsset,
  values: VisualTextValueMap | undefined,
  fieldId: string
): string {
  const field = visual.editableTextFields.find((item) => item.id === fieldId);
  return values?.[fieldId] ?? field?.defaultValue ?? "";
}

/**
 * 把「每张图各自的字段」折算成 Prompt 需要的四类槽位。
 *
 * 这是有损的，但只用于提示模型预留留白，不参与画布渲染——
 * 画布走的是各字段的精确坐标槽位。
 */
export function toPromptTextSlots(
  visual: VisualAsset,
  values: VisualTextValueMap | undefined
): PromptTextSlots {
  const byRole = (role: string) =>
    visual.editableTextFields
      .filter((field) => field.role === role)
      .map((field) => graphicTextValue(visual, values, field.id))
      .filter(Boolean);

  const brand = byRole("brand");
  const title = byRole("title");
  const card = byRole("card");
  const action = byRole("action");
  const badge = byRole("badge");
  const status = byRole("status");

  // brand 优先占顶部；没有 brand 时让 title 顶上
  const top = brand.length ? brand : title;
  // title 已经用作顶部时不再重复放进 label
  const labelSource = card.length ? card : brand.length ? title : [];

  return {
    topText: top.join(" "),
    label: labelSource.join("、"),
    buttonText: action.join(" "),
    badgeText: (badge.length ? badge : status).join(" ")
  };
}

/**
 * 建立某张图的默认文字值。
 */
export function createDefaultTextValues(visual: VisualAsset): VisualTextValueMap {
  return Object.fromEntries(
    visual.editableTextFields.map((field) => [field.id, field.defaultValue])
  );
}
