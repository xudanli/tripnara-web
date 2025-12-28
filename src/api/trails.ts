import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from './types';
import type { Trail } from '@/types/trail';

export const trailsApi = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Trail>>>(
      '/trails',
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Trail>>(`/trails/${id}`);
    return response.data;
  },

  create: async (data: Partial<Trail>) => {
    const response = await apiClient.post<ApiResponse<Trail>>('/trails', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Trail>) => {
    const response = await apiClient.put<ApiResponse<Trail>>(`/trails/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/trails/${id}`);
    return response.data;
  },
};

