export const BASE_SYSTEM_PROMPT = `你是 iDevFlow 效能平台海报的右侧主视觉生成引擎。你只生成一个可独立叠加到海报右侧的完整3D/2.5D图形资产，不生成整张海报、左侧标题、功能点、副标题或提示语。请理解业务关键词并选择对应的企业软件UI隐喻，但必须严格遵循下方“模式视觉风格”区块；正常功能发布与AI功能发布是两套不同的材质和色彩体系，不得混用。输出必须是透明背景PNG，主体完整、不裁切、无人物、无可读文字、无品牌Logo、无水印。若需要表达界面内容，只使用抽象短线、点阵、图块和不可读占位符。`;

export const BASE_NEGATIVE_PROMPT = [
  "完整海报",
  "海报背景",
  "左侧文案区",
  "大段文字",
  "可读正文",
  "卡通",
  "二次元",
  "手绘插画",
  "人物",
  "真人",
  "照片",
  "写实摄影",
  "复杂场景背景",
  "赛博朋克",
  "金属机械",
  "重工业",
  "夸张透视",
  "高饱和冲突色",
  "强噪点",
  "杂乱图标",
  "过度装饰",
  "低清晰度",
  "任何Logo",
  "水印",
  "签名"
] as const;

export function buildBasePromptBlock() {
  return BASE_SYSTEM_PROMPT;
}

export function section(title: string, lines: readonly string[]) {
  return `【${title}】\n${lines.map((line) => `- ${line}`).join("\n")}`;
}
