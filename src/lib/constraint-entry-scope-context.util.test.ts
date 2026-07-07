import { describe, expect, it } from 'vitest';
import { Car } from 'lucide-react';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import {
  formatConstraintScopeDayBadge,
  resolveConstraintEntryScopeContext,
} from './constraint-entry-scope-context.util';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

function softEntry(id: string, overrides: Partial<ConstraintListEntry> = {}): ConstraintListEntry {
  return {
    id,
    kind: 'soft',
    label: id,
    icon: Car,
    ...overrides,
  };
}

describe('constraint-entry-scope-context.util', () => {
  it('formatConstraintScopeDayBadge formats single and multi day', () => {
    expect(formatConstraintScopeDayBadge([3])).toBe('第 3 天');
    expect(formatConstraintScopeDayBadge([2, 4])).toBe('第 2、4 天');
  });

  it('extracts route context from related planning conflict', () => {
    const entry = softEntry('pacing');
    const conflicts: PlanningConflictItem[] = [
      {
        id: 'c1',
        source: 'feasibility',
        priority: 'suggest_adjust',
        category: 'schedule',
        title: '交通缓冲偏紧',
        message: '第 5 天 · 草帽山 → 黑教堂 缓冲不足',
        affectedDays: [5],
        issue: {
          id: 'i1',
          issueKind: 'buffer_insufficient',
          conflictType: 'BUFFER_INSUFFICIENT',
          category: 'schedule',
          title: '交通缓冲偏紧',
          message: '第 5 天 · 草帽山 → 黑教堂 缓冲不足',
          affectedDays: [5],
          anchors: {
            fromPlaceLabel: '草帽山',
            toPlaceLabel: '黑教堂',
          },
        },
      },
    ];

    const scope = resolveConstraintEntryScopeContext({ entry, conflicts });
    expect(scope.dayNumbers).toEqual([5]);
    expect(scope.hint).toContain('第 5 天');
    expect(scope.hint).toContain('草帽山');
    expect(scope.lines[0]?.summary).toContain('草帽山');
  });

  it('uses check issue message for directly linked constraint', () => {
    const entry = softEntry('c_tpl_travel_buffer');
    const scope = resolveConstraintEntryScopeContext({
      entry,
      checkIssues: [
        {
          id: 'issue-1',
          constraintId: 'c_tpl_travel_buffer',
          issueKind: 'schedule_violation',
          severity: 'suggest_adjust',
          message: '第 3 天 塞里雅兰瀑布 → 维克 转场缓冲偏紧',
        },
      ],
    });

    expect(scope.dayNumbers).toEqual([3]);
    expect(scope.lines[0]?.summary).toContain('塞里雅兰瀑布');
  });

  it('includes tradeoff message on sacrificed soft entry', () => {
    const scope = resolveConstraintEntryScopeContext({
      entry: softEntry('photography', {
        softSacrificed: true,
        softTradeoffMessage: '第 2 天 · 黄金圈摄影点 已让位于驾驶上限',
      }),
    });

    expect(scope.lines.some((line) => line.source === 'tradeoff')).toBe(true);
    expect(scope.hint).toContain('第 2 天');
  });
});
