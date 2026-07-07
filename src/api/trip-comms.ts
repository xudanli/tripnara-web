import apiClient from './client';
import type {
  CommsHeartbeatRequest,
  CommsHeartbeatResponse,
  CommsListResponse,
  CommsPeersResponse,
  CommsSummaryResponse,
  CommsSyncRequest,
  CommsSyncResponse,
  CommsTranscribeResponse,
} from '@/types/trip-in-trip-comms';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function unwrap<T>(response: { data: ApiResponseWrapper<T> }): T | null {
  if (response.data?.success && response.data.data != null) return response.data.data;
  return null;
}

function getApiError(err: unknown): ErrorResponse['error'] | undefined {
  return (err as { response?: { data?: ErrorResponse } })?.response?.data?.error;
}

export class TripCommsApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TripCommsApiError';
  }
}

function throwIfCommsError(err: unknown): void {
  const apiError = getApiError(err);
  if (apiError?.code) {
    throw new TripCommsApiError(apiError.code, apiError.message ?? apiError.code);
  }
}

/**
 * 行中团队对讲 API — P2.0
 */
export const tripCommsApi = {
  sync: async (tripId: string, body: CommsSyncRequest): Promise<CommsSyncResponse | null> => {
    try {
      const response = await apiClient.post<ApiResponseWrapper<CommsSyncResponse>>(
        `/trips/${tripId}/in-trip/comms/sync`,
        body,
      );
      return unwrap(response);
    } catch (err) {
      throwIfCommsError(err);
      return null;
    }
  },

  listMessages: async (
    tripId: string,
    params?: { since?: string | number; limit?: number; before?: string },
  ): Promise<CommsListResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<CommsListResponse>>(
        `/trips/${tripId}/in-trip/comms`,
        { params },
      );
      return unwrap(response);
    } catch {
      return null;
    }
  },

  getPeers: async (
    tripId: string,
    params?: { refLat?: number; refLng?: number; staleAfterSec?: number },
  ): Promise<CommsPeersResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<CommsPeersResponse>>(
        `/trips/${tripId}/in-trip/comms/peers`,
        { params },
      );
      return unwrap(response);
    } catch {
      return null;
    }
  },

  heartbeat: async (
    tripId: string,
    body: CommsHeartbeatRequest,
  ): Promise<CommsHeartbeatResponse | null> => {
    try {
      const response = await apiClient.post<ApiResponseWrapper<CommsHeartbeatResponse>>(
        `/trips/${tripId}/in-trip/comms/peers/heartbeat`,
        body,
      );
      return unwrap(response);
    } catch {
      return null;
    }
  },

  getSummary: async (
    tripId: string,
    params?: { since?: string; maxBullets?: number; lang?: string },
  ): Promise<CommsSummaryResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<CommsSummaryResponse>>(
        `/trips/${tripId}/in-trip/comms/summary`,
        { params },
      );
      return unwrap(response);
    } catch {
      return null;
    }
  },

  transcribe: async (
    tripId: string,
    form: FormData,
  ): Promise<CommsTranscribeResponse | null> => {
    try {
      const response = await apiClient.post<ApiResponseWrapper<CommsTranscribeResponse>>(
        `/trips/${tripId}/in-trip/comms/transcribe`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return unwrap(response);
    } catch {
      return null;
    }
  },
};

/** @deprecated 使用 tripCommsApi.sync */
export const syncMessages = tripCommsApi.sync;
