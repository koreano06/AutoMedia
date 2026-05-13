import { apiClient } from '@/api/httpClient';
import type { UploadResponse } from '@/types/api';
import type { EntityId } from '@/types/entities';

export async function uploadProductImage(file: File, productId?: EntityId) {
  const formData = new FormData();
  formData.append('file', file);

  if (productId) {
    formData.append('product_id', productId);
  }

  return apiClient.post<UploadResponse>('/uploads/product-image', formData);
}
