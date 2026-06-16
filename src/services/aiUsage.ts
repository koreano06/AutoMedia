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
  estimated_cost_usd: number | null;
};

export type AIPeriodUsage = {
  since: string;
  jobs: number;
  completed: number;
  failed: number;
  fallback: number;
  videos: number;
  providers: AIProviderUsage[];
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
