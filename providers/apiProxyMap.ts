/**
 * 浏览器直连模型 API 会被 CORS 拦住，因此所有请求都改写成同源的代理前缀，
 * 由 dev server / preview server / Nginx 转发到真实 host。
 *
 * 这里是该映射的唯一真相源：`proxyUrl()`（运行时改写请求 URL）和
 * `vite.config.ts`（配置转发规则）都从这里读取。两边一旦不同步就是静默 404，
 * 所以不要在别处复制这张表。
 *
 * 约定：**代理前缀只代表 origin，不代表任何路径**。
 * 前缀之后的部分就是目标 host 上的完整 pathname，转发时原样透传。
 *
 *   https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis
 *   → /api/dashscope/api/v1/services/aigc/text2image/image-synthesis
 *   → 转发到 https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis
 */
import type { ImageProviderId } from "./types";

export interface ApiProxyEntry {
  /** 真实 API 的 hostname */
  host: string;
  /** 同源代理前缀，必须以 / 开头且不以 / 结尾 */
  proxyPrefix: string;
  /**
   * 存放该 API 密钥的环境变量名。
   *
   * **不要加 VITE_ 前缀**——加了会被静态替换进客户端包，等于把 Key 发给每个访问者。
   * 无前缀变量只有 vite 服务端读得到，转发时注入到请求头，浏览器全程无感。
   */
  apiKeyEnvVar: string;
  /** 该 API 期望的鉴权头格式 */
  authHeader: { name: string; scheme: "bearer" | "raw" };
  /** 依赖这个 API 的 Provider。用于推导「哪些模型已配好可用」 */
  providers: readonly ImageProviderId[];
  /**
   * 允许用环境变量整体替换端点地址（含路径），用于对接 OpenAI 兼容的
   * 中转站、Azure、自建 vLLM 等。
   *
   * 该变量带 VITE_ 前缀是刻意的——端点地址不是机密，客户端也需要读它
   * 来拼出请求路径。真正的密钥仍然只在服务端。
   */
  baseUrlEnvVar?: string;
  /** 默认端点地址，含 API 路径前缀 */
  defaultBaseUrl?: string;
}

/**
 * 解析端点地址，拆成「转发目标 origin」和「客户端要带的路径前缀」。
 *
 * 两边必须来自同一个配置值，否则又会出现改写端与转发端不同步的静默 404。
 *
 * https://codexone.aieania.tech/v1
 *   → origin  https://codexone.aieania.tech   （proxy 转发目标）
 *   → apiPath /v1                             （客户端 baseURL 里带上）
 */
export function splitBaseUrl(baseUrl: string): { origin: string; apiPath: string } {
  const url = new URL(baseUrl);
  const apiPath = url.pathname.replace(/\/+$/, "");
  return { origin: url.origin, apiPath };
}

/** 取某个代理项当前生效的端点地址 */
export function resolveBaseUrl(entry: ApiProxyEntry, env: ServerEnv = {}): string {
  const override = entry.baseUrlEnvVar ? env[entry.baseUrlEnvVar]?.trim() : undefined;
  return override || entry.defaultBaseUrl || `https://${entry.host}`;
}

const BEARER = { name: "Authorization", scheme: "bearer" } as const;

export const API_PROXY_ENTRIES: readonly ApiProxyEntry[] = [
  {
    host: "dashscope.aliyuncs.com",
    proxyPrefix: "/api/dashscope",
    apiKeyEnvVar: "DASHSCOPE_API_KEY",
    authHeader: BEARER,
    providers: ["qwen"]
  },
  {
    host: "api.openai.com",
    proxyPrefix: "/api/openai",
    apiKeyEnvVar: "OPENAI_API_KEY",
    authHeader: BEARER,
    providers: ["gpt-image"],
    // 指向任何 OpenAI 兼容端点：中转站、Azure、自建 vLLM 等
    baseUrlEnvVar: "VITE_OPENAI_BASE_URL",
    defaultBaseUrl: "https://api.openai.com/v1"
  },
  {
    host: "api.replicate.com",
    proxyPrefix: "/api/replicate",
    apiKeyEnvVar: "REPLICATE_API_TOKEN",
    authHeader: BEARER,
    providers: ["replicate"],
    defaultBaseUrl: "https://api.replicate.com/v1"
  },
  {
    host: "generativelanguage.googleapis.com",
    proxyPrefix: "/api/gemini",
    apiKeyEnvVar: "GEMINI_API_KEY",
    // 接真实适配器时核对：Gemini 也支持 ?key= 查询参数形式
    authHeader: { name: "x-goog-api-key", scheme: "raw" },
    providers: ["gemini"]
  },
  {
    host: "api.bfl.ml",
    proxyPrefix: "/api/flux",
    apiKeyEnvVar: "BFL_API_KEY",
    // 接真实适配器时核对头名
    authHeader: { name: "x-key", scheme: "raw" },
    providers: ["flux"]
  },
  {
    host: "api.ideogram.ai",
    proxyPrefix: "/api/ideogram",
    apiKeyEnvVar: "IDEOGRAM_API_KEY",
    // 接真实适配器时核对头名
    authHeader: { name: "Api-Key", scheme: "raw" },
    providers: ["ideogram"]
  }
];

