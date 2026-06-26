import apiClient from './client';
import { getRepairOptions as fetchIssueRepairOptions } from '@/api/feasibility-repair';
import { tripsApi } from '@/api/trips';
import { inTripExecutionApi } from '@/api/in-trip-execution';
import { realtimeApi } from '@/api/optimization-v2';
import type { FeasibilityRepairOptionsResponse } from '@/types/feasibility-repair';
import type { TripState } from '@/types/trip';
import type {
  TripFeasibilityReportDto,
  FeasibilityRepairOptionDto,
  FeasibilityReportValidateOptions,
  FeasibilityValidateScope,
} from '@/types/trip-feasibility-report';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';
import { buildTripFeasibilityReport, finalizeAdapterFeasibilityReport } from '@/lib/trip-feasibility-report.adapter';
import { normalizeFeasibilityReport } from '@/lib/feasibility-issue-dedupe';
import { enrichFeasibilityReportAccommodation } from '@/lib/feasibility-day-accommodation';
import { normalizeFeasibilityReportExtensions } from '@/lib/feasibility-report-normalize';
import { normalizeFeasibilityReportFromApi } from '@/lib/feasibility-dimension-display';
import { buildTripExecutionAdvisory } from '@/lib/trip-execution-advisory.adapter';
import { readinessApi } from '@/api/readiness';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class TripConstraintSolverApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'TripConstraintSolverApiError';
  }
}

function unwrapData<T>(response: { data: ApiResponseWrapper<T> }): T | null {
  if (response?.data?.success && response.data.data != null) {
    return response.data.data;
  }
  return null;
}

function getApiError(err: unknown): ErrorResponse['error'] | undefined {
  return (err as { response?: { data?: ErrorResponse } })?.response?.data?.error;
}

function isNotImplemented(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
}

function throwIfConstraintSolverError(err: unknown): void {
  const apiError = getApiError(err);
  const code = apiError?.code;
  if (
    code === 'EXECUTION_ADVISORY_NOT_IN_TRIP' ||
    code === 'EXECUTION_ADVISORY_DISABLED'
  ) {
    throw new TripConstraintSolverApiError(
      code,
      apiError?.message ?? code,
      apiError?.details,
    );
  }
}

function toValidateScopeBody(
  scope: { dayNumber?: number; issueId?: string; segmentId?: string },
): FeasibilityValidateScope {
  if (scope.segmentId) {
    return { type: 'route', segmentId: scope.segmentId };
  }
  if (scope.issueId) {
    return { type: 'issue', issueId: scope.issueId };
  }
  if (scope.dayNumber != null) {
    return { type: 'day', dayNumber: scope.dayNumber };
  }
  return { type: 'trip' };
}

async function fetchFeasibilityReportFromBff(tripId: string): Promise<{
  report: TripFeasibilityReportDto;
  raw: Record<string, unknown> | null;
} | null> {
  try {
    const response = await apiClient.get<ApiResponseWrapper<TripFeasibilityReportDto>>(
      `/trips/${tripId}/feasibility-report`,
    );
    const data = unwrapData(response);
    if (!data) return null;
    return {
      report: data,
      raw: data as unknown as Record<string, unknown>,
    };
  } catch (err) {
    if (isNotImplemented(err)) return null;
    throw err;
  }
}

async function fetchExecutionAdvisoryFromBff(tripId: string): Promise<TripExecutionAdvisoryDto | null> {
  try {
    const response = await apiClient.get<ApiResponseWrapper<TripExecutionAdvisoryDto>>(
      `/trips/${tripId}/in-trip/execution-advisory`,
    );
    return unwrapData(response);
  } catch (err) {
    throwIfConstraintSolverError(err);
    if (isNotImplemented(err)) return null;
    throw err;
  }
}

/** @deprecated 仅 BFF 404/501 时回退；C 端主路径应使用 GET feasibility-report */
async function buildFeasibilityReportFallback(tripId: string): Promise<TripFeasibilityReportDto> {
  const [scoreBreakdown, trip] = await Promise.all([
    readinessApi.getScoreBreakdown(tripId).catch(() => null),
    tripsApi.getById(tripId).catch(() => null),
  ]);
  const report = buildTripFeasibilityReport(tripId, scoreBreakdown, trip);
  return enrichFeasibilityReportAccommodation(
    tripId,
    normalizeFeasibilityReport(finalizeAdapterFeasibilityReport(report)),
  );
}

async function finalizeFeasibilityReport(
  tripId: string,
  report: TripFeasibilityReportDto,
  raw?: Record<string, unknown> | null,
): Promise<TripFeasibilityReportDto> {
  const fromApi = normalizeFeasibilityReportFromApi(report, raw);
  const enriched = await enrichFeasibilityReportAccommodation(
    tripId,
    normalizeFeasibilityReport(fromApi),
  );
  return normalizeFeasibilityReportExtensions(enriched, raw);
}

