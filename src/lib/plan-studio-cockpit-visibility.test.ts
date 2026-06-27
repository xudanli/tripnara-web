import { describe, expect, it } from 'vitest';
import { cycleConstraintFlexibilityLevel, constraintFlexibilityLabel } from '@/lib/constraint-flexibility.util';
import {
  shouldHideDecisionCockpitCounterfactuals,
  shouldShowPlanStudioDecisionCockpit,
} from '@/lib/plan-studio-cockpit-visibility';

describe('shouldShowPlanStudioDecisionCockpit', () => {
  it('hides when matrix visible unless deep link', () => {
    expect(
      shouldShowPlanStudioDecisionCockpit({
        hasCockpitUi: true,
        showDecisionCockpitDeepLink: false,
        hasSolutionMatrix: true,
        hasCompareSummary: false,
        hasRelaxationBar: false,
      }),
    ).toBe(false);

    expect(
      shouldShowPlanStudioDecisionCockpit({
        hasCockpitUi: true,
        showDecisionCockpitDeepLink: true,
        hasSolutionMatrix: true,
        hasCompareSummary: false,
        hasRelaxationBar: false,
      }),
    ).toBe(true);
  });

  it('hides when relaxation bar visible', () => {
    expect(
      shouldShowPlanStudioDecisionCockpit({
        hasCockpitUi: true,
        showDecisionCockpitDeepLink: false,
        hasSolutionMatrix: false,
        hasCompareSummary: false,
        hasRelaxationBar: true,
      }),
    ).toBe(false);
  });
});

describe('shouldHideDecisionCockpitCounterfactuals', () => {
  it('hides counterfactuals when matrix or compare active', () => {
    expect(
      shouldHideDecisionCockpitCounterfactuals({
        hasSolutionMatrix: true,
        hasCompareSummary: false,
      }),
    ).toBe(true);
  });
});

describe('constraintFlexibilityLevel', () => {
  it('cycles hard → soft → negotiable', () => {
    expect(cycleConstraintFlexibilityLevel('hard')).toBe('soft');
    expect(cycleConstraintFlexibilityLevel('soft')).toBe('negotiable');
    expect(cycleConstraintFlexibilityLevel('negotiable')).toBe('hard');
  });

  it('labels levels in zh', () => {
    expect(constraintFlexibilityLabel('negotiable')).toBe('可协商');
  });
});
