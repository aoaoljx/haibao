# 模型接口配置改革方案

> 状态：**待评审，未实施**。本文档只描述方案，不含代码改动。

## 目标

1. 模型接口配置从页面表单移到 `.env`，运营打开页面即可用，不再手填 Key。
2. 尽量只维护一个调用出口，避免每接一个模型就写一套适配。
3. 纯本地使用，依赖越少越好。

## 结论摘要

| 问题 | 结论 |
| --- | --- |
| LiteLLM 能统一所有图片模型吗 | **不能，且不支持你们当前唯一在用的千问文生图** |
| 该用什么统一调用 | **Vercel AI SDK**（TypeScript 原生，无新运行时） |
| Key 怎么进 env 又不泄漏 | **vite proxy 注入**，零新增依赖，已验证可行 |
| 要不要加后端 | **本地使用场景不需要**；将来多人部署时再加，现有代码可直接搬 |
| 需要几个适配器 | **2~3 个**，不是每个模型一个 |

## 一、为什么不是 LiteLLM

LiteLLM `image_generation` 的支持列表：OpenAI、Azure OpenAI、Google AI Studio、
Vertex AI、AWS Bedrock、Recraft、OpenRouter、Xinference、Nscale，以及任意 OpenAI 兼容端点。

不支持的恰恰包括：

