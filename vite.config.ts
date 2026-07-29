import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 3000,
    proxy: {
      // 千问百炼 DashScope API — 完整路径代理，无需 rewrite
      "/api/dashscope": {
        target: "https://dashscope.aliyuncs.com/api/v1",
        changeOrigin: true,
        secure: false
      },
      // OpenAI API
      "/api/openai": {
        target: "https://api.openai.com/v1",
        changeOrigin: true,
        secure: false
      },
      // Google Gemini API
      "/api/gemini": {
        target: "https://generativelanguage.googleapis.com",
        changeOrigin: true,
        secure: false
      },
      // Flux / Black Forest Labs
      "/api/flux": {
        target: "https://api.bfl.ml",
        changeOrigin: true,
        secure: false
      },
      // Ideogram
      "/api/ideogram": {
        target: "https://api.ideogram.ai",
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: "127.0.0.1",
    port: 4173
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@providers": fileURLToPath(new URL("./providers", import.meta.url))
    }
  }
});
