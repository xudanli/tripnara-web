import { WISH_CATEGORY_LABELS } from '@/lib/wishlist-model';
import type { TeamWishItem, TripWishItem, WishCategory } from '@/types/trip-wishes';

export interface WishCategorySlice {
  category: WishCategory;
  label: string;
  count: number;
  percent: number;
  color: string;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

/** 按领域统计心愿分布（我的心愿 + 团队心愿） */
export function buildWishCategoryDistribution(
  mine: TripWishItem[],
  team: TeamWishItem[],
): WishCategorySlice[] {
  const counts = new Map<WishCategory, number>();

  for (const wish of [...mine, ...team]) {
    counts.set(wish.category, (counts.get(wish.category) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .map(([category, count], index) => ({
      category,
      label: WISH_CATEGORY_LABELS[category] ?? category,
      count,
      percent: Math.round((count / total) * 100),
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count);
}
