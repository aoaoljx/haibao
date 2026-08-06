export const posterAssetSources = {
  featureBg: "/poster-assets/feature-background.png",
  aiBg: "/poster-assets/ai-background.png",
  logo: "/poster-assets/logo.png",
  logoAi: "/poster-assets/logo-ai.png",
  productBadge: "/poster-assets/product-badge.png",
  aiProductBadge: "/poster-assets/ai-product-badge.png",
  graphic1: "/poster-assets/gallery-graphic-1.png",
  graphic2: "/poster-assets/gallery-graphic-2.png",
  graphic3: "/poster-assets/gallery-graphic-3.png",
  graphic4: "/poster-assets/gallery-graphic-4.png",
  graphic5: "/poster-assets/gallery-graphic-5.png",
  graphic6: "/poster-assets/gallery-graphic-6.png"
} as const;

export type PosterAssetName = keyof typeof posterAssetSources;
