/** BFF `tripnara.decision_checker@v1` — 规划工作台决策检查器读模型 */

import type {
  PlanningDaySplitMemberDto,
  PlanningDaySplitSegmentDto,
} from '@/types/planning-day-split';
import {
  normalizePlanningDaySplitMembersDto,
  normalizePlanningDaySplitSegmentDto,
  normalizePlanningDaySplits,
  type PlanningDaySplitDto,
} from '@/types/planning-day-split';

export const DECISION_CHECKER_SCHEMA = 'tripnara.decision_checker@v1' as const;

export type DecisionCheckerMetricTone = 'good' | 'bad' | 'neutral';
export type DecisionCheckerReliability = 'high' | 'medium' | 'low';
export type DecisionCheckerImpactLevel = 'high' | 'medium' | 'low';
export type DecisionCheckerLabeledTone = 'good' | 'bad' | 'neutral' | 'warning';

export type DecisionCheckerActionType =
  | 'open_repair_plan'
  | 'apply_relaxation'
  | 'select_option'
  | 'open_feasibility'
  | 'open_evidence'
  | 'run_route_and_run'
  | 'apply_split_plan'
  | 'view_split_alternatives'
  | 'discuss_with_nara';

export type DecisionCheckerRepairSource =
  | 'relaxation'
  | 'gate_compare'
  | 'feasibility_repair'
  | 'workbench';

export type DecisionCheckerEvidenceKind =
  | 'route_engine'
  | 'historical_model'
  | 'weather_road'
  | 'inventory'
  | 'opening_hours'
  | 'persona_trace'
  | 'other';

export type DecisionCheckerScenarioBadge = 'recommended' | 'alternative' | 'best';
export type DecisionCheckerScenarioVariant = 'blue' | 'orange' | 'purple';
export type DecisionCheckerCascadeStatus = 'affected' | 'at_risk' | 'ok';

export interface DecisionCheckerActionDto {
  type: DecisionCheckerActionType;
  label?: string;
  payload?: Record<string, unknown>;
}

export interface DecisionCheckerAiTextDto {
  text: string;
  source?: 'kernel' | 'llm' | 'rule';
  confidence?: number;
}

export interface DecisionCheckerMetricDto {
  key: string;
  label: string;
  displayValue: string;
  tone: DecisionCheckerMetricTone;
  raw?: {
    delta?: number;
    unit?: 'score' | 'minute' | 'currency' | 'ratio';
    currency?: string;
  };
}

export interface DecisionCheckerRepairPlanDto {
  id: string;
  source: DecisionCheckerRepairSource;
  badge?: string;
  title: string;
  description: string;
  recommended: boolean;
  metrics: DecisionCheckerMetricDto[];
  benefits: string[];
  cta?: DecisionCheckerActionDto;
}

export interface DecisionCheckerConflictPrimaryDto {
  conflictId: string;
  severity: 'hard' | 'soft';
  title: string;
  message: string;
  affectedDays?: number[];
}

export interface DecisionCheckerOverviewDto {
  conflict: {
    hardCount: number;
    softCount?: number;
    primary?: DecisionCheckerConflictPrimaryDto;
  };
  repairPlan?: DecisionCheckerRepairPlanDto;
  aiSuggestion?: DecisionCheckerAiTextDto;
}

export interface DecisionCheckerEvidenceItemDto {
  id: string;
  kind: DecisionCheckerEvidenceKind | string;
  title: string;
  subtitle: string;
  reliability: DecisionCheckerReliability;
  observedAt?: string;
  publisher?: string;
  confidence?: number;
  refs?: Array<{ type: string; id: string }>;
}

export interface DecisionCheckerEvidenceDto {
  items: DecisionCheckerEvidenceItemDto[];
  summary: {
    high: number;
    medium: number;
    low: number;
    lastUpdatedAt?: string;
  };
  judgmentExplanation?: string;
  calculationDetailUrl?: string;
}

export interface DecisionCheckerLabeledValueDto {
  label?: string;
  value: string;
  detail?: string;
  tone?: DecisionCheckerLabeledTone;
}

export interface DecisionCheckerImpactedConstraintDto {
  constraintId?: string;
  type: 'hard' | 'soft';
  name: string;
  status: string;
  impact: DecisionCheckerImpactLevel;
}

export interface DecisionCheckerCascadeNodeDto {
  id: string;
  title: string;
  description: string;
  status: DecisionCheckerCascadeStatus;
  order: number;
}

