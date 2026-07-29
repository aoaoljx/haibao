# iDevFlow 效能平台海报制作台

这是一个可部署的 React + Vite + TypeScript Web 产品。运营打开网址即可编辑海报内容、选择右侧图形来源、配置图片模型接口、维护图形文字并导出 PNG。

## 快速开始

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:3000` 使用海报制作台。

## 生产构建

```bash
npm run build
npm run preview
```

构建产物输出到 `dist/`，可部署到 Nginx、静态资源服务器或对象存储 CDN。

## 产品结构

- `index.html`：Vite Web 入口。
- `src/main.tsx`：React 挂载入口。
- `src/features/poster-editor/`：运营海报制作台。
- `src/services/visual-generation/`：右侧 2.5D 图生成服务，负责拼装系统 Prompt 并调用模型接口。
- `providers/`：图片模型统一适配层，统一暴露 `generateImage()`。
- `prompt/`：系统内部 Prompt Engine，运营不可见。
- `public/poster-assets/`：运行时海报素材。
- `docs/deployment.md`：部署文档。

## AI 能力边界

AI 只负责生成右侧 2.5D 透明 PNG 图形资产。左侧标题、功能点、副标题、提示语和图形覆盖文字全部由运营手动编辑，系统不会让模型生成或改写文案。

图片模型通过 `providers/generateImage()` 统一调用。当前已预留 GPT Image、Gemini、Flux、Ideogram、ComfyUI、SDXL 六类 Provider 配置入口，后续接入真实 HTTP API 时只需要补对应 Provider 适配器。
