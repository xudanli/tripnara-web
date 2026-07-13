/**
 * 旅行决策合同 / 约束控制台 — 前端 Client
 * @see Swagger tag: trip-constraints
 * 与后端 `dto/frontend-travel-decision-contract-api-client.ts` 对齐
 */

import apiClient from './client';
import {
  tripConstraintsApi,
  TripConstraintsApiError,
  isTripConstraintsUnavailable,
} from '@/api/trip-constraints';
import type { UnifiedConstraintAssessmentBundle } from '@/types/frontend-constraint-assessment-api.types';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import { buildConstraintConsoleViewModelFromListResponse } from '@/lib/trip-constraints-contract.util';
import type {
  ConstraintConsoleViewModel,
  PatchTripConstraintsContractDto,
} from '@/types/frontend-travel-decision-contract-api.types';
import type {
  PatchTripConstraintsContractResponse,
  TripConstraintPreviewImpactData,
  TripConstraintPreviewChange,
  TripConstraintsCheckResponse,
  TripConstraintsListResponse,
} from '@/types/trip-constraints';

export type {
  ConstraintConsoleViewModel,
  ConstraintConsoleViewSection,
} from '@/types/frontend-travel-decision-contract-api.types';

export { TripConstraintsApiError, isTripConstraintsUnavailable };

/** GET /trips/:tripId/constraints */
export async function fetchConstraintConsole(tripId: string): Promise<ConstraintConsoleViewModel> {
  const data = await tripConstraintsApi.list(tripId);
  return buildConstraintConsoleViewModel(data);
}

/** 由 GET 响应构建侧栏/控制台视图（items 需已 merge 客户端 legacy 时可传入 enriched） */
export function buildConstraintConsoleViewModel(
  data: TripConstraintsListResponse,
  uiEntries?: ConstraintListEntry[],
): ConstraintConsoleViewModel {
  return buildConstraintConsoleViewModelFromListResponse(data, uiEntries);
}

/** PATCH /trips/:tripId/constraints/contract */
export async function patchTravelDecisionContract(
  tripId: string,
  body: PatchTripConstraintsContractDto,
): Promise<PatchTripConstraintsContractResponse> {
  return tripConstraintsApi.patchContract(tripId, body);
}

/** POST /trips/:tripId/constraints/preview-impact */
export async function previewConstraintImpact(
  tripId: string,
  changes: TripConstraintPreviewChange[],
  options?: { constraintsVersion?: number; persist?: boolean; planId?: string },
): Promise<TripConstraintPreviewImpactData> {
  return tripConstraintsApi.previewImpact(tripId, {
    changes,
    constraintsVersion: options?.constraintsVersion,
    persist: options?.persist,
    planId: options?.planId,
  });
}

/** POST /trips/:tripId/constraints/check */
export async function checkConstraintConflicts(
  tripId: string,
): Promise<TripConstraintsCheckResponse> {
  return tripConstraintsApi.check(tripId);
}

export function isConstraintsStaleError(err: unknown): boolean {
  return err instanceof TripConstraintsApiError && err.code === 'CONSTRAINTS_STALE';
}

type ConstraintAssessmentBundlePayload = UnifiedConstraintAssessmentBundle & {
  /** BFF Phase 0 实际字段名；与 assessments 同构 */
  items?: UnifiedConstraintAssessmentBundle['assessments'];
};

/** BFF 返回 items[] 时归一化为 assessments[]，供 card-view lookup 使用 */
export function normalizeConstraintAssessmentBundle(
  data: ConstraintAssessmentBundlePayload,
): UnifiedConstraintAssessmentBundle {
  const assessments =
    data.assessments?.length ? data.assessments : (data.items ?? []);
  return {
    tripId: data.tripId,
    constraintsVersion: data.constraintsVersion,
    assessedAt: data.assessedAt,
    assessments,
  };
}

/** GET /trips/:tripId/constraint-assessments */
export async function fetchConstraintAssessments(
  tripId: string,
  options?: { refresh?: boolean },
): Promise<UnifiedConstraintAssessmentBundle> {
  const response = await apiClient.get<{
    success: boolean;
    data?: ConstraintAssessmentBundlePayload;
    error?: { message?: string };
  }>(`/trips/${tripId}/constraint-assessments`, {
    params: options?.refresh ? { refresh: true } : undefined,
  });
  const body = response.data;
  if (!body?.success || !body.data) {
    throw new Error(body?.error?.message ?? 'constraint-assessments failed');
  }
  return normalizeConstraintAssessmentBundle(body.data);
}
