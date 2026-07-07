import { useMemo } from 'react';
import { Eye, EyeOff, PieChart as PieChartIcon, User } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { buildWishCategoryDistribution } from '@/lib/wish-category-distribution';
import { buildWishCollabStats } from '@/lib/wish-collab-stats';
import { WISH_VISIBILITY_HINTS } from '@/lib/wishlist-model';
import type { TeamWishItem, TripWishItem, WishSummary } from '@/types/trip-wishes';
import { CollabWidgetCard } from './CollabWidgetCard';
import { cn } from '@/lib/utils';

interface CollabWishOverviewSidebarProps {
  summary: WishSummary | null;
  mine: TripWishItem[];
  team: TeamWishItem[];
  loading?: boolean;
  className?: string;
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; count: number; percent: number } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2 py-1 text-xs">
      {item.label} · {item.count} 条 ({item.percent}%)
    </div>
  );
}

export function CollabWishOverviewSidebar({
  summary,
  mine,
  team,
  loading,
  className,
}: CollabWishOverviewSidebarProps) {
  const slices = useMemo(() => buildWishCategoryDistribution(mine, team), [mine, team]);
  const stats = useMemo(() => buildWishCollabStats(mine, team, summary), [mine, team, summary]);
  const chartData = slices.map((s) => ({
    ...s,
    name: s.label,
    value: s.count,
  }));

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-2', className)}>
      <CollabWidgetCard title="心愿概览" compact className="shrink-0">
        <dl className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="rounded-md border border-border/60 bg-muted/12 px-2 py-1.5">
            <dt className="text-muted-foreground">我的心愿</dt>
            <dd className="text-base font-semibold tabular-nums">{stats.mineCount}</dd>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/12 px-2 py-1.5">
            <dt className="text-muted-foreground">团队心愿</dt>
            <dd className="text-base font-semibold tabular-nums">{stats.teamCount}</dd>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/12 px-2 py-1.5">
            <dt className="text-muted-foreground">已纳入规划</dt>
            <dd className="text-base font-semibold tabular-nums">{stats.includedInPlanCount}</dd>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/12 px-2 py-1.5">
            <dt className="text-muted-foreground">待优化</dt>
            <dd className="text-base font-semibold tabular-nums">{stats.toOptimizeCount}</dd>
          </div>
        </dl>
      </CollabWidgetCard>

      <CollabWidgetCard title="心愿影响分布" compact className="min-h-0 flex-1">
        {loading ? (
          <p className="text-[10px] text-muted-foreground" aria-busy="true">
            加载分布…
          </p>
        ) : chartData.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">提交心愿后展示领域分布</p>
        ) : (
          <div className="flex h-full min-h-[96px] items-center gap-2">
            <div className="relative h-[96px] w-[96px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={28}
                    outerRadius={44}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[9px] text-muted-foreground">总计</span>
                <span className="text-xs font-semibold tabular-nums">{stats.totalCount}</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1 text-[10px]">
              {slices.slice(0, 4).map((slice) => (
                <li key={slice.category} className="flex items-center justify-between gap-1">
                  <span className="flex min-w-0 items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate text-foreground">{slice.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{slice.percent}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CollabWidgetCard>

      <CollabWidgetCard title="隐私说明" compact className="mt-auto shrink-0">
        <ul className="space-y-1 text-[10px] leading-snug text-muted-foreground">
          <li className="flex gap-1.5">
            <EyeOff className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{WISH_VISIBILITY_HINTS.private}</span>
          </li>
          <li className="flex gap-1.5">
            <Eye className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{WISH_VISIBILITY_HINTS.anonymous}</span>
          </li>
          <li className="flex gap-1.5">
            <User className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{WISH_VISIBILITY_HINTS.signed}</span>
          </li>
        </ul>
        {!loading && stats.teamCount === 0 ? (
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <PieChartIcon className="h-3 w-3" />
            邀请成员后可见团队心愿墙
          </p>
        ) : null}
      </CollabWidgetCard>
    </div>
  );
}
