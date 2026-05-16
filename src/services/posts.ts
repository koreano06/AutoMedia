import { apiClient } from '@/api/httpClient';
import type { EntityId, Post } from '@/types/entities';

export type PostPayload = Omit<Post, 'id'>;

export async function listPosts(order = '-published_at', limit = 100) {
  return apiClient.getList<Post>('/posts', { query: { order, limit } });
}

export async function createPost(payload: PostPayload) {
  return apiClient.post<Post>('/posts', payload);
}

export async function updatePost(id: EntityId, payload: Partial<Post>) {
  return apiClient.post<Post>('/post-update', { id, ...payload });
}

export async function publishPostNow(id: EntityId) {
  return apiClient.post<Post>('/post-publish-now', { id });
}

export async function deletePost(id: EntityId) {
  return apiClient.post<Post>('/post-delete', { id });
}
