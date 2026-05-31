import { apiClient } from '@/api/httpClient';
import type { AuthUser } from '@/lib/AuthContext';

type LoginResponse = {
  user: AuthUser;
  token: string;
  refresh_token: string;
  expires_in?: number;
};

export function loginWithBackend(username: string, password: string) {
  return apiClient.post<LoginResponse>('/auth/login', { username, password });
}

export function getCurrentBackendUser() {
  return apiClient.get<AuthUser>('/auth/me');
}
