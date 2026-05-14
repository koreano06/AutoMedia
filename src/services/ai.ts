import { apiClient } from '@/api/httpClient';

export async function invokeLLM(prompt: string) {
  try {
    const response = await apiClient.post<{ text?: string; content?: string; message?: string }>('/ai/generate-text', { prompt });
    return response.text || response.content || response.message || '';
  } catch {
    return 'Sugestao gerada localmente: destaque o beneficio principal do produto, inclua uma chamada para acao clara e finalize convidando o cliente a pedir o link.';
  }
}
