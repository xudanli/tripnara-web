import { describe, expect, it } from 'vitest';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import {
  buildWorkbenchDecisionFocusFromConflict,
  buildWorkbenchDecisionFocusFromTimelineEntry,
  conflictAffectsDayIndex,
  isWorkbenchConstraintEntryFocused,
  isWorkbenchRouteStopFocused,
  reconcileWorkbenchFocusForDayChange,
  shouldDimWorkbenchRouteStop,
} from './workbench-decision-focus.util';

function conflict(partial: Partial<PlanningConflictItem> & { id: string }): PlanningConflictItem {
  return {
    category: 'transport',
    categoryLabel: '交通',
    priority: 'suggest_adjust',
    title: partial.title ?? '交通缓冲偏紧',
    message: partial.message ?? '蓝湖到哈尔格林姆教堂偏紧',
    ...partial,
  } as PlanningConflictItem;
}

describe('workbench-decision-focus.util', () => {
  it('builds focus from conflict with poi tokens and constraint ids', () => {
    const focus = buildWorkbenchDecisionFocusFromConflict({
      conflict: conflict({
        id: 'c1',
        title: '交通缓冲偏紧',
        message: '塞里雅兰瀑布 → 斯科加瀑布偏紧',
        issue: {
          id: 'issue-1',
          relatedConstraintIds: ['c_max_daily_drive'],
        } as never,
      }),
      dayIndex: 2,
      timelinePois: ['塞里雅兰瀑布', '斯科加瀑布'],
    });

    expect(focus.source).toBe('conflict');
    expect(focus.conflictId).toBe('c1');
    expect(focus.dayIndex).toBe(2);
    expect(focus.constraintIds).toContain('daily_drive');
    expect(focus.poiTokens.some((token) => token.includes('塞里雅兰'))).toBe(true);
  });

  it('builds focus from timeline entry', () => {
    const focus = buildWorkbenchDecisionFocusFromTimelineEntry({
      entryId: 'item-1',
      dayIndex: 0,
      title: '雷尼斯黑沙滩',
      subtitle: '游览 2 小时',
    });

    expect(focus.source).toBe('timeline_entry');
    expect(focus.timelineEntryId).toBe('item-1');
    expect(focus.poiTokens).toContain('雷尼斯黑沙滩');
  });

  it('highlights matching constraints and route stops', () => {
    const focus = buildWorkbenchDecisionFocusFromTimelineEntry({
      entryId: 'item-1',
      dayIndex: 0,
      title: '斯科加瀑布',
    });

    expect(
      isWorkbenchConstraintEntryFocused(
        { id: 'must_go', label: '必去景点', description: '斯科加瀑布必须保留' },
        focus,
      ),
    ).toBe(true);
    expect(isWorkbenchRouteStopFocused('斯科加瀑布', focus)).toBe(true);
    expect(shouldDimWorkbenchRouteStop('蓝湖温泉', focus)).toBe(true);
  });

  it('reconciles focus when switching to unrelated day', () => {
    const initial = buildWorkbenchDecisionFocusFromConflict({
      conflict: conflict({
        id: 'c1',
        affectedDays: [3],
      }),
      dayIndex: 2,
    });

    const next = reconcileWorkbenchFocusForDayChange(initial, 0, [
      conflict({ id: 'c1', affectedDays: [3] }),
    ]);

    expect(next.source).toBe('day');
    expect(next.conflictId).toBeNull();
    expect(next.dayIndex).toBe(0);
  });

  it('keeps conflict focus when day still matches', () => {
    const initial = buildWorkbenchDecisionFocusFromConflict({
      conflict: conflict({ id: 'c1', affectedDays: [3] }),
      dayIndex: 2,
    });

    const next = reconcileWorkbenchFocusForDayChange(initial, 2, [
      conflict({ id: 'c1', affectedDays: [3] }),
    ]);

    expect(next.conflictId).toBe('c1');
    expect(next.dayIndex).toBe(2);
  });

  it('detects conflict day membership', () => {
    expect(conflictAffectsDayIndex(conflict({ id: 'c1', affectedDays: [3] }), 2)).toBe(true);
    expect(conflictAffectsDayIndex(conflict({ id: 'c1', affectedDays: [1] }), 2)).toBe(false);
  });
});
