import { apiClient } from '@/api/httpClient';

export type DiagnosticStatus = 'ok' | 'warning' | 'error' | 'degraded' | 'external' | string;

export type DiagnosticServiceStatus = {
  status: DiagnosticStatus;
  message?: string;
  driver?: string;
  bucket?: string;
  command?: string;
  image_model?: string;
  active_count?: number;
  stale_count?: number;
  failed_last_hour?: number;
};

export type DiagnosticsResponse = {
  status: DiagnosticStatus;
  checked_at: string;
  services: {
    database?: DiagnosticServiceStatus;
    redis?: DiagnosticServiceStatus;
    storage?: DiagnosticServiceStatus;
    openai?: DiagnosticServiceStatus;
    worker?: DiagnosticServiceStatus;
  };
};

export type DiagnosticCheckResult = {
  id: string;
  status: 'ok' | 'warning' | 'error';
  title: string;
  message: string;
  duration_ms: number;
  metadata?: Record<string, string | number | boolean | null>;
};

export type RunDiagnosticChecksResponse = {
  status: 'ok' | 'warning' | 'error';
  checked_at: string;
  results: DiagnosticCheckResult[];
  available_checks: string[];
};

export async function getDiagnostics() {
  return apiClient.get<DiagnosticsResponse>('/diagnostics');
}

export async function runDiagnosticChecks(checks?: string[]) {
  const payload = await apiClient.post<RunDiagnosticChecksResponse | DiagnosticCheckResult[]>('/diagnostics/run-checks', { checks });

  if (Array.isArray(payload)) {
    const status = payload.some((result) => result.status === 'error') ? 'error' : payload.some((result) => result.status === 'warning') ? 'warning' : 'ok';

    return {
      status,
      checked_at: new Date().toISOString(),
      results: payload,
      available_checks: checks || payload.map((result) => result.id),
    };
  }

  return payload;
}
