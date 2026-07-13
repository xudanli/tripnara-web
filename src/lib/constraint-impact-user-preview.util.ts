import type { ConstraintImpactAffectedDayDetail, ConstraintImpactPreview } from '@/components/plan-studio/workbench/constraint-console-types';
import type {
  ConstraintAssessmentUiTone,
  UnifiedConstraintAssessmentView,
} from '@/types/frontend-constraint-assessment-api.types';
import { buildLaneBadges } from '@/lib/frontend-constraint-card-view.util';
import {
  buildNoNightDrivePreviewItemFromEvidence,
  isNoNightDriveActivityPreviewItem,
  isNoNightDriveDegradationPreviewItem,
  type Sdr202StructuredEvidence,
} from '@/lib/sdr-202-rule-metadata.util';
import type {
  TripConstraintPreviewAffectedDayDetail,
  TripConstraintPreviewConflictBucketSummary,
  TripConstraintPreviewExecuteabilityDelta,
  TripConstraintPreviewImpactData,
  TripConstraintPreviewSuggestedFollowUp,
  TripConstraintPreviewUserSummary,
  TripConstraintPreviewVerdict,
} from '@/types/trip-constraints';

const DEV_PREVIEW_PATTERNS = [
  /\/api\//i,
  /\bpersist\s*=/i,
  /validate-scope/i,
  /read-model/i,
  /forceRefreshEvidence/i,
  /assess\s*读模型/i,
  /轻量变更已接入/i,
];

