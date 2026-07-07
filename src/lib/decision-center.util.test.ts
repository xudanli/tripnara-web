import { describe, expect, it } from 'vitest';
import {
  countOpenDecisionProblems,
  countPendingAttentionDecisions,
  formatDecisionCenterHeadline,
  isOpenDecisionProblem,
  partitionDecisionProblems,
} from '@/lib/decision-center.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

function problem(status: string): DecisionProblemSummary {
  return {
    id: `p_${status}`,
    type: 'INFEASIBILITY',
    title: 'test',
    status,
    primaryEnforcement: 'BLOCK',
  };
}

describe('decision-center.util', () => {
  it('partitions open vs resolved problems', () => {
    const items = [problem('OPEN'), problem('RESOLVED'), problem('DISMISSED'), problem('WAITING_DECISION')];
    const { open, resolved } = partitionDecisionProblems(items);
    expect(open).toHaveLength(2);
    expect(resolved).toHaveLength(2);
  });

  it('counts open problems', () => {
    expect(countOpenDecisionProblems([problem('OPEN'), problem('RESOLVED')])).toBe(1);
  });

  it('formats overview headline with fallback', () => {
    expect(formatDecisionCenterHeadline({ headline: '有必须处理的旅行阻塞（2 项）', problemCounts: { open: 2, byEnforcement: {} }, feasibility: { canStartExecute: false, mustHandleCount: 2 }, actionableProblemCount: 1 })).toBe(
      '有必须处理的旅行阻塞（2 项）',
    );
    expect(formatDecisionCenterHeadline(null, 3)).toBe('有 3 项待决策问题');
    expect(isOpenDecisionProblem(problem('RESOLVED'))).toBe(false);
  });

  it('keeps RESOLVED problems open when execution is PARTIALLY_APPLIED', () => {
    const resolvedProblem = problem('RESOLVED');
    resolvedProblem.id = 'prob_partial';
    const { open } = partitionDecisionProblems([resolvedProblem], [
      {
        id: 'dec_1',
        problemId: 'prob_partial',
        executionStatus: 'PARTIALLY_APPLIED',
        needsRepair: true,
      },
    ]);
    expect(open).toHaveLength(1);
    expect(countPendingAttentionDecisions([
      { id: 'dec_1', executionStatus: 'PARTIALLY_APPLIED', needsRepair: true },
    ])).toBe(1);
  });
});
