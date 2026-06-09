import { apiClient } from '@/api/httpClient';
import type { EntityId, Job } from '@/types/entities';

export async function listJobs() {
  return apiClient.getList<Job>('/jobs');
}

export async function getJob(id: string) {
  return apiClient.get<Job>(`/jobs/${id}`);
}

export async function updateJob(id: EntityId, payload: Partial<Job>) {
  return apiClient.patch<Job>(`/jobs/${id}`, payload);
}

export async function retryJob(id: EntityId) {
  return apiClient.post<Job>(`/jobs/${id}/retry`);
}

export async function deleteJob(id: EntityId) {
  return apiClient.delete<Job>(`/jobs/${id}`);
}
