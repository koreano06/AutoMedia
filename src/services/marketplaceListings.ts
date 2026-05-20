import { apiClient, isNotFoundError } from '@/api/httpClient';
import type { EntityId, MarketplaceListing } from '@/types/entities';

export type MarketplaceListingPayload = Omit<MarketplaceListing, 'id'>;

export async function listMarketplaceListings(order = '-created_at', limit = 200) {
  try {
    return await apiClient.getList<MarketplaceListing>('/marketplace-listings', { query: { order, limit } });
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
    return [];
  }
}

export async function createMarketplaceListing(payload: MarketplaceListingPayload) {
  return apiClient.post<MarketplaceListing>('/marketplace-listings', payload);
}

export async function updateMarketplaceListing(id: EntityId, payload: Partial<MarketplaceListing>) {
  return apiClient.patch<MarketplaceListing>(`/marketplace-listings/${id}`, payload);
}

export async function publishMarketplaceListingNow(id: EntityId) {
  return apiClient.post<MarketplaceListing>(`/marketplace-listings/${id}/publish-now`);
}