export function isDevPreviewText(text: string | null | undefined): boolean {
  const trimmed = text?.trim();
  if (!trimmed) return false;
  return DEV_PREVIEW_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function sanitizePreviewUserFacingText(text: string | null | undefined): string {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return trimmed;
  if (isDevPreviewText(trimmed)) {
    return '变更已纳入可行性评估，确认后将重新检查是否走得通';
  }
  return trimmed;
}

export function normalizeSuggestedFollowUp(
  raw: string | TripConstraintPreviewSuggestedFollowUp | null | undefined,
): ConstraintImpactPreview['suggestedFollowUpAction'] {
  if (!raw) return undefined;
  if (typeof raw === 'object' && raw.label?.trim()) {
    return {
      label: raw.label.trim(),
      action: raw.action ?? 'NONE',
      deepLink: raw.deepLink,
    };
  }
  const text = typeof raw === 'string' ? sanitizePreviewUserFacingText(raw) : '';
  if (!text || isDevPreviewText(text)) return undefined;
  return { label: text, action: 'NONE' };
}

export function mapApiAffectedDayDetails(
  details: TripConstraintPreviewAffectedDayDetail[] | undefined,
): ConstraintImpactAffectedDayDetail[] {
  if (!details?.length) return [];
  return details.map((day) => ({
    dayNumber: day.dayNumber,
    tone: day.tone,
    daySummary: day.daySummary,
    items: (day.items ?? []).map((item) => ({
      itemId: item.itemId,
      label: item.label,
      startTimeLabel: item.startTimeLabel,
      detail: item.detail,
      impactType: item.impactType,
    })),
  }));
}

export function verdictUiTone(
  verdict: TripConstraintPreviewVerdict | undefined,
): ConstraintAssessmentUiTone {
  switch (verdict) {
    case 'NOW_EXECUTABLE':
      return 'success';
    case 'IMPROVED':
    case 'NEEDS_CONFIRM':
      return 'warning';
    case 'STILL_NOT_EXECUTABLE':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function mapPreviewConstraintAssessments(
  assessments: UnifiedConstraintAssessmentView[] | undefined,
): ConstraintImpactPreview['constraintAssessments'] {
  if (!assessments?.length) return undefined;
  return assessments.map((assessment) => ({
    constraintKey: assessment.constraintKey,
    legacyConstraintId: assessment.legacyConstraintId,
    aggregateStatus: assessment.aggregateStatus,
    laneBadges: buildLaneBadges(assessment),
    assessment,
  }));
}

export function resolvePreviewUserSummary(
  userSummary: TripConstraintPreviewUserSummary | undefined,
  fallback?: { verdictReason?: string },
): ConstraintImpactPreview['userSummary'] {
  const verdictLabel = typeof userSummary?.verdictLabel === 'string'
    ? userSummary.verdictLabel.trim()
    : '';
  if (!verdictLabel || !userSummary) return undefined;
  return {
    verdict: userSummary.verdict,
    verdictLabel,
    verdictReason: sanitizePreviewUserFacingText(
      userSummary.verdictReason ?? fallback?.verdictReason ?? '',
    ),
    confidence: userSummary.confidence,
    previewMode: userSummary.previewMode,
  };
}

export function normalizePreviewConflictBucketSummary(
  value: string | TripConstraintPreviewConflictBucketSummary | undefined,
): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value.label === 'string' && value.label.trim()) {
    return value.label.trim();
  }
  if (value.before != null && value.after != null && value.before !== value.after) {
    return `${value.before} → ${value.after}`;
  }
  if (value.after != null) return String(value.after);
  if (value.before != null) return String(value.before);
  return undefined;
}

export function normalizePreviewExecuteabilityDelta(
  delta: TripConstraintPreviewExecuteabilityDelta | undefined,
): ConstraintImpactPreview['executeabilityDelta'] {
  if (!delta) return undefined;
  const summary = delta.conflictsDeltaSummary;
  return {
    scoreDelta: delta.scoreDelta,
    mustHandleDelta: delta.mustHandleDelta,
    scoreDeltaReason: delta.scoreDeltaReason
      ? sanitizePreviewUserFacingText(delta.scoreDeltaReason)
      : undefined,
    blockingRuleIds: delta.blockingRuleIds,
    conflictsDeltaSummary: summary
      ? {
          mustHandle: normalizePreviewConflictBucketSummary(summary.mustHandle),
          suggestAdjust: normalizePreviewConflictBucketSummary(summary.suggestAdjust),
          pendingConfirm: normalizePreviewConflictBucketSummary(summary.pendingConfirm),
        }
      : undefined,
  };
}

export function extractTripLevelConflictsFromPreviewMeta(
  meta: TripConstraintPreviewImpactData['meta'],
): ConstraintImpactPreview['tripLevelConflicts'] | undefined {
  const debug = meta?.debug;
  if (!debug) return undefined;
  const before = debug.tripLevelConflictsBefore;
  const after = debug.tripLevelConflictsAfter;
  if (!before && !after) return undefined;
  return { before, after };
}

export function resolvePreviewAffectedDaysSource(
  data: Pick<TripConstraintPreviewImpactData, 'affectedDays' | 'structuredImpact'>,
): TripConstraintPreviewImpactData['affectedDays'] {
  const scheduleDays = data.structuredImpact?.schedule?.affectedDays;
  if (scheduleDays?.length) return scheduleDays;
  return data.affectedDays;
}

export function resolvePreviewAffectedDayDetailsSource(
  data: Pick<
    TripConstraintPreviewImpactData,
    'affectedDayDetails' | 'structuredImpact'
  >,
): TripConstraintPreviewAffectedDayDetail[] | undefined {
  const scheduleDetails = data.structuredImpact?.schedule?.affectedDayDetails;
  if (scheduleDetails?.length) return scheduleDetails;
  return data.affectedDayDetails;
}

export function resolvePreviewScheduleDetailLevel(
  data: Pick<
    TripConstraintPreviewImpactData,
    'scheduleDetailLevel' | 'structuredImpact'
  >,
): TripConstraintPreviewImpactData['scheduleDetailLevel'] {
  return (
    data.scheduleDetailLevel ??
    data.structuredImpact?.schedule?.scheduleDetailLevel
  );
}

export function hasPreviewActivityScheduleDetail(
  preview: Pick<
    ConstraintImpactPreview,
    'scheduleDetailLevel' | 'affectedDayDetails'
  >,
): boolean {
  if (preview.scheduleDetailLevel === 'activity') {
    return previewHasActionableDayDetails(preview, { includeDegradation: false });
  }
  return (preview.affectedDayDetails ?? []).some((day) =>
    (day.items ?? []).some((item) => isNoNightDriveActivityPreviewItem(item) || (
      Boolean(item.label?.trim()) &&
      Boolean(item.detail?.trim() || item.startTimeLabel?.trim()) &&
      !isNoNightDriveDegradationPreviewItem(item)
    )),
  );
}

/** 有活动明细时，用 affectedDayDetails 的天数替换占位 [1..N] */
export function syncPreviewAffectedDaysWithDetails(input: {
  affectedDays: ConstraintImpactPreview['affectedDays'];
  affectedDayDetails?: ConstraintImpactPreview['affectedDayDetails'];
}): ConstraintImpactPreview['affectedDays'] {
  const details = input.affectedDayDetails ?? [];
  if (!previewHasActionableDayDetails({ affectedDayDetails: details } as ConstraintImpactPreview)) {
    return input.affectedDays;
  }

  const detailDays = details.map((day, index) => ({
    dayNumber: day.dayNumber,
    tone:
      day.tone ??
      ((index === 0 ? 'major' : 'minor') as 'major' | 'minor' | 'none'),
  }));

  if (
    !input.affectedDays.length ||
    isPlainPreviewDayList(input.affectedDays) ||
    detailDays.length < input.affectedDays.length
  ) {
    return detailDays;
  }

  const detailDaySet = new Set(detailDays.map((day) => day.dayNumber));
  const merged = input.affectedDays.filter((day) => detailDaySet.has(day.dayNumber));
  return merged.length > 0 ? merged : detailDays;
}

export function buildPreviewAdjustmentSummaryFromSchedule(input: {
  affectedDayDetails?: ConstraintImpactPreview['affectedDayDetails'];
  fallback?: string;
}): string | undefined {
  const firstDay = input.affectedDayDetails?.[0];
  const firstItem = firstDay?.items?.[0];
  if (firstDay?.daySummary?.trim()) return firstDay.daySummary.trim();
  if (firstItem?.detail?.trim()) {
    const prefix = firstDay ? `第 ${firstDay.dayNumber} 天` : undefined;
    return prefix ? `${prefix} · ${firstItem.detail.trim()}` : firstItem.detail.trim();
  }
  return input.fallback;
}

export function buildConstraintScopedConflictSummary(input: {
  before?: { mustHandle?: number; suggestAdjust?: number; pendingConfirm?: number };
  after?: { mustHandle?: number; suggestAdjust?: number; pendingConfirm?: number };
}): string | undefined {
  const parts: string[] = [];
  const beforeMust = input.before?.mustHandle;
  const afterMust = input.after?.mustHandle;
  if (beforeMust != null) {
    if (afterMust != null && afterMust !== beforeMust) {
      parts.push(`必处理 ${beforeMust} → ${afterMust}`);
    } else {
      parts.push(`必处理 ${beforeMust} 项`);
    }
  }
  const beforeSuggest = input.before?.suggestAdjust;
  const afterSuggest = input.after?.suggestAdjust;
  if (beforeSuggest != null) {
    if (afterSuggest != null && afterSuggest !== beforeSuggest) {
      parts.push(`建议调整 ${beforeSuggest} → ${afterSuggest}`);
    } else if (beforeSuggest > 0) {
      parts.push(`建议调整 ${beforeSuggest} 项`);
    }
  }
  return parts.length ? parts.join(' · ') : undefined;
}

export function isPlainPreviewDayList(
  days: Array<{ dayNumber: number }> | undefined,
): boolean {
  if (!days?.length || days.length < 3) return false;
  return days.every((day, index) => day.dayNumber === index + 1);
}

export function previewHasActionableDayDetails(
  preview: Pick<ConstraintImpactPreview, 'affectedDayDetails'>,
  options?: { includeDegradation?: boolean },
): boolean {
  const includeDegradation = options?.includeDegradation ?? true;
  return (preview.affectedDayDetails ?? []).some((day) => {
    if (Boolean(day.daySummary?.trim())) return true;
    return (day.items ?? []).some((item) => {
      if (!includeDegradation && isNoNightDriveDegradationPreviewItem(item)) return false;
      return Boolean(item.label?.trim()) || Boolean(item.detail?.trim());
    });
  });
}

/** BFF 未返回 affectedDayDetails 时，从 constraintAssessments 证据补 Day 级摘要 */
export function supplementPreviewScheduleFromAssessments(
  preview: ConstraintImpactPreview,
): ConstraintImpactPreview {
  if (previewHasActionableDayDetails(preview)) return preview;

  const entries = preview.constraintAssessments ?? [];
  if (!entries.length) return preview;

  const byDay = new Map<
    number,
    {
      tone: 'major' | 'minor';
      daySummary?: string;
      items: NonNullable<ConstraintImpactPreview['affectedDayDetails']>[number]['items'];
    }
  >();

  for (const entry of entries) {
    const lane = entry.assessment?.lanes?.executability;
    if (!lane) continue;
    const evidence = lane.evidence as Sdr202StructuredEvidence | undefined;
    const dayRaw = evidence?.day ?? evidence?.dayIndex;
    const dayNumber = typeof dayRaw === 'number' ? dayRaw : undefined;
    if (dayNumber == null) continue;

    const tone: 'major' | 'minor' =
      lane.status === 'BLOCK' ? 'major' : lane.status === 'WARNING' ? 'minor' : 'minor';
    const bucket = byDay.get(dayNumber) ?? { tone, items: [] };
    if (tone === 'major') bucket.tone = 'major';

    const isNoNightDrive =
      entry.constraintKey === 'NO_NIGHT_DRIVE' ||
      entry.legacyConstraintId === 'c_no_night_drive' ||
      lane.ruleId === 'SDR-202';

    if (isNoNightDrive) {
      const previewItem = buildNoNightDrivePreviewItemFromEvidence({
        evidence,
        message: lane.message,
      });
      if (previewItem) {
        bucket.daySummary = bucket.daySummary ?? lane.message?.trim();
        bucket.items.push(previewItem);
        byDay.set(dayNumber, bucket);
        continue;
      }
    }

    const actual =
      typeof evidence?.actual === 'string'
        ? evidence.actual
        : typeof lane.message === 'string'
          ? lane.message
          : undefined;
    const limit = typeof evidence?.limit === 'string' ? evidence.limit : undefined;
    const detailParts = [actual, limit ? `上限 ${limit}` : undefined].filter(Boolean);

    bucket.daySummary = bucket.daySummary ?? lane.message?.trim();
    bucket.items.push({
      label:
        (typeof entry.assessment?.contractRequirement === 'string'
          ? entry.assessment.contractRequirement.trim()
          : undefined) ||
        lane.ruleId ||
        '约束验证',
      detail: detailParts.join(' · ') || lane.message?.trim() || undefined,
      impactType: lane.ruleId,
    });
    byDay.set(dayNumber, bucket);
  }

  if (byDay.size === 0) return preview;

  const affectedDayDetails = [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, bucket]) => ({
      dayNumber,
      tone: bucket.tone,
      daySummary: bucket.daySummary,
      items: bucket.items,
    }));

  const affectedDays = affectedDayDetails.map((day) => ({
    dayNumber: day.dayNumber,
    tone: day.tone ?? 'minor',
  }));

  const majorCount = affectedDays.filter((d) => d.tone === 'major').length;
  const minorCount = affectedDays.filter((d) => d.tone === 'minor').length;
  const conflictLine = buildConstraintScopedConflictSummary({
    before: preview.conflictsBefore,
    after: preview.conflictsAfter,
  });

  return {
    ...preview,
    isTripSnapshotOnly: false,
    affectedDays,
    affectedDayDetails,
    adjustmentSummary:
      affectedDayDetails[0]?.daySummary ??
      preview.adjustmentSummary ??
      `${majorCount} 处主要调整，${minorCount} 处次要调整${conflictLine ? ` · ${conflictLine}` : ''}`,
  };
}

export function shouldHidePlaceholderPreviewDayTabs(
  preview: ConstraintImpactPreview,
): boolean {
  if (previewHasActionableDayDetails(preview)) return false;
  if (!preview.affectedDays.length) return true;
  return isPlainPreviewDayList(preview.affectedDays);
}
