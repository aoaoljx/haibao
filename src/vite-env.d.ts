/// <reference types="vite/client" />

/**
 * 构建时由 vite.config.ts 注入：哪些 Provider 在 .env 里配好了密钥。
 *
 * 只有 Provider ID，不含密钥本身。密钥留在 vite 服务端进程内，
 * 转发时注入请求头，从不进入客户端包。
 */
declare const __CONFIGURED_PROVIDERS__: string[];
