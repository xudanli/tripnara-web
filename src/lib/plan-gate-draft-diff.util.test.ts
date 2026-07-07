import { describe, expect, it } from 'vitest';
import {
  buildMetricRowsFromDraftDiff,
  resolveDraftDiffChangeItems,
} from './plan-gate-draft-diff.util';
import type { PlanGateDraftDiff } from '@/types/plan-gate';

describe('plan-gate-draft-diff.util', () => {
  const draftDiff: PlanGateDraftDiff = {
    baselineLabel: 'A3',
    draftLabel: 'A4',
    metrics: {
      executability: 89,
      executabilityDelta: 13,
      budgetPerPerson: 1880,
      budgetPerPersonDelta: 120,
      totalDrivingMinutes: 320,
      totalDrivingMinutesDelta: -45,
      affectedDays: 2,
    },
    timelineChanges: [
      {
        kind: 'accommodation',
        day: 2,
        label: '住宿变更',
        before: '南岸酒店',
        after: '升级酒店',
      },
    ],
    changeLog: ['第2天住宿变更：南岸酒店 → 升级酒店'],
  };

  it('builds metric rows from draftDiff metrics', () => {
    const rows = buildMetricRowsFromDraftDiff(draftDiff);
    expect(rows.find((r) => r.id === 'feasibility')?.draftValue).toBe('89');
    expect(rows.find((r) => r.id === 'feasibility')?.delta).toBe('+13');
    expect(rows.find((r) => r.id === 'days')?.draftValue).toBe('2 天');
  });

  it('resolves change items from changeLog and timelineChanges', () => {
    const items = resolveDraftDiffChangeItems(draftDiff);
    expect(items[0]).toContain('南岸酒店');
    expect(items.some((item) => item.includes('升级酒店'))).toBe(true);
  });
});