async function buildExecutionAdvisoryFallback(
  tripId: string,
  tripState?: TripState | null,
): Promise<TripExecutionAdvisoryDto> {
  const [today, events, predicted] = await Promise.all([
    inTripExecutionApi.getToday(tripId),
    inTripExecutionApi.listEnvironmentEvents(tripId).catch(() => []),
    realtimeApi.predictState(tripId, 24).catch(() => null),
  ]);

  let state = tripState;
  if (!state) {
    state = await tripsApi.getState(tripId).catch(() => null);
  }

  return buildTripExecutionAdvisory(tripId, today, {
    tripState: state,
    environmentEvents: events,
    predicted,
  });
}

/**
 * 约束求解器产品读模型 API — 行前 Plan Validation / 行中 Runtime Assurance。
 * 主路径：`trip-constraint-solver` BFF；404/501 回退 adapter（legacy readiness 分数合成）。
 * 写库主路径（P0）：Loop `apply` / feasibility `apply-repair`；勿再调 deprecated readiness 写接口。
 */
export const tripConstraintSolverApi = {
  /** 行前：整趟可执行性报告 */
  getFeasibilityReport: async (tripId: string): Promise<TripFeasibilityReportDto> => {
    const fromBff = await fetchFeasibilityReportFromBff(tripId);
    if (fromBff) {
      return finalizeFeasibilityReport(tripId, fromBff.report, fromBff.raw);
    }
    return buildFeasibilityReportFallback(tripId);
  },

  /**
   * 行前：重验证并写入 metadata.feasibilityReportSnapshot。
   * 内聚 refresh-evidence + Monte Carlo；C 端勿再调 POST /readiness/refresh-evidence。
   */
  revalidateFullTrip: async (
    tripId: string,
    options?: FeasibilityReportValidateOptions,
  ): Promise<TripFeasibilityReportDto> => {
    try {
      const response = await apiClient.post<ApiResponseWrapper<TripFeasibilityReportDto>>(
        `/trips/${tripId}/feasibility-report/validate`,
        options ?? {},
      );
      const fromBff = unwrapData(response);
      if (fromBff) return finalizeFeasibilityReport(tripId, fromBff);
    } catch (err) {
      if (!isNotImplemented(err)) throw err;
    }

    return buildFeasibilityReportFallback(tripId);
  },

  /** 行前：局部验证（day / issue / route segment） */
  revalidateScope: async (
    tripId: string,
    scope: { dayNumber?: number; issueId?: string; segmentId?: string },
  ): Promise<TripFeasibilityReportDto> => {
    try {
      const response = await apiClient.post<ApiResponseWrapper<TripFeasibilityReportDto>>(
        `/trips/${tripId}/feasibility-report/validate-scope`,
        { scope: toValidateScopeBody(scope) },
      );
      const fromBff = unwrapData(response);
      if (fromBff) return finalizeFeasibilityReport(tripId, fromBff);
    } catch (err) {
      if (!isNotImplemented(err)) throw err;
    }

    return buildFeasibilityReportFallback(tripId);
  },

  /** 行前：问题修复选项（含 guardian + cascade）；首选 BFF GET repair-options */
  getIssueRepairOptions: async (
    tripId: string,
    issueId: string,
  ): Promise<FeasibilityRepairOptionDto[]> => {
    const res = await fetchIssueRepairOptions(tripId, issueId);
    return res.options;
  },

  /** 完整 repair-options 信封（issueId / blockerId / guardian / cascade） */
  getIssueRepairOptionsEnvelope: async (
    tripId: string,
    issueId: string,
  ): Promise<FeasibilityRepairOptionsResponse> => {
    return fetchIssueRepairOptions(tripId, issueId);
  },

  /** @deprecated 请使用 feasibility-repair.applyRepair 或 Loop apply */
  applyIssueRepair: async (
    tripId: string,
    issueId: string,
    optionId: string,
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await apiClient.post<
        ApiResponseWrapper<{ success: boolean; message?: string }>
      >(
        `/trips/${tripId}/feasibility-report/issues/${encodeURIComponent(issueId)}/apply-repair`,
        { optionId, executeDecision: true, persistDecision: true },
      );
      return unwrapData(response) ?? { success: true };
    } catch (err) {
      if (!isNotImplemented(err)) throw err;
    }
    return readinessApi.applyRepair(tripId, issueId, optionId);
  },

  /** 行中：实时执行建议（TRAVELING + IN_TRIP_EXECUTION_ENABLED） */
  getExecutionAdvisory: async (
    tripId: string,
    options?: { tripState?: TripState | null },
  ): Promise<TripExecutionAdvisoryDto> => {
    const fromBff = await fetchExecutionAdvisoryFromBff(tripId);
    if (fromBff) return fromBff;
    return buildExecutionAdvisoryFallback(tripId, options?.tripState);
  },
};

export function isExecutionAdvisoryDisabledError(err: unknown): boolean {
  return err instanceof TripConstraintSolverApiError && err.code === 'EXECUTION_ADVISORY_DISABLED';
}

export function isExecutionAdvisoryNotInTripError(err: unknown): boolean {
  return err instanceof TripConstraintSolverApiError && err.code === 'EXECUTION_ADVISORY_NOT_IN_TRIP';
}

export type { FeasibilityValidateScope };
