import { apiClient } from '@/api/httpClient';

export type MarketplaceSearchPlatform = 'mercadolivre' | 'shopee';

export type MarketplaceSearchItem = {
  id: string;
  platform: MarketplaceSearchPlatform;
  title: string;
  price?: number;
  currency?: string;
  url?: string;
  image_url?: string;
  category_id?: string;
  seller_name?: string;
  description?: string;
};

export type MarketplaceSearchResponse = {
  platform: MarketplaceSearchPlatform;
  query: string;
  items: MarketplaceSearchItem[];
  source_status: 'live' | 'manual_link_required' | string;
  message?: string;
};

export async function searchMarketplaceOffers(platform: MarketplaceSearchPlatform, query: string, limit = 8) {
  return apiClient.get<MarketplaceSearchResponse>('/marketplace-search', {
    query: { platform, query, limit },
  });
}
