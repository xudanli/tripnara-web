import { describe, expect, it } from 'vitest';
import {
  describeApplyOutcomeFailure,
  isApplyOutcomeBlocked,
  isApplyOutcomeSuccessful,
} from './decision-apply-outcome.util';
import type { ApplyDecisionProblemResponse } from '@/types/unified-decision';

describe('decision-apply-outcome.util', () => {
  it('detects blocked apply outcomes', () => {
    const blocked: ApplyDecisionProblemResponse = {
      applyResult: { status: 'blocked', message: 'DATA_STALE' },
      resolution: { resolutionId: 'r1', status: 'FAILED' },
    };
    expect(isApplyOutcomeBlocked(blocked)).toBe(true);
    expect(isApplyOutcomeSuccessful(blocked)).toBe(false);
    expect(describeApplyOutcomeFailure(blocked)).toBe('DATA_STALE');
  });

  it('detects successful apply outcomes', () => {
    const applied: ApplyDecisionProblemResponse = {
      problem: { executionStatus: 'APPLIED' },
      applyResult: { status: 'success' },
    };
    expect(isApplyOutcomeBlocked(applied)).toBe(false);
    expect(isApplyOutcomeSuccessful(applied)).toBe(true);
  });
});
