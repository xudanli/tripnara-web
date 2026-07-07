import apiClient from './client';
import type {
  AccommodationOverviewQuery,
  AccommodationOverviewResponse,
  ActivityFavoritesResponse,
  CollabOverviewQuery,
  CollabOverviewResponse,
  CreateTripFilePendingRequest,
  TimelineOverviewQuery,
  TimelineOverviewResponse,
  ToggleActivityFavoriteRequest,
  TripDetailTabFirstPaint,
  TripDetailTabPhase2,
  TripFileDownloadResponse,
  TripFileItem,
  TripFileListQuery,
  TripFileListResponse,
  TripFileOverviewQuery,
  TripFileOverviewResponse,
  TripFileStatsResponse,
  TripFilesTabData,
} from '@/api/trip-detail-tab.types';
import { TRIP_DETAIL_TAB_BFF_INCLUDES } from '@/api/trip-detail-tab.types';
import { tripFileItemToOverviewItem } from '@/lib/trip-files.util';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class TripDetailTabApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'TripDetailTabApiError';
  }
}

/** @deprecated 使用 TripDetailTabApiError */
export class TripFilesApiError extends TripDetailTabApiError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'TripFilesApiError';
  }
}

/** @deprecated 使用 TripDetailTabApiError */
export class TripTimelineApiError extends TripDetailTabApiError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'TripTimelineApiError';
  }
}

/** @deprecated 使用 TripDetailTabApiError */
export class TripCollabApiError extends TripDetailTabApiError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'TripCollabApiError';
  }
}

export interface TripDetailTabApiConfig {
  baseUrl?: string;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
}

/**
 * 可选配置（独立 fetch 场景）。本项目默认走 `apiClient`（已含鉴权），通常无需调用。
 */
export function configureTripDetailTabApi(_config: TripDetailTabApiConfig): void {
  // apiClient 已统一 baseUrl 与 Authorization；保留此入口以与后端 client 契约一致。
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback: string): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new TripDetailTabApiError(
      err.error?.code ?? 'REQUEST_ERROR',
      err.error?.message?.trim() || fallback,
      err.error?.details,
    );
  }
  return response.data.data;
}

export { TRIP_DETAIL_TAB_BFF_INCLUDES } from '@/api/trip-detail-tab.types';

function buildTabBffQueryParams(
  query?: { include?: string; preset?: 'shell' | 'full' },
): Record<string, string> | undefined {
  if (!query) return undefined;
  if (query.include?.trim()) return { include: query.include.trim() };
  if (query.preset) return { preset: query.preset };
  return undefined;
}

function filesPath(tripId: string): string {
  return `/trips/${tripId}/files`;
}

