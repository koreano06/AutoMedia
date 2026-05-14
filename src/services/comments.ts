import { apiClient } from '@/api/httpClient';
import type { Comment, EntityId } from '@/types/entities';

export async function listComments(order = '-detected_at', limit = 100) {
  return apiClient.get<Comment[]>('/comments', { query: { order, limit } });
}

export async function updateComment(id: EntityId, payload: Partial<Comment>) {
  return apiClient.patch<Comment>(`/comments/${id}`, payload);
}
