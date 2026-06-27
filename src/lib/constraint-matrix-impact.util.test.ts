import { describe, expect, it } from 'vitest';
import type { OptionComparison } from '@/api/planning-workbench';
import { buildSolutionMatrixModel } from '@/lib/solution-matrix-model';
import {
  buildConstraintImpactMap,
  countImpactedOptionsForConstraint,
  formatConstraintImpactLabel,
} from '@/lib/constraint-matrix-impact.util';

describe('constraint-matrix-impact', () => {
  const comparison: OptionComparison = {
    options: [
      { optionId: 'opt-a', scores: { executability: 70, cost: 80, risk: 60 } },
      { optionId: 'opt-b', scores: { executability: 85, cost: 75, risk: 55 } },
      { optionId: 'opt-c', scores: { executability: 60, cost: 70, risk: 70 } },
    ],
    recommendation: { optionId: 'opt-a', reason: 'test' },
  };

  const model = buildSolutionMatrixModel(comparison);

  it('counts budget-related column diffs', () => {
    expect(countImpactedOptionsForConstraint(model, 'budget')).toBeGreaterThan(0);
  });

  it('builds impact map for visible matrix', () => {
    const map = buildConstraintImpactMap(model);
    expect(map.budget).toBeGreaterThan(0);
  });

  it('returns zero when matrix hidden', () => {
    expect(countImpactedOptionsForConstraint(buildSolutionMatrixModel(null), 'budget')).toBe(0);
  });

  it('formats impact label', () => {
    expect(formatConstraintImpactLabel(2)).toBe('影响 2 个方案');
  });
});
