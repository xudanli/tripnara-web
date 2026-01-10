import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from './types';
import type { TrailDetail } from '@/types/trail';

export const trailsApi = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<TrailDetail>>>(
      '/trails',
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<TrailDetail>>(`/trails/${id}`);
    return response.data;
  },

  create: async (data: Partial<TrailDetail>) => {
    const response = await apiClient.post<ApiResponse<TrailDetail>>('/trails', data);
    return response.data;
  },

  update: async (id: string, data: Partial<TrailDetail>) => {
    const response = await apiClient.put<ApiResponse<TrailDetail>>(`/trails/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/trails/${id}`);
    return response.data;
  },
};

