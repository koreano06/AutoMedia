import { base44 } from '@/api/base44Client';
import type { EntityId, Post } from '@/types/entities';

export type PostPayload = Omit<Post, 'id'>;

export async function listPosts(order = '-published_at', limit = 100) {
  return base44.entities.Post.list(order, limit) as Promise<Post[]>;
}

export async function createPost(payload: PostPayload) {
  return base44.entities.Post.create(payload);
}

export async function updatePost(id: EntityId, payload: Partial<Post>) {
  return base44.entities.Post.update(id, payload);
}

export async function deletePost(id: EntityId) {
  return base44.entities.Post.delete(id);
}
