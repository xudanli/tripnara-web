import { describe, expect, it } from 'vitest';
import {
  buildPlanningConflictsStaleRefetchKey,
  resolvePlanningConflictsConstraintsVersion,
  shouldRefetchPlanningConflictsForStaleVersion,
} from '@/lib/planning-conflicts-stale.util';
import type { PlanningConflictsResponse } from '@/types/planning-conflicts';

function bundle(partial: Partial<PlanningConflictsResponse>): PlanningConflictsResponse {
  return {
    tripId: 't1',
    summary: { total: 0, mustHandle: 0, suggestAdjust: 0, pendingConfirm: 0, byCategory: {} },
    conflicts: [],
    ...partial,
  };
}

describe('planning-conflicts-stale.util', () => {
  it('reads constraintsVersion from top-level or embedded summary', () => {
    expect(
      resolvePlanningConflictsConstraintsVersion(
        bundle({ constraintsVersion: 4 }),
      ),
    ).toBe(4);
    expect(
      resolvePlanningConflictsConstraintsVersion(
        bundle({ constraintsSummary: { constraintsVersion: 5 } as never }),
      ),
    ).toBe(5);
  });

  it('refetches when isStale and query cv lags response cv', () => {
    expect(
      shouldRefetchPlanningConflictsForStaleVersion({
        isStale: true,
        queryConstraintsVersion: 3,
        responseConstraintsVersion: 4,
      }),
    ).toBe(true);
    expect(
      shouldRefetchPlanningConflictsForStaleVersion({
        isStale: false,
        queryConstraintsVersion: 3,
        responseConstraintsVersion: 4,
      }),
    ).toBe(false);
    expect(
      shouldRefetchPlanningConflictsForStaleVersion({
        isStale: true,
        queryConstraintsVersion: 4,
        responseConstraintsVersion: 4,
      }),
    ).toBe(false);
  });

  it('builds stable refetch keys', () => {
    const key = buildPlanningConflictsStaleRefetchKey(
      't1',
      3,
      bundle({ isStale: true, constraintsVersion: 4, conflictsGeneratedAt: 'x' }),
    );
    expect(key).toContain('t1');
    expect(key).toContain('stale');
  });
});
