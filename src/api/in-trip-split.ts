import apiClient from './client';
import type {
  SplitLocationInput,
  SplitPartySessionDetail,
  SplitPartySessionSummary,
  SplitProposeInput,
  SplitReunionPatch,
  SplitShareInput,
} from '@/types/in-trip-split';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class InTripSplitApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InTripSplitApiError';
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback = '请求失败'): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new InTripSplitApiError(err.error?.code ?? 'REQUEST_ERROR', err.error?.message ?? fallback);
  }
  return response.data.data;
}

function splitPath(tripId: string): string {
  return `/trips/${tripId}/in-trip/split`;
}

export const inTripSplitApi = {
  propose: async (tripId: string, body?: SplitProposeInput): Promise<SplitPartySessionDetail> => {
    const response = await apiClient.post<ApiResponseWrapper<SplitPartySessionDetail>>(
      `${splitPath(tripId)}/propose`,
      body ?? {},
    );
    return handleResponse(response, '生成分组方案失败');
  },

  listSessions: async (tripId: string): Promise<SplitPartySessionSummary[]> => {
    const response = await apiClient.get<ApiResponseWrapper<SplitPartySessionSummary[]>>(
      `${splitPath(tripId)}/sessions`,
    );
    return handleResponse(response, '获取分组记录失败');
  },

  getSession: async (tripId: string, sessionId: string): Promise<SplitPartySessionDetail> => {
    const response = await apiClient.get<ApiResponseWrapper<SplitPartySessionDetail>>(
      `${splitPath(tripId)}/sessions/${sessionId}`,
    );
    return handleResponse(response, '获取分组详情失败');
  },

  executeSession: async (tripId: string, sessionId: string): Promise<SplitPartySessionDetail> => {
    const response = await apiClient.post<ApiResponseWrapper<SplitPartySessionDetail>>(
      `${splitPath(tripId)}/sessions/${sessionId}/execute`,
    );
    return handleResponse(response, '启动分组探索失败');
  },

  shareExperience: async (
    tripId: string,
    sessionId: string,
    body: SplitShareInput,
  ): Promise<SplitPartySessionDetail> => {
    const response = await apiClient.post<ApiResponseWrapper<SplitPartySessionDetail>>(
      `${splitPath(tripId)}/sessions/${sessionId}/share`,
      body,
    );
    return handleResponse(response, '分享失败');
  },

  updateReunion: async (
    tripId: string,
    sessionId: string,
    body: SplitReunionPatch,
  ): Promise<SplitPartySessionDetail> => {
    const response = await apiClient.patch<ApiResponseWrapper<SplitPartySessionDetail>>(
      `${splitPath(tripId)}/sessions/${sessionId}/reunion`,
      body,
    );
    return handleResponse(response, '更新汇合状态失败');
  },

  postLocation: async (
    tripId: string,
    sessionId: string,
    body: SplitLocationInput,
  ): Promise<SplitPartySessionDetail> => {
    const response = await apiClient.post<ApiResponseWrapper<SplitPartySessionDetail>>(
      `${splitPath(tripId)}/sessions/${sessionId}/location`,
      body,
    );
    return handleResponse(response, '位置更新失败');
  },
};
