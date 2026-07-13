import { describe, expect, it } from 'vitest';
import {
  buildPacingConstraintImpactPreviewFallback,
  isPacingConstraintPreviewFallbackEligible,
  isPreviewImpactRecoverableServerError,
  isPreviewImpactServerTrimError,
} from './constraint-impact-preview-fallback.util';
import { TripConstraintsApiError } from '@/api/trip-constraints';
import type { ConstraintEditorDraft } from '@/components/plan-studio/workbench/constraint-console-types';
import type { UnifiedConstraintAssessmentBundle } from '@/types/frontend-constraint-assessment-api.types';
import type { TripConstraint } from '@/types/trip-constraints';

const dailyDriveDraft: ConstraintEditorDraft = {
  id: 'daily_drive',
  name: '每日驾驶上限',
  enabled: true,
  type: 'HARD',
  scope: 'TRIP',
  targetValue: 4.5,
  targetUnit: 'hour',
  toleranceMode: 'allow_over',
  toleranceMinutes: 15,
  priority: 8,
  locked: false,
  reason: '',
};

const apiConstraint: TripConstraint = {
  id: 'c_max_daily_drive',
  tripId: 'trip-1',
  name: '每日驾驶上限',
  category: 'TRANSPORT',
  type: 'HARD',
  status: 'ACTIVE',
  scope: { type: 'TRIP' },
  operator: 'LTE',
  value: { maxHours: 6 },
  unit: 'hour',
  allowRelaxation: true,
  locked: false,
  source: { type: 'USER', templateId: 'max_daily_drive' },
  visibility: 'TEAM',
  createdBy: 'test',
  createdAt: '2026-07-13T00:00:00.000Z',
  updatedAt: '2026-07-13T00:00:00.000Z',
};

const assessments: UnifiedConstraintAssessmentBundle = {
  tripId: 'trip-1',
  constraintsVersion: 4,
  assessedAt: '2026-07-13T00:00:00.000Z',
  assessments: [
    {
      constraintKey: 'MAX_DAILY_DRIVE',
      legacyConstraintId: 'c_max_daily_drive',
      aggregateStatus: 'EXECUTION_BLOCK',
      lanes: {
        planning: null,
        executability: {
          status: 'BLOCK',
          source: 'TEP',
          ruleId: 'SDR-101',
          message: '第 1 日等效驾驶负荷 1286min（EXTREME）',
          evidence: {
            dayIndex: 1,
            day: 1,
            measuredMinutes: 1286,
            actual: '21h26m',
          },
        },
        runtime: null,
      },
    },
  ],
};

describe('constraint-impact-preview-fallback.util', () => {
  it('detects pacing constraints and trim server errors', () => {
    expect(isPacingConstraintPreviewFallbackEligible('daily_drive')).toBe(true);
    expect(isPacingConstraintPreviewFallbackEligible('c_no_night_drive')).toBe(true);
    expect(isPacingConstraintPreviewFallbackEligible('budget')).toBe(false);
    expect(
      isPreviewImpactServerTrimError({
        code: 'INTERNAL_ERROR',
        message: "Cannot read properties of undefined (reading 'trim')",
      }),
    ).toBe(true);
    expect(
      isPreviewImpactRecoverableServerError(
        new TripConstraintsApiError('INTERNAL_ERROR', "Cannot read properties of undefined (reading 'find')"),
      ),
    ).toBe(true);
  });

  it('builds PILOT Case B shaped preview for daily drive when BFF fails', () => {
    const preview = buildPacingConstraintImpactPreviewFallback({
      draft: dailyDriveDraft,
      apiConstraint,
      assessments,
      feasibilityScore: 49,
    });

    expect(preview).not.toBeNull();
    expect(preview?.userSummary?.verdictLabel).toBe('仍不可执行');
    expect(preview?.userSummary?.verdictReason).toContain('4.5 小时');
    expect(preview?.userSummary?.verdictReason).toContain('21 小时 26 分钟');
    expect(preview?.suggestedFollowUpAction?.label).toBe('保存并检查是否走得通');
    expect(preview?.executeabilityDelta?.blockingRuleIds).toContain('SDR-101');
    expect(preview?.structuredImpact?.constraintChanges?.[0]?.userFacingSummary).toContain('6 小时');
    expect(preview?.constraintAssessments?.[0]?.laneBadges.length).toBeGreaterThan(0);
  });

  it('builds NO_NIGHT_DRIVE activity preview from structured SDR-202 evidence when BFF fails', () => {
    const preview = buildPacingConstraintImpactPreviewFallback({
      draft: {
        ...dailyDriveDraft,
        id: 'no_night_drive',
        name: '不夜间驾驶',
        targetValue: 30,
        targetUnit: 'minute',
        toleranceMode: 'none',
        toleranceMinutes: 0,
      },
      assessments: {
        tripId: 'trip-1',
        assessments: [
          {
            constraintKey: 'NO_NIGHT_DRIVE',
            legacyConstraintId: 'c_no_night_drive',
            contractRequirement: '日落后 30 分钟内结束驾驶',
            aggregateStatus: 'EXECUTION_BLOCK',
            lanes: {
              planning: null,
              executability: {
                status: 'BLOCK',
                ruleId: 'SDR-202',
                message: '预计 23:40 仍在驾驶，超出日落后 30 分钟（日落 23:27，截止 23:57）',
                evidence: {
                  day: 1,
                  segmentLabel: '雷克雅未克 → 维克',
                  arriveLocal: '23:40',
                  cutoffLocal: '23:57',
                  sunsetLocal: '23:27',
                  maxMinutesAfterSunset: 30,
                },
              },
              runtime: null,
            },
          },
        ],
      },
      feasibilityScore: 49,
    });

    expect(preview?.scheduleDetailLevel).toBe('activity');
    expect(preview?.affectedDayDetails?.[0]?.items[0]?.label).toBe('雷克雅未克 → 维克');
    expect(preview?.affectedDayDetails?.[0]?.items[0]?.detail).toContain('23:40');
  });
});
