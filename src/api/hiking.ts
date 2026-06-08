/**
 * 徒步模块 API
 * 全局前缀 /api，响应 { success, data, error }
 */

import apiClient from './client';
import type {
  ApiResponse,
  HikingAuditData,
  LaugavegurPreview,
  LaugavegurSnapshot,
  TrailPlanPreviewRequest,
  HardTrekTrailPlan,
} from '@/types/hiking';
import type { RouteDirectionReadinessResponse } from '@/types/route-readiness';

function handleResponse<T>(response: { data: ApiResponse<T> }): T {
  if (!response?.data) {
    throw new Error('无效的 API 响应');
  }
  if (!response.data.success) {
    const errData = response.data.error;
    const err = new Error(errData?.message || '请求失败') as Error & { code?: string };
    if (errData?.code) err.code = errData.code;
    throw err;
  }
  if (response.data.data === undefined || response.data.data === null) {
    throw new Error('响应 data 为空');
  }
  return response.data.data;
}

const DEMO_BASE = '/demo/hiking';

export const hikingApi = {
  /** 首屏骨架 / 补给 / polyline（可与 preview 并行） */
  getLaugavegurSnapshot: async (): Promise<LaugavegurSnapshot> => {
    const res = await apiClient.get<ApiResponse<LaugavegurSnapshot>>(
      `${DEMO_BASE}/laugavegur`
    );
    return handleResponse(res);
  },

  /** 海拔剖面 + 三步动效 + 体能/天气 */
  getLaugavegurPreview: async (longestHike: number = 2): Promise<LaugavegurPreview> => {
    const res = await apiClient.get<ApiResponse<LaugavegurPreview>>(
      `${DEMO_BASE}/laugavegur/preview`,
      { params: { longestHike } }
    );
    return handleResponse(res);
  },

  /** 生成前 Trail 段预演（可选） */
  previewTrailPlan: async (body: TrailPlanPreviewRequest): Promise<HardTrekTrailPlan> => {
    const res = await apiClient.post<ApiResponse<HardTrekTrailPlan>>(
      `${DEMO_BASE}/trail-plan/preview`,
      body
    );
    return handleResponse(res);
  },

  /**
   * P2 路线级 Readiness（服务端分数，替代本地 computeTrailReadiness）
   * GET /api/readiness/route-directions/:routeDirectionId?longestHike=
   */
  /**
   * P1/P2 路线级 Readiness；`plannedDate` / `hikePlanId` 仅日志与归因，不改变评分
   */
  getRouteDirectionReadiness: async (
    routeDirectionId: number,
    options?: { longestHike?: number; plannedDate?: string; hikePlanId?: string }
  ): Promise<RouteDirectionReadinessResponse> => {
    const params: Record<string, string | number> = {};
    if (options?.longestHike != null) params.longestHike = options.longestHike;
    if (options?.plannedDate) params.plannedDate = options.plannedDate.split('T')[0];
    if (options?.hikePlanId) params.hikePlanId = options.hikePlanId;
    const res = await apiClient.get<ApiResponse<RouteDirectionReadinessResponse>>(
      `/readiness/route-directions/${routeDirectionId}`,
      { params: Object.keys(params).length ? params : undefined }
    );
    return handleResponse(res);
  },

  /** 已有行程 — 行前徒步审计 */
  getTripHikingAudit: async (
    tripId: string,
    options?: { longestHike?: number }
  ): Promise<HikingAuditData> => {
    const params: Record<string, number> = {};
    if (options?.longestHike != null) params.longestHike = options.longestHike;
    const res = await apiClient.get<ApiResponse<HikingAuditData>>(
      `/readiness/trip/${tripId}/hiking-audit`,
      { params: Object.keys(params).length ? params : undefined }
    );
    return handleResponse(res);
  },
};
