import { API_BASE_URL } from '@/api/httpClient';

export type ApiHealth = {
  status: 'ok' | 'error' | string;
  service?: string;
};

export async function checkApiHealth(timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        online: false,
        message: `API respondeu com status ${response.status}.`,
      };
    }

    const payload = (await response.json()) as ApiHealth;

    return {
      online: payload.status === 'ok',
      message: payload.service ? `${payload.service} online` : 'API online',
      payload,
    };
  } catch (error) {
    return {
      online: false,
      message: error instanceof DOMException && error.name === 'AbortError'
        ? 'API demorou para responder.'
        : 'Não foi possível conectar à API.',
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
