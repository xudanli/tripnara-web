/**
 * Contract + Assessment → ConstraintCardView
 * @see P1-A Constraint Console Assessment 化
 */

import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import type { ConstraintConsoleSectionViewModel } from '@/lib/trip-constraints-contract.util';
import {
  apiConstraintIdToUi,
  uiConstraintIdToApi,
} from '@/lib/trip-constraints.adapter';
import { resolveTripDashboardHref } from '@/lib/travel-status-navigation.util';
import type {
  ConstraintAggregateStatus,
  ConstraintAssessmentLaneBadge,
  ConstraintAssessmentLaneKey,
  ConstraintAssessmentLaneStatus,
  ConstraintAssessmentUiTone,
  ConstraintCardAggregateUi,
  ConstraintCardView,
  ConstraintConsoleWithAssessmentsViewModel,
  UnifiedConstraintAssessmentBundle,
  UnifiedConstraintAssessmentLaneView,
  UnifiedConstraintAssessmentView,
} from '@/types/frontend-constraint-assessment-api.types';
import type { TripConstraint } from '@/types/trip-constraints';
import {
  formatNoNightDriveLaneEvidence,
  type Sdr202StructuredEvidence,
} from '@/lib/sdr-202-rule-metadata.util';

/** Phase 0 · capability.constraintKey → UI / legacy id 变体 */
export const CONSTRAINT_KEY_UI_IDS: Record<string, readonly string[]> = {
  MAX_DAILY_DRIVE: ['daily_drive', 'max_daily_drive', 'c_max_daily_drive'],
  NO_NIGHT_DRIVE: ['no_night_drive', 'c_no_night_drive'],
  NO_UNPAVED_ROAD: ['no_unpaved_road', 'c_tpl_no_unpaved_road'],
  FIXED_APPOINTMENTS: ['fixed_appointments', 'c_tpl_fixed_appointments'],
  OFFICIAL_IS_FROAD_2WD: ['c_official_is_froad_2wd'],
};

const LANE_LABELS: Record<ConstraintAssessmentLaneKey, string> = {
  planning: '规划',
  executability: '执行',
  runtime: '当前',
};

const LANE_STATUS_LABELS: Record<ConstraintAssessmentLaneStatus, string> = {
  PASS: '已满足',
  BLOCK: '不可执行',
  WARNING: '需关注',
  REQUIRES_VERIFICATION: '待确认',
  UNKNOWN: '待验证',
};

const AGGREGATE_STATUS_UI: Record<ConstraintAggregateStatus, ConstraintCardAggregateUi> = {
  PASS: { label: '满足', tone: 'success', isBlocking: false },
  WARN: { label: '需要关注', tone: 'warning', isBlocking: false },
  PLANNING_BLOCK: { label: '规划不可行', tone: 'danger', isBlocking: true },
  EXECUTION_BLOCK: { label: '不可执行', tone: 'danger', isBlocking: true },
  RUNTIME_BLOCK: { label: '当前受阻', tone: 'danger', isBlocking: true },
  UNKNOWN: { label: '待验证', tone: 'neutral', isBlocking: false },
};

const LANE_STATUS_TONE: Record<ConstraintAssessmentLaneStatus, ConstraintAssessmentUiTone> = {
  PASS: 'success',
  BLOCK: 'danger',
  WARNING: 'warning',
  REQUIRES_VERIFICATION: 'warning',
  UNKNOWN: 'neutral',
};

function expandIdVariants(id: string): string[] {
  const trimmed = id.trim();
  if (!trimmed) return [];
  const ui = apiConstraintIdToUi(trimmed);
  const api = uiConstraintIdToApi(trimmed);
  return [...new Set([trimmed, ui, api])];
}

function registerLookupKey(
  lookup: Map<string, UnifiedConstraintAssessmentView>,
  key: string | undefined | null,
  assessment: UnifiedConstraintAssessmentView,
): void {
  if (!key?.trim()) return;
  for (const variant of expandIdVariants(key)) {
    lookup.set(variant, assessment);
  }
}

