type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

type ApiEnvelope<T> = {
  data?: T;
  items?: T;
  result?: T;
};

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
  }

  return payload as T;
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

async function request<T>(path: string, options: RequestOptions = {}) {
  const { query, headers, body, ...init } = options;
  const isFormData = body instanceof FormData;

  const response = await fetch(buildUrl(path, query), {
    ...init,
    body,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  });

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload?.error?.message ? payload.error.message : 'Erro inesperado na API';
    throw new Error(message);
  }

  return unwrapPayload<T>(payload);
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};
