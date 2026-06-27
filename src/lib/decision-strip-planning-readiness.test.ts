import { describe, expect, it } from 'vitest';
import { resolvePlanningReadinessPresentation } from '@/lib/decision-strip-planning-readiness';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

function item(partial: Partial<PlanningConflictItem>): PlanningConflictItem {
  return {
    id: partial.id ?? 'c1',
    source: partial.source ?? 'feasibility',
    priority: partial.priority ?? 'must_handle',
    category: partial.category ?? 'schedule',
    categoryLabel: partial.categoryLabel ?? '日程',
    title: partial.title ?? '标题',
    message: partial.message ?? '说明',
    ...partial,
  };
}

describe('resolvePlanningReadinessPresentation', () => {
  const emptyGate = { blocked: false, reasons: [] };

  it('exposes inboxCount aligned with conflicts tab badge', () => {
    const items = [
      item({ id: 'must-1', priority: 'must_handle' }),
      item({ id: 'suggest-1', priority: 'suggest_adjust', category: 'transport' }),
      item({ id: 'sched-1', source: 'schedule', priority: 'must_handle' }),
    ];
    const presentation = resolvePlanningReadinessPresentation({
      gateExecute: emptyGate,
      items,
      inbox: {
        inboxCount: 2,
        mustCount: 2,
        scheduleOnlyCount: 1,
        optimizableCount: 1,
        totalCount: 3,
      },
    });
    expect(presentation?.inboxCount).toBe(2);
    expect(presentation?.primaryCta.type).toBe('open_conflicts');
  });

  it('prioritizes gate blocked over inbox headline', () => {
    const presentation = resolvePlanningReadinessPresentation({
      gateExecute: {
        blocked: true,
        reasons: [{ code: 'access_hard_blocked', message: '准入阻塞' }],
      },
      items: [item({ category: 'access_capacity' })],
      inbox: {
        inboxCount: 3,
        mustCount: 3,
        scheduleOnlyCount: 0,
        optimizableCount: 0,
        totalCount: 3,
      },
    });
    expect(presentation?.inboxCount).toBe(3);
    expect(presentation?.primaryCta.type).toBe('open_conflicts');
    expect(presentation?.headline).toContain('准入');
  });
});