/** Join SSOT：legacyConstraintId → capability.constraintKey → templateId */
export function buildAssessmentLookup(
  bundle: UnifiedConstraintAssessmentBundle | null | undefined,
): Map<string, UnifiedConstraintAssessmentView> {
  const lookup = new Map<string, UnifiedConstraintAssessmentView>();
  if (!bundle?.assessments?.length) return lookup;

  for (const assessment of bundle.assessments) {
    registerLookupKey(lookup, assessment.legacyConstraintId, assessment);
    registerLookupKey(lookup, assessment.constraintKey, assessment);
    registerLookupKey(lookup, assessment.templateId, assessment);

    const uiIds = CONSTRAINT_KEY_UI_IDS[assessment.constraintKey];
    if (uiIds) {
      for (const uiId of uiIds) registerLookupKey(lookup, uiId, assessment);
    }
  }
  return lookup;
}

export function resolveAssessmentForConstraint(
  constraint: Pick<TripConstraint, 'id' | 'source' | 'capability'>,
  lookup: Map<string, UnifiedConstraintAssessmentView>,
): UnifiedConstraintAssessmentView | null {
  for (const variant of expandIdVariants(constraint.id)) {
    const hit = lookup.get(variant);
    if (hit) return hit;
  }

  const constraintKey = constraint.capability?.constraintKey?.trim();
  if (constraintKey) {
    const byKey = lookup.get(constraintKey);
    if (byKey) return byKey;
  }

  const templateId = constraint.source?.templateId?.trim();
  if (templateId) {
    const byTemplate = lookup.get(templateId);
    if (byTemplate) return byTemplate;
    const byTplApi = lookup.get(uiConstraintIdToApi(templateId));
    if (byTplApi) return byTplApi;
  }

  return null;
}

export function resolveAssessmentForEntry(
  entry: ConstraintListEntry,
  lookup: Map<string, UnifiedConstraintAssessmentView>,
  apiConstraint?: TripConstraint | null,
): UnifiedConstraintAssessmentView | null {
  if (apiConstraint) {
    const fromApi = resolveAssessmentForConstraint(apiConstraint, lookup);
    if (fromApi) return fromApi;
  }
  for (const variant of expandIdVariants(entry.id)) {
    const hit = lookup.get(variant);
    if (hit) return hit;
  }
  return null;
}

export function aggregateStatusToUi(
  status: ConstraintAggregateStatus | undefined | null,
): ConstraintCardAggregateUi {
  if (!status || !(status in AGGREGATE_STATUS_UI)) {
    return AGGREGATE_STATUS_UI.UNKNOWN;
  }
  return AGGREGATE_STATUS_UI[status];
}

function formatLaneEvidence(
  lane: UnifiedConstraintAssessmentLaneView,
  constraintKey?: string,
): string | undefined {
  const evidence = lane.evidence;
  if (!evidence) return lane.message?.trim() || undefined;

  if (lane.ruleId === 'SDR-202' || constraintKey === 'NO_NIGHT_DRIVE') {
    const formatted = formatNoNightDriveLaneEvidence(
      evidence as Sdr202StructuredEvidence,
      lane.message,
    );
    if (formatted) return formatted;
  }

  const parts: string[] = [];
  const day = evidence.day ?? evidence.dayIndex;
  if (day != null) parts.push(`Day${day}`);
  const actual = evidence.actual ?? evidence.value;
  if (actual != null && String(actual).trim()) parts.push(String(actual).trim());

  if (parts.length) return parts.join(' ');
  return lane.message?.trim() || undefined;
}

function formatLaneDetail(
  lane: UnifiedConstraintAssessmentLaneView,
  constraintKey?: string,
): string | undefined {
  const parts: string[] = [];
  if (lane.status === 'BLOCK' && lane.ruleId) parts.push(lane.ruleId);
  const evidence = formatLaneEvidence(lane, constraintKey);
  if (evidence) parts.push(evidence);
  return parts.length ? parts.join(' · ') : undefined;
}

