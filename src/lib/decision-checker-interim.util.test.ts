import { describe, expect, it } from 'vitest';
import { buildDecisionCheckerPlanningInterim } from '@/lib/decision-checker-interim.util';

describe('buildDecisionCheckerPlanningInterim', () => {
  it('returns null while planning still loading with no items', () => {
    expect(
      buildDecisionCheckerPlanningInterim({
        summary: { total: 0, mustHandle: 0, suggestAdjust: 0, pendingConfirm: 0, byCategory: {} },
        items: [],
        planningLoading: true,
      }),
    ).toBeNull();
  });

  it('builds interim from planning conflicts summary and top item', () => {
    const interim = buildDecisionCheckerPlanningInterim({
      summary: { total: 3, mustHandle: 2, suggestAdjust: 1, pendingConfirm: 0, byCategory: {} },
      items: [
        {
          id: 'c1',
          priority: 'must_handle',
          title: 'Day 3 驾驶超时',
          message: '预计驾驶时间超出每日上限',
        } as import('@/lib/planning-conflicts.util').PlanningConflictItem,
      ],
      verdictHeadline: '需调整后再执行',
      planningLoading: false,
    });

    expect(interim).toMatchObject({
      total: 3,
      mustHandle: 2,
      topConflictTitle: 'Day 3 驾驶超时',
    });
  });
});
