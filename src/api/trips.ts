import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from './types';
import type { Trip } from '@/types/trip';

export const tripsApi = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Trip>>>(
      '/trips',
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Trip>>(`/trips/${id}`);
    return response.data;
  },

  create: async (data: Partial<Trip>) => {
    const response = await apiClient.post<ApiResponse<Trip>>('/trips', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Trip>) => {
    const response = await apiClient.put<ApiResponse<Trip>>(`/trips/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/trips/${id}`);
    return response.data;
  },
};

