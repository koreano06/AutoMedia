type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://auto-media-backend.vercel.app/api';

type ApiEnvelope<T> = {
  data?: T;
  items?: T;
  result?: T;
  results?: T;
  records?: T;
};

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

export function isNotFoundError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 404;
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

async function request<T>(path: string, options: RequestOptions = {}) {
  const { query, headers, body, ...init } = options;
  const isFormData = body instanceof FormData;
  const requestHeaders: HeadersInit = {
    ...headers,
  };

  if (body !== undefined && !isFormData) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    body,
    headers: requestHeaders,
  });

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload?.error?.message ? payload.error.message : 'Erro inesperado na API';
    throw new ApiRequestError(message, response.status, payload);
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
