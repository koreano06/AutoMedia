import { apiClient, isNotFoundError } from '@/api/httpClient';
import { fileToDataUrl } from '@/lib/fileToDataUrl';
import type { UploadResponse } from '@/types/api';
import type { EntityId, MediaAsset } from '@/types/entities';
import { createMediaAsset } from './mediaAssets';

type ProductImageUploadDetails = {
  product_name?: string;
  title?: string;
  caption?: string;
  status?: string;
  source?: string;
  quality_score?: number;
  metadata?: Record<string, unknown>;
};

function normalizeUploadResponse(response: UploadResponse | MediaAsset): UploadResponse {
  if ('asset' in response) {
    return response;
  }

  return { asset: response };
}

export async function uploadProductImage(file: File, productId?: EntityId, details: ProductImageUploadDetails = {}) {
  const dataUrl = await fileToDataUrl(file);
  const payload = {
    product_id: productId,
    product_name: details.product_name,
    title: details.title || file.name || 'Imagem de produto enviada',
    url: dataUrl,
    thumbnail_url: dataUrl,
    mime_type: file.type || 'image/png',
    file_size: file.size,
    caption: details.caption,
    status: details.status,
    source: details.source,
    quality_score: details.quality_score,
    metadata: details.metadata,
  };

  try {
    const response = await apiClient.post<UploadResponse | MediaAsset>('/uploads/product-image', payload);
    return normalizeUploadResponse(response);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }

    try {
      const response = await apiClient.post<UploadResponse | MediaAsset>('/product-image-upload', payload);
      return normalizeUploadResponse(response);
    } catch (legacyError) {
      if (!isNotFoundError(legacyError)) {
        throw legacyError;
      }
    }

    const asset = await createMediaAsset({
      product_id: productId,
      type: 'image',
      title: details.title || file.name || 'Imagem de produto enviada',
      product_name: details.product_name,
      status: details.status || 'pending_review',
      source: details.source || 'Upload local',
      url: dataUrl,
      thumbnail_url: dataUrl,
      mime_type: file.type || 'image/png',
      file_size: file.size,
      caption: details.caption,
      quality_score: details.quality_score,
      metadata: details.metadata,
    } as Omit<MediaAsset, 'id'>);

    return { asset };
  }
}
