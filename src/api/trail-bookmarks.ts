/**
 * F3 — 徒步路线收藏（JWT）
 * GET/PUT/DELETE /api/hiking/trail-bookmarks
 */

import apiClient from './client';
import type { ApiResponse } from '@/types/hiking';

export type TrailBookmarkItem = {
  routeDirectionId: number;
  name?: string;
  nameCN?: string;
  readinessScore?: number;
  totalDistanceKm?: number;
  estimatedDays?: number;
  startPoint?: { lat: number; lng: number };
  bookmarkedAt: string;
};

export type TrailBookmarksResponse = {
  routeDirectionIds: number[];
  items: TrailBookmarkItem[];
};

function handleResponse<T>(response: { data: ApiResponse<T> }): T {
  if (!response?.data?.success) {
    throw new Error(response.data?.error?.message || '收藏 API 请求失败');
  }
  if (response.data.data == null) {
    throw new Error('收藏 API 响应为空');
  }
  return response.data.data;
}

const BASE = '/hiking/trail-bookmarks';

export const trailBookmarksApi = {
  list: async (): Promise<TrailBookmarksResponse> => {
    const res = await apiClient.get<ApiResponse<TrailBookmarksResponse>>(BASE);
    return handleResponse(res);
  },

  add: async (routeDirectionId: number): Promise<void> => {
    await apiClient.put(`${BASE}/${routeDirectionId}`);
  },

  remove: async (routeDirectionId: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${routeDirectionId}`);
  },
};
