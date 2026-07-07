import { describe, expect, it } from 'vitest';
import {
  mergeDiagnosticsWithTripConflicts,
  pickRecommendedOption,
  sortDecisionClusters,
  summarizeOptionImpact,
} from '@/dto/frontend-planning-decision-card.util';
import type { PlanningDecisionPackOption } from '@/dto/frontend-planning-decision-pack.types';

const OPTIONS: PlanningDecisionPackOption[] = [
  {
    id: 'opt_b',
    optionKind: 'SHIFT_LATER',
    title: '顺延',
    outcomes: ['延后 30 分钟'],
    costs: ['压缩午餐'],
  },
  {
    id: 'opt_a',
    optionKind: 'SHIFT_EARLIER',
    title: '提前',
    recommended: true,
    outcomes: ['提前出发'],
    costs: [],
    impactScope: { scope: 'DAY', affectedDays: [2] },
  },
];

describe('frontend-planning-decision-card.util', () => {
  it('pickRecommendedOption prefers recommended flag', () => {
    expect(pickRecommendedOption(OPTIONS)?.id).toBe('opt_a');
  });

  it('sortDecisionClusters respects dependsOn', () => {
    const sorted = sortDecisionClusters([
      { id: 'c2', dependsOn: ['c1'], diagnosticCount: 1, decisionId: 'd2', title: 'B', options: [] },
      { id: 'c1', diagnosticCount: 1, decisionId: 'd1', title: 'A', options: [] },
    ]);
    expect(sorted.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('mergeDiagnosticsWithTripConflicts dedupes by conflict id', () => {
    const merged = mergeDiagnosticsWithTripConflicts(
      [{ id: 'c1', title: 'Pack diag', source: 'validation' }],
      [{ id: 'c1', title: 'Trip conflict', message: 'overlap' }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe('Pack diag');
  });

  it('summarizeOptionImpact formats scope lines', () => {
    const lines = summarizeOptionImpact(OPTIONS[1]!);
    expect(lines).toContain('范围：DAY');
    expect(lines.some((line) => line.includes('第 2 天'))).toBe(true);
  });
});
