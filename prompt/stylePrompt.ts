import type { PosterMode } from "../src/shared/poster/types";

export type ModeVisualStyleKey = "feature-gallery" | "ai-gallery";

export interface ModeVisualStylePrompt {
  key: ModeVisualStyleKey;
  name: string;
  instructions: readonly string[];
  avoid: readonly string[];
}

const FEATURE_GALLERY_STYLE: ModeVisualStylePrompt = {
  key: "feature-gallery",
  name: "蓝白玻璃拟态企业软件 2.5D 主视觉",
  instructions: [
    "视觉基准来自素材图库前五张图：单个完整的企业软件功能图标或UI装置，透明背景，适合作为海报右侧独立主视觉。",
    "采用 Blender/C4D 商业产品渲染质感，2.5D轻等距或正面略带三分之四视角，圆角几何体厚度清晰，构图稳定而饱满。",
    "主体由叠层文件卡、圆角窗口、代码或流程面板、按钮、状态卡片等抽象企业UI组件构成；根据功能语义选择少量关键物件，不堆砌。",
    "材质以半透明亚克力、磨砂玻璃、乳白塑料和柔软高光为主，具有干净白色描边、蓝色环境反射、柔和阴影与适度体积感。",
    "主色为白色、冰蓝、天蓝和宝蓝渐变；仅用少量薄荷绿、青色、浅紫或明黄作为状态与操作焦点。",
    "底部带柔和的电光蓝椭圆光晕或悬浮投影，但画布本身必须透明；整体高键、清爽、可信、精致，像企业级软件发布会的产品图标。",
    "主体轮廓完整、不裁切，视觉重心居中并略偏右，边缘清晰，适合缩放后仍保持识别度。"
  ],
  avoid: [
    "深色玻璃主面板",
    "黑色主体",
    "赛博朋克霓虹背景",
    "扁平矢量插画",
    "卡通玩具风",
    "密集小组件",
    "强烈红橙主色",
    "可读文字",
    "品牌Logo",
    "水印"
  ]
};

const AI_GALLERY_STYLE: ModeVisualStylePrompt = {
  key: "ai-gallery",
  name: "深蓝青光玻璃 AI 应用图标",
  instructions: [
    "视觉基准来自素材图库第六张图：一个完整、独立、透明背景的高级AI应用图标，适合作为深蓝科技海报右侧主视觉。",
    "主体是大尺寸圆角方形深蓝玻璃面板，前后叠放一至两层辅助卡片；顶部悬浮小型代码符号徽章，侧后方可出现抽象机器人或智能助手轮廓。",
    "面板内部使用点阵、微型电路、数据短线和柔焦界面层表达AI计算空间，中心保留一个醒目的抽象智能符号，不生成可读字母。",
    "材质为透明水晶玻璃、深海蓝亚克力和青色发光边缘，具有高光反射、折射、柔和辉光、镜面质感与清晰厚度。",
    "主色为深海军蓝、宝蓝、青蓝和高亮白，辅以少量紫蓝渐变；底部可带蓝紫玻璃胶囊装饰，但不生成品牌文字。",
    "采用精致商业3D产品渲染，正面略带三分之四视角，主体饱满、完整不裁切，整体科技感强但保持企业级、干净和可信。",
    "画布必须透明，不生成海报背景；所有辉光都收敛在主体周围，便于叠加到既有深蓝背景。"
  ],
  avoid: [
    "浅色磨砂文件卡主视觉",
    "扁平矢量图标",
    "卡通机器人",
    "科幻人物",
    "复杂机甲",
    "霓虹城市背景",
    "大面积紫红色",
    "可读AI字母",
    "品牌Logo",
    "水印"
  ]
};

export function getModeVisualStylePrompt(mode: PosterMode): ModeVisualStylePrompt {
  return mode === "ai" ? AI_GALLERY_STYLE : FEATURE_GALLERY_STYLE;
}
