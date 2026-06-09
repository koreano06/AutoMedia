type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
};

function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3333/api';
  }

  console.warn('VITE_API_BASE_URL não configurada. Configure a URL pública da API no ambiente de produção.');
  return '/api';
}

const API_BASE_URL = resolveApiBaseUrl();
export const API_TOKEN_STORAGE_KEY = 'automedia_api_token';
export const API_REFRESH_TOKEN_STORAGE_KEY = 'automedia_api_refresh_token';
export const API_AUTH_EXPIRED_EVENT = 'automedia:auth-expired';

type ApiEnvelope<T> = {
  data?: T;
  items?: T;
  result?: T;
  results?: T;
  records?: T;
};

type LastApiError = {
  path: string;
  status: number;
  message: string;
  technicalMessage?: string;
};

let lastApiError: LastApiError | null = null;

function notifyAuthExpired() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(API_AUTH_EXPIRED_EVENT));
}

export class ApiRequestError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.payload = payload;
  }
}

export function getLastApiError() {
  return lastApiError;
}

export function isNotFoundError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 404;
}

function friendlyApiMessage(status: number, fallback: string) {
  if (status === 0) return 'Não foi possível conectar ao backend. Verifique se a API está online e se a URL está correta.';
  if (status === 400) return fallback || 'Os dados enviados não passaram na validação.';
  if (status === 401) return 'Sua sessão expirou ou o login é necessário. Entre novamente para continuar.';
  if (status === 403) return 'Você não tem permissão para executar esta ação.';
  if (status === 404) return 'Recurso não encontrado. Atualize a tela e tente novamente.';
  if (status === 409) return 'Conflito de dados detectado. Atualize a tela antes de tentar de novo.';
  if (status === 413) return 'Arquivo muito grande para envio.';
  if (status === 429) return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.';
  if (status >= 500) return 'O backend encontrou uma falha interna. Veja a aba Qualidade ou tente novamente em instantes.';
  return fallback || 'Não foi possível concluir a operação.';
}

function unwrapPayload<T>(payload: unknown) {
  if (payload && typeof payload === 'object') {
    const envelope = payload as ApiEnvelope<T>;

    if ('data' in envelope) {
      return envelope.data as T;
    }

    if ('items' in envelope) {
      return envelope.items as T;
    }

    if ('result' in envelope) {
      return envelope.result as T;
    }

    if ('results' in envelope) {
      return envelope.results as T;
    }

    if ('records' in envelope) {
      return envelope.records as T;
    }
  }

  return payload as T;
}

export function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  const unwrapped = unwrapPayload<unknown>(payload);

  if (Array.isArray(unwrapped)) {
    return unwrapped as T[];
  }

  if (unwrapped && typeof unwrapped === 'object') {
    const nested = unwrapped as ApiEnvelope<unknown>;
    const candidates = [nested.data, nested.items, nested.result, nested.results, nested.records];
    const firstArray = candidates.find(Array.isArray);

    if (firstArray) {
      return firstArray as T[];
    }
  }

  return [];
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function refreshAccessToken() {
  const refreshToken = typeof window !== 'undefined' ? window.localStorage.getItem(API_REFRESH_TOKEN_STORAGE_KEY) : null;
  if (!refreshToken) return false;

  const response = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    window.localStorage.removeItem(API_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(API_REFRESH_TOKEN_STORAGE_KEY);
    notifyAuthExpired();
    return false;
  }

  const payload = await response.json() as { token?: string; refresh_token?: string };
  if (!payload.token || !payload.refresh_token) return false;

  window.localStorage.setItem(API_TOKEN_STORAGE_KEY, payload.token);
  window.localStorage.setItem(API_REFRESH_TOKEN_STORAGE_KEY, payload.refresh_token);
  return true;
}

async function request<T>(path: string, options: RequestOptions = {}, didRefresh = false): Promise<T> {
  const { query, headers, body, ...init } = options;
  const isFormData = body instanceof FormData;
  const requestHeaders = new Headers(headers);
  const token = typeof window !== 'undefined' ? window.localStorage.getItem(API_TOKEN_STORAGE_KEY) : null;

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  if (body !== undefined && !isFormData) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      body,
      headers: requestHeaders,
    });
  } catch (error) {
    const technicalMessage = error instanceof Error ? error.message : 'Falha de conexão com a API';
    const message = friendlyApiMessage(0, technicalMessage);
    lastApiError = { path, status: 0, message, technicalMessage };
    throw new ApiRequestError(message, 0, null);
  }

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && !didRefresh && path !== '/auth/login' && path !== '/auth/refresh') {
      const refreshed = await refreshAccessToken();
      if (refreshed) return request<T>(path, options, true);
    }

    const technicalMessage = typeof payload === 'object' && payload?.error?.message ? payload.error.message : 'Erro inesperado na API';
    const message = friendlyApiMessage(response.status, technicalMessage);
    lastApiError = { path, status: response.status, message, technicalMessage };
    if (response.status === 401 && path !== '/auth/login') {
      notifyAuthExpired();
    }
    throw new ApiRequestError(message, response.status, payload);
  }

  if (lastApiError?.path === path) {
    lastApiError = null;
  }

  return unwrapPayload<T>(payload);
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  getList: async <T>(path: string, options?: RequestOptions) => normalizeList<T>(await request<unknown>(path, { ...options, method: 'GET' })),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};
