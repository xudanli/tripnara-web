import { describe, expect, it } from 'vitest';
import {
  mergePreviewIntoDecisionOption,
  optionHasEnrichedTradeoffs,
  optionNeedsPreviewEnrichment,
} from '@/lib/decision-option-preview-enrichment.util';

describe('decision-option-preview-enrichment', () => {
  it('detects baseline-only tradeoffs', () => {
    expect(
      optionHasEnrichedTradeoffs({
        id: 'o1',
        label: 'A',
        tradeoffs: [{ dimension: 'TIME', direction: 'IMPROVE', explanation: '略快' }],
      }),
    ).toBe(false);
    expect(
      optionNeedsPreviewEnrichment({
        id: 'o1',
        label: 'A',
        tradeoffs: [{ dimension: 'TIME', direction: 'IMPROVE', explanation: '略快' }],
      }),
    ).toBe(true);
  });

  it('skips preview when numeric tradeoffs exist', () => {
    expect(
      optionNeedsPreviewEnrichment({
        id: 'o1',
        label: 'A',
        tradeoffs: [{ dimension: 'COST', direction: 'WORSEN', value: 120, unit: 'CNY' }],
      }),
    ).toBe(false);
  });

  it('merges preview tradeoffs into option', () => {
    const merged = mergePreviewIntoDecisionOption(
      { id: 'option-1', label: '方案 A', description: 'baseline' },
      {
        optionId: 'option-1',
        tradeoffs: [{ dimension: 'COST', direction: 'WORSEN', value: 200, unit: 'CNY' }],
        routePreview: { placeNames: ['A', 'B'] },
      },
    );
    expect(merged.tradeoffs?.[0]?.value).toBe(200);
    expect(merged.routePreview?.placeNames).toEqual(['A', 'B']);
  });
});
