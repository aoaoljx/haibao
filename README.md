# iDevFlow 效能平台海报制作台

这是一个可部署的 React + Vite + TypeScript Web 产品。运营打开网址即可编辑海报内容、选择右侧图形来源、配置图片模型接口、维护图形文字并导出 PNG。

## 快速开始

```bash
npm install
cp .env.example .env    # 填入至少一个模型 API Key
npm run dev
```

打开 `http://127.0.0.1:3000` 使用海报制作台。

模型密钥配置在 `.env` 里，**页面上不再需要填写任何接口配置**。
填了哪个 Key，界面上就出现哪个模型；改完 `.env` 需要重启服务。

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

## 测试

```bash
npm test        # 单元与渲染回归
npm run verify  # typecheck + 测试 + 构建
```

## AI 能力边界

AI 只负责生成右侧 2.5D 透明 PNG 图形资产。左侧标题、功能点、副标题、提示语和图形覆盖文字全部由运营手动编辑，系统不会让模型生成或改写文案。

图片模型通过 `providers/generateImage()` 统一调用。**当前只有千问百炼（Qwen-Image）接了真实适配器**；GPT Image、Gemini、Flux、Ideogram、ComfyUI、SDXL 已注册配置入口，界面可选可填，但调用时会明确报错，需要补对应 Provider 适配器才能使用。

多数文生图模型不产透明通道。Provider 通过 `supportsTransparentBackground` 声明能力，声明为 `false` 时系统会在客户端自动去背（从画布边缘 flood-fill，不会误伤图形内部的白色面板）。

## 密钥怎么保管

密钥写在 `.env` 里，**不能加 `VITE_` 前缀**——vite 会把 `VITE_` 开头的变量静态替换进客户端包，加了前缀等于把密钥打进 `dist/assets/index-*.js`，任何打开页面的人都能拿到。

无前缀的变量只有 vite 服务端进程读得到。浏览器发出的请求本身不带任何凭据，转发时才由服务端注入鉴权头。前端只知道「哪些模型可用」，不知道密钥。

## 部署注意

浏览器不能直连模型 API（CORS），前端会把请求改写成 `/api/<provider>/...` 同源路径，由 vite（dev / preview）或 Nginx 转发。

**这套依赖「页面由 vite 提供服务」**：`npm run dev` 和 `npm run preview` 都满足。如果把 `dist/` 丢到纯静态托管上，转发和密钥注入都不存在，AI 生成不可用——那种场景需要一个真正的后端。Nginx 反代样例见 `docs/deployment.md`（注意样例本身不做密钥注入，需另行配置）。
