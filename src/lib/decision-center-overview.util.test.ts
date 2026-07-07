import { describe, expect, it } from 'vitest';
import { resolveDecisionCenterOverviewPresentation } from '@/lib/decision-center-overview.util';
import type { DecisionCenterOverview } from '@/types/decision-problem';

function baseOverview(
  partial: Partial<DecisionCenterOverview> = {},
): DecisionCenterOverview {
  return {
    headline: '',
    problemCounts: { open: 0, byEnforcement: {} },
    feasibility: { canStartExecute: true, mustHandleCount: 0 },
    actionableProblemCount: 0,
    ...partial,
  };
}

describe('resolveDecisionCenterOverviewPresentation', () => {
  it('returns PASS when no open problems and can start execute', () => {
    const p = resolveDecisionCenterOverviewPresentation(baseOverview());
    expect(p.state).toBe('PASS');
    expect(p.headline).toBe('当前行程检查通过');
  });

  it('returns BLOCK when block enforcement present', () => {
    const p = resolveDecisionCenterOverviewPresentation(
      baseOverview({
        problemCounts: {
          open: 2,
          byEnforcement: { BLOCK: 1, WARN: 1 },
        },
        feasibility: { canStartExecute: false, mustHandleCount: 1 },
      }),
    );
    expect(p.state).toBe('BLOCK');
    expect(p.blockCount).toBe(1);
  });

  it('returns APPLYING when a decision is APPLYING', () => {
    const p = resolveDecisionCenterOverviewPresentation(
      baseOverview({
        recentDecisions: [
          {
            decisionId: 'd1',
            problemId: 'p1',
            executionStatus: 'APPLYING',
          },
        ],
      }),
    );
    expect(p.state).toBe('APPLYING');
  });

  it('returns REQUIRE_CONFIRMATION before WARN', () => {
    const p = resolveDecisionCenterOverviewPresentation(
      baseOverview({
        problemCounts: {
          open: 2,
          byEnforcement: { REQUIRE_CONFIRMATION: 1, WARN: 1 },
        },
        feasibility: { canStartExecute: false, mustHandleCount: 0 },
      }),
    );
    expect(p.state).toBe('REQUIRE_CONFIRMATION');
  });

  it('exposes resolvedProblemCount from v2 overview', () => {
    const p = resolveDecisionCenterOverviewPresentation(
      baseOverview({ resolvedProblemCount: 3, blockingProblemCount: 1 }),
    );
    expect(p.resolvedCount).toBe(3);
    expect(p.blockCount).toBe(1);
  });
});
