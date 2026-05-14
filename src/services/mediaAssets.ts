import { apiClient } from '@/api/httpClient';
import type { EntityId, MediaAsset } from '@/types/entities';

export type MediaAssetPayload = Omit<MediaAsset, 'id'>;

export async function listMediaAssets(order = '-created_date', limit = 50) {
  return apiClient.get<MediaAsset[]>('/media-assets', { query: { order, limit } });
}

export async function filterMediaAssets(filter: Partial<MediaAsset>, order = '-created_date', limit = 20) {
  return apiClient.get<MediaAsset[]>('/media-assets', {
    query: {
      order,
      limit,
      type: filter.type,
      status: filter.status,
      product_id: filter.product_id,
    },
  });
}

export async function createMediaAsset(payload: MediaAssetPayload) {
  return apiClient.post<MediaAsset>('/media-assets', payload);
}

export async function updateMediaAsset(id: EntityId, payload: Partial<MediaAsset>) {
  return apiClient.patch<MediaAsset>(`/media-assets/${id}`, payload);
}
