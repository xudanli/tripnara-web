import type { PlanningConflictsResponse } from '@/types/planning-conflicts';

/** BFF 响应中的 constraintsVersion（顶层或 constraintsSummary 嵌入） */
export function resolvePlanningConflictsConstraintsVersion(
  bundle: PlanningConflictsResponse | null | undefined,
): number | null {
  if (!bundle) return null;
  const top = (bundle as PlanningConflictsResponse & { constraintsVersion?: number })
    .constraintsVersion;
  if (typeof top === 'number' && Number.isFinite(top)) return top;
  const embedded = bundle.constraintsSummary?.constraintsVersion;
  if (typeof embedded === 'number' && Number.isFinite(embedded)) return embedded;
  return null;
}

export interface PlanningConflictsStaleRefetchInput {
  isStale: boolean;
  queryConstraintsVersion?: number | null;
  responseConstraintsVersion?: number | null;
}

/**
 * query cv 落后于 BFF 响应 cv 且 isStale 时，应先刷新 constraints 列表再重拉 planning-conflicts。
 */
export function shouldRefetchPlanningConflictsForStaleVersion(
  input: PlanningConflictsStaleRefetchInput,
): boolean {
  if (!input.isStale) return false;
  const responseCv = input.responseConstraintsVersion;
  const queryCv = input.queryConstraintsVersion;
  if (responseCv == null) return true;
  if (queryCv == null) return true;
  return responseCv > queryCv;
}

export function buildPlanningConflictsStaleRefetchKey(
  tripId: string,
  queryCv: number | null | undefined,
  bundle: PlanningConflictsResponse | null | undefined,
): string {
  const responseCv = resolvePlanningConflictsConstraintsVersion(bundle);
  return [
    tripId,
    queryCv ?? 'null',
    responseCv ?? 'null',
    bundle?.isStale ? 'stale' : 'fresh',
    bundle?.conflictsGeneratedAt ?? '',
  ].join(':');
}
