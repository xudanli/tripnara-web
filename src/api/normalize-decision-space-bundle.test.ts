import { describe, expect, it } from 'vitest';
import { normalizeDecisionSpaceBundle } from '@/api/normalize-decision-space-bundle';

describe('normalizeDecisionSpaceBundle', () => {
  it('peels success envelope and merges basis into inspector', () => {
    const bundle = normalizeDecisionSpaceBundle(
      {
        success: true,
        data: {
          schema: 'tripnara.decision_space_bundle@v1',
          tripId: 'trip_1',
          etag: 'W/"dsb:tv_1:prob_a"',
          binding: { mode: 'problem', problemId: 'prob_a', proposalId: null },
          problem: {
            id: 'prob_a',
            title: '驾驶超时',
            actions: [{ actionId: 'action_a', label: '方案 A', allowed: true }],
          },
          basis: {
            schema: 'tripnara.planning_decision_basis@v1',
            whatHappened: { narrative: '道路封闭' },
            contextFields: [],
          },
          inspector: {
            schema: 'tripnara.planning_decision_inspector@v1',
            mode: 'problem',
            tabEmptyState: { causalChain: true },
            feasibility: { canSafelyWrite: false, gateChecks: [] },
          },
          meta: {
            included: ['problem', 'basis', 'inspector.tabEmptyState'],
            deferred: ['inspector.planDiff'],
          },
        },
      },
      'trip_1',
    );

    expect(bundle.tripId).toBe('trip_1');
    expect(bundle.problem?.id).toBe('prob_a');
    expect(bundle.basis?.whatHappened.narrative).toBe('道路封闭');
    expect(bundle.inspector?.decisionBasis?.whatHappened.narrative).toBe('道路封闭');
    expect(bundle.meta?.deferred).toContain('inspector.planDiff');
  });
});
