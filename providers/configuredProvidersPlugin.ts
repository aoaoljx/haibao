import { resolveConfiguredProviders, type ServerEnv } from "./apiProxyMap";

/**
 * 把「哪些 Provider 配好了密钥」以虚拟模块的形式交给前端。
 *
 * 用虚拟模块而不是 `define`：实测 define 在本项目的 dev server 下不会替换
 * `providers/` 里的标识符，会造成「构建能用、npm run dev 却报没有可用模型」
 * 这种 dev/prod 割裂。虚拟模块是 Vite 官方为构建期注入数据提供的机制，
 * dev 与 build 走同一条路径，行为一致。
 *
 * 注入的只有 Provider ID，**不含密钥**——密钥留在 vite 服务端进程内，
 * 转发请求时才注入鉴权头。
 */
export const CONFIGURED_PROVIDERS_MODULE_ID = "virtual:configured-providers";

const RESOLVED_ID = `\0${CONFIGURED_PROVIDERS_MODULE_ID}`;

export interface MinimalVitePlugin {
  name: string;
  resolveId(id: string): string | null;
  load(id: string): string | null;
}

export function configuredProvidersPlugin(env: ServerEnv): MinimalVitePlugin {
  const providers = resolveConfiguredProviders(env);

  return {
    name: "idevflow:configured-providers",
    resolveId(id) {
      return id === CONFIGURED_PROVIDERS_MODULE_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      return `export const configuredProviderIds = ${JSON.stringify(providers)};\n`;
    }
  };
}
