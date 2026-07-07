import { describe, expect, it } from 'vitest';
import {
  compareDecisionProblemsForQueue,
  formatQueueRowContextLine,
  groupQueueProblemsByDay,
  resolveDecisionProblemQueueDisplay,
} from '@/lib/decision-problem-queue-display.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

describe('decision-problem-queue-display.util', () => {
  it('splits day prefix from title', () => {
    const display = resolveDecisionProblemQueueDisplay({
      id: 'p1',
      type: 'RISK',
      title: '第9天 · 雷尼斯黑沙滩',
      status: 'OPEN',
      primaryEnforcement: 'REQUIRE_ADJUSTMENT',
      affectedDayNumbers: [9],
    });

    expect(display.dayBadge).toBe('第 9 天');
    expect(display.issueTitle).toBe('雷尼斯黑沙滩');
  });

  it('uses day badge for duplicate generic titles', () => {
    const display = resolveDecisionProblemQueueDisplay({
      id: 'p2',
      type: 'RISK',
      title: '交通缓冲偏紧',
      status: 'OPEN',
      primaryEnforcement: 'ADVISE',
      affectedDayNumbers: [5],
      affectedScopeSummary: '第5天 · 草帽山 → 黑教堂',
    });

    expect(display.dayBadge).toBe('第 5 天');
    expect(display.issueTitle).toBe('交通缓冲偏紧');
    expect(display.contextLine).toBe('草帽山 → 黑教堂');
  });

  it('sorts queue items by enforcement then day', () => {
    const items: DecisionProblemSummary[] = [
      {
        id: 'p9',
        type: 'RISK',
        title: '第9天 · 雷尼斯黑沙滩',
        status: 'OPEN',
        primaryEnforcement: 'REQUIRE_ADJUSTMENT',
        affectedDayNumbers: [9],
      },
      {
        id: 'p5',
        type: 'RISK',
        title: '交通缓冲偏紧',
        status: 'OPEN',
        primaryEnforcement: 'ADVISE',
        affectedDayNumbers: [5],
      },
      {
        id: 'p1',
        type: 'RISK',
        title: '交通缓冲偏紧',
        status: 'OPEN',
        primaryEnforcement: 'ADVISE',
        affectedDayNumbers: [1],
      },
    ];

    const sorted = [...items].sort(compareDecisionProblemsForQueue);
    expect(sorted.map((item) => item.id)).toEqual(['p9', 'p1', 'p5']);
  });

  it('shortens lunch-late diagnostic title for queue row', () => {
    const display = resolveDecisionProblemQueueDisplay({
      id: 'p-lunch',
      type: 'RISK',
      title: '预计 彩虹街 结束于 16:27，晚于午餐窗 12:00',
      status: 'OPEN',
      primaryEnforcement: 'REQUIRE_ADJUSTMENT',
      affectedDayNumbers: [1],
      queueCategoryLabel: '日程',
    });

    expect(display.dayBadge).toBe('第 1 天');
    expect(display.issueTitle).toBe('午餐窗冲突');
    expect(display.contextLine).toBe('彩虹街');
  });

  it('infers day from description when affectedDayNumbers missing', () => {
    const display = resolveDecisionProblemQueueDisplay({
      id: 'p-lunch',
      type: 'RISK',
      title: '午餐窗冲突',
      status: 'OPEN',
      primaryEnforcement: 'REQUIRE_ADJUSTMENT',
      categoryLabel: '日程',
      affectedScopeSummary: '彩虹街',
      description: '预计 彩虹街 结束于 16:27，晚于午餐窗 12:00',
      impactScopeView: {
        arrangements: [{ label: '彩虹街', dayIndex: 1 }],
      },
    });

    expect(display.dayBadge).toBe('第 1 天');
    expect(display.issueTitle).toBe('午餐窗冲突');
    expect(display.contextLine).toBe('彩虹街');
  });

  it('uses scope.dayIds for day badge when legacy affectedDayNumbers empty', () => {
    const display = resolveDecisionProblemQueueDisplay({
      id: 'CAS-123',
      type: 'RISK',
      title: '午餐窗冲突',
      status: 'OPEN',
      primaryEnforcement: 'REQUIRE_ADJUSTMENT',
      categoryLabel: '日程',
      affectedScopeSummary: '彩虹街',
      scope: { dayIds: [1] },
      impactScopeView: {
        arrangements: [{ label: '彩虹街', dayIndex: 1 }],
      },
    });

    expect(display.dayBadge).toBe('第 1 天');
    expect(display.issueTitle).toBe('午餐窗冲突');
    expect(display.contextLine).toBe('彩虹街');
  });

  it('formats queue row context from day and category', () => {
    expect(
      formatQueueRowContextLine({
        id: 'p1',
        type: 'RISK',
        title: '预计 冰河湖 结束于 16:49，晚于午餐窗 12:00',
        status: 'OPEN',
        primaryEnforcement: 'REQUIRE_ADJUSTMENT',
        affectedDayNumbers: [3],
        queueCategoryLabel: '日程',
      }),
    ).toBe('第 3 天 · 日程');
  });

  it('keeps flat groups when item count is small', () => {
    const items = Array.from({ length: 3 }, (_, index) => ({
      id: `p${index}`,
      type: 'RISK' as const,
      title: `问题 ${index}`,
      status: 'OPEN' as const,
      primaryEnforcement: 'REQUIRE_ADJUSTMENT' as const,
      affectedDayNumbers: [index + 1],
    }));

    expect(groupQueueProblemsByDay(items)).toEqual([{ day: null, items }]);
  });
});
