import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from './types';
import type { Hotel } from '@/types/hotel';

export const hotelsApi = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Hotel>>>(
      '/hotels',
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Hotel>>(`/hotels/${id}`);
    return response.data;
  },

  create: async (data: Partial<Hotel>) => {
    const response = await apiClient.post<ApiResponse<Hotel>>('/hotels', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Hotel>) => {
    const response = await apiClient.put<ApiResponse<Hotel>>(`/hotels/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/hotels/${id}`);
    return response.data;
  },
};

