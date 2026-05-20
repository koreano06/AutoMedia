export const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'facebook', 'youtube'] as const;
export const MARKETPLACE_PLATFORMS = ['shopee', 'mercadolivre'] as const;
export const ALL_PLATFORMS = [...SOCIAL_PLATFORMS, ...MARKETPLACE_PLATFORMS] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type MarketplacePlatform = (typeof MARKETPLACE_PLATFORMS)[number];
