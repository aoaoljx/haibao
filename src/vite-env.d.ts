/// <reference types="vite/client" />

/**
 * 由 providers/configuredProvidersPlugin.ts 生成的虚拟模块：
 * 哪些 Provider 在 .env 里配好了密钥。
 *
 * 只有 Provider ID，不含密钥本身。密钥留在 vite 服务端进程内，
 * 转发时注入请求头，从不进入客户端包。
 */
declare module "virtual:configured-providers" {
  export const configuredProviderIds: string[];
}
