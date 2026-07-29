# 产品架构

项目交付形态是可部署 Web 产品，技术栈为 React + Vite + TypeScript。运行入口是 `index.html` 与 `src/main.tsx`，构建产物为静态目录 `dist/`。

## 目录边界

- `src/features/poster-editor/`：运营编辑器、画布预览、PNG 导出。
- `src/shared/poster/`：海报领域类型、默认模板、素材映射和渲染数据。
- `src/services/visual-generation/`：右侧 2.5D 图生成服务，只负责生成图形资产请求。
- `providers/`：图片模型 Provider Adapter，统一接口为 `generateImage()`。
- `prompt/`：系统内部 Prompt Engine，包含 Base Prompt、Scene Prompt、Keyword Mapping 和 Prompt Builder。
- `public/poster-assets/`：Web 运行时直接访问的海报素材。
- `docs/`：产品架构与部署说明。

## 运行链路

1. 运营打开 Web 页面。
2. 运营编辑左侧标题、副标题、提示语、功能点和图形覆盖文字。
3. 运营选择右侧图形来源：AI 自动生成、素材图库或上传图片。
4. 选择 AI 自动生成时，运营可填写图片模型接口配置。
5. 系统根据标题、功能点和关键词进入 Prompt Engine。
6. Prompt Engine 组合 Keyword Mapping、Scene Prompt、Base Prompt，生成最终图片 Prompt。
7. `src/services/visual-generation/` 调用 `providers/generateImage()`。
8. Provider Adapter 负责对接具体模型并返回透明 PNG。
9. Canvas 使用当前图形资产渲染完整海报，浏览器导出 PNG。

## AI 抽象

AI 能力全部抽象为接口，不与编辑器 UI、Canvas 渲染或海报文案逻辑耦合。

- `providers/types.ts`：定义统一输入、输出、Provider 配置和 Adapter 接口。
- `providers/modelAdapter.ts`：统一暴露 `generateImage(input, config)`。
- `providers/registry.ts`：维护 Provider 注册表和运营配置字段。
- `src/services/visual-generation/visualGenerationService.ts`：把业务输入转成图片生成请求。

当前 Provider 已预留：

- GPT Image
- Gemini
- Flux
- Ideogram
- ComfyUI
- SDXL

## 约束

- 模型只生成右侧 2.5D 透明 PNG。
- 模型不生成标题、不生成功能点、不修改运营输入。
- Prompt 不暴露给运营。
- Provider API 配置可由运营在界面输入，后续也可以替换为服务器保存的配置。
- 海报画布布局、品牌素材、导出尺寸和原视觉风格保持稳定。
