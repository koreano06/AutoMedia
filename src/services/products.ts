import { base44 } from '@/api/base44Client';
import type { EntityId, Product, Status } from '@/types/entities';

export type ProductPayload = Omit<Product, 'id'>;

export async function listProducts(order = '-created_date', limit = 50) {
  return base44.entities.Product.list(order, limit) as Promise<Product[]>;
}

export async function createProduct(payload: ProductPayload) {
  return base44.entities.Product.create(payload);
}

export async function updateProduct(id: EntityId, payload: Partial<Product> & { status?: Status }) {
  return base44.entities.Product.update(id, payload);
}

export async function deleteProduct(id: EntityId) {
  return base44.entities.Product.delete(id);
}
