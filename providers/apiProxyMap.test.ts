import { describe, expect, it } from "vitest";
import {
  API_PROXY_ENTRIES,
  buildViteProxyConfig,
  proxyTargetOrigin,
  stripProxyPrefix,
  toProxyPath
} from "./apiProxyMap";

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
