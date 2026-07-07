import { describe, expect, it } from 'vitest';
import { coerceDisplayText } from './coerce-display-text.util';
import { mapPreviewImpactToUi } from './trip-constraints.adapter';
import { EMPTY_CONSTRAINT_IMPACT_PREVIEW } from '@/components/plan-studio/workbench/constraint-console-types';

describe('coerceDisplayText', () => {
  it('stringifies endpoint/body mutation descriptors', () => {
    expect(
      coerceDisplayText({
        endpoint: '/trips/1/constraints/preview-impact',
        body: { changes: [] },
      }),
    ).toContain('/trips/1/constraints/preview-impact');
  });
});

describe('mapPreviewImpactToUi text coercion', () => {
  it('coerces object recommendations into render-safe strings', () => {
    const ui = mapPreviewImpactToUi(
      {
        feasibilityBefore: 80,
        feasibilityAfter: 75,
        recommendations: [
          {
            endpoint: '/trips/x/constraints/check',
            body: { persist: false },
          },
        ],
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.recommendations?.[0]).toContain('/trips/x/constraints/check');
    expect(ui.diffBullets[0]).toContain('/trips/x/constraints/check');
  });
});
