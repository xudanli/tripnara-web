import { describe, expect, it } from 'vitest';
import {
  resolveSoftTemplateCanonicalWeightKey,
  softApiPriorityToSolverWeight,
  softUiPriorityToSolverWeight,
} from './soft-constraint-solver.util';

describe('soft-constraint-solver.util', () => {
  it('maps API priority to solver weight as priority / 10', () => {
    expect(softApiPriorityToSolverWeight(8)).toBe(0.8);
    expect(softApiPriorityToSolverWeight(5)).toBe(0.5);
    expect(softApiPriorityToSolverWeight(3)).toBe(0.3);
  });

  it('maps UI 高/中/低 to solver weight via API priority', () => {
    expect(softUiPriorityToSolverWeight('高')).toBe(0.8);
    expect(softUiPriorityToSolverWeight('中')).toBe(0.5);
    expect(softUiPriorityToSolverWeight('低')).toBe(0.3);
  });

  it('resolves budget_soft canonical weight key', () => {
    expect(resolveSoftTemplateCanonicalWeightKey('budget_soft')).toBe('budget_deviation');
    expect(resolveSoftTemplateCanonicalWeightKey('minimize_hotel_changes')).toBe('fewer_hotel_changes');
  });
});
