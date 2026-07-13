import { describe, expect, it } from 'vitest';
import {
  isDevPreviewText,
  normalizeSuggestedFollowUp,
  sanitizePreviewUserFacingText,
  normalizePreviewConflictBucketSummary,
  normalizePreviewExecuteabilityDelta,
  extractTripLevelConflictsFromPreviewMeta,
  shouldHidePlaceholderPreviewDayTabs,
} from '@/lib/constraint-impact-user-preview.util';
import { mapPreviewImpactToUi } from '@/lib/trip-constraints.adapter';
import { EMPTY_CONSTRAINT_IMPACT_PREVIEW } from '@/components/plan-studio/workbench/constraint-console-types';

describe('constraint-impact-user-preview.util', () => {
  it('detects dev preview strings', () => {
    expect(isDevPreviewText('/api/trips/x/feasibility-report/validate')).toBe(true);
    expect(isDevPreviewText('persist=true will trigger validate-scope')).toBe(true);
    expect(isDevPreviewText('第 1 天驾驶仍超 5 小时')).toBe(false);
  });

  it('sanitizes dev strings to user copy', () => {
    expect(sanitizePreviewUserFacingText('assess 读模型已接入')).toContain('确认后将重新检查');
  });

  it('normalizes object-shaped conflict bucket summaries', () => {
    expect(
      normalizePreviewConflictBucketSummary({
        before: 1,
        after: 0,
        label: '预算域必处理 1 → 0',
      }),
    ).toBe('预算域必处理 1 → 0');
    expect(
      normalizePreviewExecuteabilityDelta({
        mustHandleDelta: -1,
        scoreDeltaReason: '建议调整后改善',
        conflictsDeltaSummary: {
          suggestAdjust: { before: 1, after: 0, label: '节奏放松后建议调整减少' },
        },
      })?.conflictsDeltaSummary?.suggestAdjust,
    ).toBe('节奏放松后建议调整减少');
    expect(
      extractTripLevelConflictsFromPreviewMeta({
        debug: {
          tripLevelConflictsBefore: { mustHandle: 6 },
          tripLevelConflictsAfter: { mustHandle: 5 },
        },
      })?.before?.mustHandle,
    ).toBe(6);
  });

  it('maps structured suggestedFollowUp', () => {
    expect(
      normalizeSuggestedFollowUp({
        label: '保存并检查是否走得通',
        action: 'CONFIRM_AND_DEEP_CHECK',
      }),
    ).toEqual({
      label: '保存并检查是否走得通',
      action: 'CONFIRM_AND_DEEP_CHECK',
    });
  });
});

