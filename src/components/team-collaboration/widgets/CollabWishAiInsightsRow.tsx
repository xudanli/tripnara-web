import { useMemo } from 'react';
import { AlertTriangle, ChevronRight, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildWishCategoryDistribution } from '@/lib/wish-category-distribution';
import type { TeamWishItem, TripWishItem, WishSummary } from '@/types/trip-wishes';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabWishAiInsightsRowProps {
  mine: TripWishItem[];
  team: TeamWishItem[];
  summary: WishSummary | null;
  onAskAssistant?: () => void;
  onScrollToForm?: () => void;
  /** stacked: 右栏纵向三卡；default: 底栏四列 */
  variant?: 'default' | 'stacked';
  className?: string;
}

const CLUSTER_CHIP_STYLES = [
  'border-primary/40 bg-primary/5 text-primary',
  'border-gate-allow-border/40 bg-gate-allow-foreground/5 text-gate-allow-foreground dark:text-gate-allow-foreground',
  'border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-200',
];

function buildClusterChips(mine: TripWishItem[], team: TeamWishItem[]) {
  return buildWishCategoryDistribution(mine, team)
    .filter((slice) => slice.count >= 2)
    .slice(0, 3)
    .map((slice, index) => ({
      id: slice.category,
      label: slice.label,
      count: slice.count,
      className: CLUSTER_CHIP_STYLES[index % CLUSTER_CHIP_STYLES.length],
    }));
}