export const tripFilesApi = {
  /** GET /trips/:tripId/files/overview — 方案 A 聚合 BFF */
  async getOverview(
    tripId: string,
    query?: TripFileOverviewQuery,
  ): Promise<TripFileOverviewResponse> {
    const response = await apiClient.get<ApiResponseWrapper<TripFileOverviewResponse>>(
      `${filesPath(tripId)}/overview`,
      { params: query },
    );
    return handleResponse(response, '获取文件概览失败');
  },

  /** GET /trips/:tripId/files */
  async getList(tripId: string, query?: TripFileListQuery): Promise<TripFileListResponse> {
    const response = await apiClient.get<ApiResponseWrapper<TripFileListResponse>>(filesPath(tripId), {
      params: query,
    });
    return handleResponse(response, '获取文件列表失败');
  },

  /** GET /trips/:tripId/files/stats */
  async getStats(tripId: string): Promise<TripFileStatsResponse> {
    const response = await apiClient.get<ApiResponseWrapper<TripFileStatsResponse>>(
      `${filesPath(tripId)}/stats`,
    );
    return handleResponse(response, '获取文件统计失败');
  },

  /** 文件 Tab 首屏：优先 overview，降级 stats + list */
  async loadTabData(
    tripId: string,
    options?: { limit?: number; includePending?: boolean },
  ): Promise<TripFilesTabData> {
    const limit = options?.limit ?? 50;
    try {
      return await tripFilesApi.getOverview(tripId, {
        limit,
        offset: 0,
        includePending: options?.includePending ?? true,
      });
    } catch {
      const [stats, list] = await Promise.all([
        tripFilesApi.getStats(tripId),
        tripFilesApi.getList(tripId, { limit, offset: 0 }),
      ]);
      return {
        tripId,
        stats,
        items: (list.items ?? []).map(tripFileItemToOverviewItem),
        total: list.total,
        limit: list.limit,
        offset: list.offset,
        sources: {
          tripFileCount: list.total,
          itineraryDocumentCount: 0,
          itineraryPendingCount: 0,
          itineraryLinkCount: 0,
        },
        generatedAt: new Date().toISOString(),
      };
    }
  },

  /** POST /trips/:tripId/files — multipart */
  async upload(tripId: string, formData: FormData): Promise<TripFileItem> {
    const response = await apiClient.post<ApiResponseWrapper<TripFileItem>>(filesPath(tripId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    });
    return handleResponse(response, '上传文件失败');
  },

  /** POST /trips/:tripId/files/pending */
  async createPending(tripId: string, body: CreateTripFilePendingRequest): Promise<TripFileItem> {
    const response = await apiClient.post<ApiResponseWrapper<TripFileItem>>(
      `${filesPath(tripId)}/pending`,
      body,
    );
    return handleResponse(response, '创建待补充项失败');
  },

  /** GET /trips/:tripId/files/:fileId/download */
  async getDownloadUrl(tripId: string, fileId: string): Promise<TripFileDownloadResponse> {
    const response = await apiClient.get<ApiResponseWrapper<TripFileDownloadResponse>>(
      `${filesPath(tripId)}/${fileId}/download`,
    );
    return handleResponse(response, '获取下载链接失败');
  },

  /** DELETE /trips/:tripId/files/:fileId */
  async delete(tripId: string, fileId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<ApiResponseWrapper<{ deleted: boolean }>>(
      `${filesPath(tripId)}/${fileId}`,
    );
    return handleResponse(response, '删除文件失败');
  },
};

export const tripTimelineApi = {
  /** GET /trips/:tripId/timeline-overview */
  async getOverview(
    tripId: string,
    query?: TimelineOverviewQuery,
  ): Promise<TimelineOverviewResponse> {
    const response = await apiClient.get<ApiResponseWrapper<TimelineOverviewResponse>>(
      `/trips/${tripId}/timeline-overview`,
      { params: buildTabBffQueryParams(query) },
    );
    return handleResponse(response, '获取时间轴概览失败');
  },

  /** Phase 1 — 首屏壳层（stats + newSuggestionCount 角标） */
  getShellOverview(tripId: string): Promise<TimelineOverviewResponse> {
    return tripTimelineApi.getOverview(tripId, { include: TRIP_DETAIL_TAB_BFF_INCLUDES.timelineShell });
  },

  /** Phase 2 — pipeline / tasks / reminders + planobjects（无 suggestions 列表） */
  getPhase2Overview(tripId: string): Promise<TimelineOverviewResponse> {
    return tripTimelineApi.getOverview(tripId, {
      include: TRIP_DETAIL_TAB_BFF_INCLUDES.timelinePhase2,
    });
  },

  /** Phase 3 — 打开建议面板时拉 suggestions 列表 */
  getOverviewWithSuggestions(tripId: string): Promise<TimelineOverviewResponse> {
    return tripTimelineApi.getOverview(tripId, {
      include: TRIP_DETAIL_TAB_BFF_INCLUDES.timelineWithSuggestions,
    });
  },
};

