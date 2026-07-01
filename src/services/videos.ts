import { apiClient, isNotFoundError } from '@/api/httpClient';
import type { VideoGenerateRequest, VideoGenerateResponse } from '@/types/api';
import type { Job, MediaAsset } from '@/types/entities';
import { createMediaAsset } from './mediaAssets';

type VideoRequestOptions = {
  timeoutMs?: number;
};

export async function generateVideo(payload: VideoGenerateRequest, options?: VideoRequestOptions) {
  try {
    return await apiClient.post<VideoGenerateResponse>('/videos/generate', payload, options);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }

    const asset = await createMediaAsset({
      product_id: payload.product_id,
      type: 'generated_video',
      title: `Video ${payload.template || payload.style} (${payload.duration})`,
      status: 'pending_review',
      source: 'fallback-frontend',
      caption: payload.script || payload.briefing || 'Video solicitado pelo painel. Aguardando processamento definitivo no backend.',
      duration: payload.duration,
    } as Omit<MediaAsset, 'id'>);

    const job: Job = {
      id: `local_video_generation_${Date.now()}`,
      type: 'video_generation',
      status: 'queued',
      title: `Gerar video ${payload.template || payload.style}`,
      product_id: payload.product_id,
      media_asset_id: asset.id,
      progress: 0,
      created_at: new Date().toISOString(),
    };

    return { job, asset, script: asset.caption, provider: 'frontend-fallback' };
  }
}
