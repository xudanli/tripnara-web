import { describe, expect, it } from 'vitest';
import { isDecisionPendingAttention } from '@/generated/decision-semantics-contracts';

describe('DecisionCenterPendingDecisionsStrip logic', () => {
  it('filters recentDecisions to pending attention only (executionStatus, not status)', () => {
    const recent = [
      { decisionId: 'd1', executionStatus: 'APPLIED' as const, status: 'EXECUTED' as const },
      {
        decisionId: 'd2',
        executionStatus: 'PARTIALLY_APPLIED' as const,
        recordStatus: 'PARTIALLY_APPLIED' as const,
        needsRepair: true,
        status: 'PARTIALLY_APPLIED' as const,
      },
      { decisionId: 'd3', executionStatus: 'IDEMPOTENT_REPLAY' as const },
    ];
    const pending = recent.filter((d) =>
      isDecisionPendingAttention(d.executionStatus, d.needsRepair),
    );
    expect(pending).toHaveLength(1);
    expect(pending[0]?.decisionId).toBe('d2');
  });
});
