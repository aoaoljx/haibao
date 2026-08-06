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
export interface ApiProxyEntry {
  /** 真实 API 的 hostname */
  host: string;
  /** 同源代理前缀，必须以 / 开头且不以 / 结尾 */
  proxyPrefix: string;
}

export const API_PROXY_ENTRIES: readonly ApiProxyEntry[] = [
  { host: "dashscope.aliyuncs.com", proxyPrefix: "/api/dashscope" },
  { host: "api.openai.com", proxyPrefix: "/api/openai" },
  { host: "generativelanguage.googleapis.com", proxyPrefix: "/api/gemini" },
  { host: "api.bfl.ml", proxyPrefix: "/api/flux" },
  { host: "api.ideogram.ai", proxyPrefix: "/api/ideogram" }
];

export interface ViteProxyEntryConfig {
  target: string;
  changeOrigin: boolean;
  secure: boolean;
  rewrite: (path: string) => string;
}

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

/**
 * 生成 Vite 的 proxy 配置。dev server 与 preview server 共用同一份，
 * 避免出现"开发能用、预览 404"的割裂。
 *
 * secure=false 沿用项目原有设置：内网环境常有 TLS 中间人代理，开启校验会握手失败。
 * 如果部署环境没有这类代理，改成 true 更安全。
 */
export function buildViteProxyConfig(
  entries: readonly ApiProxyEntry[] = API_PROXY_ENTRIES
): Record<string, ViteProxyEntryConfig> {
  const config: Record<string, ViteProxyEntryConfig> = {};

  for (const entry of entries) {
    config[entry.proxyPrefix] = {
      target: proxyTargetOrigin(entry),
      changeOrigin: true,
      secure: false,
      rewrite: (path: string) => stripProxyPrefix(path, entry.proxyPrefix)
    };
  }

  return config;
}
