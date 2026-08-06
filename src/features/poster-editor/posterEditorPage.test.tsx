// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";

/**
 * 编辑器接线层的集成测试。
 *
 * 渲染函数、Prompt Engine、Provider 都各自有单测，但「点了生成按钮之后
 * 画布有没有真的拿到那张图」「点了导出有没有真的触发下载」这一层此前没有覆盖，
 * 而 bug 恰好出在这里。
 */

const renderPosterSpy = vi.fn();
const generateVisualImageSpy = vi.fn();

vi.mock("./rendering/posterRenderer", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, renderPoster: (...args: unknown[]) => renderPosterSpy(...args) };
});

vi.mock("@/services/visual-generation", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, generateVisualImage: (...args: unknown[]) => generateVisualImageSpy(...args) };
});

// 只配一个可用 Provider，让界面正常渲染生成按钮
vi.mock("virtual:configured-providers", () => ({ configuredProviderIds: ["gpt-image"] }));

const FAKE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** jsdom 不实现图片解码，给个立刻 onload 的替身 */
class InstantImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 1536;
  naturalHeight = 1024;
  #src = "";
  get src() {
    return this.#src;
  }
  set src(value: string) {
    this.#src = value;
    queueMicrotask(() => this.onload?.());
  }
}

let clickedDownloads: Array<{ href: string; download: string }>;

beforeEach(() => {
  renderPosterSpy.mockReset();
  generateVisualImageSpy.mockReset();
  clickedDownloads = [];

  vi.stubGlobal("Image", InstantImage);

  // jsdom 的 canvas 没有 2d 上下文，也没有 toDataURL / toBlob
  const canvasProto = window.HTMLCanvasElement.prototype;
  vi.spyOn(canvasProto, "getContext").mockReturnValue({} as never);
  vi.spyOn(canvasProto, "toDataURL").mockReturnValue(FAKE_PNG);
  canvasProto.toBlob = function (callback: BlobCallback) {
    callback(new Blob(["fake-png-bytes"], { type: "image/png" }));
  };

  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: () => "blob:mock-object-url",
    revokeObjectURL: () => {}
  });

  // 记录下载动作
  const originalCreate = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string, ...rest) => {
    const el = originalCreate(tag, ...(rest as []));
    if (tag === "a") {
      const anchor = el as HTMLAnchorElement;
      anchor.click = () => {
        clickedDownloads.push({ href: anchor.href, download: anchor.download });
      };
    }
    return el;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** 取最近一次传给 renderPoster 的入参 */
function lastRenderInput() {
  const call = renderPosterSpy.mock.calls.at(-1);
  return call?.[1] as Record<string, unknown> | undefined;
}

async function mountEditor() {
  const { PosterEditorPage } = await import("./components/PosterEditorPage");
  await act(async () => {
    render(<PosterEditorPage />);
  });
  // 等素材加载完成（usePosterAssets 里的 Image 也走替身，立刻 onload）
  await waitFor(() => expect(renderPosterSpy).toHaveBeenCalled());
}

describe("AI 生成后画布要显示那张图", () => {
  it("生成成功后，renderPoster 拿到 AI 图且来源为 ai", async () => {
    generateVisualImageSpy.mockResolvedValue({
      image: { dataUrl: FAKE_PNG, base64: "x", model: "gpt-image-2", transparentBackground: false },
      trace: { sceneKey: "code", sceneName: "代码编辑", matchedCategories: [], matchedKeywords: [], extractedKeywords: [], visualElements: [] },
      backgroundRemoved: true
    });

    await mountEditor();

    // 生成前：画布上没有 AI 图
    expect(lastRenderInput()?.aiGeneratedImage).toBeNull();

    const button = screen.getByRole("button", { name: /生成图形/ });
    await act(async () => {
      button.click();
    });

    await waitFor(() => {
      const input = lastRenderInput();
      expect(input?.graphicSource).toBe("ai");
      expect(input?.aiGeneratedImage).toBeTruthy();
    });
  });

  /**
   * 回归：连续生成两次，画布必须换成第二张。
   * 用户反馈「每次生成的图片都一模一样」，而模型端已验证每次输出确实不同，
   * 所以嫌疑在这一层。
   */
  it("连续生成两次，画布拿到的是第二张而不是第一张", async () => {
    const first = "data:image/png;base64,FIRSTIMAGE";
    const second = "data:image/png;base64,SECONDIMAGE";

    const makeResult = (dataUrl: string) => ({
      image: { dataUrl, base64: "x", model: "gpt-image-2", transparentBackground: false },
      trace: {
        sceneKey: "code",
        sceneName: "代码编辑",
        matchedCategories: [],
        matchedKeywords: [],
        extractedKeywords: [],
        visualElements: []
      },
      backgroundRemoved: true
    });

    generateVisualImageSpy
      .mockResolvedValueOnce(makeResult(first))
      .mockResolvedValueOnce(makeResult(second));

    await mountEditor();
    const button = screen.getByRole("button", { name: /生成图形/ });

    await act(async () => {
      button.click();
    });
    await waitFor(() =>
      expect((lastRenderInput()?.aiGeneratedImage as { src: string })?.src).toBe(first)
    );

    await act(async () => {
      button.click();
    });

    await waitFor(() => {
      expect(generateVisualImageSpy).toHaveBeenCalledTimes(2);
      expect((lastRenderInput()?.aiGeneratedImage as { src: string })?.src).toBe(second);
    });
  });

  it("生成失败时不把画布清空，仍保留原有图形", async () => {
    generateVisualImageSpy.mockRejectedValue(new Error("模型炸了"));

    await mountEditor();
    const before = lastRenderInput();

    await act(async () => {
      screen.getByRole("button", { name: /生成图形/ }).click();
    });

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("模型炸了"));
    expect(lastRenderInput()?.visualKey).toBe(before?.visualKey);
  });
});

describe("绘制失败要看得见", () => {
  it("renderPoster 抛错时给出提示，而不是停在一张不更新的画布上", async () => {
    await mountEditor();

    renderPosterSpy.mockImplementation(() => {
      throw new Error("素材尺寸异常");
    });

    // 触发一次重绘
    await act(async () => {
      screen.getByRole("button", { name: /AI 功能发布/ }).click();
    });

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("画布绘制失败：素材尺寸异常")
    );
  });
});

describe("导出下载", () => {
  it("点击导出会真的触发一次下载", async () => {
    await mountEditor();

    await act(async () => {
      screen.getByRole("button", { name: /导出/ }).click();
    });

    await waitFor(() => expect(clickedDownloads).toHaveLength(1));
    expect(clickedDownloads[0].download).toMatch(/\.png$/);
  });

  it("导出用的是 blob: 链接而不是超大 data URL", async () => {
    // 3840x1920 的 PNG 转成 data URL 有十几 MB，
    // Chrome 会拦掉这么大的 data: 下载，必须走 blob
    await mountEditor();

    await act(async () => {
      screen.getByRole("button", { name: /导出/ }).click();
    });

    await waitFor(() => expect(clickedDownloads).toHaveLength(1));
    expect(clickedDownloads[0].href.startsWith("blob:")).toBe(true);
  });

  it("导出后给出可再次点击的下载入口", async () => {
    await mountEditor();

    await act(async () => {
      screen.getByRole("button", { name: /导出/ }).click();
    });

    await waitFor(() => {
      const link = screen.getByRole("link", { name: /下载 PNG/ });
      expect(link.getAttribute("href")?.startsWith("blob:")).toBe(true);
    });
  });
});
