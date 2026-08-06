import { describe, expect, it } from "vitest";
import {
  API_PROXY_ENTRIES,
  buildViteProxyConfig,
  proxyTargetOrigin,
  resolveConfiguredProviders,
  stripProxyPrefix,
  toProxyPath,
  type ViteProxyEntryConfig
} from "./apiProxyMap";
import { IMAGE_PROVIDER_IDS } from "./registry";

describe("stripProxyPrefix", () => {
  it("剥掉前缀后还原出目标 host 上的真实路径", () => {
    expect(
      stripProxyPrefix(
        "/api/dashscope/api/v1/services/aigc/text2image/image-synthesis",
        "/api/dashscope"
      )
    ).toBe("/api/v1/services/aigc/text2image/image-synthesis");
  });

  it("保留 query string", () => {
    expect(stripProxyPrefix("/api/dashscope/api/v1/tasks/abc?x=1", "/api/dashscope")).toBe(
      "/api/v1/tasks/abc?x=1"
    );
  });

  it("前缀本身映射到根路径", () => {
    expect(stripProxyPrefix("/api/dashscope", "/api/dashscope")).toBe("/");
  });

  it("不误伤前缀相近但不匹配的路径", () => {
    // /api/dashscope-other 不属于 /api/dashscope
    expect(stripProxyPrefix("/api/dashscope-other/x", "/api/dashscope")).toBe(
      "/api/dashscope-other/x"
    );
  });
});

describe("URL 改写与转发规则闭环", () => {
  it("改写再剥前缀，能还原出原始 pathname", () => {
    // 这是回归的关键：改写端与转发端各自演进就会静默 404
    const config = buildViteProxyConfig();

    const cases = [
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
      "https://dashscope.aliyuncs.com/api/v1/tasks/task-123",
      "https://api.openai.com/v1/images/generations",
      "https://generativelanguage.googleapis.com/v1beta/models/x:generateContent",
      "https://api.bfl.ml/v1/flux-pro",
      "https://api.ideogram.ai/generate"
    ];

    for (const fullUrl of cases) {
      const original = new URL(fullUrl);
      const rewritten = toProxyPath(fullUrl);
      expect(rewritten, `expected ${fullUrl} to be proxied`).not.toBeNull();

      // 找到命中的前缀
      const prefix = Object.keys(config).find(
        (key) => rewritten === key || rewritten!.startsWith(`${key}/`)
      );
      expect(prefix, `no proxy prefix matched ${rewritten}`).toBeTruthy();

      const entry = config[prefix as string];
      expect(entry.target).toBe(original.origin);
      expect(entry.rewrite(rewritten as string)).toBe(`${original.pathname}${original.search}`);
    }
  });

  it("未登记的 host 不做改写，交给调用方直连", () => {
    expect(toProxyPath("https://example.internal/v1/images")).toBeNull();
  });

  it("非法 URL 不抛异常", () => {
    expect(toProxyPath("not a url")).toBeNull();
  });

  it("每个登记项都能生成对应的转发规则", () => {
    const config = buildViteProxyConfig();
    expect(Object.keys(config)).toHaveLength(API_PROXY_ENTRIES.length);

    for (const entry of API_PROXY_ENTRIES) {
      expect(config[entry.proxyPrefix].target).toBe(proxyTargetOrigin(entry));
      expect(entry.proxyPrefix.startsWith("/")).toBe(true);
      expect(entry.proxyPrefix.endsWith("/")).toBe(false);
    }
  });
});

/** 记录 configure 钩子实际设置了哪些请求头 */
function captureInjectedHeaders(config: ViteProxyEntryConfig) {
  const headers: Record<string, string> = {};
  config.configure?.({
    on: (_event, listener) => {
      listener({ setHeader: (name, value) => { headers[name] = value; } });
    }
  });
  return headers;
}

describe("密钥注入", () => {
  it("配了 Key 时在转发阶段注入鉴权头", () => {
    const config = buildViteProxyConfig({ DASHSCOPE_API_KEY: "sk-secret" });
    expect(captureInjectedHeaders(config["/api/dashscope"])).toEqual({
      Authorization: "Bearer sk-secret"
    });
  });

  it("没配 Key 时不注入，也不生成空头", () => {
    const config = buildViteProxyConfig({});
    expect(config["/api/dashscope"].configure).toBeUndefined();
  });

  it("空白字符串视为未配置", () => {
    const config = buildViteProxyConfig({ DASHSCOPE_API_KEY: "   " });
    expect(config["/api/dashscope"].configure).toBeUndefined();
  });

  it("按各家要求的头格式注入，不是一律 Bearer", () => {
    const config = buildViteProxyConfig({
      OPENAI_API_KEY: "sk-openai",
      GEMINI_API_KEY: "goog-key",
      BFL_API_KEY: "bfl-key"
    });

    expect(captureInjectedHeaders(config["/api/openai"])).toEqual({
      Authorization: "Bearer sk-openai"
    });
    // Google 用自己的头名，且不带 Bearer 前缀
    expect(captureInjectedHeaders(config["/api/gemini"])).toEqual({
      "x-goog-api-key": "goog-key"
    });
    expect(captureInjectedHeaders(config["/api/flux"])).toEqual({ "x-key": "bfl-key" });
  });

  it("所有密钥环境变量都不带 VITE_ 前缀——带了就会被打进客户端包", () => {
    // 这条是安全边界：VITE_ 前缀的变量会被静态替换进 dist，等于公开密钥
    for (const entry of API_PROXY_ENTRIES) {
      expect(entry.apiKeyEnvVar.startsWith("VITE_"), entry.apiKeyEnvVar).toBe(false);
    }
  });
});

describe("resolveConfiguredProviders", () => {
  it("只返回配了密钥的 Provider", () => {
    expect(resolveConfiguredProviders({ DASHSCOPE_API_KEY: "sk-a" })).toEqual(["qwen"]);
    expect(resolveConfiguredProviders({ OPENAI_API_KEY: "sk-b" })).toEqual(["gpt-image"]);
  });

  it("一个都没配时返回空，交由界面提示去填 .env", () => {
    expect(resolveConfiguredProviders({})).toEqual([]);
  });

  it("空白值不算配置过", () => {
    expect(resolveConfiguredProviders({ DASHSCOPE_API_KEY: "  " })).toEqual([]);
  });

  it("多个密钥时全部返回且不重复", () => {
    const result = resolveConfiguredProviders({
      DASHSCOPE_API_KEY: "sk-a",
      OPENAI_API_KEY: "sk-b",
      GEMINI_API_KEY: "sk-c"
    });
    expect(result).toEqual(["qwen", "gpt-image", "gemini"]);
    expect(new Set(result).size).toBe(result.length);
  });

  it("每个登记项声明的 Provider 都是合法 ID", () => {
    for (const entry of API_PROXY_ENTRIES) {
      for (const provider of entry.providers) {
        expect(IMAGE_PROVIDER_IDS).toContain(provider);
      }
    }
  });
});