export interface DecisionCheckerImpactDto {
  summary: {
    affectedDays?: DecisionCheckerLabeledValueDto;
    affectedMembers?: DecisionCheckerLabeledValueDto;
    budgetImpact?: DecisionCheckerLabeledValueDto;
    experienceCompletion?: DecisionCheckerLabeledValueDto;
  };
  constraints: DecisionCheckerImpactedConstraintDto[];
  cascade: DecisionCheckerCascadeNodeDto[];
  aiInterpretation?: DecisionCheckerAiTextDto;
}

export interface DecisionCheckerScenarioDto {
  id: string;
  letter?: string;
  title: string;
  badge?: DecisionCheckerScenarioBadge;
  badgeLabel?: string;
  description: string;
  variant?: DecisionCheckerScenarioVariant;
  metrics: DecisionCheckerMetricDto[];
  action?: DecisionCheckerActionDto;
}

export interface DecisionCheckerIfUnchangedDto {
  riskLevel: 'high' | 'medium' | 'low';
  label: string;
  points: Array<{ title: string; description: string }>;
  recommendation?: DecisionCheckerAiTextDto;
}

export interface DecisionCheckerCounterfactualDto {
  headline?: string;
  subheadline?: string;
  scenarios: DecisionCheckerScenarioDto[];
  ifUnchanged?: DecisionCheckerIfUnchangedDto;
}

export type DecisionCheckerSplitPlanKind =
  | 'physical_strength'
  | 'preference'
  | 'weather_adaptive'
  | string;

export interface DecisionCheckerSplitBannerDto {
  title: string;
  message: string;
  affectedDays: number[];
  tone?: 'info' | 'warning';
}

export interface DecisionCheckerSplitRecommendationDto {
  title: string;
  summary: string;
  badge?: string;
  badgeTone?: 'success' | 'warning' | 'neutral';
}

export interface DecisionCheckerSplitGroupDto {
  id: string;
  letter?: string;
  label: string;
  memberCount: number;
  /** 与 daySplits.branches[].members 同源 */
  members?: PlanningDaySplitMemberDto[];
  /** 组主题（如「高强度体验」）；右栏 SplitGroupCard 用，非 POI 名 */
  activityTitle: string;
  /** 与 daySplits.branches[].segments 同源 — 中栏 POI 明细；右栏摘要不渲染 */
  segments?: PlanningDaySplitSegmentDto[];
  /** ✓ 要点 bullet，如「冰川徒步 4.5 小时」 */
  highlights: string[];
  intensity?: 'high' | 'medium' | 'low';
  riskLevel?: 'low' | 'medium' | 'high';
  costPerPerson?: string;
  variant?: DecisionCheckerScenarioVariant;
  avatarUrls?: string[];
}

export interface DecisionCheckerSplitLogisticsDto {
  meetupPoint: string;
  meetupTime: string;
  transport?: string;
  emergencyContact?: string;
  guideBooking?: string;
  notes?: string[];
}

export interface DecisionCheckerSplitPlanDto {
  id: string;
  kind: DecisionCheckerSplitPlanKind;
  banner: DecisionCheckerSplitBannerDto;
  recommendation: DecisionCheckerSplitRecommendationDto;
  metrics: DecisionCheckerMetricDto[];
  groups: DecisionCheckerSplitGroupDto[];
  logistics: DecisionCheckerSplitLogisticsDto;
  risks?: Array<{ title: string; description: string }>;
  aiSuggestion?: DecisionCheckerAiTextDto;
  actions: DecisionCheckerActionDto[];
  snapshotVersion?: string;
}

export interface DecisionCheckerResponse {
  schema: typeof DECISION_CHECKER_SCHEMA | string;
  tripId: string;
  generatedAt: string;
  isStale?: boolean;
  staleReason?: string;
  focusConflictId?: string;
  snapshotVersion: string;
  overview: DecisionCheckerOverviewDto;
  evidence: DecisionCheckerEvidenceDto;
  impact: DecisionCheckerImpactDto;
  counterfactual: DecisionCheckerCounterfactualDto;
  /** 分流方案（有则右栏第四 Tab 为「分流」） */
  splitPlan?: DecisionCheckerSplitPlanDto;
  /** poll ready 后覆盖 planning-conflicts.daySplits */
  daySplits?: PlanningDaySplitDto[];
  actions?: DecisionCheckerActionDto[];
}

export interface DecisionCheckerQuery {
  focusConflictId?: string;
  planId?: string;
  constraintsVersion?: number;
  includeStale?: boolean;
  taskId?: string;
}

