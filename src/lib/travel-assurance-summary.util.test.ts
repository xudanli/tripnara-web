import { describe, expect, it } from 'vitest';
import {
  buildTravelAssuranceSummary,
  formatTravelAssuranceSubtitle,
} from '@/lib/travel-assurance-summary.util';

describe('travel-assurance-summary.util', () => {
  it('builds summary from planning conflicts by category', () => {
    const summary = buildTravelAssuranceSummary({
      planningSummary: {
        total: 3,
        mustHandle: 1,
        suggestAdjust: 2,
        pendingConfirm: 0,
        byCategory: { transport: 1, schedule: 1 },
      },
      openDecisionProblems: 1,
    });
    expect(summary.verifiedItemCount).toBeGreaterThan(0);
    expect(summary.pendingProblemCount).toBe(1);
    expect(summary.suggestOptimizeCount).toBe(2);
    expect(summary.verificationLines.length).toBeGreaterThan(0);
  });

  it('formats subtitle for header', () => {
    const text = formatTravelAssuranceSubtitle({
      verifiedItemCount: 27,
      pendingProblemCount: 1,
      suggestOptimizeCount: 2,
      autoAdaptedCount: 0,
      verificationLines: [],
    });
    expect(text).toContain('已验证 27 项');
    expect(text).toContain('1 个问题待处理');
  });
});
