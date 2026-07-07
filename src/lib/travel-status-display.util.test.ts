import { describe, expect, it } from 'vitest';
import {
  humanizeTravelActivitySummary,
  resolveSuggestedConfirmCount,
} from '@/lib/travel-status-display.util';

describe('travel-status-display.util', () => {
  it('humanizes technical summaries', () => {
    expect(humanizeTravelActivitySummary('已选择修复方案 (repair-delay-start)')).toBe(
      '已选择修复方案',
    );
  });

  it('resolves suggested confirm count from pending verification first', () => {
    expect(
      resolveSuggestedConfirmCount({
        issueCount: 11,
        pendingVerificationCount: 3,
        executabilityHeadline: '有 11 个事项',
      }),
    ).toBe(3);
  });

  it('falls back to issueCount and headline parsing', () => {
    expect(
      resolveSuggestedConfirmCount({
        issueCount: 11,
        pendingVerificationCount: 0,
        executabilityHeadline: '有 11 个事项建议您确认',
      }),
    ).toBe(11);
  });
});
