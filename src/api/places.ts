import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from './types';
import type { Place } from '@/types/place';

export const placesApi = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Place>>>(
      '/places',
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Place>>(`/places/${id}`);
    return response.data;
  },

  create: async (data: Partial<Place>) => {
    const response = await apiClient.post<ApiResponse<Place>>('/places', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Place>) => {
    const response = await apiClient.put<ApiResponse<Place>>(`/places/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/places/${id}`);
    return response.data;
  },
};

