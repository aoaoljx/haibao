import {
  removeBorderBackground,
  type BackgroundRemovalOptions,
  type BackgroundRemovalStats
} from "./backgroundRemoval";

/**
 * 浏览器侧封装：把 data URL 图片抠成透明底 PNG。
 *
 * 与算法核心分开放，是为了让 removeBorderBackground() 能脱离 canvas 直接测。
 */

export interface RemoveImageBackgroundResult {
  dataUrl: string;
  stats: BackgroundRemovalStats;
}

/**
 * 去背结果的可信下限/上限。
 *
 * 背景占比过低说明图基本是满幅内容，多半没有可去的底；
 * 过高说明连主体一起被吃了。两种情况都退回原图，宁可保留白底也不要毁掉图形。
 */
const MIN_PLAUSIBLE_REMOVED_RATIO = 0.02;
const MAX_PLAUSIBLE_REMOVED_RATIO = 0.95;

export async function removeImageBackground(
  dataUrl: string,
  options: BackgroundRemovalOptions = {}
): Promise<RemoveImageBackgroundResult | null> {
  const image = await loadImage(dataUrl);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    // 跨源图片会污染画布导致 getImageData 抛错；此处图片来自 data URL，
    // 正常不会触发，兜底避免整条生成链路失败
    return null;
  }

  const stats = removeBorderBackground(imageData.data, width, height, options);

  if (
    stats.removedRatio < MIN_PLAUSIBLE_REMOVED_RATIO ||
    stats.removedRatio > MAX_PLAUSIBLE_REMOVED_RATIO
  ) {
    return null;
  }

  ctx.putImageData(imageData, 0, 0);
  return { dataUrl: canvas.toDataURL("image/png"), stats };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("去背失败：图片无法加载"));
    image.src = src;
  });
}
