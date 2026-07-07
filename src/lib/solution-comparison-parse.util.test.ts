import { describe, expect, it } from 'vitest';
import {
  buildOptionComparisonFromExplainAlternatives,
  normalizeExplainAlternativeDto,
} from '@/lib/solution-comparison-parse.util';

describe('normalizeExplainAlternativeDto', () => {
  it('reads tradeoffs array', () => {
    expect(
      normalizeExplainAlternativeDto({
        id: 'opt-a',
        tradeoffs: [' 省 2h ', '', '成本 +500'],
      })?.tradeoffs,
    ).toEqual(['省 2h', '成本 +500']);
  });
});

describe('buildOptionComparisonFromExplainAlternatives', () => {
  it('maps tradeoffs onto option comparison entries', () => {
    const comparison = buildOptionComparisonFromExplainAlternatives({
      alternatives: [
        { id: 'opt-a', tradeoffs: ['更省预算'] },
        { id: 'opt-b', tradeoffs: ['更安全'], is_recommended: true },
      ],
    });

    expect(comparison?.options?.[0]?.tradeoffs).toEqual(['更省预算']);
    expect(comparison?.options?.[1]?.tradeoffs).toEqual(['更安全']);
    expect(comparison?.options?.[0]?.summary).toBeUndefined();
  });
});
