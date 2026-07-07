import { describe, expect, it } from 'vitest';
import {
  formatDecisionListBadgeLabel,
  formatWorkbenchDecisionQueueHeadline,
  resolveDecisionListBadgeCount,
} from './decision-list-badge.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

const adjustmentProblem = (id: string): DecisionProblemSummary =>
  ({
    id,
    title: id,
    status: 'OPEN',
    primaryEnforcement: 'REQUIRE_ADJUSTMENT',
  }) as DecisionProblemSummary;

describe('decision-list-badge.util', () => {
  it('prefers actionableCount', () => {
    expect(resolveDecisionListBadgeCount({ actionableCount: 2, openCount: 5 })).toBe(2);
    expect(formatDecisionListBadgeLabel({ actionableCount: 2, openCount: 5 })).toBe('2 待决策');
  });

  it('falls back to openCount', () => {
    expect(resolveDecisionListBadgeCount({ openCount: 3 })).toBe(3);
    expect(formatDecisionListBadgeLabel({ openCount: 3 })).toBe('3 待处理');
  });

  it('returns empty label when no open items', () => {
    expect(formatDecisionListBadgeLabel({ actionableCount: 0, openCount: 0 })).toBe('');
  });

  it('queue headline explains diagnostic merge when occurrenceCount exceeds visible open', () => {
    expect(
      formatWorkbenchDecisionQueueHeadline(
        [adjustmentProblem('a'), adjustmentProblem('b')],
        null,
        { occurrenceCount: 14, openCount: 2 },
      ),
    ).toBe('AI 已将 14 项诊断合并为 2 个决策');
  });

  it('queue headline uses visible open count when no merge', () => {
    expect(
      formatWorkbenchDecisionQueueHeadline([adjustmentProblem('a'), adjustmentProblem('b')], null),
    ).toBe('建议尽快调整行程（2 项）');
  });
});
