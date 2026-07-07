import { describe, expect, it } from 'vitest';
import {
  buildPlanGateCompareMetricRows,
  buildPlanGateDraftMetrics,
  buildPlanGateTripBaselineMetrics,
} from './plan-gate-diff.util';
import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';
import type { TripDetail } from '@/types/trip';

describe('plan-gate-diff.util', () => {
  it('builds metric rows between trip baseline and draft', () => {
    const trip = {
      TripDay: [{ ItineraryItem: [{ id: '1' }, { id: '2' }] }, { ItineraryItem: [{ id: '3' }] }],
      totalBudget: 10000,
    } as TripDetail;

    const result = {
      planState: {
        plan_id: 'draft-1',
        plan_version: 4,
        budget: { total: 10620 },
        itinerary: { items: [{ dayIndex: 0 }, { dayIndex: 0 }, { dayIndex: 1 }, { dayIndex: 2 }] },
      },
      uiOutput: {
        consolidatedDecision: { status: 'NEED_CONFIRM', summary: 'test', nextSteps: ['调整 Day 2 住宿'] },
        optionComparison: {
          options: [
            {
              optionId: 'opt-a',
              label: 'A',
              scores: { executability: 89, fatigue: 42 },
              tradeoffs: [],
            },
          ],
          recommendation: { optionId: 'opt-a', reason: '推荐' },
        },
      },
    } as unknown as ExecutePlanningWorkbenchResponse;

    const baseline = buildPlanGateTripBaselineMetrics(trip);
    const draft = buildPlanGateDraftMetrics(result);
    const rows = buildPlanGateCompareMetricRows(baseline, draft);

    expect(baseline.itemCount).toBe(3);
    expect(draft.itemCount).toBe(4);
    expect(rows.find((r) => r.id === 'budget')?.draftValue).toContain('10');
    expect(rows.find((r) => r.id === 'feasibility')?.draftValue).toBe('89');
  });
});