export function CollabWishAiInsightsRow({
  mine,
  team,
  summary,
  onAskAssistant,
  onScrollToForm,
  variant = 'default',
  className,
}: CollabWishAiInsightsRowProps) {
  const all = useMemo(() => [...mine, ...team], [mine, team]);
  const clusterChips = useMemo(() => buildClusterChips(mine, team), [mine, team]);
  const distribution = useMemo(() => buildWishCategoryDistribution(mine, team), [mine, team]);

  const highImportance = all.filter((w) => w.importance >= 4);
  const categories = new Set(highImportance.map((w) => w.category));
  const hasTension = categories.size >= 2 && highImportance.length >= 2;

  const agentEligible = summary?.agentEligibleCount ?? 0;
  const impactDays = summary?.impactByDay?.filter((d) => d.impactCount > 0).length ?? 0;

  const conflictBody = hasTension
    ? `检测到 ${highImportance.length} 条高优先级心愿跨 ${categories.size} 个领域，可能存在节奏或预算张力。`
    : '当前未发现明显的高优先级冲突，可继续补充想法。';

  const conflictItems = distribution.slice(0, 3).map((slice, index) => ({
    label: slice.label,
    count: Math.max(1, Math.round(slice.count * (index === 0 ? 0.4 : index === 1 ? 0.3 : 0.2))),
  }));

  const impactBullets = [
    agentEligible > 0
      ? `影响天数约 ${(impactDays * 0.35 + agentEligible * 0.15).toFixed(1)} 天`
      : '补充心愿后可估算行程影响天数',
    all.length > 0
      ? `协调率约 ${Math.min(95, 60 + all.length * 2)}%`
      : '协调率待更多心愿数据',
    agentEligible > 0
      ? `调整建议 ${Math.min(12, agentEligible + 2)} 条`
      : '将心愿设为可纳入优化后生成建议',
  ];

  if (variant === 'stacked') {
    return (
      <section className={cn('space-y-1.5', className)} aria-label="AI 洞察">
        <h3 className="text-xs font-semibold text-foreground">AI 洞察</h3>
        <div className="grid gap-1.5 sm:grid-cols-3">
          <div className={cn(workbenchCard, 'p-2')}>
            <div className="mb-1 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <h4 className="text-[11px] font-semibold text-foreground">偏好聚类</h4>
            </div>
            {distribution.length > 0 ? (
              <ul className="space-y-1 text-[10px] text-muted-foreground">
                {distribution.slice(0, 3).map((slice) => (
                  <li key={slice.category} className="flex justify-between gap-2">
                    <span className="truncate">{slice.label}</span>
                    <span className="shrink-0 tabular-nums font-medium text-foreground">{slice.percent}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] text-muted-foreground">再记录心愿后识别聚类</p>
            )}
          </div>

          <div className={cn(workbenchCard, 'p-2', hasTension && 'border-gate-confirm-border/60')}>
            <div className="mb-1 flex items-center gap-1.5">
              <AlertTriangle
                className={cn('h-3.5 w-3.5', hasTension ? 'text-gate-confirm-foreground' : 'text-muted-foreground')}
              />
              <h4 className="text-[11px] font-semibold text-foreground">冲突检测</h4>
            </div>
            {conflictItems.length > 0 ? (
              <ul className="space-y-1 text-[10px] text-muted-foreground">
                {conflictItems.map((item) => (
                  <li key={item.label} className="flex justify-between gap-2">
                    <span className="truncate">{item.label}</span>
                    <span className="shrink-0 tabular-nums">{item.count} 组</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] leading-relaxed">{conflictBody}</p>
            )}
          </div>

          <div className={cn(workbenchCard, 'p-2')}>
            <div className="mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <h4 className="text-[11px] font-semibold text-foreground">对行程影响分析</h4>
            </div>
            <ul className="space-y-1 text-[10px] text-muted-foreground">
              {impactBullets.map((line) => (
                <li key={line} className="flex gap-1.5">
                  <span className="text-primary">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {onAskAssistant ? (
              <Button
                type="button"
                variant="link"
                className="mt-2 h-auto p-0 text-[10px]"
                onClick={onAskAssistant}
              >
                与 Nara 讨论
                <ChevronRight className="ml-0.5 h-3 w-3" />
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('space-y-2', className)} aria-label="AI 洞察与建议">
      <div className="grid gap-2 lg:grid-cols-4">
        <div className={cn(workbenchCard, 'flex flex-col p-3 lg:col-span-1')}>
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">相似心愿聚类</h4>
          </div>
          {clusterChips.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {clusterChips.map((chip) => (
                <span
                  key={chip.id}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                    chip.className,
                  )}
                >
                  {chip.label} {chip.count}条
                </span>
              ))}
            </div>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">
              {all.length >= 2
                ? '心愿领域较分散，建议在协商 Tab 对齐核心体验。'
                : '再记录 1–2 条心愿后，AI 会识别相似主题。'}
            </p>
          )}
          <Button type="button" variant="link" className="mt-auto h-auto justify-start p-0 text-xs">
            查看聚类详情
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Button>
        </div>

        <div
          className={cn(
            workbenchCard,
            'flex flex-col p-3 lg:col-span-1',
            hasTension && 'border-gate-confirm-border/60',
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle
              className={cn(
                'h-4 w-4',
                hasTension ? 'text-gate-confirm-foreground' : 'text-muted-foreground',
              )}
            />
            <h4 className="text-xs font-semibold text-foreground">潜在冲突检测</h4>
          </div>
          <p className="mb-3 flex-1 text-xs leading-relaxed text-muted-foreground">{conflictBody}</p>
          <Button type="button" variant="link" className="mt-auto h-auto justify-start p-0 text-xs">
            查看建议方案
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Button>
        </div>

        <div className={cn(workbenchCard, 'flex flex-col p-3 lg:col-span-1')}>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">对行程的影响</h4>
          </div>
          <ul className="mb-3 flex-1 space-y-1 text-xs text-muted-foreground">
            {impactBullets.map((line) => (
              <li key={line} className="flex gap-1.5">
                <span className="text-primary">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <Button type="button" variant="link" className="mt-auto h-auto justify-start p-0 text-xs">
            查看影响详情
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Button>
        </div>

        <div
          className={cn(
            workbenchCard,
            'flex flex-col justify-between bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 p-3 lg:col-span-1',
          )}
        >
          <div>
            <Sparkles className="mb-2 h-5 w-5 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">让 AI 更懂你</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              记录更多偏好，生成更精准的聚类与妥协建议。
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-4 h-8 w-full text-xs"
            onClick={onScrollToForm ?? onAskAssistant}
          >
            去记录更多心愿
          </Button>
        </div>
      </div>
    </section>
  );
}
