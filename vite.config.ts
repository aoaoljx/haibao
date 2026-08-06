import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { buildViteProxyConfig } from "./providers/apiProxyMap";

/**
 * dev 与 preview 共用同一份转发规则。
 * 前端 `proxyUrl()` 改写出的路径、这里的转发规则、以及生产环境 Nginx 的 location
 * 三者必须一致，否则模型调用会静默 404。三处都以 providers/apiProxyMap.ts 为准。
 */
const apiProxy = buildViteProxyConfig();

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 3000,
    proxy: apiProxy
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    proxy: apiProxy
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@providers": fileURLToPath(new URL("./providers", import.meta.url))
    }
  }
});
