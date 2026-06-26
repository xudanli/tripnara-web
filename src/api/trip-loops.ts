import apiClient from './client';
import {
  normalizeInTripRecoveryLatest,
  normalizeInTripRecoveryRunResult,
  normalizeLoopApplyResponse,
  normalizeReadinessRepairLatest,
  normalizeReadinessRepairRunResult,
} from '@/lib/trip-loop.adapter';
import type {
  InTripApplyRequest,
  InTripApplyResponse,
  InTripRecoveryLatestDto,
  InTripRecoveryRunResult,
  LoopApplyRequest,
  LoopApplyResponse,
  ReadinessRepairLatestDto,
  ReadinessRepairRunResult,
  ReadinessRepairRunRequest,
  ReadinessRepairTriggerRequest,
} from '@/types/trip-loop';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class TripLoopsApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TripLoopsApiError';
  }
}

/** Loop API：HTTP 200 + success:false 亦视为错误（非 4xx） */
function unwrapLoopData<T>(response: { data: ApiResponseWrapper<T> }): T {
  const body = response?.data;
  if (!body?.success) {
    const err = body && 'error' in body ? body.error : undefined;
    throw new TripLoopsApiError(err?.code ?? 'REQUEST_FAILED', err?.message ?? '请求失败');
  }
  if (body.data === undefined || body.data === null) {
    throw new TripLoopsApiError('EMPTY_DATA', '无效的 API 响应：data 为空');
  }
  return body.data;
}

const base = (tripId: string) => `/trips/${tripId}/loops`;

function assertNonEmptyPatches(body: LoopApplyRequest): void {
  if (!body.patches?.length) {
    throw new TripLoopsApiError('BAD_REQUEST', 'patches 不能为空');
  }
}

function assertNonEmptyPlans(body: InTripApplyRequest): void {
  if (!body.plans?.length) {
    throw new TripLoopsApiError('BAD_REQUEST', 'plans 不能为空');
  }
}

export const tripLoopsApi = {
  async runReadinessRepair(
    tripId: string,
    body: ReadinessRepairRunRequest = {},
  ): Promise<ReadinessRepairRunResult> {
    const res = await apiClient.post<ApiResponseWrapper<unknown>>(
      `${base(tripId)}/readiness-repair`,
      body,
    );
    const data = unwrapLoopData(res);
    const run = normalizeReadinessRepairRunResult(data);
    if (!run) throw new TripLoopsApiError('PARSE_ERROR', '无法解析 readiness-repair 响应');
    return run;
  },

  async getReadinessRepairLatest(tripId: string): Promise<ReadinessRepairLatestDto> {
    const res = await apiClient.get<ApiResponseWrapper<unknown>>(
      `${base(tripId)}/readiness-repair/latest`,
    );
    return normalizeReadinessRepairLatest(unwrapLoopData(res));
  },

  async triggerReadinessRepair(
    tripId: string,
    body: ReadinessRepairTriggerRequest,
  ): Promise<ReadinessRepairRunResult | null> {
    const res = await apiClient.post<ApiResponseWrapper<unknown>>(
      `${base(tripId)}/readiness-repair/trigger`,
      body,
    );
    const data = unwrapLoopData(res);
    return normalizeReadinessRepairRunResult(data);
  },

  async getLoopRun(tripId: string, loopRunId: string): Promise<ReadinessRepairRunResult | null> {
    const res = await apiClient.get<ApiResponseWrapper<unknown>>(
      `${base(tripId)}/${encodeURIComponent(loopRunId)}`,
    );
    return normalizeReadinessRepairRunResult(unwrapLoopData(res));
  },

  async applyReadinessRepair(
    tripId: string,
    loopRunId: string,
    body: LoopApplyRequest,
  ): Promise<LoopApplyResponse> {
    assertNonEmptyPatches(body);
    const res = await apiClient.post<ApiResponseWrapper<unknown>>(
      `${base(tripId)}/${encodeURIComponent(loopRunId)}/apply`,
      body,
    );
    return normalizeLoopApplyResponse(unwrapLoopData(res));
  },

  async runInTripRecovery(
    tripId: string,
    body: { environmentEventId?: string } = {},
  ): Promise<InTripRecoveryRunResult> {
    const res = await apiClient.post<ApiResponseWrapper<unknown>>(
      `${base(tripId)}/in-trip-recovery`,
      body,
    );
    const run = normalizeInTripRecoveryRunResult(unwrapLoopData(res));
    if (!run) throw new TripLoopsApiError('PARSE_ERROR', '无法解析 in-trip-recovery 响应');
    return run;
  },

  async getInTripRecoveryLatest(tripId: string): Promise<InTripRecoveryLatestDto> {
    const res = await apiClient.get<ApiResponseWrapper<unknown>>(
      `${base(tripId)}/in-trip-recovery/latest`,
    );
    return normalizeInTripRecoveryLatest(unwrapLoopData(res));
  },

  async triggerInTripRecovery(
    tripId: string,
    body: { environmentEventId?: string; force?: boolean } = {},
  ): Promise<InTripRecoveryRunResult | null> {
    const res = await apiClient.post<ApiResponseWrapper<unknown>>(
      `${base(tripId)}/in-trip-recovery/trigger`,
      body,
    );
    return normalizeInTripRecoveryRunResult(unwrapLoopData(res));
  },

  async applyInTripRecovery(
    tripId: string,
    loopRunId: string,
    body: InTripApplyRequest,
  ): Promise<InTripApplyResponse> {
    assertNonEmptyPlans(body);
    const res = await apiClient.post<ApiResponseWrapper<unknown>>(
      `${base(tripId)}/${encodeURIComponent(loopRunId)}/apply-in-trip`,
      body,
    );
    return unwrapLoopData(res) as InTripApplyResponse;
  },
};

export function isTripLoopsBadRequest(err: unknown): boolean {
  return err instanceof TripLoopsApiError && err.code === 'BAD_REQUEST';
}

export function isTripLoopsNotFound(err: unknown): boolean {
  return err instanceof TripLoopsApiError && err.code === 'NOT_FOUND';
}
