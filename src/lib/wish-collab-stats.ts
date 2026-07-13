import type { TeamWishItem, TripWishItem, WishSummary } from '@/types/trip-wishes';

export interface WishCollabStats {
  mineCount: number;
  teamCount: number;
  includedInPlanCount: number;
  toOptimizeCount: number;
  totalCount: number;
  highImpactCount: number;
  conflictCount: number;
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

  const all = [...mine, ...team];
  const highImpactCount = all.filter((w) => w.importance >= 4).length;

  const highByCategory = new Map<string, number>();
  for (const wish of all.filter((w) => w.importance >= 4)) {
    highByCategory.set(wish.category, (highByCategory.get(wish.category) ?? 0) + 1);
  }
  const conflictCount = [...highByCategory.values()].filter((n) => n >= 2).length;

  return {
    mineCount,
    teamCount,
    includedInPlanCount,
    toOptimizeCount,
    totalCount: mineCount + teamCount,
    highImpactCount,
    conflictCount,
  };
}

/** 协作中心顶栏 AI 摘要文案 */
export function buildWishCollabAiSummary(
  mine: TripWishItem[],
  team: TeamWishItem[],
): string {
  const all = [...mine, ...team];
  if (all.length === 0) {
    return '记录个人与团队心愿后，AI 会分析偏好聚类与潜在冲突，辅助协商决策。';
  }

  const categoryCounts = new Map<string, number>();
  for (const wish of all) {
    categoryCounts.set(wish.category, (categoryCounts.get(wish.category) ?? 0) + 1);
  }
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => {
      const labels: Record<string, string> = {
        activities: '活动体验',
        dining: '美食探索',
        accommodation: '住宿体验',
        destination_route: '路线规划',
        main_transport: '交通接驳',
        local_transport: '当地交通',
        shopping: '购物',
        insurance_visa: '保险签证',
      };
      return labels[cat] ?? cat;
    });

  const highImportance = all.filter((w) => w.importance >= 4);
  const highCategories = new Set(highImportance.map((w) => w.category));
  const hasTension = highCategories.size >= 2 && highImportance.length >= 2;

  const focus =
    topCategories.length > 0
      ? `团队心愿主要集中在${topCategories.join('、')}等方面。`
      : '团队心愿领域较分散。';

  const tension = hasTension
    ? '主要冲突集中在起床时间与行程节奏等维度，建议在协作决策 Tab 对齐。'
    : '当前未发现明显高优先级冲突，可继续补充想法。';

  return `${focus}${tension}`;
}
