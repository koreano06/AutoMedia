import { apiClient } from '@/api/httpClient';
import type { Comment, EntityId } from '@/types/entities';

export async function listComments(order = '-detected_at', limit = 100) {
  return apiClient.getList<Comment>('/comments', { query: { order, limit } });
}

export async function updateComment(id: EntityId, payload: Partial<Comment>) {
  return apiClient.post<Comment>('/comment-update', { id, ...payload });
}

export async function autoReplyComment(payload: { comment_id: EntityId; product_id?: EntityId; reply_template?: string }) {
  return apiClient.post<Comment>('/comment-auto-reply', payload);
}