export function buildLaneBadges(
  assessment: UnifiedConstraintAssessmentView | null | undefined,
): ConstraintAssessmentLaneBadge[] {
  if (!assessment?.lanes) return [];

  const laneKeys: ConstraintAssessmentLaneKey[] = ['planning', 'executability'];
  const badges: ConstraintAssessmentLaneBadge[] = [];

  for (const laneKey of laneKeys) {
    const lane = assessment.lanes[laneKey];
    if (!lane) continue;
    badges.push({
      laneKey,
      laneLabel: LANE_LABELS[laneKey],
      status: lane.status,
      statusLabel: LANE_STATUS_LABELS[lane.status] ?? lane.status,
      tone: LANE_STATUS_TONE[lane.status] ?? 'neutral',
      ruleId: lane.ruleId,
      detail: formatLaneDetail(lane, assessment.constraintKey),
    });
  }

  return badges;
}

export function resolveContractRequirement(
  entry: ConstraintListEntry,
  apiConstraint?: TripConstraint | null,
): string | undefined {
  const fromContractMeta = apiConstraint?.contractMeta?.enabledSummary?.trim();
  if (fromContractMeta) return fromContractMeta;

  const fromMeta = entry.metadata?.ruleLabel?.trim();
  if (fromMeta) return fromMeta;

  const fromValue = entry.value?.trim();
  if (fromValue) return fromValue;

  const fromDisplay = apiConstraint?.displayValue?.trim();
  if (fromDisplay) return fromDisplay;

  return entry.description?.trim() || undefined;
}

function resolveRepairProblemId(
  assessment: UnifiedConstraintAssessmentView | null | undefined,
): string | undefined {
  const fromIds = assessment?.problemIds?.find((id) => id?.trim());
  if (fromIds?.trim()) return fromIds.trim();

  const deepLink = assessment?.repairDeepLink?.trim();
  if (!deepLink) return undefined;

  try {
    const url = deepLink.startsWith('http')
      ? new URL(deepLink)
      : new URL(deepLink, 'https://tripnara.local');
    const problemId = url.searchParams.get('problemId');
    if (problemId?.trim()) return problemId.trim();
  } catch {
    /* ignore malformed deep link */
  }
  return undefined;
}

export function resolveAssessmentRepairDeepLink(
  assessment: UnifiedConstraintAssessmentView | null | undefined,
  tripId: string,
): string | undefined {
  const resolved = resolveTripDashboardHref(assessment?.repairDeepLink);
  if (resolved) return resolved;

  const problemId = resolveRepairProblemId(assessment);
  if (!problemId) return undefined;

  const params = new URLSearchParams({
    tripId,
    tab: 'schedule',
    view: 'constraints',
    problemId,
  });
  return `/dashboard/plan-studio?${params.toString()}`;
}

export function buildConstraintCardView(input: {
  entry: ConstraintListEntry;
  apiConstraint?: TripConstraint | null;
  assessment: UnifiedConstraintAssessmentView | null;
  tripId: string;
}): ConstraintCardView {
  const { entry, apiConstraint, assessment, tripId } = input;
  const aggregateUi = assessment
    ? aggregateStatusToUi(assessment.aggregateStatus)
    : AGGREGATE_STATUS_UI.UNKNOWN;

  const repairProblemId = resolveRepairProblemId(assessment);
  const repairDeepLink = resolveAssessmentRepairDeepLink(assessment, tripId);

  return {
    constraintId: entry.id,
    name: entry.label,
    contractRequirement:
      assessment?.contractRequirement?.trim() ||
      resolveContractRequirement(entry, apiConstraint),
    assessment,
    aggregateUi,
    laneBadges: buildLaneBadges(assessment),
    repairDeepLink,
    repairProblemId,
    contractCardTone: entry.cardTone,
    entry,
  };
}

