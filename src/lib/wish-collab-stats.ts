import type { TeamWishItem, TripWishItem, WishSummary } from '@/types/trip-wishes';

export interface WishCollabStats {
  mineCount: number;
  teamCount: number;
  includedInPlanCount: number;
  toOptimizeCount: number;
  totalCount: number;
}

/** 协作中心心愿概览统计（已纳入规划 / 待优化） */
export function buildWishCollabStats(
  mine: TripWishItem[],
  team: TeamWishItem[],
  summary: WishSummary | null,
): WishCollabStats {
  const mineCount = summary?.mineCount ?? mine.length;
  const teamCount = summary?.teamCount ?? team.length;

  const includedIds = new Set(
    summary?.impactByDay?.flatMap((day) => day.wishIds) ?? [],
  );
  const includedFromImpact = includedIds.size;
  const includedFromEligible = mine.filter((w) => w.agentEligible).length;
  const includedInPlanCount = Math.max(includedFromImpact, includedFromEligible);

  const toOptimizeCount =
    summary?.agentEligibleCount ?? mine.filter((w) => w.agentEligible).length;

  return {
    mineCount,
    teamCount,
    includedInPlanCount,
    toOptimizeCount,
    totalCount: mineCount + teamCount,
  };
}
