import { base44 } from '@/api/base44Client';
import type { Comment, EntityId } from '@/types/entities';

export async function listComments(order = '-detected_at', limit = 100) {
  return base44.entities.Comment.list(order, limit) as Promise<Comment[]>;
}

export async function updateComment(id: EntityId, payload: Partial<Comment>) {
  return base44.entities.Comment.update(id, payload);
}
