import apiClient from './client';
import type {
  CreateTripConstraintDto,
  CreateTripConstraintResponse,
  PatchTripConstraintDto,
  PatchTripConstraintsContractDto,
  PatchTripConstraintsContractResponse,
  TripConstraint,
  TripConstraintPreviewImpactData,
  TripConstraintPreviewImpactRequest,
  TripConstraintsListQuery,
  TripConstraintsListResponse,
  UpdateConstraintsCommandRequest,
  UpdateConstraintsCommandResponse,
  TripConstraintsCheckResponse,
  TripConstraintsRepairRequest,
  TripConstraintsRepairResponse,
} from '@/types/trip-constraints';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class TripConstraintsApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'TripConstraintsApiError';
    this.code = code;
    this.details = details;
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) throw new TripConstraintsApiError('INVALID_RESPONSE', '无效的API响应');
  if (!response.data.success) {
    const err = response.data.error;
    throw new TripConstraintsApiError(
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? '请求失败',
      err?.details,
    );
  }
  if (response.data.data == null) {
    throw new TripConstraintsApiError('EMPTY_DATA', 'API响应数据为空');
  }
  return response.data.data;
}

export function isTripConstraintsUnavailable(err: unknown): boolean {
  if (err instanceof TripConstraintsApiError) {
    return err.code === 'NOT_FOUND' || err.code === 'ENDPOINT_NOT_FOUND';
  }
  const code = (err as { code?: string })?.code;
  if (code === 'NOT_FOUND' || code === 'ENDPOINT_NOT_FOUND') return true;
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501 || status === 405;
}

function buildListParams(query?: TripConstraintsListQuery): Record<string, string> {
  if (!query) return {};
  const params: Record<string, string> = {};
  if (query.type) params.type = query.type;
  if (query.category) params.category = query.category;
  if (query.status) params.status = query.status;
  if (query.conflictOnly) params.conflictOnly = 'true';
  return params;
}

function unwrapConstraintPayload(data: TripConstraint | CreateTripConstraintResponse): TripConstraint {
  if (data && typeof data === 'object' && 'constraint' in data && data.constraint) {
    return data.constraint;
  }
  return data as TripConstraint;
}

export const tripConstraintsApi = {
  /** GET /trips/:tripId/constraints */
  list: async (
    tripId: string,
    query?: TripConstraintsListQuery,
  ): Promise<TripConstraintsListResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<TripConstraintsListResponse>>(
      `/trips/${tripId}/constraints`,
      { params: buildListParams(query) },
    );
    return handleResponse(response);
  },

  /** POST /trips/:tripId/constraints */
  create: async (tripId: string, body: CreateTripConstraintDto): Promise<TripConstraint> => {
    const response = await apiClient.post<ApiResponseWrapper<CreateTripConstraintResponse>>(
      `/trips/${tripId}/constraints`,
      body,
    );
    return unwrapConstraintPayload(handleResponse(response));
  },

  /** PATCH /trips/:tripId/constraints/:constraintId */
  patch: async (
    tripId: string,
    constraintId: string,
    body: PatchTripConstraintDto,
  ): Promise<TripConstraint> => {
    const response = await apiClient.patch<ApiResponseWrapper<TripConstraint | CreateTripConstraintResponse>>(
      `/trips/${tripId}/constraints/${encodeURIComponent(constraintId)}`,
      body,
    );
    return unwrapConstraintPayload(handleResponse(response));
  },

  /** DELETE /trips/:tripId/constraints/:constraintId */
  remove: async (
    tripId: string,
    constraintId: string,
    constraintsVersion?: number,
  ): Promise<void> => {
    await apiClient.delete(`/trips/${tripId}/constraints/${encodeURIComponent(constraintId)}`, {
      data: constraintsVersion != null ? { constraintsVersion } : undefined,
    });
  },

  /** POST /trips/:tripId/constraints/:constraintId/disable */
  disable: async (
    tripId: string,
    constraintId: string,
    constraintsVersion?: number,
  ): Promise<TripConstraint> => {
    const response = await apiClient.post<ApiResponseWrapper<TripConstraint | CreateTripConstraintResponse>>(
      `/trips/${tripId}/constraints/${encodeURIComponent(constraintId)}/disable`,
      constraintsVersion != null ? { constraintsVersion } : {},
    );
    return unwrapConstraintPayload(handleResponse(response));
  },

  /** PATCH /trips/:tripId/constraints/contract */
  patchContract: async (
    tripId: string,
    body: PatchTripConstraintsContractDto,
  ): Promise<PatchTripConstraintsContractResponse> => {
    const response = await apiClient.patch<ApiResponseWrapper<PatchTripConstraintsContractResponse>>(
      `/trips/${tripId}/constraints/contract`,
      body,
    );
    return handleResponse(response);
  },

  /** POST /trips/:tripId/constraints/preview-impact */
  previewImpact: async (
    tripId: string,
    body: TripConstraintPreviewImpactRequest,
  ): Promise<TripConstraintPreviewImpactData> => {
    const response = await apiClient.post<ApiResponseWrapper<TripConstraintPreviewImpactData>>(
      `/trips/${tripId}/constraints/preview-impact`,
      body,
    );
    return handleResponse(response);
  },

  /** POST /trips/:tripId/constraints/check */
  check: async (tripId: string): Promise<TripConstraintsCheckResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<TripConstraintsCheckResponse>>(
      `/trips/${tripId}/constraints/check`,
      {},
    );
    return handleResponse(response);
  },

  /** POST /trips/:tripId/constraints/repair */
  repair: async (
    tripId: string,
    body?: TripConstraintsRepairRequest,
  ): Promise<TripConstraintsRepairResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<TripConstraintsRepairResponse>>(
      `/trips/${tripId}/constraints/repair`,
      body ?? {},
    );
    return handleResponse(response);
  },

  /** POST /trips/:tripId/planning/commands — UPDATE_CONSTRAINTS */
  updateConstraints: async (
    tripId: string,
    body: UpdateConstraintsCommandRequest,
  ): Promise<UpdateConstraintsCommandResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<UpdateConstraintsCommandResponse>>(
      `/trips/${tripId}/planning/commands`,
      body,
    );
    return handleResponse(response);
  },
};
