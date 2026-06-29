import { normalizePlanningDaySplits, type PlanningDaySplitDto } from '@/types/planning-day-split';
import type { DecisionCheckerSplitPlanDto } from '@/types/decision-checker';
import type { TripDetail } from '@/types/trip';

export interface EffectiveDaySplitsInput {
  /** GET planning-conflicts 首包 */
  planningConflictsDaySplits?: PlanningDaySplitDto[] | null;
  /** poll ready 后 decisionChecker.daySplits（优先覆盖首包） */
  decisionCheckerDaySplits?: PlanningDaySplitDto[] | null;
  splitPlanId?: string | null;
}

/** poll ready 后 decisionChecker.daySplits 覆盖首包；按 splitPlanId 过滤 */
export function resolveEffectiveDaySplits(input: EffectiveDaySplitsInput): PlanningDaySplitDto[] {
  const raw = input.decisionCheckerDaySplits ?? input.planningConflictsDaySplits;
  return filterDaySplitsForPlan(normalizePlanningDaySplits(raw), input.splitPlanId);
}

export interface WorkbenchSplitPlanContextInput {
  trip?: TripDetail | null;
  conflictItems?: Array<{ category?: string }>;
  rawSplitPlan?: DecisionCheckerSplitPlanDto | null;
  /** @deprecated 用 planningConflictsDaySplits + decisionCheckerDaySplits */
  rawDaySplits?: PlanningDaySplitDto[] | null;
  planningConflictsDaySplits?: PlanningDaySplitDto[] | null;
  decisionCheckerDaySplits?: PlanningDaySplitDto[] | null;
}

export interface WorkbenchSplitPlanContext {
  /** 有 ItineraryItem 且存在 team_fit 冲突 */
  eligible: boolean;
  splitPlan?: DecisionCheckerSplitPlanDto;
  daySplits: PlanningDaySplitDto[];
}

/** 行程是否已有可投影的日程项 */
export function countTripItineraryItems(trip: TripDetail | null | undefined): number {
  if (!trip?.TripDay?.length) return 0;
  return trip.TripDay.reduce((total, day) => total + (day.ItineraryItem?.length ?? 0), 0);
}

/** 是否触发 team_fit 分流冲突（BFF 前置条件） */
export function hasTeamFitSplitConflict(
  items: Array<{ category?: string }> | undefined,
): boolean {
  return (items ?? []).some((item) => item.category === 'team_fit');
}

export function isWorkbenchSplitPlanEligible(input: {
  trip?: TripDetail | null;
  conflictItems?: Array<{ category?: string }>;
}): boolean {
  return countTripItineraryItems(input.trip) > 0 && hasTeamFitSplitConflict(input.conflictItems);
}

/**
 * 分流 SSOT 门控：无 schedule 或无 team_fit 时丢弃 BFF splitPlan/daySplits，禁止客户端占位。
 */
export function resolveWorkbenchSplitPlanContext(
  input: WorkbenchSplitPlanContextInput,
): WorkbenchSplitPlanContext {
  const eligible = isWorkbenchSplitPlanEligible({
    trip: input.trip,
    conflictItems: input.conflictItems,
  });

  if (!eligible) {
    return { eligible: false, splitPlan: undefined, daySplits: [] };
  }

  const splitPlan = input.rawSplitPlan?.id ? input.rawSplitPlan : undefined;
  const daySplits = resolveEffectiveDaySplits({
    planningConflictsDaySplits:
      input.planningConflictsDaySplits ?? input.rawDaySplits,
    decisionCheckerDaySplits: input.decisionCheckerDaySplits,
    splitPlanId: splitPlan?.id,
  });

  return { eligible: true, splitPlan, daySplits };
}

/**
 * 仅保留与当前 splitPlan 关联的 daySplits（BFF 契约 §2）。
 * splitPlan 尚未就绪（fast 首包仅有 daySplits）时原样透传，避免中栏回退单线。
 */
export function filterDaySplitsForPlan(
  daySplits: PlanningDaySplitDto[],
  splitPlanId: string | null | undefined,
): PlanningDaySplitDto[] {
  if (!splitPlanId) return daySplits;
  return daySplits.filter((split) => split.splitPlanId === splitPlanId);
}

/** 是否处于「待应用」分流预览（中栏展示并行时间线） */
export function hasPendingSplitPreview(daySplits: PlanningDaySplitDto[]): boolean {
  return daySplits.length > 0;
}

/** 是否展示分流横幅：须有待应用 daySplits + BFF banner */
export function shouldShowSplitPlanBanner(
  splitPlan: DecisionCheckerSplitPlanDto | null | undefined,
  daySplits: PlanningDaySplitDto[] = [],
): boolean {
  if (!hasPendingSplitPreview(daySplits)) return false;
  return Boolean(splitPlan?.banner?.title || splitPlan?.banner?.message);
}

/** banner.affectedDays 转为 0-based dayIndex 集合 */
export function splitPlanAffectedDayIndexes(
  affectedDays: number[] | undefined,
): Set<number> {
  const set = new Set<number>();
  if (!affectedDays?.length) return set;
  for (const day of affectedDays) {
    if (typeof day === 'number' && day >= 1) {
      set.add(day - 1);
    }
  }
  return set;
}

/** snapshotVersion 不一致时提示（契约 §2） */
export function isSplitPlanSnapshotStale(
  splitPlan: DecisionCheckerSplitPlanDto | null | undefined,
  checkerSnapshotVersion: string | null | undefined,
): boolean {
  if (!splitPlan?.snapshotVersion || !checkerSnapshotVersion) return false;
  return splitPlan.snapshotVersion !== checkerSnapshotVersion;
}
