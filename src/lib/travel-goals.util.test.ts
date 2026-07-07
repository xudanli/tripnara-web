import { describe, expect, it } from 'vitest';
import {
  defaultOrderFromPlanningPolicy,
  inferPlanningPolicyFromGoalOrder,
  moveTravelGoal,
  normalizeTravelGoalOrder,
  resolveTravelGoalOrder,
  travelGoalRanksToWeights,
} from './travel-goals.util';

describe('travel-goals.util', () => {
  it('normalizes partial and duplicate goal orders', () => {
    expect(normalizeTravelGoalOrder(['budget', 'safety', 'budget'])).toEqual([
      'budget',
      'safety',
      'pace',
      'experience',
      'lodging',
      'flexibility',
      'coverage',
      'photography',
      'family_comfort',
    ]);
  });

  it('maps planning policy to default order', () => {
    expect(defaultOrderFromPlanningPolicy('safe')[0]).toBe('safety');
    expect(defaultOrderFromPlanningPolicy('experience')[0]).toBe('experience');
  });

  it('moveTravelGoal swaps adjacent items', () => {
    const order = normalizeTravelGoalOrder(['safety', 'pace', 'budget']);
    const movedUp = moveTravelGoal(order, 'pace', 'up');
    expect(movedUp[0]).toBe('pace');
    expect(movedUp[1]).toBe('safety');
    const movedDown = moveTravelGoal(order, 'safety', 'down');
    expect(movedDown[0]).toBe('pace');
    expect(movedDown[1]).toBe('safety');
  });

  it('assigns higher weight to earlier ranks', () => {
    const order = normalizeTravelGoalOrder(['safety', 'budget', 'flexibility']);
    const weights = travelGoalRanksToWeights(order);
    expect(weights.safety).toBeGreaterThan(weights.budget);
    expect(weights.budget).toBeGreaterThan(weights.flexibility);
  });

  it('infers planning policy from top goal', () => {
    expect(inferPlanningPolicyFromGoalOrder(['safety', 'pace'])).toBe('safe');
    expect(inferPlanningPolicyFromGoalOrder(['coverage', 'experience'])).toBe('challenge');
    expect(inferPlanningPolicyFromGoalOrder(['experience', 'budget'])).toBe('experience');
  });

  it('uses compiled legacy weights when provided', () => {
    const order = normalizeTravelGoalOrder(['safety', 'budget']);
    const weights = travelGoalRanksToWeights(order, { SAFETY: 9, BUDGET: 3, comfort: 5 });
    expect(weights.safety).toBe(9);
    expect(weights.budget).toBe(3);
  });
});
