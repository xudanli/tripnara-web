import { describe, expect, it } from 'vitest';
import {
  checkVerdictHeadline,
  checkVerdictIsBlocking,
  shouldOfferRepairFlow,
} from './check-verdict.util';

describe('check-verdict.util', () => {
  it('maps NOT_EXECUTABLE to blocking headline', () => {
    expect(checkVerdictHeadline('NOT_EXECUTABLE')).toBe('当前路线无法按现有计划执行');
    expect(checkVerdictIsBlocking('NOT_EXECUTABLE')).toBe(true);
  });

  it('offers repair flow when verdict is NOT_EXECUTABLE even for OPTIMIZE issue', () => {
    expect(
      shouldOfferRepairFlow('NOT_EXECUTABLE', {
        severity: 'OPTIMIZE',
        decisionRequired: false,
      }),
    ).toBe(true);
  });
});
