import { apiClient } from '@/api/httpClient';
import type { VideoGenerateRequest, VideoGenerateResponse } from '@/types/api';

export async function generateVideo(payload: VideoGenerateRequest) {
  return apiClient.post<VideoGenerateResponse & { asset?: unknown }>('/videos/generate', payload);
}
