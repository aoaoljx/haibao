/**
 * 把模型返回的浅色底图形抠成透明 PNG。
 *
 * 海报右侧图形必须是透明底，否则贴上去就是一个色块。但多数文生图模型
 * （含当前唯一接线的千问）都不产透明通道，只能在客户端补这一步。
 *
 * 关键点是**从边缘 flood-fill**，而不是"所有接近白色的像素都抹掉"：
 * 图形内部大量存在白色卡片、玻璃面板、高光，一刀切会把主体掏空。
 * 只有从画布边缘连通到的背景色才算背景。
 */

export interface BackgroundRemovalOptions {
  /** 颜色距离容差（0~255），越大去得越狠。默认 32。 */
  tolerance?: number;
  /** 边缘羽化系数，容差的倍数。默认 1.8，用来消除锯齿。 */
  featherScale?: number;
}

export interface BackgroundRemovalStats {
  /** 被判定为背景、置为全透明的像素数 */
  removedPixels: number;
  /** 处于羽化带、被部分减弱的像素数 */
  featheredPixels: number;
  /** 估计出的背景色 */
  backgroundColor: [number, number, number];
  /** 背景占比，用于判断这次去背是否可信 */
  removedRatio: number;
}

/**
 * 默认容差偏保守（8 而不是更宽松的值），是被真实出图逼出来的。
 *
 * 海报要的 2.5D 玻璃拟态风格，主体本身就是浅蓝半透明玻璃，
 * 和它要被抠掉的浅色背景几乎同色。实测某张 gpt-image 出图：
 *   容差 8  → 去除 37%，主体完整
 *   容差 16 → 去除 52%，玻璃面板被打出大洞
 *   容差 32 → 去除 73%，上半部分面板基本没了
 *
 * 宁可边缘留一点背景残影，也不能把主体吃掉——残影在浅色海报上几乎看不见，
 * 主体缺块则一眼就废。需要更狠时用 VITE_DEBG_TOLERANCE 调。
 */
const DEFAULT_TOLERANCE = 8;
const DEFAULT_FEATHER_SCALE = 1.8;

/**
 * 原地修改 RGBA 像素数组的 alpha 通道。
 *
 * 与 canvas 解耦，方便直接测；浏览器侧的封装见 removeImageBackground()。
 */
export function removeBorderBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: BackgroundRemovalOptions = {}
): BackgroundRemovalStats {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const featherScale = options.featherScale ?? DEFAULT_FEATHER_SCALE;
  const pixelCount = width * height;

  if (pixelCount === 0) {
    return {
      removedPixels: 0,
      featheredPixels: 0,
      backgroundColor: [255, 255, 255],
      removedRatio: 0
    };
  }

  const background = estimateBorderColor(data, width, height);
  const [bgR, bgG, bgB] = background;

  // flood-fill：从所有边缘像素出发，沿着与背景色接近的连通区域扩散
  const removed = new Uint8Array(pixelCount);
  const stack = new Int32Array(pixelCount);
  let stackSize = 0;

  const pushIfBackground = (index: number) => {
    if (removed[index]) return;
    const offset = index * 4;
    if (colorDistance(data[offset], data[offset + 1], data[offset + 2], bgR, bgG, bgB) > tolerance) {
      return;
    }
    removed[index] = 1;
    stack[stackSize++] = index;
  };

  for (let x = 0; x < width; x++) {
    pushIfBackground(x);
    pushIfBackground((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    pushIfBackground(y * width);
    pushIfBackground(y * width + width - 1);
  }

  let removedPixels = 0;
  while (stackSize > 0) {
    const index = stack[--stackSize];
    removedPixels++;

    const x = index % width;
    const y = (index - x) / width;

    if (x > 0) pushIfBackground(index - 1);
    if (x < width - 1) pushIfBackground(index + 1);
    if (y > 0) pushIfBackground(index - width);
    if (y < height - 1) pushIfBackground(index + width);
  }

  // 羽化：紧贴透明区、颜色仍接近背景的像素按距离减弱 alpha，避免硬边锯齿
  const featherLimit = tolerance * featherScale;
  let featheredPixels = 0;

  if (featherLimit > tolerance) {
    for (let index = 0; index < pixelCount; index++) {
      if (removed[index]) continue;

      const x = index % width;
      const y = (index - x) / width;
      const touchesRemoved =
        (x > 0 && removed[index - 1]) ||
        (x < width - 1 && removed[index + 1]) ||
        (y > 0 && removed[index - width]) ||
        (y < height - 1 && removed[index + width]);

      if (!touchesRemoved) continue;

      const offset = index * 4;
      const distance = colorDistance(
        data[offset],
        data[offset + 1],
        data[offset + 2],
        bgR,
        bgG,
        bgB
      );
      if (distance >= featherLimit) continue;

      const strength = (distance - tolerance) / (featherLimit - tolerance);
      data[offset + 3] = Math.round(data[offset + 3] * clamp01(strength));
      featheredPixels++;
    }
  }

  for (let index = 0; index < pixelCount; index++) {
    if (removed[index]) data[index * 4 + 3] = 0;
  }

  return {
    removedPixels,
    featheredPixels,
    backgroundColor: background,
    removedRatio: removedPixels / pixelCount
  };
}

/**
 * 估计背景色：对边缘像素按 16 级量化后取众数。
 *
 * 用众数而不是平均值，是因为背景常带轻微渐变，平均值会落到不存在的中间色上。
 */
export function estimateBorderColor(
  data: Uint8ClampedArray,
  width: number,
  height: number
): [number, number, number] {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();

  const sample = (index: number) => {
    const offset = index * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count++;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  };

  for (let x = 0; x < width; x++) {
    sample(x);
    sample((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    sample(y * width);
    sample(y * width + width - 1);
  }

  let best: { count: number; r: number; g: number; b: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket;
  }

  if (!best) return [255, 255, 255];
  return [
    Math.round(best.r / best.count),
    Math.round(best.g / best.count),
    Math.round(best.b / best.count)
  ];
}

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3);
}

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
