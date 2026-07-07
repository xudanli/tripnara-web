import apiClient from './client';
import type {
  DecisionRuntimeCapabilitiesResponse,
  DecisionWriteChainOpsResponse,
} from '@/types/decision-runtime-capabilities';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function unwrapData<T>(response: { data: ApiResponseWrapper<T> }): T | null {
  if (response?.data?.success && response.data.data != null) {
    return response.data.data;
  }
  return null;
}

function isEndpointMissing(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
}

export const decisionRuntimeApi = {
  /** GET /decision-runtime/ops/write-chain */
  getWriteChainOps: async (): Promise<DecisionWriteChainOpsResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<DecisionWriteChainOpsResponse>>(
        '/decision-runtime/ops/write-chain',
      );
      return unwrapData(response);
    } catch (err) {
      if (isEndpointMissing(err)) return null;
      throw err;
    }
  },

  /** GET /decision-engine/v1/runtime-capabilities */
  getRuntimeCapabilities: async (): Promise<DecisionRuntimeCapabilitiesResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<DecisionRuntimeCapabilitiesResponse>>(
        '/decision-engine/v1/runtime-capabilities',
      );
      return unwrapData(response);
    } catch (err) {
      if (isEndpointMissing(err)) return null;
      throw err;
    }
  },
};
