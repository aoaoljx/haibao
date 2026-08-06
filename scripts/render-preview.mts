/**
 * 用 node canvas 把两版海报渲染成 PNG，用于人工确认排版。
 *
 * 不属于产品代码，也不进构建；@napi-rs/canvas 需要临时安装：
 *   npm install --no-save @napi-rs/canvas
 *   npx vite-node scripts/render-preview.mts -- <输出目录>
 *
 * 字体依赖系统，node 端缺少 PingFang SC 时中文会渲染成方框，字形与浏览器不一致，
 * 但足以核对构图、图层顺序、配色和图形位置。
 *
 * 用 .mts 后缀是有意的：tsconfig 的 include 只匹配 .ts，
 * 这样没装上面那两个可选依赖的人执行 npm run typecheck 也不会失败。
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { posterAssetSources } from "../src/shared/poster/assets";
import { createDefaultGraphicTextState, posterPresets } from "../src/shared/poster/defaults";
import { renderPoster, type PosterImages } from "../src/features/poster-editor/rendering/posterRenderer";
import type { GraphicSource, PosterMode } from "../src/shared/poster/types";

const outDir = process.argv[2] || ".";

const images = Object.fromEntries(
  await Promise.all(
    Object.entries(posterAssetSources).map(async ([name, src]) => [
      name,
      await loadImage(`public${src}`)
    ])
  )
) as unknown as PosterImages;

async function render(mode: PosterMode, source: GraphicSource, label: string) {
  const canvas = createCanvas(3840, 1920);
  const preset = posterPresets[mode];

  renderPoster(canvas as unknown as HTMLCanvasElement, {
    mode,
    copy: preset.copy,
    visualKey: preset.selection === "auto" ? "graphic1" : preset.selection,
    graphicText: createDefaultGraphicTextState(),
    graphicSource: source,
    images,
    aiGeneratedImage: null,
    uploadedImage: null
  });

  const path = `${outDir}/${label}.png`;
  writeFileSync(path, canvas.toBuffer("image/png"));
  console.log("wrote", path);
}

await render("feature", "library", "poster-feature");
await render("ai", "library", "poster-ai");