describe('mapPreviewImpactToUi · user preview layer', () => {
  it('maps PILOT Case B user-facing fields', () => {
    const ui = mapPreviewImpactToUi(
      {
        refreshType: 'quick',
        feasibilityBefore: 49,
        feasibilityAfter: 49,
        userSummary: {
          verdict: 'STILL_NOT_EXECUTABLE',
          verdictLabel: '仍不可执行',
          verdictReason: '第 1 天驾驶 21 小时 26 分钟，仍超过 5 小时上限',
          confidence: 'HIGH',
        },
        executeabilityDelta: {
          scoreDelta: 0,
          mustHandleDelta: -6,
          scoreDeltaReason: '冲突计数已更新，可执行性分数待完整检查后刷新',
          blockingRuleIds: ['SDR-101'],
          conflictsDeltaSummary: {
            mustHandle: '与驾驶上限相关的必处理项已减少',
          },
        },
        affectedDays: [{ dayNumber: 1, tone: 'major' }],
        affectedDayDetails: [
          {
            dayNumber: 1,
            tone: 'major',
            daySummary: '驾驶负荷超标，需拆分或减点',
            items: [{ label: '雷克雅未克 → 维克', detail: '当日累计 21h26m' }],
          },
        ],
        suggestedFollowUp: {
          label: '保存并检查是否走得通',
          action: 'CONFIRM_AND_DEEP_CHECK',
        },
        diffBullets: ['第 1 天仍超过驾驶上限'],
        structuredImpact: {
          constraintChanges: [
            {
              constraintId: 'c_max_daily_drive',
              name: '每日驾驶上限',
              before: 6,
              after: 5,
              unit: 'hour',
              userFacingSummary: '从 6 小时/天 改为 5 小时/天',
            },
          ],
        },
        constraintAssessments: [
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
              },
              runtime: null,
            },
          },
        ],
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.userSummary?.verdictLabel).toBe('仍不可执行');
    expect(ui.executeabilityDelta?.scoreDeltaReason).toContain('完整检查');
    expect(ui.suggestedFollowUpAction?.label).toBe('保存并检查是否走得通');
    expect(ui.affectedDayDetails?.[0]?.daySummary).toContain('驾驶负荷');
    expect(ui.constraintAssessments?.[0]?.laneBadges.length).toBeGreaterThan(0);
    expect(ui.structuredImpact?.constraintChanges?.[0]?.userFacingSummary).toContain('6 小时');
    expect(ui.suggestedFollowUp).toBeUndefined();
  });

  it('maps quick TEP activity-level schedule projection without generic snapshot stripping', () => {
    const ui = mapPreviewImpactToUi(
      {
        refreshType: 'quick',
        scheduleDetailLevel: 'activity',
        scheduleDetailUnavailableReason: '需保存后运行完整检查，才能看到具体活动影响',
        affectedDays: [1, 2, 3, 4],
        affectedDayDetails: [
          {
            dayNumber: 1,
            items: [
              {
                label: '雷克雅未克 → 维克',
                startTimeLabel: '09:00',
                detail: '本段驾驶约 2h40m，当日累计 21h26m',
              },
            ],
          },
        ],
        conflictsBefore: { mustHandle: 1, suggestAdjust: 0, pendingConfirm: 0 },
        conflictsAfter: { mustHandle: 0, suggestAdjust: 0, pendingConfirm: 0 },
        userSummary: {
          verdict: 'IMPROVED',
          verdictLabel: '冲突已减少',
          verdictReason: '驾驶上限相关必处理项已消除',
        },
        structuredImpact: {
          constraintChanges: [
            {
              constraintId: 'c_max_daily_drive',
              name: '每日驾驶上限',
              before: 6,
              after: 5,
              unit: 'hour',
              userFacingSummary: '从 6 小时/天 改为 5 小时/天',
            },
          ],
        },
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.isTripSnapshotOnly).toBe(false);
    expect(ui.scheduleDetailLevel).toBe('activity');
    expect(ui.scheduleDetailUnavailableReason).toBeUndefined();
    expect(ui.affectedDays).toEqual([{ dayNumber: 1, tone: 'major' }]);
    expect(ui.affectedDayDetails?.[0]?.items[0]).toMatchObject({
      label: '雷克雅未克 → 维克',
      startTimeLabel: '09:00',
      detail: '本段驾驶约 2h40m，当日累计 21h26m',
    });
    expect(ui.adjustmentSummary).toContain('本段驾驶约 2h40m');
    expect(shouldHidePlaceholderPreviewDayTabs(ui)).toBe(false);
  });

  it('supplements day-level detail from constraintAssessments when BFF omits affectedDayDetails', () => {
    const ui = mapPreviewImpactToUi(
      {
        refreshType: 'deep',
        affectedDays: [1, 2, 3, 4],
        scheduleDetailLevel: 'none',
        scheduleDetailUnavailableReason: '需保存后运行完整检查，才能看到具体活动影响',
        userSummary: {
          verdict: 'NEEDS_CONFIRM',
          verdictLabel: '需确认后检查',
          verdictReason: '第 1 日等效驾驶负荷 1286min（EXTREME）',
        },
        constraintAssessments: [
          {
            constraintKey: 'MAX_DAILY_DRIVE',
            legacyConstraintId: 'c_max_daily_drive',
            contractRequirement: '≤ 5h',
            aggregateStatus: 'EXECUTION_BLOCK',
            lanes: {
              planning: null,
              executability: {
                status: 'BLOCK',
                source: 'TEP',
                ruleId: 'SDR-101',
                message: '第 1 日等效驾驶负荷 1286min（EXTREME）',
                evidence: {
                  day: 1,
                  actual: '21h26m',
                  limit: '5h',
                },
              },
              runtime: null,
            },
          },
        ],
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.affectedDays).toEqual([{ dayNumber: 1, tone: 'major' }]);
    expect(ui.affectedDayDetails?.[0]?.items[0]?.detail).toContain('21h26m');
    expect(shouldHidePlaceholderPreviewDayTabs(ui)).toBe(false);
  });

  it('supplements NO_NIGHT_DRIVE preview schedule from structured SDR-202 evidence', () => {
    const ui = mapPreviewImpactToUi(
      {
        refreshType: 'quick',
        scheduleDetailLevel: 'activity',
        affectedDayDetails: [],
        constraintAssessments: [
          {
            constraintKey: 'NO_NIGHT_DRIVE',
            legacyConstraintId: 'c_no_night_drive',
            contractRequirement: '日落后 30 分钟内结束驾驶',
            aggregateStatus: 'EXECUTION_BLOCK',
            lanes: {
              planning: null,
              executability: {
                status: 'BLOCK',
                source: 'TEP',
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
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.affectedDayDetails?.[0]?.items[0]).toMatchObject({
      label: '雷克雅未克 → 维克',
      impactType: 'TIME_WINDOW',
    });
    expect(ui.affectedDayDetails?.[0]?.items[0]?.detail).toContain('23:40');
    expect(ui.scheduleDetailLevel).toBe('activity');
  });
});
