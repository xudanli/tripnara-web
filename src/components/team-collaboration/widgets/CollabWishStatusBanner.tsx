import { useMemo } from 'react';
import { AlertTriangle, Heart, Plus, Sparkles, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildWishCollabAiSummary, buildWishCollabStats } from '@/lib/wish-collab-stats';
import type { TeamWishItem, TripWishItem, WishSummary } from '@/types/trip-wishes';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabWishStatusBannerProps {
  summary: WishSummary | null;
  mine: TripWishItem[];
  team: TeamWishItem[];
  onNewWish?: () => void;
  className?: string;
}

const STAT_ITEMS = [
  {
    key: 'mineCount' as const,
    label: '我的心愿',
    icon: Heart,
    tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    key: 'teamCount' as const,
    label: '团队心愿',
    icon: Users,
    tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    key: 'highImpactCount' as const,
    label: '高影响心愿',
    icon: Star,
    tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    key: 'conflictCount' as const,
    label: '潜在冲突',
    icon: AlertTriangle,
    tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
];

function splitAiSummary(text: string): [string, string | null] {
  const conflictIdx = text.indexOf('主要冲突');
  const focusIdx = text.indexOf('当前未发现');
  const splitIdx = conflictIdx >= 0 ? conflictIdx : focusIdx >= 0 ? focusIdx : -1;
  if (splitIdx <= 0) return [text, null];
  return [text.slice(0, splitIdx).trim(), text.slice(splitIdx).trim()];
}

export function CollabWishStatusBanner({
  summary,
  mine,
  team,
  onNewWish,
  className,
}: CollabWishStatusBannerProps) {
  const stats = useMemo(() => buildWishCollabStats(mine, team, summary), [mine, team, summary]);
  const aiSummary = useMemo(() => buildWishCollabAiSummary(mine, team), [mine, team]);
  const [aiLead, aiTail] = useMemo(() => splitAiSummary(aiSummary), [aiSummary]);

  return (
    <section className={cn(workbenchCard, 'p-2.5', className)}>
      <h3 className="mb-1.5 text-sm font-semibold tracking-tight text-foreground">心愿概览</h3>

      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-2.5">
        <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4 sm:gap-x-4">
          {STAT_ITEMS.map(({ key, label, icon: Icon, tone }) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  tone,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold tabular-nums leading-tight text-foreground">
                  {stats[key]}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden shrink-0 self-stretch xl:block xl:w-px xl:bg-border/60" aria-hidden />

        <div className="flex min-w-0 flex-1 items-start gap-2 xl:max-w-[300px]">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground">AI 洞察</p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{aiLead}</p>
            {aiTail ? (
              <p className="text-[10px] leading-snug text-muted-foreground">{aiTail}</p>
            ) : null}
          </div>
        </div>

        {onNewWish ? (
          <Button
            type="button"
            size="sm"
            className="h-7 shrink-0 gap-1 self-start px-2.5 text-xs xl:self-center"
            onClick={onNewWish}
          >
            <Plus className="h-3.5 w-3.5" />
            新增心愿
          </Button>
        ) : null}
      </div>
    </section>
  );
}
