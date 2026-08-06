import { describe, expect, it } from "vitest";
import { estimateBorderColor, removeBorderBackground } from "./backgroundRemoval";

interface TestImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

function createImage(width: number, height: number, fill: [number, number, number]): TestImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

function fillRect(
  image: TestImage,
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: [number, number, number]
) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const offset = (y * image.width + x) * 4;
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = 255;
    }
  }
}

function alphaAt(image: TestImage, x: number, y: number) {
  return image.data[(y * image.width + x) * 4 + 3];
}

describe("estimateBorderColor", () => {
  it("取边缘众数而非平均值", () => {
    const image = createImage(20, 20, [250, 250, 250]);
    // 一角染成深色，平均值会被拉偏，众数不会
    fillRect(image, 0, 0, 3, 3, [10, 10, 10]);

    const [r, g, b] = estimateBorderColor(image.data, image.width, image.height);
    expect(r).toBeGreaterThan(240);
    expect(g).toBeGreaterThan(240);
    expect(b).toBeGreaterThan(240);
  });
});

describe("removeBorderBackground", () => {
  it("去掉白底，保留中心主体", () => {
    const image = createImage(40, 40, [255, 255, 255]);
    fillRect(image, 12, 12, 16, 16, [30, 90, 200]);

    const stats = removeBorderBackground(image.data, image.width, image.height);

    expect(alphaAt(image, 0, 0)).toBe(0); // 角落是背景
    expect(alphaAt(image, 20, 20)).toBe(255); // 中心主体保留
    expect(stats.removedRatio).toBeGreaterThan(0.5);
    expect(stats.backgroundColor[0]).toBeGreaterThan(240);
  });

  it("不掏空主体内部的白色区域——这是从边缘 flood-fill 的意义", () => {
    const image = createImage(40, 40, [255, 255, 255]);
    // 蓝色卡片，内部嵌一块纯白（模拟玻璃面板/高光）
    fillRect(image, 8, 8, 24, 24, [30, 90, 200]);
    fillRect(image, 16, 16, 8, 8, [255, 255, 255]);

    removeBorderBackground(image.data, image.width, image.height);

    expect(alphaAt(image, 0, 0)).toBe(0); // 外部白底去掉
    expect(alphaAt(image, 19, 19)).toBe(255); // 内部白色保留，没被连带抹掉
  });

  it("背景带轻微渐变时仍能整片去掉", () => {
    const image = createImage(40, 40, [255, 255, 255]);
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        const offset = (y * 40 + x) * 4;
        const shade = 255 - Math.floor((x / 40) * 12); // 12 级渐变，在容差内
        image.data[offset] = shade;
        image.data[offset + 1] = shade;
        image.data[offset + 2] = 255;
      }
    }
    fillRect(image, 15, 15, 10, 10, [20, 40, 80]);

    const stats = removeBorderBackground(image.data, image.width, image.height);

    expect(alphaAt(image, 0, 0)).toBe(0);
    expect(alphaAt(image, 39, 39)).toBe(0);
    expect(alphaAt(image, 20, 20)).toBe(255);
    expect(stats.removedRatio).toBeGreaterThan(0.8);
  });

  it("主体连到边缘时不会顺着主体蔓延", () => {
    const image = createImage(40, 40, [255, 255, 255]);
    // 主体从左边缘一直伸到中间
    fillRect(image, 0, 15, 25, 10, [30, 90, 200]);

    removeBorderBackground(image.data, image.width, image.height);

    expect(alphaAt(image, 0, 20)).toBe(255); // 贴边的主体像素保留
    expect(alphaAt(image, 0, 0)).toBe(0); // 真背景仍被去掉
  });

  it("满幅无背景的图不会被误伤", () => {
    const image = createImage(20, 20, [30, 90, 200]);
    const stats = removeBorderBackground(image.data, image.width, image.height);

    // 整幅同色时边缘色就是主体色，会被全部判定为背景，
    // 交由调用方的 removedRatio 上限拦截（见 backgroundRemoval.browser.ts）
    expect(stats.removedRatio).toBeGreaterThan(MAX_RATIO_GUARD);
  });

  it("空图不崩", () => {
    const stats = removeBorderBackground(new Uint8ClampedArray(0), 0, 0);
    expect(stats.removedPixels).toBe(0);
    expect(stats.removedRatio).toBe(0);
  });

  it("容差越大去得越多", () => {
    const build = () => {
      const image = createImage(40, 40, [255, 255, 255]);
      fillRect(image, 15, 15, 10, 10, [225, 225, 225]); // 与背景差异很小的主体
      return image;
    };

    const tight = build();
    const loose = build();
    const tightStats = removeBorderBackground(tight.data, 40, 40, { tolerance: 5 });
    const looseStats = removeBorderBackground(loose.data, 40, 40, { tolerance: 60 });

    expect(looseStats.removedRatio).toBeGreaterThan(tightStats.removedRatio);
  });
});

// 与 backgroundRemoval.browser.ts 中的 MAX_PLAUSIBLE_REMOVED_RATIO 对应
const MAX_RATIO_GUARD = 0.95;
