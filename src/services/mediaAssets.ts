import { base44 } from '@/api/base44Client';
import type { EntityId, MediaAsset } from '@/types/entities';

export type MediaAssetPayload = Omit<MediaAsset, 'id'>;

export async function listMediaAssets(order = '-created_date', limit = 50) {
  return base44.entities.MediaAsset.list(order, limit) as Promise<MediaAsset[]>;
}

export async function filterMediaAssets(filter: Partial<MediaAsset>, order = '-created_date', limit = 20) {
  return base44.entities.MediaAsset.filter(filter, order, limit) as Promise<MediaAsset[]>;
}

export async function createMediaAsset(payload: MediaAssetPayload) {
  return base44.entities.MediaAsset.create(payload);
}

export async function updateMediaAsset(id: EntityId, payload: Partial<MediaAsset>) {
  return base44.entities.MediaAsset.update(id, payload);
}
