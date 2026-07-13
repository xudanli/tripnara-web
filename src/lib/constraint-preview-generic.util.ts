import type { ConstraintImpactPreview } from '@/components/plan-studio/workbench/constraint-console-types';
import type { TripConstraintPreviewImpactData } from '@/types/trip-constraints';
import { buildConstraintChangeUserFacingSummary } from '@/lib/constraint-catalog-editor.util';
import {
  previewHasActionableDayDetails,
  resolvePreviewAffectedDayDetailsSource,
  resolvePreviewAffectedDaysSource,
  resolvePreviewScheduleDetailLevel,
} from '@/lib/constraint-impact-user-preview.util';

export function dedupePreviewLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const text = line.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

/** BFF quick 预览未算出约束专属影响时的模板句（整趟 trip 级） */
const GENERIC_QUICK_PREVIEW_BULLET_PATTERNS = [
  /^变更尚未保存，保存后将重新检查是否走得通$/,
  /^当前有 \d+ 条必处理项，保存后将重算$/,
  /^当前 \d+ 条，保存后重算$/,
  /^变更影响较小，建议确认后刷新可行性验证$/,
  /^快速预览(?:暂)?不(?:会|能)?重算(?:可执行性分数|分数)?/,
  /^保存后将重新完整检查$/,
];

export function isGenericQuickPreviewBullet(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return GENERIC_QUICK_PREVIEW_BULLET_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function hasConstraintScopedAffectedDays(
  days: TripConstraintPreviewImpactData['affectedDays'],
): boolean {
  if (!days?.length) return false;
  return days.some((day) => typeof day === 'object' && day != null && 'dayNumber' in day);
}

function isPlainTripWideDayList(days: TripConstraintPreviewImpactData['affectedDays']): boolean {
  if (!days?.length || days.length < 3) return false;
  return days.every((day) => typeof day === 'number');
}

/**
 * 旧版 quick 预览只回传整趟行程快照（affectedDays=全部规划日、conflictsAfter 为空）。
 * 新版 BFF 回传约束域计数 + schedule.affectedDays 时返回 false。
 */
export function isGenericQuickPreviewImpact(
  data: Pick<
    TripConstraintPreviewImpactData,
    | 'refreshType'
    | 'affectedDays'
    | 'affectedDayDetails'
    | 'conflictsAfter'
    | 'structuredImpact'
    | 'executeabilityDelta'
    | 'userSummary'
  >,
): boolean {
  if (data.structuredImpact?.schedule?.affectedDays?.length) return false;
  if (data.conflictsAfter != null) return false;
  if (resolvePreviewScheduleDetailLevel(data) === 'activity') return false;
  if (previewHasActionableDayDetails({
    affectedDayDetails: resolvePreviewAffectedDayDetailsSource(data) as ConstraintImpactPreview['affectedDayDetails'],
  })) return false;

  const resolvedDays = resolvePreviewAffectedDaysSource(data);
  if (hasConstraintScopedAffectedDays(resolvedDays)) return false;

  const scheduleDetails =
    data.structuredImpact?.schedule?.affectedDayDetails ?? data.affectedDayDetails;
  if (scheduleDetails?.length) return false;
  if (data.structuredImpact?.schedule?.daysNeedingSplit?.length) return false;
  if (data.structuredImpact?.schedule?.poisToRelocate?.length) return false;

  const delta = data.executeabilityDelta;
  if (delta?.mustHandleDelta != null && delta.mustHandleDelta !== 0) return false;
  if (delta?.suggestAdjustDelta != null && delta.suggestAdjustDelta !== 0) return false;

  const genericReason = data.userSummary?.verdictReason?.trim();
  if (
    genericReason &&
    genericReason === '变更尚未保存，保存后将重新检查是否走得通'
  ) {
    return isPlainTripWideDayList(resolvedDays);
  }

  if (data.refreshType === 'deep') return false;

  return isPlainTripWideDayList(resolvedDays);
}

function buildConstraintSpecificSummary(
  changes: NonNullable<ConstraintImpactPreview['structuredImpact']>['constraintChanges'],
): string | undefined {
  if (!changes?.length) return undefined;
  if (changes.length === 1) {
    return buildConstraintChangeUserFacingSummary(changes[0]);
  }
  return changes
    .map((change) => buildConstraintChangeUserFacingSummary(change))
    .filter(Boolean)
    .join('；');
}

export function applyGenericQuickPreviewPresentation(
  preview: ConstraintImpactPreview,
  data: Pick<
    TripConstraintPreviewImpactData,
    | 'refreshType'
    | 'affectedDays'
    | 'affectedDayDetails'
    | 'conflictsAfter'
    | 'structuredImpact'
    | 'executeabilityDelta'
    | 'conflictsBefore'
    | 'userSummary'
    | 'meta'
  >,
): ConstraintImpactPreview {
  if (!isGenericQuickPreviewImpact(data)) {
    return { ...preview, isTripSnapshotOnly: false };
  }

  const constraintSummary = buildConstraintSpecificSummary(
    preview.structuredImpact?.constraintChanges,
  );
  const diffBullets = preview.diffBullets.filter((line) => !isGenericQuickPreviewBullet(line));
  const recommendations = (preview.recommendations ?? []).filter(
    (line) => !isGenericQuickPreviewBullet(line),
  );

  const tripMustHandle =
    preview.tripLevelConflicts?.before?.mustHandle ?? data.conflictsBefore?.mustHandle;
  const tripStatusNote =
    tripMustHandle != null && tripMustHandle > 0
      ? `整趟行程共有 ${tripMustHandle} 条必处理项（与本次修改无关，保存后将重算）`
      : undefined;

  return {
    ...preview,
    isTripSnapshotOnly: true,
    affectedDays: [],
    affectedDayDetails: [],
    adjustmentSummary:
      constraintSummary ??
      '即时预览暂未算出本次修改的专属日程影响，保存后将重新完整检查',
    diffBullets: diffBullets.length
      ? diffBullets
      : constraintSummary
        ? [constraintSummary]
        : ['保存后将重新检查本次修改是否走得通'],
    recommendations: recommendations.length
      ? recommendations
      : tripStatusNote
        ? [tripStatusNote]
        : preview.recommendations,
    recommendation:
      recommendations[0] ??
      constraintSummary ??
      preview.recommendation ??
      '保存后将重新检查本次修改是否走得通',
    scheduleDetailLevel: preview.scheduleDetailLevel ?? 'unavailable',
    scheduleDetailUnavailableReason:
      preview.scheduleDetailUnavailableReason ??
      '即时预览仅展示约束变更摘要；具体哪天受影响需保存后完整检查',
    planNeedsAdjust: preview.userSummary?.verdict !== 'NOW_EXECUTABLE',
  };
}
