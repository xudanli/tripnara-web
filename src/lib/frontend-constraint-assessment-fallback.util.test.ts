import { describe, expect, it } from 'vitest';
import { buildAssessmentBundleFromExecutability } from './frontend-constraint-assessment-fallback.util';
import type { TripExecutabilityView } from '@/types/trip-executability';

describe('buildAssessmentBundleFromExecutability', () => {
  it('maps SDR-101 to MAX_DAILY_DRIVE EXECUTION_BLOCK (PILOT Case B shape)', () => {
    const view = {
      tripId: '5945a3ab-75d2-4911-ae82-9647c8c29e96',
      assessment: {
        schemaId: 'tripnara/executability_assessment@v1',
        status: 'NOT_EXECUTABLE',
        findings: [
          {
            findingId: 'f1',
            ruleId: 'SDR-101',
            outcome: 'REJECT',
            severity: 'HIGH',
            message: '第 1 日等效驾驶负荷 680min（EXTREME）',
            affectedRefs: ['day_1'],
          },
        ],
        ruleResults: [],
        evaluatedAt: '2026-07-13T00:00:00.000Z',
      },
      ui: {} as TripExecutabilityView['ui'],
      profile: {} as TripExecutabilityView['profile'],
      dailyDrivePlans: [],
      repairPreviews: [],
      isStale: false,
      hooksPersisted: false,
      tepRuleResults: [
        {
          ruleId: 'SDR-101',
          outcome: 'NEED_CONFIRM',
          severity: 'HIGH',
          affectedRefs: ['day_1'],
          explanation: '第 1 日等效驾驶负荷 680min（EXTREME）',
        },
      ],
    } satisfies TripExecutabilityView;

    const bundle = buildAssessmentBundleFromExecutability(view);
    const drive = bundle.assessments.find((a) => a.constraintKey === 'MAX_DAILY_DRIVE');
    expect(drive?.aggregateStatus).toBe('EXECUTION_BLOCK');
    expect(drive?.lanes.executability?.ruleId).toBe('SDR-101');
    expect(drive?.lanes.executability?.evidence?.day).toBe(1);
    expect(drive?.legacyConstraintId).toBe('c_max_daily_drive');
  });
});