export interface ViteProxyEntryConfig {
  target: string;
  changeOrigin: boolean;
  secure: boolean;
  rewrite: (path: string) => string;
  configure?: (proxy: ProxyLike) => void;
}

/** http-proxy 实例中我们用到的那部分，避免为构建配置引入类型依赖 */
export interface ProxyLike {
  on(
    event: "proxyReq",
    listener: (proxyReq: { setHeader(name: string, value: string): void }) => void
  ): void;
}

/** 服务端环境变量表。vite 的 loadEnv() 返回的就是这个形状。 */
export type ServerEnv = Record<string, string | undefined>;

/** 目标 origin。代理前缀代表的就是它。 */
export function proxyTargetOrigin(entry: ApiProxyEntry): string {
  return `https://${entry.host}`;
}

/**
 * 把完整 URL 映射成同源代理路径；host 未登记或 URL 非法时返回 null（表示直连）。
 *
 * 这里是纯函数，不看运行环境——环境判断留在 `proxyUrl()` 里，
 * 这样映射规则本身可以直接测。
 */
export function toProxyPath(fullUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(fullUrl);
  } catch {
    return null;
  }

  for (const { host, proxyPrefix } of API_PROXY_ENTRIES) {
    if (url.hostname === host) {
      return `${proxyPrefix}${url.pathname}${url.search}`;
    }
  }

  return null;
}

/**
 * 从代理路径中剥掉前缀，还原成目标 host 上的真实 pathname。
 *
 * 转发层必须做这一步：http-proxy 默认把收到的整条路径接在 target 后面，
 * 不会自动去掉用于路由的前缀。
 */
export function stripProxyPrefix(path: string, proxyPrefix: string): string {
  if (path === proxyPrefix) return "/";
  if (!path.startsWith(`${proxyPrefix}/`) && !path.startsWith(`${proxyPrefix}?`)) {
    return path;
  }
  const rest = path.slice(proxyPrefix.length);
  return rest.startsWith("/") ? rest : `/${rest}`;
}

/** 按该 API 要求的格式拼出鉴权头的值 */
export function formatAuthHeaderValue(entry: ApiProxyEntry, apiKey: string): string {
  return entry.authHeader.scheme === "bearer" ? `Bearer ${apiKey}` : apiKey;
}

/**
 * 生成 Vite 的 proxy 配置。dev server 与 preview server 共用同一份，
 * 避免出现"开发能用、预览 404"的割裂。
 *
 * 传入 env 后会在转发时注入鉴权头：**密钥只存在于 vite 服务端进程内，
 * 不进客户端包、不经过浏览器**。前端发出的请求是不带凭据的。
 *
 * secure=false 沿用项目原有设置：内网环境常有 TLS 中间人代理，开启校验会握手失败。
 * 如果部署环境没有这类代理，改成 true 更安全。
 */
export function buildViteProxyConfig(
  env: ServerEnv = {},
  entries: readonly ApiProxyEntry[] = API_PROXY_ENTRIES
): Record<string, ViteProxyEntryConfig> {
  const config: Record<string, ViteProxyEntryConfig> = {};

  for (const entry of entries) {
    const apiKey = env[entry.apiKeyEnvVar]?.trim();
    // 转发到当前生效的端点 origin。路径前缀由客户端带上，见 splitBaseUrl 的说明。
    const { origin } = splitBaseUrl(resolveBaseUrl(entry, env));

    config[entry.proxyPrefix] = {
      target: origin,
      changeOrigin: true,
      secure: false,
      rewrite: (path: string) => stripProxyPrefix(path, entry.proxyPrefix),
      ...(apiKey
        ? {
            configure: (proxy: ProxyLike) => {
              proxy.on("proxyReq", (proxyReq) => {
                proxyReq.setHeader(entry.authHeader.name, formatAuthHeaderValue(entry, apiKey));
              });
            }
          }
        : {})
    };
  }

  return config;
}

/**
 * 从环境变量推导出「哪些 Provider 已经配好了密钥」。
 *
 * 让 .env 里有没有那把 Key 成为唯一真相源——不需要再维护一份"启用列表"，
 * 也就不会出现"填了 Key 却没启用"或"启用了却没 Key"的错配。
 */
export function resolveConfiguredProviders(
  env: ServerEnv,
  entries: readonly ApiProxyEntry[] = API_PROXY_ENTRIES
): ImageProviderId[] {
  const configured: ImageProviderId[] = [];

  for (const entry of entries) {
    if (!env[entry.apiKeyEnvVar]?.trim()) continue;
    for (const provider of entry.providers) {
      if (!configured.includes(provider)) configured.push(provider);
    }
  }

  return configured;
}
