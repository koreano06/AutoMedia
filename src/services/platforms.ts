import { apiClient, isNotFoundError } from '@/api/httpClient';
import type { Platform, PlatformAccount } from '@/types/entities';

export type PlatformAccountWithConfig = PlatformAccount & {
  configured?: boolean;
  mode?: 'mock' | 'live';
  required_scopes?: string[];
};

export type ConnectPlatformResponse = {
  account: PlatformAccountWithConfig;
  oauth_url: string;
  mode: 'mock' | 'live';
};

export async function listPlatformAccounts() {
  try {
    return await apiClient.getList<PlatformAccountWithConfig>('/platforms/accounts');
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
    return [];
  }
}

export async function connectPlatform(platform: Platform) {
  return apiClient.post<ConnectPlatformResponse>(`/platforms/${platform}/connect`);
}

export async function disconnectPlatform(platform: Platform) {
  return apiClient.post<PlatformAccountWithConfig>(`/platforms/${platform}/disconnect`);
}
