import { describe, expect, it } from 'vitest';
import {
  filterDecisionQueueSummaries,
  isReadinessSafetyDecisionProblem,
} from './decision-problem-queue-filter.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

function summary(partial: Partial<DecisionProblemSummary> & Pick<DecisionProblemSummary, 'id' | 'title'>): DecisionProblemSummary {
  return {
    type: 'RISK',
    status: 'OPEN',
    primaryEnforcement: 'REQUIRE_CONFIRMATION',
    ...partial,
  };
}

describe('decision-problem-queue-filter.util', () => {
  it('excludes Iceland emergency phone from decision queue', () => {
    const item = summary({
      id: 'dp_id:issue-finding-2',
      title: '冰岛 紧急电话',
    });
    expect(isReadinessSafetyDecisionProblem(item)).toBe(true);
    expect(filterDecisionQueueSummaries([item])).toHaveLength(0);
  });

  it('keeps route conflict problems', () => {
    const item = summary({
      id: 'dp_id:coverage-gap:1',
      title: '第6天 · 红沙滩',
      semanticKey: 'gate:reachability',
    });
    expect(filterDecisionQueueSummaries([item])).toHaveLength(1);
  });
});