export const tripCollabApi = {
  /** GET /trips/:tripId/collab-overview */
  async getOverview(tripId: string, query?: CollabOverviewQuery): Promise<CollabOverviewResponse> {
    const response = await apiClient.get<ApiResponseWrapper<CollabOverviewResponse>>(
      `/trips/${tripId}/collab-overview`,
      { params: buildTabBffQueryParams(query) },
    );
    return handleResponse(response, '获取协作概览失败');
  },

  /** Phase 1 — members + teamHealth */
  getShellOverview(tripId: string): Promise<CollabOverviewResponse> {
    return tripCollabApi.getOverview(tripId, { preset: 'shell' });
  },

  /** Phase 2 — 全量协作块 */
  getPhase2Overview(tripId: string): Promise<CollabOverviewResponse> {
    return tripCollabApi.getOverview(tripId, { preset: 'full' });
  },
};

export const tripAccommodationApi = {
  /** GET /trips/:tripId/accommodation-overview */
  async getOverview(
    tripId: string,
    query?: AccommodationOverviewQuery,
  ): Promise<AccommodationOverviewResponse> {
    const response = await apiClient.get<ApiResponseWrapper<AccommodationOverviewResponse>>(
      `/trips/${tripId}/accommodation-overview`,
      { params: query?.include ? { include: query.include } : undefined },
    );
    return handleResponse(response, '获取住宿概览失败');
  },

  /** 住宿 Tab 首屏 */
  async loadTabData(tripId: string): Promise<AccommodationOverviewResponse> {
    return tripAccommodationApi.getOverview(tripId);
  },
};

function activityFavoritesPath(tripId: string): string {
  return `/trips/${tripId}/activity-favorites`;
}

export const tripActivityFavoritesApi = {
  /** GET /trips/:tripId/activity-favorites */
  async list(tripId: string): Promise<ActivityFavoritesResponse> {
    const response = await apiClient.get<ApiResponseWrapper<ActivityFavoritesResponse>>(
      activityFavoritesPath(tripId),
    );
    return handleResponse(response, '获取活动收藏失败');
  },

  /** POST /trips/:tripId/activity-favorites */
  async toggle(
    tripId: string,
    body: ToggleActivityFavoriteRequest,
  ): Promise<ActivityFavoritesResponse> {
    const response = await apiClient.post<ApiResponseWrapper<ActivityFavoritesResponse>>(
      activityFavoritesPath(tripId),
      body,
    );
    return handleResponse(response, '更新活动收藏失败');
  },

  async toggleItineraryItem(
    tripId: string,
    itineraryItemId: string,
    favorited: boolean,
  ): Promise<ActivityFavoritesResponse> {
    return tripActivityFavoritesApi.toggle(tripId, { itineraryItemId, favorited });
  },

  async togglePlace(
    tripId: string,
    placeId: number,
    favorited: boolean,
  ): Promise<ActivityFavoritesResponse> {
    return tripActivityFavoritesApi.toggle(tripId, { placeId, favorited });
  },
};

export const tripDetailTabApi = {
  /** Phase 1 — 首屏四 Tab 并行（≈ loadFirstPaint） */
  async loadFirstPaint(tripId: string): Promise<TripDetailTabFirstPaint> {
    const [timeline, collab, files, accommodation] = await Promise.all([
      tripTimelineApi.getShellOverview(tripId),
      tripCollabApi.getShellOverview(tripId),
      tripFilesApi.loadTabData(tripId),
      tripAccommodationApi.loadTabData(tripId),
    ]);
    return { timeline, collab, files, accommodation };
  },

  /** Phase 2 — idle / 进入时间轴或成员 Tab 后填充 */
  async loadPhase2(tripId: string): Promise<TripDetailTabPhase2> {
    const [timeline, collab] = await Promise.all([
      tripTimelineApi.getPhase2Overview(tripId),
      tripCollabApi.getPhase2Overview(tripId),
    ]);
    return { timeline, collab };
  },
};
