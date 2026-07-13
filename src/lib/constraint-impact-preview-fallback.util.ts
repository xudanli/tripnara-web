import type {
  ConstraintEditorDraft,
  ConstraintImpactPreview,
} from '@/components/plan-studio/workbench/constraint-console-types';
import { normalizeFeasibilityScore } from '@/components/plan-studio/workbench/constraint-console-view.util';
import {
  mapPreviewConstraintAssessments,
  resolvePreviewUserSummary,
} from '@/lib/constraint-impact-user-preview.util';
import { uiConstraintIdToApi } from '@/lib/trip-constraints.adapter';
import type {
  UnifiedConstraintAssessmentBundle,
  UnifiedConstraintAssessmentView,
} from '@/types/frontend-constraint-assessment-api.types';
import type { TripConstraint, TripConstraintPreviewVerdict } from '@/types/trip-constraints';
import { TripConstraintsApiError } from '@/api/trip-constraints';
import {
  buildNoNightDrivePreviewItemFromEvidence,
  reprojectNoNightDriveTextWithBuffer,
  type Sdr202StructuredEvidence,
} from '@/lib/sdr-202-rule-metadata.util';

export function isPacingConstraintPreviewFallbackEligible(draftId: string): boolean {
  return (
    draftId === 'daily_drive' ||
    draftId === 'max_daily_drive' ||
    draftId === 'c_max_daily_drive' ||
    draftId === 'no_night_drive' ||
    draftId === 'c_no_night_drive'
  );
}

export function isPreviewImpactRecoverableServerError(err: unknown): boolean {
  if (isPreviewImpactServerTrimError(err)) return true;
  if (err instanceof TripConstraintsApiError && err.code === 'INTERNAL_ERROR') return true;
  const message = err instanceof Error ? err.message : '';
  return /reading 'find'/i.test(message) || /Cannot read properties of undefined/i.test(message);
}

export function isPreviewImpactServerTrimError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { message?: string; code?: string };
  const message = record.message ?? '';
  return (
    record.code === 'INTERNAL_ERROR' &&
    /trim/i.test(message)
  );
}

function formatDurationMinutes(totalMinutes: number): string {
  const rounded = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours > 0 && mins > 0) return `${hours} 小时 ${mins} 分钟`;
  if (hours > 0) return `${hours} 小时`;
  return `${mins} 分钟`;
}

