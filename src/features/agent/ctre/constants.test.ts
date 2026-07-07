import { describe, expect, it } from 'vitest';
import {
  ctreEmptyStateShortCopy,
  getCtreSkippedReasonCopy,
  shouldShowTripCtrePanel,
} from './constants';

describe('ctre trip panel gates §11.14', () => {
  it('shouldShowTripCtrePanel requires tripId', () => {
    expect(shouldShowTripCtrePanel(undefined)).toBe(false);
    expect(shouldShowTripCtrePanel('')).toBe(false);
  });

  it('provides empty state copy', () => {
    expect(ctreEmptyStateShortCopy()).toContain('生成方案');
  });

  it('maps skipped reasons', () => {
    expect(getCtreSkippedReasonCopy('travel_compiler_disabled')).toContain('TRAVEL_COMPILER');
    expect(getCtreSkippedReasonCopy('compare_only')).toContain('对比');
  });
});