export interface DecisionCheckerRefreshRequest {
  reason?: string;
  constraintsVersion?: number;
  focusConflictId?: string;
  runMonteCarlo?: boolean;
}

export interface DecisionCheckerRefreshResponse {
  taskId: string;
  pollUrl: string;
}

/** 空快照 — 仅用于 loading 占位，禁止作为 fallback 展示数据 */
export function emptyDecisionCheckerResponse(tripId: string): DecisionCheckerResponse {
  return {
    schema: DECISION_CHECKER_SCHEMA,
    tripId,
    generatedAt: new Date(0).toISOString(),
    snapshotVersion: '',
    overview: { conflict: { hardCount: 0 } },
    evidence: { items: [], summary: { high: 0, medium: 0, low: 0 } },
    impact: { summary: {}, constraints: [], cascade: [] },
    counterfactual: { scenarios: [] },
  };
}

function isApiWrapper(
  value: unknown,
): value is { success: boolean; data: DecisionCheckerResponse } {
  return (
    value != null &&
    typeof value === 'object' &&
    'success' in value &&
    'data' in value &&
    (value as { success: boolean }).success === true &&
    (value as { data: unknown }).data != null &&
    typeof (value as { data: unknown }).data === 'object'
  );
}

/** 归一化 BFF 决策检查器 DTO，避免局部缺字段导致渲染崩溃 */
export function normalizeDecisionCheckerResponse(
  raw: DecisionCheckerResponse | null | undefined,
  tripId: string,
): DecisionCheckerResponse {
  const source = isApiWrapper(raw) ? raw.data : raw;
  if (!source || typeof source !== 'object') {
    return emptyDecisionCheckerResponse(tripId);
  }

  const overview = source.overview ?? { conflict: { hardCount: 0 } };
  const conflict = overview.conflict ?? { hardCount: 0 };
  const repairPlan = overview.repairPlan
    ? {
        ...overview.repairPlan,
        metrics: overview.repairPlan.metrics ?? [],
        benefits: overview.repairPlan.benefits ?? [],
      }
    : undefined;

  const evidence = source.evidence ?? { items: [], summary: { high: 0, medium: 0, low: 0 } };
  const impact = source.impact ?? { summary: {}, constraints: [], cascade: [] };
  const counterfactual = source.counterfactual ?? { scenarios: [] };

  return {
    schema: source.schema ?? DECISION_CHECKER_SCHEMA,
    tripId: source.tripId ?? tripId,
    generatedAt: source.generatedAt ?? new Date(0).toISOString(),
    snapshotVersion: source.snapshotVersion ?? '',
    isStale: source.isStale,
    staleReason: source.staleReason,
    focusConflictId: source.focusConflictId,
    overview: { ...overview, conflict, repairPlan },
    evidence: {
      ...evidence,
      items: evidence.items ?? [],
      summary: evidence.summary ?? { high: 0, medium: 0, low: 0 },
    },
    impact: {
      ...impact,
      summary: impact.summary ?? {},
      constraints: impact.constraints ?? [],
      cascade: impact.cascade ?? [],
    },
    counterfactual: {
      ...counterfactual,
      scenarios: (counterfactual.scenarios ?? []).map((scenario) => ({
        ...scenario,
        metrics: scenario.metrics ?? [],
      })),
      ifUnchanged: counterfactual.ifUnchanged
        ? {
            ...counterfactual.ifUnchanged,
            points: counterfactual.ifUnchanged.points ?? [],
          }
        : undefined,
    },
    splitPlan: normalizeSplitPlan(source.splitPlan),
    daySplits:
      source.daySplits != null ? normalizePlanningDaySplits(source.daySplits) : undefined,
    actions: source.actions,
  };
}

function normalizeSplitPlan(
  raw: DecisionCheckerSplitPlanDto | null | undefined,
): DecisionCheckerSplitPlanDto | undefined {
  if (!raw || typeof raw !== 'object' || !raw.id) return undefined;
  return {
    ...raw,
    metrics: raw.metrics ?? [],
    groups: (raw.groups ?? []).map((group) => ({
      ...group,
      highlights: group.highlights ?? [],
      members: normalizePlanningDaySplitMembersDto(group.members),
      avatarUrls: Array.isArray(group.avatarUrls)
        ? group.avatarUrls.filter((url): url is string => typeof url === 'string' && url.length > 0)
        : undefined,
      segments: (group.segments ?? []).map((segment) => normalizePlanningDaySplitSegmentDto(segment)),
    })),
    risks: raw.risks ?? [],
    actions: raw.actions ?? [],
  };
}
