import { apiClient, isNotFoundError } from '@/api/httpClient';
import { fileToDataUrl } from '@/lib/fileToDataUrl';
import type { UploadResponse } from '@/types/api';
import type { EntityId, MediaAsset } from '@/types/entities';
import { createMediaAsset } from './mediaAssets';

export async function uploadProductImage(file: File, productId?: EntityId) {
  const dataUrl = await fileToDataUrl(file);

  try {
    return await apiClient.post<UploadResponse>('/product-image-upload', {
      product_id: productId,
      title: file.name || 'Imagem de produto enviada',
      url: dataUrl,
      thumbnail_url: dataUrl,
      mime_type: file.type || 'image/png',
      file_size: file.size,
    });
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }

    const asset = await createMediaAsset({
      product_id: productId,
      type: 'image',
      title: file.name || 'Imagem de produto enviada',
      status: 'collected',
      source: 'upload-fallback',
      url: dataUrl,
      thumbnail_url: dataUrl,
      mime_type: file.type || 'image/png',
      file_size: file.size,
    } as Omit<MediaAsset, 'id'>);

    return { asset };
  }
}
