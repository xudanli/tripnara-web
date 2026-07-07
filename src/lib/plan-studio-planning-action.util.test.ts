import { describe, expect, it } from 'vitest';
import {
  resolvePlanningActionCtaLabel,
  resolvePlanningActionTarget,
} from '@/lib/plan-studio-planning-action.util';

describe('plan-studio-planning-action.util', () => {
  it('routes workbench with BFF open problems to decision space', () => {
    expect(
      resolvePlanningActionTarget({
        useDecisionProblemsBff: true,
        openDecisionProblemCount: 2,
        context: 'workbench',
      }),
    ).toBe('decision_space');
  });

  it('routes pre-departure always to planning inbox', () => {
    expect(
      resolvePlanningActionTarget({
        useDecisionProblemsBff: true,
        openDecisionProblemCount: 3,
        context: 'pre_departure',
      }),
    ).toBe('planning_inbox');
  });

  it('falls back to planning inbox without BFF or open problems', () => {
    expect(
      resolvePlanningActionTarget({
        useDecisionProblemsBff: false,
        openDecisionProblemCount: 0,
        context: 'workbench',
      }),
    ).toBe('planning_inbox');
  });

  it('labels decision space as 去决策', () => {
    expect(
      resolvePlanningActionCtaLabel({
        target: 'decision_space',
        context: 'workbench',
      }),
    ).toBe('去决策');
  });

  it('preserves specific readiness labels', () => {
    expect(
      resolvePlanningActionCtaLabel({
        target: 'decision_space',
        context: 'workbench',
        specificLabel: '处理准入阻塞',
      }),
    ).toBe('处理准入阻塞');
  });
});