- **阿里云百炼 / 千问文生图** —— `dashscope` provider 只做 `completion`
  （qwen-turbo / plus / max / vl 等对话模型）。社区提过
  [feature request #28763](https://github.com/BerriAI/litellm/issues/28763) 和
  [PR #25672](https://github.com/BerriAI/litellm/pull/25672)，PR 已关闭未合入。
- ComfyUI、Ideogram、Flux 直连。

另外 LiteLLM 是 Python 服务，要么装 Python SDK、要么起 Docker 跑 Proxy。
对一个纯本地的 TypeScript 项目来说，为了一批用不上的 provider 引入另一套运行时，
不划算。

## 二、Key 放 env 且不进浏览器

### 先说一个陷阱

`import.meta.env.VITE_*` 是**构建时静态替换**的。如果把 Key 写成 `VITE_DASHSCOPE_KEY`，
它会被直接打进 `dist/assets/index-*.js`，任何人查看源码都能拿走。
**这比现状更糟**——现在至少是每个运营在自己浏览器里填自己的 Key。

### 正确做法：无前缀变量 + 代理注入

Vite 只把 `VITE_` 前缀的变量暴露给客户端。无前缀变量留在服务端，
由 `vite.config.ts` 在转发请求时注入到 Header。浏览器发出的请求不带任何凭据。

`.env`（已在 .gitignore 内）：

```bash
# 不加 VITE_ 前缀 —— 加了就会被打进客户端包
DASHSCOPE_API_KEY=sk-xxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxx

# 非机密项可以加前缀，让界面知道哪些模型可用
VITE_ENABLED_PROVIDERS=qwen,gpt-image
```

`vite.config.ts` 中在现有 `buildViteProxyConfig()` 基础上加 `configure` 钩子：

```ts
const env = loadEnv(mode, process.cwd(), ""); // 第三参为空 = 不过滤前缀

configure: (proxy) => {
  proxy.on("proxyReq", (proxyReq) => {
    const key = env[entry.apiKeyEnvVar];
    if (key) proxyReq.setHeader("Authorization", `Bearer ${key}`);
  });
}
```

### 已验证

用本地探针实测过两点：

1. `loadEnv(mode, dir, "")` 能读到 `.env` 里的 `DASHSCOPE_API_KEY`；
   而 `loadEnv(mode, dir, "VITE_")`（即客户端可见的那部分）读不到它。
2. 浏览器发出的请求不带 Authorization，上游收到的是
   `Authorization: Bearer <来自 .env 的值>`，路径重写照常工作。

### 约束

这条路依赖「页面由 vite 提供服务」，`npm run dev` 和 `npm run preview` 都满足
（preview 的 proxy 已在上一轮补齐）。**如果哪天把 `dist/` 丢到纯静态托管上，
这套就不成立**，那时必须换成真正的后端。鉴于当前是纯本地使用，先不做。

## 三、统一调用出口

### 关键认识

**不需要给每个模型写适配器。** 现有 `providers/generateImage(input, config)`
这层抽象本身是对的，只需要在它下面放两三个适配器：

| 适配器 | 覆盖 | 状态 |
| --- | --- | --- |
| **AI SDK 适配器** | OpenAI（gpt-image）、Google Vertex（Imagen）、Replicate（Flux / SDXL 及大量开源模型）、Luma、Fal、Runpod 等 | 新增 |
| **百炼 / DashScope** | 千问文生图（异步提交 + 轮询，确实不是 OpenAI 形状） | **已写好且能跑，保留** |
| ComfyUI | 自建工作流 | 按需，可暂缓 |

其中 Replicate 是性价比最高的一个：一个适配器就能触达 Flux、SDXL 等几乎所有开源图像模型。

### AI SDK 的接入形态

```ts
import { generateImage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// baseURL 指向自己的代理前缀，Key 由 vite 注入，前端这里填占位即可
const openai = createOpenAI({ baseURL: "/api/openai", apiKey: "injected-by-proxy" });

const { image } = await generateImage({
  model: openai.image("gpt-image-2"),
  prompt,
  size: deriveRequestSize(targetBounds)  // 复用现有的槽位比例派生
});
```

新增依赖：`ai` + 按需的 `@ai-sdk/*` provider 包。都是纯 TypeScript，无新运行时。

### 与现有代码的衔接

`GenerateImageInput` / `GenerateImageResult` 契约不变，
`registry.ts` / `modelAdapter.ts` 不动。AI SDK 只是多一个
`createAiSdkProvider()` 实现，和现有 `createQwenProvider()` 平级。
上层 `visualGenerationService`、Prompt Engine、渲染层完全不受影响。

## 四、千问怎么办

你们能访问境外 API，所以有个额外选项值得考虑：

**gpt-image 原生支持透明底**，而千问不支持——这正是上一轮不得不写客户端去背的原因。
如果把默认模型换成 gpt-image：

- 透明 PNG 由模型直接产出，去背逻辑降级为兜底
- 尺寸可精确指定，不再受千问那 6 种离散尺寸限制
- 少一层有损处理，海报图形质量更稳

建议：**保留千问适配器不删**（已经能跑，且是境内兜底），
但把默认 Provider 切到 gpt-image，实际对比出图质量后再定。

> 待确认：gpt-image 透明底在 AI SDK 中的具体传参方式（`providerOptions.openai`
> 下的字段名），接入时查一下当前版本文档。

## 五、界面怎么变

- **删掉**「模型接口配置」整块表单（API Key、Base URL、超时、额外参数）。
- **保留**模型选择下拉，但选项由 `VITE_ENABLED_PROVIDERS` 决定——
  只列出 `.env` 里真正配了 Key 的那些，避免出现「选了却报错」。
- 保留「自动去除背景」开关（模型原生支持透明时自动隐藏，逻辑已有）。
- 保留生成场景 trace 提示。

代价：换模型要改 `.env` 并重启 vite。对本地单人使用可以接受；
如果经常要切模型对比，可以把「选哪个模型」留在界面上，只把 Key 收进 env。

## 六、实施步骤

| 阶段 | 内容 | 可独立验证 |
| --- | --- | --- |
| 1 | `apiProxyMap` 增加 `apiKeyEnvVar` 字段；`vite.config.ts` 加 `configure` 注入；`.env.example` | 用现有千问链路验证：清空界面 Key 仍能出图 |
| 2 | 前端删除配置表单，`ImageProviderConfig` 瘦身为只剩 provider / model | typecheck + 现有 68 个测试 |
| 3 | 新增 AI SDK 适配器（先只接 OpenAI gpt-image） | 新增适配器单测 + 实际出图对比 |
| 4 | 按需扩展 Replicate 等 | — |

阶段 1、2 可以先做，跟 AI SDK 无关；即使后面决定不用 AI SDK，这两步也不白做。

## 七、取舍与风险

- **绑定 vite 运行**：换成静态托管即失效。当前纯本地使用可接受，多人部署时需改造成
  真后端——届时 `providers/` 目录可原样搬过去，这层抽象不会浪费。
- **`.env` 泄漏风险**：Key 以明文存在开发机上。确认 `.env` 在 `.gitignore` 内
  （当前已是），不要提交。
- **AI SDK 版本变动**：image generation 相关 API 迭代较快，接入时以当前文档为准，
  不要照抄本文档里的示例签名。
- **失去运营自助配置能力**：改配置需要能改 `.env` 的人。本地单人使用无影响。

## 八、明确不做

- 不引入 LiteLLM（理由见第一节）。
- 不引入 Python / Docker。
- 不新建常驻后端服务。
- 不改动 Prompt Engine、渲染层、海报布局。
