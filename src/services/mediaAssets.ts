import { apiClient, isNotFoundError } from '@/api/httpClient';
import type { MediaCollectResponse } from '@/types/api';
import type { EntityId, Job, MediaAsset } from '@/types/entities';

export type MediaAssetPayload = Omit<MediaAsset, 'id'>;

export async function listMediaAssets(order = '-created_date', limit = 50) {
  return apiClient.getList<MediaAsset>('/media-assets', { query: { order, limit } });
}

export async function filterMediaAssets(filter: Partial<MediaAsset>, order = '-created_date', limit = 20) {
  return apiClient.getList<MediaAsset>('/media-assets', {
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

export async function collectMedia(payload: { product_id: EntityId; query?: string; sources?: string[] }) {
  try {
    return await apiClient.post<MediaCollectResponse>('/media-collect', payload);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }

    const fallbackJob: Job = {
      id: `local_media_collection_${Date.now()}`,
      type: 'media_collection',
      status: 'queued',
      title: 'Coleta de mídia solicitada',
      product_id: payload.product_id,
      progress: 0,
      created_at: new Date().toISOString(),
    };

    return { job: fallbackJob };
  }
}

export async function updateMediaAsset(id: EntityId, payload: Partial<MediaAsset>) {
  return apiClient.post<MediaAsset>('/media-update', { id, ...payload });
}
