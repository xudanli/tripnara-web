import { describe, expect, it } from 'vitest';
import { normalizeConstraintAssessmentBundle } from '@/api/frontend-travel-decision-contract-api-client';

describe('normalizeConstraintAssessmentBundle', () => {
  it('maps BFF items[] to assessments[]', () => {
    const normalized = normalizeConstraintAssessmentBundle({
      tripId: 'trip-1',
      items: [
        {
          constraintKey: 'MAX_DAILY_DRIVE',
          legacyConstraintId: 'c_max_daily_drive',
          aggregateStatus: 'EXECUTION_BLOCK',
          lanes: { planning: null, executability: null, runtime: null },
        },
      ],
    });

    expect(normalized.assessments).toHaveLength(1);
    expect(normalized.assessments[0]?.constraintKey).toBe('MAX_DAILY_DRIVE');
  });

  it('prefers assessments[] when both fields exist', () => {
    const normalized = normalizeConstraintAssessmentBundle({
      tripId: 'trip-1',
      assessments: [
        {
          constraintKey: 'NO_NIGHT_DRIVE',
          aggregateStatus: 'PASS',
          lanes: { planning: null, executability: null, runtime: null },
        },
      ],
      items: [
        {
          constraintKey: 'MAX_DAILY_DRIVE',
          aggregateStatus: 'EXECUTION_BLOCK',
          lanes: { planning: null, executability: null, runtime: null },
        },
      ],
    });

    expect(normalized.assessments).toHaveLength(1);
    expect(normalized.assessments[0]?.constraintKey).toBe('NO_NIGHT_DRIVE');
  });
});
