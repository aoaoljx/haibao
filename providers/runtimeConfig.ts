// 由 configuredProvidersPlugin 在构建/开发期生成，内容取决于 .env 里配了哪些密钥
import { configuredProviderIds } from "virtual:configured-providers";
import { getImageProviderDefinition, IMAGE_PROVIDER_IDS, isImageProviderId } from "./registry";
import type { ImageProviderId } from "./types";

/**
 * 运行期的 Provider 可用性与调节项，全部来自环境变量，界面上不再有配置表单。
 *
 * 边界很清楚：
 * - **密钥**（无前缀，如 DASHSCOPE_API_KEY）只有 vite 服务端读得到，
 *   转发时注入请求头，永远不进这个文件、不进客户端包。
 * - **可用性**（哪些 Provider 配好了密钥）由 vite.config 依据密钥是否存在推导后
 *   通过 virtual:configured-providers 注入，只有 Provider ID，不含密钥。
 * - **非机密调节项**（VITE_ 前缀）直接读 import.meta.env。
 */

/** .env 里配了密钥的 Provider——不代表适配器已接入 */
function providersWithKey(): ImageProviderId[] {
  return configuredProviderIds.filter(isImageProviderId);
}

/**
 * 真正可用的 Provider：**既配了密钥，又接入了真实适配器**。
 *
 * 两个条件缺一不可。七个 Provider 里目前只有千问和 gpt-image 有真实适配器，
 * 其余五个调用会抛「adapter is not connected yet」。只按密钥过滤的话，
 * 填了 GEMINI_API_KEY 就会让 Gemini 出现在下拉里，选中后点生成才报错。
 */
export function configuredProviders(): ImageProviderId[] {
  return providersWithKey().filter((id) => getImageProviderDefinition(id).implemented);
}

/**
 * 配了密钥但适配器还没接的 Provider。
 *
 * 界面用它给一句说明——否则运营填了 Key 却发现模型没出现，会以为配错了。
 */
export function providersAwaitingAdapter(): ImageProviderId[] {
  return providersWithKey().filter((id) => !getImageProviderDefinition(id).implemented);
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

/**
 * 从环境变量读取指定 Provider 要用的模型名。返回 undefined 时适配器用自己的默认值。
 *
 * 模型名不是机密，所以走 VITE_ 前缀。对 Replicate 尤其有用——
 * 换 Flux / SDXL / 其它开源模型只要改这个变量，不用动代码。
 */
export function providerModel(provider: ImageProviderId): string | undefined {
  const env = import.meta.env;
  const configured: Partial<Record<ImageProviderId, string | undefined>> = {
    replicate: env.VITE_REPLICATE_MODEL,
    "gpt-image": env.VITE_OPENAI_IMAGE_MODEL,
    qwen: env.VITE_QWEN_MODEL
  };

  return configured[provider]?.trim() || undefined;
}
