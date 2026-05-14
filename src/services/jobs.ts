import { apiClient } from '@/api/httpClient';
import type { Job } from '@/types/entities';

export async function listJobs() {
  return apiClient.getList<Job>('/jobs');
}

export async function getJob(id: string) {
  return apiClient.get<Job>(`/jobs/${id}`);
}
