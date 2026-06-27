import { describe, expect, it } from 'vitest';
import { resolveCompareStripCtaLabel } from '@/lib/decision-strip-compare-cta';
import { buildOptionComparisonFromExplainAlternatives } from '@/lib/solution-comparison-parse.util';
import { isLightConstraintChange } from '@/lib/solution-matrix-refresh.util';

describe('resolveCompareStripCtaLabel', () => {
  it('returns adopt recommended when selection is recommended', () => {
    expect(
      resolveCompareStripCtaLabel('open_plan_gate', {
        optionId: 'a',
        label: '推荐方案',
        isRecommended: true,
      }),
    ).toBe('采用推荐方案');
  });

  it('returns adopt label for non-recommended selection', () => {
    expect(
      resolveCompareStripCtaLabel('open_plan_gate', {
        optionId: 'b',
        label: '替代 A',
        isRecommended: false,
      }),
    ).toBe('采用替代 A');
  });
});

describe('buildOptionComparisonFromExplainAlternatives', () => {
  it('builds OptionComparison from explain alternatives', () => {
    const cmp = buildOptionComparisonFromExplainAlternatives({
      alternatives: [
        { id: 'a', dimension_scores: { cost: 80 }, is_recommended: false },
        { id: 'b', dimension_scores: { cost: 70 }, is_recommended: true },
      ],
      reason: '更省预算',
    });
    expect(cmp?.recommendation?.optionId).toBe('b');
    expect(cmp?.options).toHaveLength(2);
  });
});

describe('isLightConstraintChange', () => {
  it('classifies budget as light', () => {
    expect(isLightConstraintChange('budget')).toBe(true);
  });
});
