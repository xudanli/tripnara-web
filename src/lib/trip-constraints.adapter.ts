import {
  Building2,
  Car,
  Clock,
  CloudSun,
  Leaf,
  Lock,
  MapPin,
  Route,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { ConstraintEditorDraft, ConstraintImpactPreview, ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import { EMPTY_CONSTRAINT_IMPACT_PREVIEW } from '@/components/plan-studio/workbench/constraint-console-types';
import {
  SOFT_PRIORITY_TO_SLIDER,
  sliderToSoftPriority,
  normalizeFeasibilityScore,
  type SoftPreferenceItem,
  type SoftPreferencePriority,
} from '@/components/plan-studio/workbench/constraint-console-view.util';
import { getSoftConstraintTemplate, getHardConstraintTemplate, isCatalogHardTemplate, isCatalogSoftTemplate } from '@/components/plan-studio/workbench/constraint-templates';
import { coerceDisplayText } from '@/lib/coerce-display-text.util';
import {
  decimalHoursToTimeString,
  formatConstraintPreviewChangeValue,
  buildConstraintChangeUserFacingSummary,
  repairBrokenPreviewObjectText,
  isCatalogHardToggleTemplate,
} from '@/lib/constraint-catalog-editor.util';
import {
  mergeScopeBindingIntoValue,
  readScopeBindingFromDraft,
  scopeBindingToApiScope,
} from '@/lib/constraint-scope.util';
import { formatConstraintTravelMode } from '@/lib/planning-constraints.util';
import { buildAffectedDayDetailsFromStructuredImpact, sanitizePreviewAffectedDays } from '@/lib/constraint-preview-schedule.util';
import {
  mapApiAffectedDayDetails,
  mapPreviewConstraintAssessments,
  normalizeSuggestedFollowUp,
  resolvePreviewUserSummary,
  sanitizePreviewUserFacingText,
  normalizePreviewExecuteabilityDelta,
  extractTripLevelConflictsFromPreviewMeta,
  resolvePreviewAffectedDaysSource,
  resolvePreviewAffectedDayDetailsSource,
  buildConstraintScopedConflictSummary,
  supplementPreviewScheduleFromAssessments,
  shouldHidePlaceholderPreviewDayTabs,
  isPlainPreviewDayList,
  syncPreviewAffectedDaysWithDetails,
  resolvePreviewScheduleDetailLevel,
  hasPreviewActivityScheduleDetail,
  buildPreviewAdjustmentSummaryFromSchedule,
} from '@/lib/constraint-impact-user-preview.util';
import {
  applyGenericQuickPreviewPresentation,
  isGenericQuickPreviewBullet,
  dedupePreviewLines,
} from '@/lib/constraint-preview-generic.util';
import { enrichListEntryWithMetadata, ensureHardConstraintMetadataOnEntries } from '@/lib/constraint-metadata.util';
import { enrichListEntryWithDestinationRule } from '@/lib/destination-rules.util';
import type {
  CreateTripConstraintDto,
  PatchTripConstraintDto,
  TripConstraint,
  TripConstraintCardTone,
  TripConstraintPreviewChange,
  TripConstraintPreviewImpactData,
  TripConstraintsListResponse,
} from '@/types/trip-constraints';
import type { ConstraintTemplate } from '@/components/plan-studio/workbench/constraint-templates';
import { TRIP_CONSTRAINT_LEGACY_IDS } from '@/types/trip-constraints';
import {
  isOfficialRuleConstraint,
  isWorldFeasibilityConstraint,
} from '@/lib/constraint-console-partition.util';

/** UI 工作台 id ↔ API 稳定 id */
export const UI_TO_API_CONSTRAINT_ID: Record<string, string> = {
  time_range: TRIP_CONSTRAINT_LEGACY_IDS.TIME_RANGE,
  budget: TRIP_CONSTRAINT_LEGACY_IDS.BUDGET_TOTAL,
  travelers: TRIP_CONSTRAINT_LEGACY_IDS.TRAVELERS,
  transport: TRIP_CONSTRAINT_LEGACY_IDS.TRANSPORT_MODE,
  must_go: TRIP_CONSTRAINT_LEGACY_IDS.MUST_PLACES,
  avoid_places: TRIP_CONSTRAINT_LEGACY_IDS.AVOID_PLACES,
  pacing: TRIP_CONSTRAINT_LEGACY_IDS.PACING_LEVEL,
  planning_policy: TRIP_CONSTRAINT_LEGACY_IDS.PLANNING_POLICY,
  road_restrictions: TRIP_CONSTRAINT_LEGACY_IDS.WORLD_FEASIBILITY,
  max_segment_distance: TRIP_CONSTRAINT_LEGACY_IDS.MAX_SEGMENT_DISTANCE,
  daily_drive: TRIP_CONSTRAINT_LEGACY_IDS.MAX_DAILY_DRIVE,
  no_night_drive: TRIP_CONSTRAINT_LEGACY_IDS.NO_NIGHT_DRIVE,
};

const API_TO_UI_CONSTRAINT_ID: Record<string, string> = Object.fromEntries(
  Object.entries(UI_TO_API_CONSTRAINT_ID).map(([ui, api]) => [api, ui]),
);

export function uiConstraintIdToApi(uiId: string): string {
  if (uiId.startsWith('c_')) return uiId;
  if (isCatalogHardTemplate(uiId)) return `c_tpl_${uiId}`;
  if (isCatalogSoftTemplate(uiId)) return `c_tpl_${uiId}`;
  return UI_TO_API_CONSTRAINT_ID[uiId] ?? uiId;
}

export function apiConstraintIdToUi(apiId: string): string {
  if (apiId.startsWith('c_tpl_')) return apiId.slice(6);
  return API_TO_UI_CONSTRAINT_ID[apiId] ?? apiId;
}

/**
 * 从已存在的 c_max_segment_distance 约束读取上限（km）。
 * 无约束或无法解析时返回 null — 不假定国家默认，供冲突展示/对齐使用。
 */
export function readMaxSegmentDistanceKmFromConstraint(
  constraint?: TripConstraint | null,
): number | null {
  if (!constraint) return null;
  const raw = constraint.value;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const v = raw as Record<string, unknown>;
    const max =
      typeof v.maxSegmentDistanceKm === 'number'
        ? v.maxSegmentDistanceKm
        : typeof v.value === 'number'
          ? v.value
          : undefined;
    if (max != null && Number.isFinite(max)) return max;
  }
  if (typeof raw === 'string') {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** 解析单段最长行驶距离约束（c_max_segment_distance）；无记录时用冰岛国家默认 250km（仅约束编辑 UI） */
export function parseMaxSegmentDistance(
  constraint?: TripConstraint | null,
): { maxKm: number; warnKm?: number } {
  const explicit = readMaxSegmentDistanceKmFromConstraint(constraint);
  if (explicit != null) {
    const warn =
      constraint?.value && typeof constraint.value === 'object'
        ? (constraint.value as Record<string, unknown>).warnSegmentDistanceKm
        : undefined;
    return {
      maxKm: explicit,
      warnKm: typeof warn === 'number' && Number.isFinite(warn) ? warn : undefined,
    };
  }
  if (!constraint) return { maxKm: 250 };
  return { maxKm: 250 };
}

export function isMaxSegmentDistanceConstraintId(id: string): boolean {
  return id === 'max_segment_distance' || id === TRIP_CONSTRAINT_LEGACY_IDS.MAX_SEGMENT_DISTANCE;
}

/**
 * road_class 叙述兜底：将 message 中 (>Nkm) 与当前 c_max_segment_distance 对齐。
 * 后端部署 `longDistanceHighMessage` 后前端应直接展示 BFF 文案；此函数仅作过渡兜底。
 */
export function refreshRoadClassTransportMessage(
  text: string | undefined | null,
  maxSegmentDistanceKm: number | undefined | null,
): string {
  return syncUltraLongDriveThresholdInText(text, maxSegmentDistanceKm ?? undefined);
}

/**
 * 可行性/冲突叙述里常嵌入旧阈值（如冰岛默认 250km）；与当前 c_max_segment_distance 对齐展示。
 */
export function syncUltraLongDriveThresholdInText(
  text: string | undefined | null,
  maxKm: number | undefined,
): string {
  if (!text || maxKm == null || !Number.isFinite(maxKm)) return text ?? '';
  const km = Math.round(maxKm);
  if (!/超长距离|long_distance|road_class/i.test(text) && !/[（(]\s*>\s*\d+/i.test(text)) {
    return text;
  }
  return text.replace(
    /(超长距离行驶\s*[（(]\s*>\s*)(\d+(?:\.\d+)?)(\s*km\s*[）)])/gi,
    `$1${km}$3`,
  );
}

export function isApiManagedSoftId(id: string): boolean {
  return id.startsWith('c_custom_') || id.startsWith('c_wish_');
}

function priorityToSoftPriority(priority?: number): SoftPreferencePriority {
  const p = priority ?? 5;
  if (p >= 7) return '高';
  if (p >= 4) return '中';
  return '低';
}

function softPriorityToApiPriority(priority: SoftPreferencePriority): number {
  switch (priority) {
    case '高':
      return 8;
    case '中':
      return 5;
    default:
      return 3;
  }
}

function resolveConstraintListLabel(constraint: TripConstraint): string {
  const uiId = apiConstraintIdToUi(constraint.id);
  const hardTemplate = getHardConstraintTemplate(uiId);
  if (hardTemplate) return hardTemplate.label;
  const softTemplate = getSoftConstraintTemplate(uiId);
  if (softTemplate) return softTemplate.label;
  const name = constraint.name?.trim();
  if (name && name !== constraint.id && name !== uiId) return name;
  return uiId;
}

function resolveConstraintIcon(constraint: TripConstraint): LucideIcon {
  const uiId = apiConstraintIdToUi(constraint.id);
  const hardTemplate = getHardConstraintTemplate(uiId);
  if (hardTemplate) return hardTemplate.icon;
  const softTemplate = getSoftConstraintTemplate(uiId);
  if (softTemplate) return softTemplate.icon;

  switch (constraint.category) {
    case 'TIME':
      return Clock;
    case 'BUDGET':
      return Wallet;
    case 'MEMBER':
      return Users;
    case 'TRANSPORT':
      return Car;
    case 'PLACE':
      return MapPin;
    case 'WORLD':
      return Route;
    default:
      break;
  }

  switch (constraint.id) {
    case TRIP_CONSTRAINT_LEGACY_IDS.TIME_RANGE:
      return Clock;
    case TRIP_CONSTRAINT_LEGACY_IDS.BUDGET_TOTAL:
      return Wallet;
    case TRIP_CONSTRAINT_LEGACY_IDS.MUST_PLACES:
      return MapPin;
    case TRIP_CONSTRAINT_LEGACY_IDS.TRANSPORT_MODE:
      return Car;
    case TRIP_CONSTRAINT_LEGACY_IDS.TRAVELERS:
      return Users;
    case TRIP_CONSTRAINT_LEGACY_IDS.WORLD_FEASIBILITY:
      return Route;
    case TRIP_CONSTRAINT_LEGACY_IDS.MAX_SEGMENT_DISTANCE:
      return Route;
    default:
      return constraint.type === 'EXTERNAL' ? CloudSun : constraint.type === 'SOFT' ? Leaf : Lock;
  }
}

function looksLikeIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value.trim());
}

function formatIsoDateRangeString(raw: string): string | undefined {
  const trimmed = raw.trim();
  const parts = trimmed.split(/\s*[—–-]\s*/);
  if (
    parts.length === 2 &&
    looksLikeIsoDateString(parts[0]!) &&
    looksLikeIsoDateString(parts[1]!)
  ) {
    return formatConstraintDateRangeParts(parts[0]!, parts[1]!, 0).replace(/（— 天）$/, '');
  }
  if (looksLikeIsoDateString(trimmed)) {
    try {
      return new Date(trimmed).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function formatConstraintDateRangeParts(
  startDate: string,
  endDate: string,
  dayCount: number,
): string {
  try {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    return `${fmt(startDate)} – ${fmt(endDate)}（${dayCount || '—'} 天）`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}

function formatConstraintDisplayValue(constraint: TripConstraint): string | undefined {
  if (constraint.displayValue?.trim()) {
    const formattedDisplay = formatIsoDateRangeString(constraint.displayValue.trim());
    return formattedDisplay ?? constraint.displayValue.trim();
  }

  if (isMaxSegmentDistanceConstraintId(constraint.id)) {
    const { maxKm } = parseMaxSegmentDistance(constraint);
    return `≤ ${maxKm} km`;
  }

  if (constraint.id === TRIP_CONSTRAINT_LEGACY_IDS.TRANSPORT_MODE) {
    if (typeof constraint.value === 'string') {
      return formatConstraintTravelMode(constraint.value);
    }
    if (constraint.value && typeof constraint.value === 'object') {
      const v = constraint.value as Record<string, unknown>;
      if (typeof v.travelMode === 'string') {
        return formatConstraintTravelMode(v.travelMode);
      }
      if (typeof v.raw === 'string') {
        return formatConstraintTravelMode(v.raw);
      }
    }
  }

  if (constraint.value == null) return undefined;

  if (typeof constraint.value === 'object' && constraint.value != null) {
    const v = constraint.value as Record<string, unknown>;
    if (typeof v.startDate === 'string' && typeof v.endDate === 'string') {
      const dayCount = typeof v.dayCount === 'number' ? v.dayCount : 0;
      return formatConstraintDateRangeParts(v.startDate, v.endDate, dayCount);
    }
    if (typeof v.dayCount === 'number') return `${v.dayCount} 天`;
    if (typeof v.memberCount === 'number') return `${v.memberCount} 人`;
    if (typeof v.count === 'number') return `${v.count} 人`;
    if (typeof v.total === 'number') return `${v.total}`;
    if (typeof v.templateId === 'string') return v.templateId;
    if (typeof v.verifiedAt === 'string') return '已验证';
  }

  if (typeof constraint.value === 'string' || typeof constraint.value === 'number') {
    if (typeof constraint.value === 'string') {
      const formatted = formatIsoDateRangeString(constraint.value);
      if (formatted) return formatted;
    }
    return constraint.unit ? `${constraint.value} ${constraint.unit}` : String(constraint.value);
  }
  return undefined;
}

function readFeasibilityScore(
  raw: TripConstraintPreviewImpactData['feasibilityBefore'],
  assess?: TripConstraintPreviewImpactData['assessBefore'],
): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return normalizeFeasibilityScore(raw, 0);
  }
  if (assess?.overallAverageScore != null) {
    return normalizeFeasibilityScore(assess.overallAverageScore, 0);
  }
  if (raw && typeof raw === 'object') {
    const normalized = normalizeFeasibilityScore(raw, Number.NaN);
    if (Number.isFinite(normalized)) return normalized;
  }
  return undefined;
}

function normalizeAffectedDays(
  days: TripConstraintPreviewImpactData['affectedDays'],
  fallback: ConstraintImpactPreview['affectedDays'],
): ConstraintImpactPreview['affectedDays'] {
  if (!days?.length) return fallback;
  return days.map((day, index) => {
    if (typeof day === 'number') {
      return {
        dayNumber: day,
        tone: (index === 0 ? 'major' : 'minor') as 'major' | 'minor',
      };
    }
    return {
      dayNumber: day.dayNumber,
      tone:
        day.tone ??
        (day.severity === 'major' ? 'major' : day.severity === 'minor' ? 'minor' : 'none'),
    };
  });
}

const CARD_TONES: TripConstraintCardTone[] = ['default', 'caution', 'danger', 'muted'];

export function resolveConstraintCardTone(input: {
  cardTone?: TripConstraintCardTone | string | null;
  status?: TripConstraint['status'];
  hasConflict?: boolean;
}): TripConstraintCardTone {
  const raw = input.cardTone;
  if (raw && CARD_TONES.includes(raw as TripConstraintCardTone)) {
    return raw as TripConstraintCardTone;
  }
  if (input.status === 'DISABLED') return 'muted';
  if (input.status === 'CONFLICTED' || input.hasConflict) return 'danger';
  if (input.status === 'DRAFT') return 'caution';
  return 'default';
}

export function tripConstraintToListEntry(constraint: TripConstraint): ConstraintListEntry {
  const uiId = apiConstraintIdToUi(constraint.id);
  const officialRule = isOfficialRuleConstraint(constraint);
  const worldFeasibility = isWorldFeasibilityConstraint(constraint);
  const kind =
    officialRule || (constraint.type === 'EXTERNAL' && !worldFeasibility)
      ? 'external'
      : worldFeasibility
        ? 'external'
        : constraint.type === 'HARD'
          ? 'hard'
          : constraint.type === 'SOFT'
            ? 'soft'
            : 'external';
  const priority = priorityToSoftPriority(constraint.priority);
  const cardTone = resolveConstraintCardTone({
    cardTone: constraint.cardTone,
    status: constraint.status,
    hasConflict: constraint.hasConflict,
  });
  const conflict = constraint.hasConflict === true || cardTone === 'danger';

  const baseEntry: ConstraintListEntry = {
    id: uiId,
    kind,
    label: resolveConstraintListLabel(constraint),
    value: formatConstraintDisplayValue(constraint),
    icon: resolveConstraintIcon(constraint),
    locked: constraint.locked ?? officialRule,
    readOnly: officialRule,
    allowRelaxation: officialRule ? false : constraint.allowRelaxation,
    category: constraint.category,
    sourceType: constraint.source?.type,
    sectionKey: officialRule ? 'readonly_official' : constraint.sectionKey,
    description: coerceDisplayText(constraint.description),
    updatedAt: constraint.updatedAt,
    verificationStatus: constraint.verificationStatus,
    lastVerifiedAt: constraint.lastVerifiedAt,
    cardTone,
    hasConflict: conflict,
    sliderValue: kind === 'soft' ? SOFT_PRIORITY_TO_SLIDER[priority] : undefined,
    statusLabel:
      officialRule
        ? conflict
          ? '冲突'
          : constraint.status === 'CONFLICTED'
            ? '冲突'
            : undefined
        : kind === 'external'
          ? constraint.status === 'CONFLICTED'
            ? '有变更'
            : constraint.verificationStatus === 'OUTDATED'
              ? '待更新'
              : undefined
          : undefined,
    statusTone:
      conflict || constraint.status === 'CONFLICTED' || constraint.verificationStatus === 'OUTDATED'
        ? 'warning'
        : 'neutral',
  };

  if (officialRule) {
    return enrichListEntryWithDestinationRule(baseEntry, constraint);
  }
  if (kind === 'hard') {
    return enrichListEntryWithMetadata(baseEntry, constraint);
  }
  if (kind === 'soft') {
    const template = getSoftConstraintTemplate(uiId);
    return {
      ...baseEntry,
      description:
        coerceDisplayText(constraint.description) || template?.description,
    };
  }
  return baseEntry;
}

export function softPreferencesFromTripConstraints(items: TripConstraint[]): SoftPreferenceItem[] {
  return items
    .filter((c) => c.type === 'SOFT' && c.status !== 'DISABLED')
    .map((c) => {
      const uiId =
        c.source?.templateId ??
        (typeof (c.value as { templateId?: string } | undefined)?.templateId === 'string'
          ? (c.value as { templateId: string }).templateId
          : undefined) ??
        apiConstraintIdToUi(c.id);
      const template = getSoftConstraintTemplate(uiId);
      const priority = priorityToSoftPriority(c.priority);
      return {
        id: c.id.startsWith('c_custom_') || c.id.startsWith('c_wish_') ? c.id : uiId,
        label: c.name,
        icon: template?.icon ?? Leaf,
        priority,
      };
    });
}

export function mergeApiListWithClientEntries(
  api: TripConstraintsListResponse,
  client: {
    hardItems: ConstraintListEntry[];
    softItems: ConstraintListEntry[];
    externalItems: ConstraintListEntry[];
  },
): {
  hardItems: ConstraintListEntry[];
  softItems: ConstraintListEntry[];
  externalItems: ConstraintListEntry[];
} {
  const apiHard = api.items
    .filter((c) => c.type === 'HARD' && !isOfficialRuleConstraint(c))
    .map(tripConstraintToListEntry);
  const apiSoft = api.items.filter((c) => c.type === 'SOFT').map(tripConstraintToListEntry);
  const apiExternal = api.items
    .filter((c) => c.type === 'EXTERNAL' || isOfficialRuleConstraint(c) || isWorldFeasibilityConstraint(c))
    .map(tripConstraintToListEntry);

  const mergeById = (primary: ConstraintListEntry[], supplement: ConstraintListEntry[]) => {
    const map = new Map<string, ConstraintListEntry>();
    for (const item of supplement) map.set(item.id, item);
    for (const item of primary) map.set(item.id, item);
    return [...map.values()];
  };

  return {
    hardItems: ensureHardConstraintMetadataOnEntries(
      mergeById(apiHard, client.hardItems),
      api.items,
    ),
    softItems: apiSoft.length > 0 ? apiSoft : client.softItems,
    externalItems: apiExternal,
  };
}

export function draftToPreviewChange(draft: ConstraintEditorDraft): TripConstraintPreviewChange {
  const constraintId = uiConstraintIdToApi(draft.id);
  const scopeBinding = readScopeBindingFromDraft(draft);
  const patch: PatchTripConstraintDto = {
    priority: draft.priority,
    locked: draft.locked,
    scope: scopeBindingToApiScope(scopeBinding),
  };

  const embedScope = (value: unknown) => mergeScopeBindingIntoValue(value, scopeBinding);

  if (draft.type === 'SOFT') {
    patch.value = embedScope({ intensity: draft.targetValue, priority: draft.priority });
    patch.unit = 'score';
  } else if (draft.id === 'budget') {
    patch.value = embedScope(draft.targetValue);
    patch.unit = draft.currency ?? 'CNY';
  } else if (draft.id === 'time_range') {
    patch.value = embedScope({
      startDate: draft.startDate,
      endDate: draft.endDate,
      dayCount: draft.targetValue,
    });
    patch.unit = 'day';
  } else if (draft.id === 'daily_drive') {
    patch.value = embedScope(draft.targetValue);
    patch.unit = 'hour';
  } else if (isMaxSegmentDistanceConstraintId(draft.id)) {
    patch.value = embedScope(draft.targetValue);
    patch.unit = 'km';
    if (draft.toleranceMode === 'allow_over' && draft.toleranceMinutes > 0) {
      patch.tolerance = draft.toleranceMinutes;
    }
  } else if (draft.id === 'no_night_drive') {
    patch.enabled = draft.enabled !== false;
    patch.value = embedScope({
      maxMinutesAfterSunset: draft.targetValue,
      enabled: draft.enabled !== false,
    });
    patch.unit = 'minute';
  } else if (draft.id === 'accommodation') {
    patch.value = embedScope(draft.targetValue);
    patch.unit = 'star';
  } else if (isCatalogHardTemplate(draft.id)) {
    patch.value = embedScope(buildCatalogHardConstraintValue(draft.id, draft));
  } else {
    patch.value = embedScope(draft.targetValue);
    patch.unit = draft.targetUnit;
  }

  const draftName = draft.name?.trim();
  if (draftName) patch.name = draftName;
  if (isCatalogHardTemplate(draft.id) && isCatalogHardToggleTemplate(draft.id)) {
    patch.enabled = draft.enabled !== false;
  }
  const draftReason = draft.reason?.trim();
  if (draftReason) {
    patch.value =
      typeof patch.value === 'object' && patch.value != null
        ? { ...(patch.value as Record<string, unknown>), reason: draftReason }
        : { value: patch.value, reason: draftReason };
  }

  return { constraintId, patch };
}

function sanitizePreviewUserText(text: string): string {
  return sanitizePreviewUserFacingText(text);
}

function normalizePreviewConstraintChanges(
  changes: NonNullable<NonNullable<ConstraintImpactPreview['structuredImpact']>['constraintChanges']>,
): NonNullable<NonNullable<ConstraintImpactPreview['structuredImpact']>['constraintChanges']> {
  return changes.map((change) => {
    const before = formatConstraintPreviewChangeValue(change.before, change.unit);
    const after = formatConstraintPreviewChangeValue(change.after, change.unit);
    const formatted = before != null || after != null;
    return {
      ...change,
      before: before ?? change.before,
      after: after ?? change.after,
      unit: formatted ? undefined : change.unit,
      userFacingSummary: buildConstraintChangeUserFacingSummary(change),
    };
  });
}

function repairPreviewTextLine(
  line: string,
  constraintChanges?: NonNullable<ConstraintImpactPreview['structuredImpact']>['constraintChanges'],
): string {
  return repairBrokenPreviewObjectText(sanitizePreviewUserText(line), constraintChanges);
}

export function mapPreviewImpactToUi(
  data: TripConstraintPreviewImpactData,
  _empty: ConstraintImpactPreview = EMPTY_CONSTRAINT_IMPACT_PREVIEW,
): ConstraintImpactPreview {
  const structured = data.structuredImpact;
  const rawConstraintChanges = structured?.constraintChanges;
  const normalizedConstraintChanges = rawConstraintChanges?.length
    ? normalizePreviewConstraintChanges(rawConstraintChanges)
    : undefined;

  let budgetRows =
    data.budgetDelta?.rows?.map((row) => ({
      label: row.label,
      delta: row.delta,
      currency: row.currency ?? data.budgetDelta?.currency ?? 'CNY',
    })) ??
    (data.budgetDelta?.total != null
      ? [{ label: '总预算', delta: data.budgetDelta.total, currency: data.budgetDelta.currency ?? 'CNY' }]
      : []);

  if (structured?.budget && (structured.budget.deltaAmount != null || structured.budget.deltaPct != null)) {
    const rows = [...budgetRows];
    if (structured.budget.deltaAmount != null) {
      rows.unshift({
        label: structured.budget.deltaPct != null ? `总预算 (+${structured.budget.deltaPct}%)` : '总预算',
        delta: structured.budget.deltaAmount,
        currency: structured.budget.currency ?? 'CNY',
      });
    }
    budgetRows = rows;
  }

  let feasibilityBeforeRaw = readFeasibilityScore(data.feasibilityBefore, data.assessBefore);
  let feasibilityAfterRaw = readFeasibilityScore(data.feasibilityAfter, data.assessAfter);
  let executeabilityDelta = normalizePreviewExecuteabilityDelta(data.executeabilityDelta);

  if (structured?.executeability) {
    if (structured.executeability.scoreBefore != null) {
      feasibilityBeforeRaw = structured.executeability.scoreBefore;
    }
    if (structured.executeability.scoreAfter != null) {
      feasibilityAfterRaw = structured.executeability.scoreAfter;
    }
    if (structured.executeability.scoreDelta != null) {
      executeabilityDelta = {
        ...executeabilityDelta,
        scoreDelta: structured.executeability.scoreDelta,
      };
    }
  }

  if (
    feasibilityAfterRaw == null &&
    feasibilityBeforeRaw != null &&
    executeabilityDelta?.scoreDelta != null
  ) {
    feasibilityAfterRaw = Math.max(
      0,
      Math.min(100, feasibilityBeforeRaw + executeabilityDelta.scoreDelta),
    );
  }

  const feasibilityBefore =
    feasibilityBeforeRaw != null ? normalizeFeasibilityScore(feasibilityBeforeRaw, 0) : 0;
  const feasibilityAfter =
    feasibilityAfterRaw != null
      ? normalizeFeasibilityScore(feasibilityAfterRaw, feasibilityBefore)
      : feasibilityBefore;

  const conflictSummary =
    buildConstraintScopedConflictSummary({
      before: data.conflictsBefore,
      after: data.conflictsAfter,
    }) ??
    (data.conflictsBefore?.mustHandle != null
      ? `本约束 ${data.conflictsBefore.mustHandle} 项需处理`
      : undefined);

  const conflictDeltaBullets: string[] = [];
  if (data.conflictsBefore && data.conflictsAfter) {
    const beforeMust = data.conflictsBefore.mustHandle ?? 0;
    const afterMust = data.conflictsAfter.mustHandle ?? 0;
    if (beforeMust !== afterMust) {
      conflictDeltaBullets.push(`硬冲突：${beforeMust} → ${afterMust}`);
    }
    const beforeSuggest = data.conflictsBefore.suggestAdjust ?? 0;
    const afterSuggest = data.conflictsAfter.suggestAdjust ?? 0;
    if (beforeSuggest !== afterSuggest) {
      conflictDeltaBullets.push(`建议调整：${beforeSuggest} → ${afterSuggest}`);
    }
  }

  const structuredBullets = (structured?.summaryBullets ?? [])
    .map(coerceDisplayText)
    .filter((line): line is string => Boolean(line))
    .map((line) => repairPreviewTextLine(line, rawConstraintChanges));
  const recommendationList = (data.recommendations ?? [])
    .map(coerceDisplayText)
    .filter((line): line is string => Boolean(line))
    .map((line) => repairPreviewTextLine(line, rawConstraintChanges));
  const mergedRecommendations = [
    ...new Set(
      recommendationList.filter((line) => !structuredBullets.includes(line)),
    ),
  ];

  const rawDiffBullets = (data.diffBullets ?? [])
    .map(coerceDisplayText)
    .filter((line): line is string => Boolean(line))
    .map((line) => repairPreviewTextLine(line, rawConstraintChanges));
  const diffBullets = dedupePreviewLines(
    (structuredBullets.length > 0
      ? [...structuredBullets, ...conflictDeltaBullets]
      : rawDiffBullets.length > 0
        ? [...rawDiffBullets, ...conflictDeltaBullets]
        : conflictDeltaBullets
    ).filter((line) => !isGenericQuickPreviewBullet(line)),
  );

  const mergedRecommendationsFiltered = dedupePreviewLines(
    mergedRecommendations.filter(
      (line) =>
        !isGenericQuickPreviewBullet(line) &&
        !rawDiffBullets.includes(line) &&
        !structuredBullets.includes(line),
    ),
  );

  const recommendation =
    repairPreviewTextLine(
      coerceDisplayText(data.recommendation) ??
        structuredBullets[0] ??
        mergedRecommendationsFiltered[0] ??
        (data.refreshType === 'deep' ? '建议查看完整冲突检测与修复选项。' : '') ??
        '',
      rawConstraintChanges,
    ) || undefined;

  let affected = normalizeAffectedDays(resolvePreviewAffectedDaysSource(data), []);
  if (
    !data.structuredImpact?.schedule?.affectedDays?.length &&
    structured?.schedule?.daysNeedingSplit?.length
  ) {
    affected = structured.schedule.daysNeedingSplit.map((dayNumber, index) => ({
      dayNumber,
      tone: (index === 0 ? 'major' : 'minor') as 'major' | 'minor',
    }));
  }

  const affectedItemIds =
    data.affectedItemIds?.length
      ? [...data.affectedItemIds]
      : structured?.schedule?.poisToRelocate
          ?.map((poi) => poi.itemId)
          .filter((id): id is string => Boolean(id));

  let adjustmentSummary = coerceDisplayText(data.adjustmentSummary);
  if (!adjustmentSummary && structured?.schedule) {
    const parts: string[] = [];
    if (structured.schedule.daysNeedingSplit?.length) {
      parts.push(`${structured.schedule.daysNeedingSplit.length} 天可能需拆分`);
    }
    if (structured.schedule.extraLodgingNights) {
      parts.push(`预计增加 ${structured.schedule.extraLodgingNights} 晚住宿`);
    }
    if (structured.schedule.poisToRelocate?.length) {
      parts.push(`${structured.schedule.poisToRelocate.length} 个景点可能需要移动或移除`);
    }
    if (parts.length) adjustmentSummary = parts.join(' · ');
  }

  const affectedDayDetailsFromApi = mapApiAffectedDayDetails(
    resolvePreviewAffectedDayDetailsSource(data),
  );
  const affectedDayDetailsFromStructured = buildAffectedDayDetailsFromStructuredImpact({
    affectedDays: affected,
    structuredImpact: structured,
  } as ConstraintImpactPreview);
  let affectedDayDetails =
    affectedDayDetailsFromApi.length > 0
      ? affectedDayDetailsFromApi
      : affectedDayDetailsFromStructured ?? [];
  let sanitizedAffectedDays = sanitizePreviewAffectedDays(
    syncPreviewAffectedDaysWithDetails({
      affectedDays: sanitizePreviewAffectedDays(affected),
      affectedDayDetails,
    }),
  );
  const sanitizedAffectedDayDetails = sanitizePreviewAffectedDays(affectedDayDetails);
  const scheduleDetailLevel = resolvePreviewScheduleDetailLevel(data);
  const hasActivitySchedule = hasPreviewActivityScheduleDetail({
    scheduleDetailLevel,
    affectedDayDetails: sanitizedAffectedDayDetails,
  });
  const placeholderDayList =
    isPlainPreviewDayList(sanitizedAffectedDays) && sanitizedAffectedDayDetails.length === 0;
  const majorCount = sanitizedAffectedDays.filter((d) => d.tone === 'major').length;
  const minorCount = sanitizedAffectedDays.filter((d) => d.tone === 'minor').length;

  const suggestedFollowUpAction = normalizeSuggestedFollowUp(data.suggestedFollowUp);
  const legacySuggestedFollowUp =
    typeof data.suggestedFollowUp === 'string'
      ? sanitizePreviewUserText(data.suggestedFollowUp)
      : undefined;

  const tripLevelConflicts = extractTripLevelConflictsFromPreviewMeta(data.meta);
  const scheduleFromStructured = structured?.schedule;

  const basePreview: ConstraintImpactPreview = {
    affectedDays: sanitizedAffectedDays,
    affectedDayDetails: sanitizedAffectedDayDetails,
    affectedItemIds: affectedItemIds?.length ? affectedItemIds : undefined,
    adjustmentSummary:
      adjustmentSummary ??
      (hasActivitySchedule
        ? buildPreviewAdjustmentSummaryFromSchedule({
            affectedDayDetails: sanitizedAffectedDayDetails,
            fallback: conflictSummary,
          })
        : placeholderDayList
          ? conflictSummary ??
            sanitizePreviewUserText(data.userSummary?.verdictReason) ??
            '暂无按天活动明细，保存后将运行完整检查'
          : sanitizedAffectedDays.length > 0
            ? `${majorCount} 处主要调整，${minorCount} 处次要调整${conflictSummary ? ` · ${conflictSummary}` : ''}`
            : conflictSummary ?? '暂无显著日程影响'),
    planLabel: data.planLabel ?? (data.refreshType === 'deep' ? '深度预览' : '即时预览'),
    planNeedsAdjust:
      data.planNeedsAdjust ??
      (data.userSummary?.verdict === 'STILL_NOT_EXECUTABLE' ||
      data.userSummary?.verdict === 'NEEDS_CONFIRM'
        ? true
        : executeabilityDelta?.scoreDelta != null && executeabilityDelta.scoreDelta < -5
          ? true
          : data.conflictsBefore?.mustHandle != null && data.conflictsBefore.mustHandle > 0
            ? true
            : typeof data.feasibilityAfter === 'object' &&
                (data.feasibilityAfter as { canStartExecute?: boolean }).canStartExecute === false
              ? true
              : false),
    feasibilityBefore,
    feasibilityAfter,
    executeabilityDelta: executeabilityDelta ?? data.executeabilityDelta,
    budgetRows,
    diffBullets,
    recommendation,
    recommendations: mergedRecommendationsFiltered.length
      ? mergedRecommendationsFiltered
      : undefined,
    conflictsBefore: data.conflictsBefore,
    conflictsAfter: data.conflictsAfter,
    tripLevelConflicts,
    suggestedFollowUp: suggestedFollowUpAction ? undefined : legacySuggestedFollowUp,
    suggestedFollowUpAction,
    userSummary: resolvePreviewUserSummary(data.userSummary),
    scheduleDetailLevel,
    scheduleDetailUnavailableReason: hasActivitySchedule
      ? undefined
      : (
          data.scheduleDetailUnavailableReason ??
          scheduleFromStructured?.scheduleDetailUnavailableReason
        )
        ? sanitizePreviewUserText(
            (data.scheduleDetailUnavailableReason ??
              scheduleFromStructured?.scheduleDetailUnavailableReason) as string,
          )
        : undefined,
    constraintAssessments: mapPreviewConstraintAssessments(data.constraintAssessments),
    refreshType: data.refreshType,
    structuredImpact: structured
      ? {
          ...structured,
          constraintChanges: normalizedConstraintChanges,
        }
      : undefined,
  };

  return supplementPreviewScheduleFromAssessments(
    applyGenericQuickPreviewPresentation(basePreview, data),
  );
}

function formatHourValueToTime(value: number): string {
  return decimalHoursToTimeString(value);
}

/** catalog 硬约束 PATCH value（与 BFF template registry 对齐） */
export function buildCatalogHardConstraintValue(
  templateId: string,
  draft: Pick<ConstraintEditorDraft, 'targetValue' | 'targetUnit' | 'currency'>,
): unknown {
  switch (templateId) {
    case 'earliest_departure':
    case 'latest_end':
    case 'child_nap_time':
      return { time: formatHourValueToTime(draft.targetValue) };
    case 'max_daily_activity':
    case 'required_rest':
      return { hours: draft.targetValue };
    case 'activity_budget':
    case 'budget_overrun_tolerance':
      return { amount: draft.targetValue, currency: draft.currency ?? 'CNY' };
    case 'elderly_walk_limit':
      return { maxKm: draft.targetValue };
    case 'fixed_appointments':
      return { count: draft.targetValue };
    case 'accessibility':
    case 'motion_sickness':
    case 'dietary_restrictions':
      return {
        enabled: draft.enabled !== false,
        ...(draft.reason.trim() ? { notes: draft.reason.trim() } : {}),
      };
    case 'no_unpaved_road':
    case 'no_bad_weather':
    case 'no_high_risk_activity':
    case 'no_unverified_route':
      return {
        enabled: draft.enabled !== false,
        ...(draft.reason.trim() ? { notes: draft.reason.trim() } : {}),
      };
    default:
      return draft.targetValue;
  }
}

export function buildCreateHardConstraintDto(input: {
  template: ConstraintTemplate;
  constraintsVersion?: number;
}): CreateTripConstraintDto {
  if (!isCatalogHardTemplate(input.template.id)) {
    throw new Error(`LEGACY_CONSTRAINT_USE_PATCH:${input.template.id}`);
  }
  const category =
    input.template.category === 'RISK'
      ? 'SAFETY'
      : input.template.category === 'PLACE'
        ? 'PLACE'
        : input.template.category ?? 'CUSTOM';
  return {
    name: input.template.label,
    category,
    type: 'HARD',
    source: { type: 'USER', templateId: input.template.id },
    constraintsVersion: input.constraintsVersion,
  };
}

export function findApiHardConstraintByTemplateId(
  items: TripConstraint[] | undefined,
  templateId: string,
): TripConstraint | undefined {
  if (!items?.length) return undefined;
  const apiId = uiConstraintIdToApi(templateId);
  return items.find(
    (item) =>
      item.type === 'HARD' &&
      (item.id === apiId ||
        item.id === templateId ||
        item.id === `c_tpl_${templateId}` ||
        apiConstraintIdToUi(item.id) === templateId ||
        item.source?.templateId === templateId),
  );
}

export function buildCreateSoftConstraintDto(input: {
  name: string;
  templateId?: string;
  priority?: SoftPreferencePriority;
  constraintsVersion?: number;
  custom?: boolean;
}): CreateTripConstraintDto {
  return {
    name: input.name,
    category: input.custom ? 'CUSTOM' : 'MEMBER',
    type: 'SOFT',
    scope: { type: 'TRIP' },
    operator: 'CUSTOM',
    value: input.templateId ? { templateId: input.templateId } : { custom: true },
    unit: 'score',
    priority: softPriorityToApiPriority(input.priority ?? '中'),
    allowRelaxation: true,
    source: { type: 'USER', templateId: input.templateId },
    visibility: 'TEAM',
    constraintsVersion: input.constraintsVersion,
  };
}

export function patchFromSoftPriority(
  priority: SoftPreferencePriority,
  constraintsVersion?: number,
): PatchTripConstraintDto {
  return {
    priority: softPriorityToApiPriority(priority),
    value: { intensity: SOFT_PRIORITY_TO_SLIDER[priority] },
    constraintsVersion,
  };
}

export function resolveSoftIdForApi(
  uiId: string,
  items?: TripConstraint[],
): string {
  if (items?.length) {
    const match = items.find(
      (c) =>
        c.type === 'SOFT' &&
        (c.id === uiId ||
          apiConstraintIdToUi(c.id) === uiId ||
          c.source?.templateId === uiId),
    );
    if (match) return match.id;
  }
  return uiConstraintIdToApi(uiId);
}

export { sliderToSoftPriority, softPriorityToApiPriority, priorityToSoftPriority };
