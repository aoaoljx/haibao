// 注意：AI 版海报的背景是代码里画的渐变（见 posterRenderer 的 POSTER_THEMES），
// 不再加载 ai-background.png——它曾被下载却从未绘制，白白拖慢首屏。
export const posterAssetSources = {
  featureBg: "/poster-assets/feature-background.png",
  logo: "/poster-assets/logo.png",
  logoAi: "/poster-assets/logo-ai.png",
  productBadge: "/poster-assets/product-badge.png",
  graphic1: "/poster-assets/poster-graphic-1-clean-v3.png",
  graphic2: "/poster-assets/poster-graphic-2-clean-v3.png",
  graphic3: "/poster-assets/poster-graphic-3-clean-v3.png",
  graphic4: "/poster-assets/poster-graphic-4-clean-v3.png",
  graphic5: "/poster-assets/poster-graphic-5-clean-v3.png"
} as const;

export type PosterAssetName = keyof typeof posterAssetSources;
