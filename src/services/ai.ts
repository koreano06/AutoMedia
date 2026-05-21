import { apiClient } from '@/api/httpClient';
import type { MediaAsset } from '@/types/entities';

export async function invokeLLM(prompt: string) {
  try {
    const response = await apiClient.post<{ text?: string; content?: string; message?: string }>('/ai/generate-text', { prompt });
    return response.text || response.content || response.message || '';
  } catch {
    return 'Sugestao gerada localmente: destaque a promessa principal do anuncio, crie um gancho forte, inclua uma chamada para acao clara e mantenha tom natural para redes sociais.';
  }
}

export type GenerateImagePayload = {
  prompt: string;
  product_id?: string;
  product_name?: string;
  title?: string;
  platform?: string;
  format?: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024';
};

export type GenerateImageResponse = {
  image_url: string;
  provider: 'openai' | 'local-fallback' | string;
  asset?: MediaAsset | null;
};

export async function generateImage(payload: GenerateImagePayload) {
  return apiClient.post<GenerateImageResponse>('/ai/generate-image', payload);
}
