import { apiClient } from '@/api/httpClient';

export type AIProviderStatus = {
  id: string;
  name: string;
  configured: boolean;
  text_model?: string;
  image_model?: string;
  video_model?: string;
  mode?: string;
  credit_status: 'manual' | 'available' | 'unavailable' | string;
  credit_message?: string;
};

export type AIProviderUsage = {
  provider: string;
  model?: string;
  requests: number;
  completed: number;
  failed: number;
  fallback: number;
  videos: number;
  estimated_cost_usd: number;
};

export type AIRecentVideoCost = {
  id: string;
  title: string | null;
  product_name: string | null;
  status: string;
  provider: string;
  model?: string;
  duration_seconds: number | null;
  estimated_cost_usd: number;
  cost_source: 'configured_estimate' | 'free_local' | 'unknown';
  url: string | null;
  created_at: string;
};

export type AIPeriodUsage = {
  since: string;
  jobs: number;
  completed: number;
  failed: number;
  fallback: number;
  videos: number;
  estimated_cost_usd: number;
  providers: AIProviderUsage[];
  recent_videos: AIRecentVideoCost[];
};

export type AIUsageSummary = {
  generated_at: string;
  providers: AIProviderStatus[];
  periods: {
    day: AIPeriodUsage;
    week: AIPeriodUsage;
    month: AIPeriodUsage;
  };
};

export function getAIUsageSummary() {
  return apiClient.get<AIUsageSummary>('/ai-usage/summary');
}
