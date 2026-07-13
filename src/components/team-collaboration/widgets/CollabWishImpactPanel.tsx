import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { buildWishCategoryDistribution } from '@/lib/wish-category-distribution';
import { buildWishCollabStats } from '@/lib/wish-collab-stats';
import type { TeamWishItem, TripWishItem, WishSummary } from '@/types/trip-wishes';
import { Progress } from '@/components/ui/progress';
import { CollabWidgetCard } from './CollabWidgetCard';
import { cn } from '@/lib/utils';

interface CollabWishImpactPanelProps {
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

export function CollabWishImpactPanel({
  summary,
  mine,
  team,
  loading,
  className,
}: CollabWishImpactPanelProps) {
  const slices = useMemo(() => buildWishCategoryDistribution(mine, team), [mine, team]);
  const stats = useMemo(() => buildWishCollabStats(mine, team, summary), [mine, team, summary]);
  const chartData = slices.map((s) => ({ ...s, name: s.label, value: s.count }));
  const topSlice = slices[0];

  return (
    <CollabWidgetCard title="影响分布" compact className={className}>
      {loading ? (
        <p className="text-[10px] text-muted-foreground" aria-busy="true">
          加载分布…
        </p>
      ) : chartData.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">提交心愿后展示领域分布</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="relative h-[88px] w-[88px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={26}
                    outerRadius={40}
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

            <ul className="min-w-0 flex-1 space-y-2">
              {slices.slice(0, 5).map((slice) => (
                <li key={slice.category}>
                  <div className="mb-0.5 flex items-center justify-between gap-1 text-[10px]">
                    <span className="flex min-w-0 items-center gap-1">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="truncate text-foreground">{slice.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{slice.percent}%</span>
                  </div>
                  <Progress value={slice.percent} className="h-1" />
                </li>
              ))}
            </ul>
          </div>

          {topSlice ? (
            <div className={cn('rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[10px] leading-relaxed')}>
              <p className="font-medium text-foreground">
                影响最大的领域：{topSlice.label}（{topSlice.percent}%）
              </p>
              <p className="mt-1 text-muted-foreground">
                该领域心愿数量最多，建议在协作决策中对齐核心体验与节奏安排。
              </p>
            </div>
          ) : null}
        </div>
      )}
    </CollabWidgetCard>
  );
}
