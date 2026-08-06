import { IMAGE_PROVIDER_IDS, isImageProviderId } from "./registry";
import type { ImageProviderId } from "./types";

/**
 * 运行期的 Provider 可用性与调节项，全部来自环境变量，界面上不再有配置表单。
 *
 * 边界很清楚：
 * - **密钥**（无前缀，如 DASHSCOPE_API_KEY）只有 vite 服务端读得到，
 *   转发时注入请求头，永远不进这个文件、不进客户端包。
 * - **可用性**（哪些 Provider 配好了）由 vite.config 依据密钥是否存在推导后
 *   通过 __CONFIGURED_PROVIDERS__ 注入，只有 Provider ID，不含密钥。
 * - **非机密调节项**（VITE_ 前缀）直接读 import.meta.env。
 */

/** 已在 .env 中配好密钥、可以真正调用的 Provider */
export function configuredProviders(): ImageProviderId[] {
  const injected = typeof __CONFIGURED_PROVIDERS__ !== "undefined" ? __CONFIGURED_PROVIDERS__ : [];
  return injected.filter(isImageProviderId);
}

/**
 * 默认选中的 Provider。
 *
 * 优先用已配好的第一个；一个都没配时仍返回一个合法值，
 * 让界面能正常渲染并提示去填 .env，而不是崩在这里。
 */
export function defaultProvider(): ImageProviderId {
  return configuredProviders()[0] ?? IMAGE_PROVIDER_IDS[0];
}

/** 读取某个 Provider 的非机密调节项（VITE_ 前缀，允许进入客户端） */
export function providerExtras(provider: ImageProviderId): Record<string, string> {
  if (provider !== "qwen") return {};

  const env = import.meta.env;
  return {
    promptExtend: env.VITE_QWEN_PROMPT_EXTEND ?? "false",
    watermark: env.VITE_QWEN_WATERMARK ?? "false"
  };
}
