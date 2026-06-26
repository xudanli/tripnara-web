/**
 * Narrative Engine V1 API
 * Base path: /trips/:tripId/narrative
 * Feature flag: NARRATIVE_THEME_V1=true
 */

import apiClient from './client';
import { CONFIG } from '@/constants/config';
import type {
  ClearThemeResponse,
  GenerateCandidatesResult,
  GetThemeResponse,
  NarrativeIntakeRequest,
  RegenerateThemeRequest,
  SelectThemeRequest,
  SelectThemeResponse,
} from '@/types/narrative-engine';

const narrativePath = (tripId: string) => `/trips/${tripId}/narrative`;

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
}

interface ErrorResponse {
  success: false;
  error: ErrorBody;
}

type ApiWrap<T> = SuccessResponse<T> | ErrorResponse;

export class NarrativeThemeApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'NarrativeThemeApiError';
  }
}

function unwrap<T>(payload: ApiWrap<T> | T): T {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const wrapped = payload as ApiWrap<T>;
    if (wrapped.success === false) {
      const err = wrapped.error;
      throw new NarrativeThemeApiError(
        err?.code ?? 'REQUEST_ERROR',
        err?.message ?? '叙事主题请求失败',
        err?.details
      );
    }
    if (wrapped.data === undefined || wrapped.data === null) {
      throw new NarrativeThemeApiError('INVALID_RESPONSE', 'API 响应 data 为空');
    }
    return wrapped.data;
  }
  return payload as T;
}

function toApiError(error: unknown, fallback: string): NarrativeThemeApiError {
  const err = error as {
    response?: { data?: ErrorResponse };
    code?: string;
    message?: string;
    details?: unknown;
  };

  if (err instanceof NarrativeThemeApiError) {
    return err;
  }

  const body = err.response?.data;
  if (body && body.success === false && body.error) {
    return new NarrativeThemeApiError(
      body.error.code ?? 'REQUEST_ERROR',
      body.error.message ?? fallback,
      body.error.details
    );
  }

  return new NarrativeThemeApiError(
    err.code ?? 'REQUEST_ERROR',
    err.message ?? fallback
  );
}

async function postNarrative<T>(
  tripId: string,
  subPath: string,
  body?: unknown
): Promise<T> {
  try {
    const response = await apiClient.post<ApiWrap<T>>(`${narrativePath(tripId)}${subPath}`, body, {
      timeout: CONFIG.API.TIMEOUT_LONG,
    });
    return unwrap(response.data);
  } catch (error) {
    throw toApiError(error, '叙事主题请求失败');
  }
}

async function getNarrative<T>(tripId: string, subPath: string): Promise<T> {
  try {
    const response = await apiClient.get<ApiWrap<T>>(`${narrativePath(tripId)}${subPath}`);
    return unwrap(response.data);
  } catch (error) {
    throw toApiError(error, '获取叙事主题失败');
  }
}

async function deleteNarrative<T>(tripId: string, subPath: string): Promise<T> {
  try {
    const response = await apiClient.delete<ApiWrap<T>>(`${narrativePath(tripId)}${subPath}`);
    return unwrap(response.data);
  } catch (error) {
    throw toApiError(error, '清除叙事主题失败');
  }
}

export const narrativeEngineApi = {
  /** POST /trips/:tripId/narrative/intake */
  submitIntake: async (
    tripId: string,
    request: NarrativeIntakeRequest
  ): Promise<GenerateCandidatesResult> => {
    return postNarrative<GenerateCandidatesResult>(tripId, '/intake', request);
  },

  /** POST /trips/:tripId/narrative/theme/select */
  selectTheme: async (
    tripId: string,
    request: SelectThemeRequest
  ): Promise<SelectThemeResponse> => {
    return postNarrative<SelectThemeResponse>(tripId, '/theme/select', request);
  },

  /** POST /trips/:tripId/narrative/theme/regenerate */
  regenerateCandidates: async (
    tripId: string,
    request: RegenerateThemeRequest
  ): Promise<GenerateCandidatesResult> => {
    return postNarrative<GenerateCandidatesResult>(tripId, '/theme/regenerate', request);
  },

  /** GET /trips/:tripId/narrative/theme */
  getTheme: async (tripId: string): Promise<GetThemeResponse> => {
    return getNarrative<GetThemeResponse>(tripId, '/theme');
  },

  /** DELETE /trips/:tripId/narrative/theme */
  clearTheme: async (tripId: string): Promise<ClearThemeResponse> => {
    return deleteNarrative<ClearThemeResponse>(tripId, '/theme');
  },
};
