import { describe, expect, it } from 'vitest';
import { mergeDecisionCenterOverviewV2 } from '@/lib/decision-center-overview-v2.util';
import { resolveDecisionCenterOverviewPresentation } from '@/lib/decision-center-overview.util';

describe('mergeDecisionCenterOverviewV2', () => {
  it('merges v2 headline and counts over legacy base', () => {
    const merged = mergeDecisionCenterOverviewV2(
      {
        headline: 'legacy',
        problemCounts: { open: 1, byEnforcement: { BLOCK: 0 } },
        feasibility: { canStartExecute: false, mustHandleCount: 0 },
        actionableProblemCount: 0,
      },
      {
        headline: 'v2 headline',
        totalOpenProblemCount: 3,
        blockingProblemCount: 2,
        occurrenceCount: 5,
      },
    );

    expect(merged?.headline).toBe('v2 headline');
    expect(merged?.problemCounts.open).toBe(3);
    expect(merged?.blockingProblemCount).toBe(2);
    expect(merged?.occurrenceCount).toBe(5);
  });

  it('derives resolvedProblemCount from legacy byStatus when v2 omits it', () => {
    const merged = mergeDecisionCenterOverviewV2(
      {
        headline: 'legacy',
        problemCounts: {
          open: 2,
          byEnforcement: {},
          byStatus: { RESOLVED: 3, DISMISSED: 1 },
        } as import('@/types/decision-problem').DecisionCenterOverview['problemCounts'],
        feasibility: { canStartExecute: false, mustHandleCount: 0 },
        actionableProblemCount: 0,
      },
      { totalOpenProblemCount: 2, blockingProblemCount: 1 },
    );
    expect(merged?.resolvedProblemCount).toBe(4);
    expect(merged?.totalProblemCount).toBe(6);
  });

  it('uses v2 resolvedProblemCount when provided', () => {
    const merged = mergeDecisionCenterOverviewV2(
      {
        headline: 'legacy',
        problemCounts: { open: 1, byEnforcement: {} },
        feasibility: { canStartExecute: false, mustHandleCount: 0 },
        actionableProblemCount: 0,
      },
      {
        totalOpenProblemCount: 2,
        blockingProblemCount: 1,
        resolvedProblemCount: 5,
        totalProblemCount: 7,
      },
    );
    expect(merged?.resolvedProblemCount).toBe(5);
    expect(merged?.totalProblemCount).toBe(7);
  });
});

describe('resolveDecisionCenterOverviewPresentation v2 counts', () => {
  it('prefers blockingProblemCount over byEnforcement.BLOCK', () => {
    const p = resolveDecisionCenterOverviewPresentation({
      headline: '有阻塞',
      problemCounts: { open: 2, byEnforcement: { BLOCK: 1 } },
      feasibility: { canStartExecute: false, mustHandleCount: 1 },
      actionableProblemCount: 1,
      blockingProblemCount: 2,
    });
    expect(p.blockCount).toBe(2);
    expect(p.state).toBe('BLOCK');
  });

  it('exposes occurrenceCount when above openCount', () => {
    const p = resolveDecisionCenterOverviewPresentation(
      {
        headline: '需关注',
        problemCounts: { open: 2, byEnforcement: { WARN: 1 } },
        feasibility: { canStartExecute: false, mustHandleCount: 0 },
        actionableProblemCount: 1,
        occurrenceCount: 4,
        totalOpenProblemCount: 2,
      },
    );
    expect(p.openCount).toBe(2);
    expect(p.occurrenceCount).toBe(4);
  });
});
