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
  className?: string;
}

const CLUSTER_CHIP_STYLES = [
  'border-primary/40 bg-primary/5 text-primary',
  'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
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
  className,
}: CollabWishAiInsightsRowProps) {
  const all = useMemo(() => [...mine, ...team], [mine, team]);
  const clusterChips = useMemo(() => buildClusterChips(mine, team), [mine, team]);

  const highImportance = all.filter((w) => w.importance >= 4);
  const categories = new Set(highImportance.map((w) => w.category));
  const hasTension = categories.size >= 2 && highImportance.length >= 2;

  const agentEligible = summary?.agentEligibleCount ?? 0;
  const impactDays = summary?.impactByDay?.filter((d) => d.impactCount > 0).length ?? 0;

  const conflictBody = hasTension
    ? `检测到 ${highImportance.length} 条高优先级心愿跨 ${categories.size} 个领域，可能存在节奏或预算张力。`
    : '当前未发现明显的高优先级冲突，可继续补充想法。';

  const impactBullets = [
    agentEligible > 0
      ? `预计人均预算 +¥${Math.round(agentEligible * 300)}（基于 ${agentEligible} 条可优化心愿）`
      : '将心愿设为可纳入优化后，AI 会估算预算影响',
    impactDays > 0 ? `行程时间 +${(impactDays * 0.25).toFixed(1)} 天` : '时间影响待更多心愿数据',
    agentEligible > 0 ? '可能需要调整交通与住宿安排' : '补充心愿后可生成交通建议',
  ];

  return (
    <section className={cn('space-y-3', className)} aria-label="AI 洞察与建议">
      <div className="grid gap-3 lg:grid-cols-4">
        <div className={cn(workbenchCard, 'flex flex-col p-4 lg:col-span-1')}>
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
            'flex flex-col p-4 lg:col-span-1',
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

        <div className={cn(workbenchCard, 'flex flex-col p-4 lg:col-span-1')}>
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
            'flex flex-col justify-between bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 p-4 lg:col-span-1',
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
