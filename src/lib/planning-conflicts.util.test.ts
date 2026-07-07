import { describe, expect, it } from 'vitest';
import {
  computePlanningConflictsInboxMetrics,
  filterPlanningConflictsByViewMode,
  isPlanningConflictInboxItem,
  mergePlanningConflicts,
  resolvePlanningConflictGateStatus,
  summarizePlanningConflicts,
} from '@/lib/planning-conflicts.util';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { PlanStudioConflict } from '@/types/trip';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

function issue(partial: Partial<FeasibilityIssueDto>): FeasibilityIssueDto {
  return {
    id: partial.id ?? 'issue-1',
    priority: partial.priority ?? 'must_handle',
    category: partial.category ?? 'schedule',
    title: partial.title ?? '标题',
    message: partial.message ?? '说明',
    severity: 'high',
    ...partial,
  };
}

function studioConflict(partial: Partial<PlanStudioConflict>): PlanStudioConflict {
  return {
    id: partial.id ?? 'c1',
    type: partial.type ?? 'BUFFER_INSUFFICIENT',
    severity: partial.severity ?? 'HIGH',
    title: partial.title ?? '缓冲不足',
    description: partial.description ?? '时间轴冲突',
    affectedDays: partial.affectedDays ?? ['2'],
    affectedItemIds: partial.affectedItemIds ?? ['item-a'],
    ...partial,
  };
}

describe('mergePlanningConflicts', () => {
  it('drops schedule conflict when feasibility issue covers same item', () => {
    const merged = mergePlanningConflicts(
      [
        issue({
          id: 'feas-1',
          anchors: { fromItemId: 'item-a', toItemId: 'item-b' },
          affectedDays: [2],
        }),
      ],
      [studioConflict({ id: 'sched-1', affectedItemIds: ['item-a'] })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe('feasibility');
  });

  it('keeps schedule-only conflict with studio: id prefix', () => {
    const merged = mergePlanningConflicts([], [studioConflict({ id: 'sched-only' })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe('schedule');
    expect(merged[0].id).toBe('studio:sched-only');
  });

  it('filters lunch validation noise from schedule side', () => {
    const merged = mergePlanningConflicts(
      [],
      [
        studioConflict({
          id: 'lunch',
          type: 'LUNCH_VALIDATION',
          severity: 'LOW',
        }),
      ],
    );
    expect(merged).toHaveLength(0);
  });
});

describe('planning conflicts inbox view', () => {
  const items = mergePlanningConflicts(
    [issue({ id: 'must-1', priority: 'must_handle' }), issue({ id: 'suggest-1', priority: 'suggest_adjust' })],
    [studioConflict({ id: 'sched-1' })],
  );

  it('inbox includes must_handle and schedule-only', () => {
    expect(items.filter(isPlanningConflictInboxItem)).toHaveLength(2);
    expect(filterPlanningConflictsByViewMode(items, 'pending')).toHaveLength(2);
    expect(filterPlanningConflictsByViewMode(items, 'all')).toHaveLength(3);
  });

  it('summarizes counts by priority and category', () => {
    const summary = summarizePlanningConflicts(items);
    expect(summary.total).toBe(3);
    expect(summary.mustHandle).toBe(1);
    expect(summary.suggestAdjust).toBe(1);
    expect(summary.pendingConfirm).toBe(1);
  });

  it('computes inbox badge metrics', () => {
    const metrics = computePlanningConflictsInboxMetrics(items);
    expect(metrics.inboxCount).toBe(2);
    expect(metrics.scheduleOnlyCount).toBe(1);
    expect(metrics.mustCount).toBe(1);
    expect(metrics.optimizableCount).toBe(0);
  });
});

describe('resolvePlanningConflictGateStatus', () => {
  function conflict(partial: Partial<PlanningConflictItem>): PlanningConflictItem {
    return {
      id: 'c1',
      title: '标题',
      message: '说明',
      priority: 'suggest_adjust',
      category: 'schedule',
      categoryLabel: '日程',
      source: 'feasibility',
      issue: issue({}),
      ...partial,
    };
  }

  it('maps buffer tightness to NEED_CONFIRM', () => {
    expect(
      resolvePlanningConflictGateStatus(
        conflict({ title: '交通缓冲偏紧', message: '两段行程间隔不足' }),
      ),
    ).toBe('NEED_CONFIRM');
  });

  it('maps road closure to REJECT', () => {
    expect(
      resolvePlanningConflictGateStatus(
        conflict({
          priority: 'must_handle',
          category: 'transport',
          title: 'F208 北段已封闭',
        }),
      ),
    ).toBe('REJECT');
  });

  it('maps suggest_adjust to SUGGEST_REPLACE', () => {
    expect(
      resolvePlanningConflictGateStatus(
        conflict({ priority: 'suggest_adjust', title: '节奏偏紧' }),
      ),
    ).toBe('SUGGEST_REPLACE');
  });
});
