/**
 * 徒步路线分享（与 trail-bookmarks 相同：统一 `apiClient`，自动附加 Bearer）
 *
 * 创建分享（需登录）：
 *   POST /api/hiking/route-directions/:routeDirectionId/share
 *   Authorization: Bearer <access_token>  ← sessionStorage.accessToken，由 client 拦截器注入
 *   Content-Type: application/json
 *   Body: { "permission": "VIEW" | "EDIT", "expiresAt"?: "2027-01-01T00:00:00.000Z" }
 *
 * 公开查看（无需 token）：
 *   GET /api/hiking/route-directions/shared/:shareToken
 */

import apiClient from './client';
import type { ApiResponse } from '@/types/hiking';
import type {
  CreateRouteDirectionShareRequest,
  RouteDirectionShare,
  SharedRouteDirectionResponse,
} from '@/types/route-direction-share';

function handleResponse<T>(response: { data: ApiResponse<T> }): T {
  if (!response?.data?.success) {
    throw new Error(response.data?.error?.message || '分享 API 请求失败');
  }
  if (response.data.data == null) {
    throw new Error('分享 API 响应为空');
  }
  return response.data.data;
}

export const routeDirectionShareApi = {
  /**
   * 创建分享链接（权限 + 可选过期时间）
   */
  createShare: async (
    routeDirectionId: number,
    data?: CreateRouteDirectionShareRequest
  ): Promise<RouteDirectionShare> => {
    const res = await apiClient.post<ApiResponse<RouteDirectionShare>>(
      `/hiking/route-directions/${routeDirectionId}/share`,
      data ?? {}
    );
    return handleResponse(res);
  },

  /**
   * 通过 shareToken 获取分享的路线（无需登录）
   */
  getShared: async (shareToken: string): Promise<SharedRouteDirectionResponse> => {
    const res = await apiClient.get<ApiResponse<SharedRouteDirectionResponse>>(
      `/hiking/route-directions/shared/${encodeURIComponent(shareToken)}`
    );
    return handleResponse(res);
  },
};

/** 将后端 shareUrl 转为可复制的完整 URL */
export function toFullShareUrl(shareUrl: string): string {
  if (/^https?:\/\//i.test(shareUrl)) return shareUrl;
  const path = shareUrl.startsWith('/') ? shareUrl : `/${shareUrl}`;
  return `${window.location.origin}${path}`;
}
