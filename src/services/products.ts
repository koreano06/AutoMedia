import { apiClient } from '@/api/httpClient';
import type { EntityId, Product, Status } from '@/types/entities';

export type ProductPayload = Omit<Product, 'id'>;

export async function listProducts(order = '-created_date', limit = 50) {
  return apiClient.getList<Product>('/products', { query: { order, limit } });
}

export async function createProduct(payload: ProductPayload) {
  return apiClient.post<Product>('/products', payload);
}

export async function updateProduct(id: EntityId, payload: Partial<Product> & { status?: Status }) {
  return apiClient.patch<Product>(`/products/${id}`, payload);
}

export async function deleteProduct(id: EntityId) {
  return apiClient.delete<Product>(`/products/${id}`);
}
