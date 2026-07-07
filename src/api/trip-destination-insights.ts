import apiClient from './client';
import type {
  TripDestinationInsightsFetchResult,
  TripDestinationInsightsQuery,
  TripDestinationInsightsResponse,
} from '@/api/destination-insight.types';
import { normalizeTripDestinationInsightsResponse } from '@/api/destination-insight.types';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function normalizeEtagValue(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function formatIfNoneMatch(etag: string): string {
  const normalized = normalizeEtagValue(etag) ?? etag;
  if (normalized.startsWith('W/') || (normalized.startsWith('"') && normalized.endsWith('"'))) {
    return normalized;
  }
  return `"${normalized}"`;
}

function buildParams(
  query?: Omit<TripDestinationInsightsQuery, 'ifNoneMatch'>,
): Record<string, string | number> | undefined {
  if (!query) return undefined;

  const params: Record<string, string | number> = {};
  if (query.focusConflictId) params.focusConflictId = query.focusConflictId;
  if (query.problemId) params.problemId = query.problemId;
  if (query.poiSlug) params.poiSlug = query.poiSlug;
  if (query.placeId) params.placeId = query.placeId;
  if (query.dayIndex != null && query.dayIndex >= 0) params.dayIndex = query.dayIndex;
  if (query.includeRag) params.includeRag = '1';

  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * GET /trips/:tripId/destination-insights
 * 决策检查器证据 / 冲突上下文下的目的地洞察（BFF；勿直调 /api/rag/destination-insights）
 */
export async function getDestinationInsights(
  tripId: string,
  query?: TripDestinationInsightsQuery,
): Promise<TripDestinationInsightsFetchResult> {
  const { ifNoneMatch, ...scope } = query ?? {};

  const response = await apiClient.get<ApiResponseWrapper<unknown>>(
    `/trips/${encodeURIComponent(tripId)}/destination-insights`,
    {
      params: buildParams(scope),
      timeout: 30_000,
      headers: ifNoneMatch ? { 'If-None-Match': formatIfNoneMatch(ifNoneMatch) } : undefined,
      validateStatus: (status) => status === 200 || status === 304,
    },
  );

  const headerEtag =
    (response.headers?.etag as string | undefined) ??
    (response.headers?.ETag as string | undefined);
  const etag = normalizeEtagValue(headerEtag ?? ifNoneMatch);

  if (response.status === 304) {
    return { status: 'not_modified', etag };
  }

  if (!response?.data) {
    throw new Error('无效的 API 响应');
  }
  if (!response.data.success) {
    const err = response.data.error;
    throw new Error(err?.message ?? err?.code ?? '请求失败');
  }
  if (response.data.data == null) {
    throw new Error('API 响应数据为空');
  }

  const data = normalizeTripDestinationInsightsResponse(response.data.data);
  const resolvedEtag = normalizeEtagValue(data.etag ?? headerEtag);

  return {
    status: 'ok',
    data: resolvedEtag ? { ...data, etag: resolvedEtag } : data,
    etag: resolvedEtag,
  };
}

export const tripDestinationInsightsApi = {
  get: async (
    tripId: string,
    query?: TripDestinationInsightsQuery,
  ): Promise<TripDestinationInsightsResponse> => {
    const result = await getDestinationInsights(tripId, query);
    if (result.status === 'not_modified') {
      throw new Error('目的地洞察未修改但缺少本地缓存');
    }
    return result.data;
  },
};

export type {
  DestinationInsightBundle,
  DestinationInsightEntry,
  DestinationInsightSourceRef,
  TripDestinationInsightItem,
  TripDestinationInsightLocal,
  TripDestinationInsightRoute,
  TripDestinationInsightTip,
  TripDestinationInsightsFetchResult,
  TripDestinationInsightsPayload,
  TripDestinationInsightsQuery,
  TripDestinationInsightsResponse,
} from '@/api/destination-insight.types';

export { collectDestinationInsightEntries } from '@/api/destination-insight.types';
