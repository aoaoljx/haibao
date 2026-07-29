export const posterAssetSources = {
  featureBg: "/poster-assets/feature-background.png",
  aiBg: "/poster-assets/ai-background.png",
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
