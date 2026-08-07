export const posterAssetSources = {
  featureBg: "/poster-assets/feature-background.png",
  aiBg: "/poster-assets/ai-template-background.png",
  logo: "/poster-assets/logo.png",
  logoAi: "/poster-assets/ai-template-logo.png",
  productBadge: "/poster-assets/product-badge.png",
  aiProductBadge: "/poster-assets/ai-template-badge.png",
  aiHero: "/poster-assets/ai-template-visual.png",
  graphic1: "/poster-assets/library-graphic-1.png",
  graphic2: "/poster-assets/library-graphic-2.png",
  graphic3: "/poster-assets/library-graphic-3.png",
  graphic4: "/poster-assets/library-graphic-4.png",
  graphic5: "/poster-assets/library-graphic-5.png"
} as const;

export type PosterAssetName = keyof typeof posterAssetSources;
