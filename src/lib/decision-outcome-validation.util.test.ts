import { describe, expect, it } from 'vitest';
import {
  buildOutcomeComparisonRows,
  failureReasonLabel,
  formatExpectedOutcome,
  formatObservedOutcome,
  hasDataStaleFailure,
  outcomeVerdictBadgeClass,
  outcomeVerdictLabel,
} from '@/lib/decision-outcome-validation.util';

describe('decision-outcome-validation.util', () => {
  it('labels verdicts for UI badges', () => {
    expect(outcomeVerdictLabel('CONFIRMED')).toBe('决策有效');
    expect(outcomeVerdictBadgeClass('REFUTED')).toContain('red');
  });

  it('formats constraint violation outcomes', () => {
    expect(
      formatExpectedOutcome({
        metric: 'CONSTRAINT_VIOLATION',
        expectedValue: false,
      }),
    ).toBe('问题应消解');
    expect(
      formatObservedOutcome({
        metric: 'CONSTRAINT_VIOLATION',
        actualValue: false,
      }),
    ).toBe('已消解');
  });

  it('builds comparison rows and detects matches', () => {
    const rows = buildOutcomeComparisonRows({
      expectedOutcomes: [
        {
          metric: 'DRIVING_DURATION',
          expectedValue: 90,
          tolerance: 18,
          unit: 'MINUTE',
        },
      ],
      observedOutcomes: [
        {
          metric: 'DRIVING_DURATION',
          actualValue: 90,
          source: 'SYSTEM_INFERENCE',
          confidence: 0.88,
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.matched).toBe(true);
    expect(formatExpectedOutcome(rows[0]!.expected!)).toContain('90 分钟');
  });

  it('labels failure reasons including DATA_STALE', () => {
    expect(failureReasonLabel('DATA_STALE')).toContain('Ledger');
    expect(
      hasDataStaleFailure({
        verdict: 'PARTIALLY_CONFIRMED',
        failureReasons: ['DATA_STALE'],
        expectedOutcomes: [],
        observedOutcomes: [],
        id: 'v1',
        decisionId: 'd1',
        tripId: 't1',
      }),
    ).toBe(true);
  });
});
