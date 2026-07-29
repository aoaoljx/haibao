import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 3000
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