export function applyAssessmentToEntry(
  entry: ConstraintListEntry,
  card: ConstraintCardView,
): ConstraintListEntry {
  const hasAssessment = card.assessment != null;
  return {
    ...entry,
    contractRequirement: card.contractRequirement ?? entry.contractRequirement,
    assessmentAggregateStatus: card.assessment?.aggregateStatus,
    assessmentAggregateLabel: hasAssessment ? card.aggregateUi.label : undefined,
    assessmentTone: hasAssessment ? card.aggregateUi.tone : undefined,
    assessmentLaneBadges: card.laneBadges.length ? card.laneBadges : undefined,
    assessmentRepairProblemId: card.repairProblemId,
    assessmentRepairDeepLink: card.repairDeepLink,
    statusLabel: hasAssessment ? card.aggregateUi.label : entry.statusLabel,
    statusTone: hasAssessment
      ? card.aggregateUi.tone === 'success'
        ? 'success'
        : card.aggregateUi.tone === 'warning'
          ? 'warning'
          : card.aggregateUi.tone === 'danger'
            ? 'warning'
            : 'neutral'
      : entry.statusTone,
    checkIssueId: card.repairProblemId ?? entry.checkIssueId,
    hasConflict:
      hasAssessment && card.aggregateUi.isBlocking
        ? true
        : entry.hasConflict,
  };
}

export function applyAssessmentsToSections(
  sections: ConstraintConsoleSectionViewModel[],
  bundle: UnifiedConstraintAssessmentBundle | null | undefined,
  itemsById: Record<string, TripConstraint> | undefined,
  tripId: string,
): ConstraintConsoleSectionViewModel[] {
  const lookup = buildAssessmentLookup(bundle);
  if (!lookup.size) return sections;

  return sections.map((section) => ({
    ...section,
    items: section.items.map((entry) => {
      const apiId = uiConstraintIdToApi(entry.id);
      const apiConstraint = itemsById?.[entry.id] ?? itemsById?.[apiId] ?? null;
      const assessment = resolveAssessmentForEntry(entry, lookup, apiConstraint);
      if (!assessment) return entry;
      const card = buildConstraintCardView({ entry, apiConstraint, assessment, tripId });
      return applyAssessmentToEntry(entry, card);
    }),
  }));
}

export function buildConstraintConsoleWithAssessments(input: {
  tripId: string;
  constraintsVersion: number;
  sections: ConstraintConsoleSectionViewModel[];
  bundle: UnifiedConstraintAssessmentBundle | null | undefined;
  itemsById?: Record<string, TripConstraint>;
}): ConstraintConsoleWithAssessmentsViewModel {
  const lookup = buildAssessmentLookup(input.bundle);
  const cardsByConstraintId: Record<string, ConstraintCardView> = {};

  const enrichedSections = input.sections.map((section) => {
    const cards: ConstraintCardView[] = section.items.map((entry) => {
      const apiId = uiConstraintIdToApi(entry.id);
      const apiConstraint =
        input.itemsById?.[entry.id] ?? input.itemsById?.[apiId] ?? null;
      const assessment = resolveAssessmentForEntry(entry, lookup, apiConstraint);
      const card = buildConstraintCardView({
        entry,
        apiConstraint,
        assessment,
        tripId: input.tripId,
      });
      cardsByConstraintId[entry.id] = card;
      cardsByConstraintId[apiId] = card;
      return card;
    });

    return {
      sectionKey: section.meta.key,
      sectionLabel: section.meta.label,
      cards,
    };
  });

  return {
    tripId: input.tripId,
    constraintsVersion: input.constraintsVersion,
    assessedAt: input.bundle?.assessedAt,
    sections: enrichedSections,
    cardsByConstraintId,
  };
}

export function assessmentToneBorderClass(
  tone: ConstraintAssessmentUiTone | undefined,
): string {
  switch (tone) {
    case 'success':
      return 'border-l-2 border-l-[color-mix(in_srgb,var(--color-success)_70%,transparent)]';
    case 'warning':
      return 'border-l-2 border-l-[color-mix(in_srgb,var(--color-warning)_70%,transparent)]';
    case 'danger':
      return 'border-l-2 border-l-[color-mix(in_srgb,var(--color-danger)_70%,transparent)]';
    default:
      return 'border-l-2 border-l-border/60';
  }
}

export function assessmentToneBadgeClass(tone: ConstraintAssessmentUiTone): string {
  switch (tone) {
    case 'success':
      return 'border-[color-mix(in_srgb,var(--color-success)_35%,transparent)] text-[var(--color-success)]';
    case 'warning':
      return 'border-[color-mix(in_srgb,var(--color-warning)_35%,transparent)] text-[var(--color-warning)]';
    case 'danger':
      return 'border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)] text-error';
    default:
      return 'text-muted-foreground';
  }
}
