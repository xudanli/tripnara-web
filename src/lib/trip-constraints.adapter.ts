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
import { getSoftConstraintTemplate, getHardConstraintTemplate } from '@/components/plan-studio/workbench/constraint-templates';
import { formatConstraintTravelMode } from '@/lib/planning-constraints.util';
import type {
  CreateTripConstraintDto,
  PatchTripConstraintDto,
  TripConstraint,
  TripConstraintCardTone,
  TripConstraintPreviewChange,
  TripConstraintPreviewImpactData,
  TripConstraintsListResponse,
} from '@/types/trip-constraints';
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
};

const API_TO_UI_CONSTRAINT_ID: Record<string, string> = Object.fromEntries(
  Object.entries(UI_TO_API_CONSTRAINT_ID).map(([ui, api]) => [api, ui]),
);

export function uiConstraintIdToApi(uiId: string): string {
  if (uiId.startsWith('c_')) return uiId;
  return UI_TO_API_CONSTRAINT_ID[uiId] ?? uiId;
}

export function apiConstraintIdToUi(apiId: string): string {
  return API_TO_UI_CONSTRAINT_ID[apiId] ?? apiId;
}

/** 解析单段最长行驶距离约束（c_max_segment_distance） */
export function parseMaxSegmentDistance(
  constraint?: TripConstraint | null,
): { maxKm: number; warnKm?: number } {
  if (!constraint) return { maxKm: 250 };
  const raw = constraint.value;
  if (typeof raw === 'number' && Number.isFinite(raw)) return { maxKm: raw };
  if (raw && typeof raw === 'object') {
    const v = raw as Record<string, unknown>;
    const max =
      typeof v.maxSegmentDistanceKm === 'number'
        ? v.maxSegmentDistanceKm
        : typeof v.value === 'number'
          ? v.value
          : undefined;
    const warn =
      typeof v.warnSegmentDistanceKm === 'number' ? v.warnSegmentDistanceKm : undefined;
    if (max != null) return { maxKm: max, warnKm: warn };
  }
  if (typeof raw === 'string') {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) return { maxKm: n };
  }
  return { maxKm: 250 };
}

export function isMaxSegmentDistanceConstraintId(id: string): boolean {
  return id === 'max_segment_distance' || id === TRIP_CONSTRAINT_LEGACY_IDS.MAX_SEGMENT_DISTANCE;
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

function formatConstraintDisplayValue(constraint: TripConstraint): string | undefined {
  if (constraint.displayValue?.trim()) return constraint.displayValue.trim();

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
    }
  }

  if (constraint.value == null) return undefined;

  if (typeof constraint.value === 'object' && constraint.value != null) {
    const v = constraint.value as Record<string, unknown>;
    if (typeof v.dayCount === 'number') return `${v.dayCount} 天`;
    if (typeof v.memberCount === 'number') return `${v.memberCount} 人`;
    if (typeof v.count === 'number') return `${v.count} 人`;
    if (typeof v.total === 'number') return `${v.total}`;
    if (typeof v.templateId === 'string') return v.templateId;
    if (typeof v.verifiedAt === 'string') return '已验证';
  }

  if (typeof constraint.value === 'string' || typeof constraint.value === 'number') {
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

  return {
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
    description: constraint.description,
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
            : '正常'
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
  const apiHard = api.items.filter((c) => c.type === 'HARD').map(tripConstraintToListEntry);
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
    hardItems: mergeById(apiHard, client.hardItems),
    softItems: apiSoft.length > 0 ? apiSoft : client.softItems,
    externalItems: apiExternal,
  };
}

