import { describe, expect, it } from 'vitest';
import type { RouteAndRunResponse } from '@/api/agent';
import mock from '../../fixtures/agent/route-and-run-decision-closure-l1.mock.json';
import {
  formatRejectedPlanStatus,
  formatScorePct,
  hasAlternativesRows,
  hasDecisionVerdictCard,
  hasRejectedPlansRows,
  pickOptimizationExplain,
  resolveChosenAlternativeId,
  shouldShowRoadBanner,
  sortAlternativesForDisplay,
} from '@/lib/decision-closure-l1';

describe('decision-closure L1', () => {
  it('shows banner when applied_events > 0 and roads present', () => {
    expect(
      shouldShowRoadBanner({
        applied_events: 2,
        road_ids: ['F208'],
        weather_dates: ['2026-01-16'],
        store_version: 1,
      })
    ).toBe(true);
  });

  it('hides banner when applied_events is 0', () => {
    expect(
      shouldShowRoadBanner({
        applied_events: 0,
        road_ids: ['F208'],
        weather_dates: [],
        store_version: 0,
      })
    ).toBe(false);
  });

  it('detects verdict card', () => {
    expect(hasDecisionVerdictCard({ decision_verdict_narration_zh: '**x**' })).toBe(true);
    expect(hasDecisionVerdictCard({})).toBe(false);
  });

  it('detects rejected plan rows', () => {
    expect(hasRejectedPlansRows({ rejected_plans: [{ id: 'base', status: 'infeasible' }] })).toBe(
      true
    );
    expect(formatRejectedPlanStatus('infeasible')).toBe('不可行');
  });

  it('sorts alternatives and formats scores', () => {
    expect(
      resolveChosenAlternativeId({
        recommended_alternative_id: 'a',
        decision_verdict: { chosen_plan_id: 'b' },
      })
    ).toBe('b');
    expect(formatScorePct(0.825)).toBe('82.5%');
    expect(hasAlternativesRows([{ id: 'x', score: 1 }])).toBe(true);
    const sorted = sortAlternativesForDisplay([
      { id: 'low', score: 0.5 },
      { id: 'high', score: 0.9 },
    ]);
    expect(sorted[0]?.id).toBe('high');
  });

  it('reads optimization from mock fixture (snake_case)', () => {
    const opt = pickOptimizationExplain(mock as RouteAndRunResponse);
    expect(opt?.method).toBe('CGUS');
    expect(shouldShowRoadBanner(opt?.world_constraint_materialization)).toBe(true);
    expect(hasDecisionVerdictCard(opt)).toBe(true);
    expect(hasRejectedPlansRows(opt?.decision_verdict)).toBe(true);
    expect(hasAlternativesRows(opt?.alternatives)).toBe(true);
    expect(resolveChosenAlternativeId(opt)).toBe('repair-spatial-poi-v2');
    expect(opt?.decision_verdict?.monte_carlo_summary?.total_samples).toBe(500);
  });
});
