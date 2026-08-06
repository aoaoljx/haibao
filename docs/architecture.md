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
- `providers/apiProxyMap.ts`：模型 API 的同源代理映射，运行时改写与转发配置共用的唯一真相源。
- `src/services/visual-generation/visualGenerationService.ts`：把业务输入转成图片生成请求。
- `src/services/visual-generation/backgroundRemoval.ts`：模型不产透明底时的客户端去背。

Provider 状态：

| Provider | 状态 | 原生透明底 |
| --- | --- | --- |
| 千问百炼 Qwen-Image | 已接线（直接 HTTP，异步提交+轮询） | 否，走客户端去背 |
| OpenAI GPT Image | 已接线（经 Vercel AI SDK） | 是 |
| Gemini | 仅注册，适配器未接 | 待确认 |
| Flux | 仅注册，适配器未接 | 待确认 |
| Ideogram | 仅注册，适配器未接 | 待确认 |
| ComfyUI | 仅注册，适配器未接 | 视工作流而定 |
| SDXL | 仅注册，适配器未接 | 待确认 |

「仅注册」表示已在注册表里占位，但调用时会明确报错；且因为界面只列出 `.env`
里配了密钥的 Provider，这些未接线的模型即使填了 Key 也还不能用。

经 AI SDK 接入的 Provider（当前是 gpt-image）用**动态引入**：
AI SDK 约 360kB，只在真正调用该模型时才加载，不进首屏包。
后续扩展 Replicate、Vertex 等只需在同一个适配器里换 model 实例。

### 尺寸能力对比

各家文生图都只接受有限的几种尺寸，`pickClosestSize()` 负责挑比例最接近的，
残余误差由渲染层 `fitContain()` 吸收成透明留白，绝不拉伸。

| 模型 | 可选比例 | 对 1.24:1 槽位的误差 |
| --- | --- | --- |
| 千问 | 5 种（1.0 / 1.333 / 0.75 / 1.778 / 0.5625） | 约 9% |
| gpt-image | 3 种（1.0 / 1.5 / 0.667） | 约 24% |

也就是说 gpt-image 胜在原生透明底，**不是**尺寸精度——窄幅槽位上它的图形会偏小。

## 跨浏览器 CORS 的处理

浏览器直连模型 API 会被 CORS 拦截，因此前端把请求改写成同源前缀
（`/api/dashscope/...`），由 dev server、preview server 或生产环境的 Nginx 转发。

**代理前缀只代表 origin，pathname 原样透传。** 转发层必须剥掉前缀，
且 target 不能再带路径，否则路径会被叠加两次。三处配置都以
`providers/apiProxyMap.ts` 为准，任一处不同步都会表现为静默 404。
纯静态托管（对象存储 / CDN）没有转发能力，AI 生成会不可用，详见部署文档。

## 密钥边界

界面上没有任何接口配置表单，密钥只存在于 vite 服务端进程内。

| 数据 | 位置 | 是否进客户端包 |
| --- | --- | --- |
| API 密钥（`DASHSCOPE_API_KEY` 等，**无前缀**） | `.env`，由 `loadEnv(mode, cwd, "")` 读取 | **否** |
| 已配好密钥的 Provider 列表 | 构建时由密钥是否存在推导，`define` 注入 `__CONFIGURED_PROVIDERS__` | 是（只有 ID） |
| 非机密调节项（`VITE_` 前缀） | `.env`，走 `import.meta.env` | 是 |

浏览器发出的请求不带凭据；`vite.config.ts` 的 proxy `configure` 钩子在转发时
按各家要求的格式注入鉴权头（`Authorization: Bearer`、`x-goog-api-key` 等，
见 `ApiProxyEntry.authHeader`）。

**「.env 里有没有那把 Key」是可用性的唯一真相源**——不需要另外维护启用列表，
也就不会出现「填了 Key 却没启用」或「启用了却没 Key」的错配。
界面的模型下拉只列出真正可用的，不会再出现「选得到、点了才报错」。

## 约束

- 模型只生成右侧 2.5D 图形，必须是透明底；模型不支持时在客户端去背。
- 模型不生成标题、不生成功能点、不修改运营输入。
- Prompt 不暴露给运营，但命中的场景模板与关键词类目会显示在界面上，便于排查。
- 图形文字只能叠加在素材图库的图形上——槽位坐标是按那几张素材逐个标定的。
- 生成请求的尺寸由目标槽位比例派生；外来图片一律等比放入槽位，绝不拉伸。
- Provider API 配置由运营在界面输入并保存在本机浏览器。
  生产环境如需集中管理密钥，应在服务端保存并代理，前端不再持有 Key。
- 海报画布布局、品牌素材、导出尺寸和原视觉风格保持稳定。
  两版海报的差异集中在 `posterRenderer.ts` 的 `POSTER_THEMES`。