export function draftToPreviewChange(draft: ConstraintEditorDraft): TripConstraintPreviewChange {
  const constraintId = uiConstraintIdToApi(draft.id);
  const patch: PatchTripConstraintDto = {
    priority: draft.priority,
    locked: draft.locked,
  };

  if (draft.type === 'SOFT') {
    patch.value = { intensity: draft.targetValue, priority: draft.priority };
    patch.unit = 'score';
  } else if (draft.id === 'budget') {
    patch.value = draft.targetValue;
    patch.unit = draft.currency ?? 'CNY';
  } else if (draft.id === 'time_range') {
    patch.value = {
      startDate: draft.startDate,
      endDate: draft.endDate,
      dayCount: draft.targetValue,
    };
    patch.unit = 'day';
  } else if (draft.id === 'daily_drive') {
    patch.value = draft.targetValue;
    patch.unit = 'hour';
  } else if (isMaxSegmentDistanceConstraintId(draft.id)) {
    patch.value = draft.targetValue;
    patch.unit = 'km';
    if (draft.toleranceMode === 'allow_over' && draft.toleranceMinutes > 0) {
      patch.tolerance = draft.toleranceMinutes;
    }
  } else if (draft.id === 'accommodation') {
    patch.value = draft.targetValue;
    patch.unit = 'star';
  } else {
    patch.value = draft.targetValue;
    patch.unit = draft.targetUnit;
  }

  if (draft.name.trim()) patch.name = draft.name.trim();
  if (draft.reason.trim()) {
    patch.value =
      typeof patch.value === 'object' && patch.value != null
        ? { ...(patch.value as Record<string, unknown>), reason: draft.reason.trim() }
        : { value: patch.value, reason: draft.reason.trim() };
  }

  return { constraintId, patch };
}

export function mapPreviewImpactToUi(
  data: TripConstraintPreviewImpactData,
  _empty: ConstraintImpactPreview = EMPTY_CONSTRAINT_IMPACT_PREVIEW,
): ConstraintImpactPreview {
  const budgetRows =
    data.budgetDelta?.rows?.map((row) => ({
      label: row.label,
      delta: row.delta,
      currency: row.currency ?? data.budgetDelta?.currency ?? 'CNY',
    })) ??
    (data.budgetDelta?.total != null
      ? [{ label: '总预算', delta: data.budgetDelta.total, currency: data.budgetDelta.currency ?? 'CNY' }]
      : []);

  const feasibilityBeforeRaw = readFeasibilityScore(data.feasibilityBefore, data.assessBefore);
  const feasibilityAfterRaw =
    readFeasibilityScore(data.feasibilityAfter, data.assessAfter) ??
    (feasibilityBeforeRaw != null && data.executeabilityDelta?.scoreDelta != null
      ? Math.max(0, Math.min(100, feasibilityBeforeRaw + data.executeabilityDelta.scoreDelta))
      : undefined);
  const feasibilityBefore =
    feasibilityBeforeRaw != null ? normalizeFeasibilityScore(feasibilityBeforeRaw, 0) : 0;
  const feasibilityAfter =
    feasibilityAfterRaw != null
      ? normalizeFeasibilityScore(feasibilityAfterRaw, feasibilityBefore)
      : feasibilityBefore;

  const conflictSummary =
    data.conflictsBefore?.mustHandle != null
      ? `${data.conflictsBefore.mustHandle} 项需处理`
      : undefined;

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

  const diffBullets =
    data.diffBullets?.length
      ? [...data.diffBullets, ...conflictDeltaBullets]
      : conflictDeltaBullets.length
        ? conflictDeltaBullets
        : data.recommendations?.length
          ? data.recommendations
          : [];

  const recommendation =
    data.recommendation ??
    data.recommendations?.[0] ??
    (data.refreshType === 'deep' ? '建议查看完整冲突检测与修复选项。' : '');

  const affected = normalizeAffectedDays(data.affectedDays, []);
  const majorCount = affected.filter((d) => d.tone === 'major').length;
  const minorCount = affected.filter((d) => d.tone === 'minor').length;

  return {
    affectedDays: affected,
    adjustmentSummary:
      data.adjustmentSummary ??
      (affected.length > 0
        ? `${majorCount} 处主要调整，${minorCount} 处次要调整${conflictSummary ? ` · ${conflictSummary}` : ''}`
        : conflictSummary ?? '暂无显著日程影响'),
    planLabel: data.planLabel ?? (data.refreshType === 'deep' ? '深度预览' : '即时预览'),
    planNeedsAdjust:
      data.planNeedsAdjust ??
      (data.conflictsBefore?.mustHandle != null && data.conflictsBefore.mustHandle > 0
        ? true
        : typeof data.feasibilityAfter === 'object' &&
            (data.feasibilityAfter as { canStartExecute?: boolean }).canStartExecute === false
          ? true
          : false),
    feasibilityBefore,
    feasibilityAfter,
    budgetRows,
    diffBullets,
    recommendation,
  };
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

export function resolveSoftIdForApi(uiId: string): string {
  return uiConstraintIdToApi(uiId);
}

export { sliderToSoftPriority, softPriorityToApiPriority, priorityToSoftPriority };
