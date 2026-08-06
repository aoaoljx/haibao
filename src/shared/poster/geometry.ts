import type { VisualBounds } from "./types";

/**
 * 按等比缩放把 srcW×srcH 放进 box，居中，不裁切也不拉伸（contain）。
 *
 * 右侧图形是品牌资产，宁可留白也不能变形。模型只能吐出有限的几种尺寸，
 * 和海报里的槽位比例不可能次次对上，差值在这里吸收掉。
 */
export function fitContain(
  srcWidth: number,
  srcHeight: number,
  box: VisualBounds
): VisualBounds {
  // 尺寸不可用时退回填满整个槽位，至少不会把图画丢了
  if (!(srcWidth > 0) || !(srcHeight > 0)) return { ...box };

  const scale = Math.min(box.w / srcWidth, box.h / srcHeight);
  const w = srcWidth * scale;
  const h = srcHeight * scale;

  return {
    x: box.x + (box.w - w) / 2,
    y: box.y + (box.h - h) / 2,
    w,
    h
  };
}

/**
 * 由海报槽位反推该向模型请求的图片尺寸，保证生成比例贴近实际绘制比例。
 *
 * 之前这里是硬编码的 1536x1536（1:1），而槽位普遍在 1.24:1~1.55:1，
 * 直接 drawImage 拉伸会明显变形。
 *
 * `maxPixels` 控制总像素规模：各家模型都有尺寸上限，且海报里这块区域
 * 最终也就 1600~2300px 宽，请求更大只是浪费时间和额度。
 */
export function deriveRequestSize(
  box: VisualBounds,
  maxPixels = 1536 * 1536
): `${number}x${number}` {
  const ratio = box.w > 0 && box.h > 0 ? box.w / box.h : 1;
  const scale = Math.sqrt(maxPixels / ratio);

  // 对齐到 64 的倍数：多数扩散模型要求边长能被 8/64 整除
  const width = roundToMultiple(scale * ratio, 64);
  const height = roundToMultiple(scale, 64);

  return `${width}x${height}`;
}

function roundToMultiple(value: number, multiple: number) {
  return Math.max(multiple, Math.round(value / multiple) * multiple);
}
