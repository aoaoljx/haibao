import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { buildViteProxyConfig } from "./providers/apiProxyMap";
import { configuredProvidersPlugin } from "./providers/configuredProvidersPlugin";

/**
 * 模型密钥从 .env 读取，只存在于本进程内。
 *
 * loadEnv 的第三个参数传空串表示不按前缀过滤，这样能读到 DASHSCOPE_API_KEY 这类
 * **无前缀**变量。无前缀是刻意的：vite 只把 VITE_ 前缀的变量静态替换进客户端包，
 * 所以密钥不会出现在 dist 里，也不会经过浏览器——转发时由下面的 proxy 注入请求头。
 *
 * 前端能拿到的只有「哪些模型已配好可用」这份列表，由密钥是否存在自动推导，
 * 经 virtual:configured-providers 虚拟模块注入，不含密钥本身。
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // dev 与 preview 共用同一份转发规则，避免"开发能用、预览 404"
  const apiProxy = buildViteProxyConfig(env);

  return {
    plugins: [configuredProvidersPlugin(env)],
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
  };
});