function formatHourLimit(hours: number): string {
  if (!Number.isFinite(hours)) return '—';
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} 小时` : `${rounded} 小时`;
}

function readMaxDailyDriveHours(constraint?: TripConstraint | null): number | null {
  const raw = constraint?.value;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (typeof record.maxHours === 'number' && Number.isFinite(record.maxHours)) {
      return record.maxHours;
    }
    if (typeof record.hours === 'number' && Number.isFinite(record.hours)) {
      return record.hours;
    }
    if (typeof record.value === 'number' && Number.isFinite(record.value)) {
      return record.value;
    }
  }
  return null;
}

function findAssessmentForDraft(
  draftId: string,
  bundle: UnifiedConstraintAssessmentBundle | null | undefined,
): UnifiedConstraintAssessmentView | undefined {
  if (!bundle?.assessments?.length) return undefined;
  const apiId = uiConstraintIdToApi(draftId);
  const constraintKey =
    draftId === 'daily_drive' || draftId === 'max_daily_drive' || draftId === 'c_max_daily_drive'
      ? 'MAX_DAILY_DRIVE'
      : draftId === 'no_night_drive' || draftId === 'c_no_night_drive'
        ? 'NO_NIGHT_DRIVE'
        : undefined;
  return bundle.assessments.find(
    (assessment) =>
      assessment.legacyConstraintId === apiId ||
      assessment.legacyConstraintId === draftId ||
      assessment.constraintKey === constraintKey ||
      assessment.constraintKey === apiId,
  );
}

function readMeasuredDriveMinutes(assessment?: UnifiedConstraintAssessmentView): number | null {
  const evidence = assessment?.lanes?.executability?.evidence;
  if (evidence && typeof evidence.measuredMinutes === 'number') {
    return evidence.measuredMinutes;
  }
  const actual = evidence?.actual;
  if (typeof actual === 'string') {
    const match = actual.match(/(\d+)h(?:(\d+)m)?/i);
    if (match) {
      return Number(match[1]) * 60 + Number(match[2] ?? 0);
    }
  }
  const message = assessment?.lanes?.executability?.message ?? '';
  const minMatch = message.match(/(\d+)\s*min/i);
  if (minMatch) return Number(minMatch[1]);
  return null;
}

function readAffectedDay(assessment?: UnifiedConstraintAssessmentView): number | undefined {
  const evidence = assessment?.lanes?.executability?.evidence;
  const day = evidence?.day ?? evidence?.dayIndex;
  return typeof day === 'number' && Number.isFinite(day) ? day : undefined;
}

function resolveVerdictForDailyDrive(input: {
  measuredMinutes: number | null;
  afterHours: number;
  toleranceMinutes: number;
  laneStatus?: string;
}): { verdict: TripConstraintPreviewVerdict; verdictLabel: string; verdictReason: string } {
  const limitMinutes = input.afterHours * 60 + input.toleranceMinutes;
  const measured = input.measuredMinutes;

  if (measured != null && measured > limitMinutes) {
    const dayLabel = '第 1 天';
    const durationLabel = formatDurationMinutes(measured);
    return {
      verdict: 'STILL_NOT_EXECUTABLE',
      verdictLabel: '仍不可执行',
      verdictReason: `${dayLabel}驾驶 ${durationLabel}，仍超过 ${formatHourLimit(input.afterHours)} 上限`,
    };
  }

  if (input.laneStatus === 'BLOCK') {
    return {
      verdict: 'STILL_NOT_EXECUTABLE',
      verdictLabel: '仍不可执行',
      verdictReason: '当前行程仍被驾驶上限阻断，保存后需重新检查是否走得通',
    };
  }

  if (input.laneStatus === 'WARNING' || input.laneStatus === 'REQUIRES_VERIFICATION') {
    return {
      verdict: 'NEEDS_CONFIRM',
      verdictLabel: '需确认后调整',
      verdictReason: '调整后可能仍需拆分日程或移动景点，保存后将重新验证',
    };
  }

  return {
    verdict: 'IMPROVED',
    verdictLabel: '预计可改善',
    verdictReason: '新上限更严格，保存后将重新检查各天驾驶负荷',
  };
}

function buildDailyDrivePreviewFallback(input: {
  draft: ConstraintEditorDraft;
  apiConstraint?: TripConstraint | null;
  assessments?: UnifiedConstraintAssessmentBundle | null;
  feasibilityScore?: number | null;
}): ConstraintImpactPreview | null {
  const assessment = findAssessmentForDraft('daily_drive', input.assessments);
  const beforeHours = readMaxDailyDriveHours(input.apiConstraint) ?? input.draft.targetValue;
  const afterHours = input.draft.targetValue;
  const toleranceMinutes =
    input.draft.toleranceMode === 'allow_over' ? Math.max(0, input.draft.toleranceMinutes) : 0;
  const measuredMinutes = readMeasuredDriveMinutes(assessment);
  const affectedDay = readAffectedDay(assessment) ?? 1;
  const lane = assessment?.lanes?.executability;
  const verdict = resolveVerdictForDailyDrive({
    measuredMinutes,
    afterHours,
    toleranceMinutes,
    laneStatus: lane?.status,
  });

  const score = normalizeFeasibilityScore(input.feasibilityScore, 0);
  const userSummary = resolvePreviewUserSummary({
    verdict: verdict.verdict,
    verdictLabel: verdict.verdictLabel,
    verdictReason: verdict.verdictReason,
    confidence: measuredMinutes != null ? 'HIGH' : 'MEDIUM',
    previewMode: 'assessment_snapshot',
  });

  const constraintAssessments = assessment
    ? mapPreviewConstraintAssessments([assessment])
    : undefined;

  const measuredLabel =
    measuredMinutes != null ? formatDurationMinutes(measuredMinutes) : lane?.message ?? '驾驶负荷偏高';

  return {
    affectedDays: [{ dayNumber: affectedDay, tone: 'major' }],
    affectedDayDetails: [
      {
        dayNumber: affectedDay,
        tone: 'major',
        daySummary: '驾驶负荷超标，需拆分或减点',
        items: [
          {
            label: `第 ${affectedDay} 天累计驾驶`,
            detail: measuredLabel,
            impactType: 'drive_load',
          },
        ],
      },
    ],
    adjustmentSummary: `主要影响第 ${affectedDay} 天驾驶安排`,
    planLabel: '验证快照预览',
    planNeedsAdjust: verdict.verdict !== 'NOW_EXECUTABLE',
    feasibilityBefore: score,
    feasibilityAfter: score,
    executeabilityDelta: {
      scoreDelta: 0,
      scoreDeltaReason: '预览服务暂不可用，基于当前验证快照估算；保存后将重新完整检查',
      blockingRuleIds: lane?.ruleId ? [lane.ruleId] : ['SDR-101'],
      conflictsDeltaSummary: {
        mustHandle: '与驾驶上限相关的阻断项需结合完整检查后确认',
      },
    },
    budgetRows: [],
    diffBullets: [
      `每日驾驶上限从 ${formatHourLimit(beforeHours)} 调整为 ${formatHourLimit(afterHours)}`,
      verdict.verdictReason,
    ],
    recommendation: '建议先保存修改，再查看完整可行性报告确认各天是否走得通',
    recommendations: ['建议先保存修改，再查看完整可行性报告确认各天是否走得通'],
    suggestedFollowUpAction: {
      label: '保存并检查是否走得通',
      action: 'CONFIRM_AND_DEEP_CHECK',
    },
    userSummary,
    scheduleDetailLevel: 'summary_only',
    scheduleDetailUnavailableReason: '预览服务暂不可用，当前仅展示验证快照中的驾驶负荷摘要',
    constraintAssessments,
    refreshType: 'quick',
    structuredImpact: {
      constraintChanges: [
        {
          constraintId: uiConstraintIdToApi('daily_drive'),
          name: input.draft.name || '每日驾驶上限',
          before: beforeHours,
          after: afterHours,
          unit: 'hour',
          userFacingSummary: `从 ${formatHourLimit(beforeHours)}/天 改为 ${formatHourLimit(afterHours)}/天`,
        },
      ],
    },
  };
}

function buildNoNightDrivePreviewFallback(input: {
  draft: ConstraintEditorDraft;
  apiConstraint?: TripConstraint | null;
  assessments?: UnifiedConstraintAssessmentBundle | null;
  feasibilityScore?: number | null;
}): ConstraintImpactPreview | null {
  const assessment = findAssessmentForDraft(input.draft.id, input.assessments);
  const lane = assessment?.lanes?.executability;
  const affectedDay = readAffectedDay(assessment) ?? 1;
  const score = normalizeFeasibilityScore(input.feasibilityScore, 0);
  const previewItem = buildNoNightDrivePreviewItemFromEvidence({
    evidence: lane?.evidence as Sdr202StructuredEvidence | undefined,
    message: lane?.message,
    bufferMinutes: Math.round(input.draft.targetValue),
  });

  const verdictReason =
    previewItem?.detail?.trim() ||
    (lane?.message
      ? reprojectNoNightDriveTextWithBuffer(lane.message, Math.round(input.draft.targetValue))
      : undefined) ||
    '保存后将重新验证各天是否存在夜驾风险';

  const userSummary = resolvePreviewUserSummary({
    verdict: lane?.status === 'BLOCK' ? 'STILL_NOT_EXECUTABLE' : 'NEEDS_CONFIRM',
    verdictLabel: lane?.status === 'BLOCK' ? '仍不可执行' : '需确认后调整',
    verdictReason,
    confidence: previewItem?.impactType === 'TIME_WINDOW' ? 'HIGH' : 'MEDIUM',
    previewMode: 'assessment_snapshot',
  });

  const hasActivityDetail = previewItem?.impactType === 'TIME_WINDOW';

  return {
    affectedDays: [{ dayNumber: affectedDay, tone: lane?.status === 'BLOCK' ? 'major' : 'minor' }],
    affectedDayDetails: previewItem
      ? [
          {
            dayNumber: affectedDay,
            tone: lane?.status === 'BLOCK' ? 'major' : 'minor',
            daySummary: lane?.message?.trim(),
            items: [previewItem],
          },
        ]
      : undefined,
    adjustmentSummary: hasActivityDetail
      ? previewItem?.detail
      : '夜驾约束变更需保存后重新验证',
    planLabel: '验证快照预览',
    planNeedsAdjust: lane?.status === 'BLOCK' || lane?.status === 'WARNING',
    feasibilityBefore: score,
    feasibilityAfter: score,
    executeabilityDelta: {
      scoreDelta: 0,
      scoreDeltaReason: '预览服务暂不可用，已改用当前验证快照展示',
      blockingRuleIds: lane?.ruleId ? [lane.ruleId] : undefined,
    },
    budgetRows: [],
    diffBullets: [verdictReason],
    recommendation: '保存后将重新检查各天结束时间是否落在安全驾驶窗口内',
    suggestedFollowUpAction: {
      label: '保存并检查是否走得通',
      action: 'CONFIRM_AND_DEEP_CHECK',
    },
    userSummary,
    scheduleDetailLevel: hasActivityDetail ? 'activity' : 'unavailable',
    scheduleDetailUnavailableReason: hasActivityDetail
      ? undefined
      : '预览服务暂不可用，夜驾验证需保存后重新检查',
    constraintAssessments: assessment
      ? mapPreviewConstraintAssessments([assessment])
      : undefined,
    refreshType: 'quick',
    structuredImpact: {
      constraintChanges: [
        {
          constraintId: uiConstraintIdToApi('no_night_drive'),
          name: input.draft.name || '不夜间驾驶',
          before: input.apiConstraint?.value,
          after: {
            maxMinutesAfterSunset: input.draft.targetValue,
            enabled: input.draft.enabled !== false,
          },
          unit: 'minute',
          userFacingSummary: `日落后 ${Math.round(input.draft.targetValue)} 分钟内结束驾驶`,
        },
      ],
    },
  };
}

/** BFF preview-impact 对 pacing 约束报错时，用 constraint-assessments 快照合成用户预览 */
export function buildPacingConstraintImpactPreviewFallback(input: {
  draft: ConstraintEditorDraft;
  apiConstraint?: TripConstraint | null;
  assessments?: UnifiedConstraintAssessmentBundle | null;
  feasibilityScore?: number | null;
}): ConstraintImpactPreview | null {
  if (!isPacingConstraintPreviewFallbackEligible(input.draft.id)) return null;
  if (!input.assessments?.assessments?.length) return null;

  if (input.draft.id === 'daily_drive' || input.draft.id === 'max_daily_drive' || input.draft.id === 'c_max_daily_drive') {
    return buildDailyDrivePreviewFallback(input);
  }
  if (input.draft.id === 'no_night_drive' || input.draft.id === 'c_no_night_drive') {
    return buildNoNightDrivePreviewFallback(input);
  }
  return null;
}
