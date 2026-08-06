import { describe, expect, it } from "vitest";
import {
  createImageProvider,
  getImageProviderDefinition,
  IMAGE_PROVIDER_IDS,
  listImageProviderDefinitions
} from "./registry";
import { resolveConfiguredProviders } from "./apiProxyMap";

/** 未接线的占位适配器抛出的固定措辞 */
const NOT_CONNECTED = /adapter is not connected yet/i;

async function callAdapter(id: (typeof IMAGE_PROVIDER_IDS)[number]) {
  const adapter = createImageProvider(id);
  return adapter.generateImage(
    { prompt: "connectivity probe", size: "1024x1024" },
    { provider: id }
  );
}

describe("implemented 标记必须与真实情况一致", () => {
  /**
   * 这条是防漂移的关键：`implemented` 决定模型出不出现在界面下拉里。
   * 标成 true 但其实还是占位桩，运营就会选中一个点了必报错的模型。
   */
  it.each(IMAGE_PROVIDER_IDS.filter((id) => !getImageProviderDefinition(id).implemented))(
    "%s 标记为未实现，调用确实抛占位错误",
    async (id) => {
      await expect(callAdapter(id)).rejects.toThrow(NOT_CONNECTED);
    }
  );

  it.each(IMAGE_PROVIDER_IDS.filter((id) => getImageProviderDefinition(id).implemented))(
    "%s 标记为已实现，不会抛占位错误",
    async (id) => {
      // 没有网络也没有密钥，这里必然失败——但失败原因不能是"适配器没接"
      await expect(callAdapter(id)).rejects.not.toThrow(NOT_CONNECTED);
    }
  );

  it("当前已接入的是千问、gpt-image、Replicate", () => {
    // 故意钉死这份名单：新接一个 Provider 时这条会红，
    // 提醒同步更新 .env.example 与文档里的「哪些能用」
    const implemented = listImageProviderDefinitions()
      .filter((definition) => definition.implemented)
      .map((definition) => definition.id);

    expect(implemented.sort()).toEqual(["gpt-image", "qwen", "replicate"]);
  });
});

describe("配了密钥 ≠ 可用", () => {
  it("填了未接线 Provider 的密钥，不会让它出现在可用列表里", async () => {
    // resolveConfiguredProviders 只看密钥
    expect(resolveConfiguredProviders({ GEMINI_API_KEY: "sk-x" })).toEqual(["gemini"]);

    // 但 gemini 还没接适配器，所以界面读的那份要把它滤掉
    expect(getImageProviderDefinition("gemini").implemented).toBe(false);
  });
});

describe("Provider 定义的基本完整性", () => {
  it.each(IMAGE_PROVIDER_IDS)("%s 的定义字段齐全", (id) => {
    const definition = getImageProviderDefinition(id);

    expect(definition.id).toBe(id);
    expect(definition.displayName).toBeTruthy();
    expect(definition.description).toBeTruthy();
    expect(typeof definition.implemented).toBe("boolean");
    expect(typeof definition.supportsTransparentBackground).toBe("boolean");
  });

  it("已接入的 Provider 都给了默认模型，运营不填也能用", () => {
    for (const definition of listImageProviderDefinitions()) {
      if (!definition.implemented) continue;
      expect(definition.defaultModel, definition.id).toBeTruthy();
    }
  });
});
