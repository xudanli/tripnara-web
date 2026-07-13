import { useMemo } from 'react';
import { BarChart3, CheckCircle2, HelpCircle, MessageCircle, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CollabDecisionStats } from '@/hooks/useCollabOverview';
import { buildDecisionAiSummaryView } from '@/lib/collab-decisions-dashboard.util';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { HighRiskAlert } from '@/types/trip-decision-profiling';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabDecisionStatusBannerProps {
  stats: CollabDecisionStats;
  tasks?: DomainNegotiationTask[];
  alerts?: HighRiskAlert[];
  onStartNegotiation?: () => void;
  className?: string;
}

const STAT_ITEMS = [
  {
    key: 'pending' as const,
    label: '待决',
    icon: HelpCircle,
    tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    key: 'inNegotiation' as const,
    label: '协商中',
    icon: MessageCircle,
    tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    key: 'inVoting' as const,
    label: '投票中',
    icon: BarChart3,
    tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    key: 'consensusReached' as const,
    label: '已达成共识',
    icon: CheckCircle2,
    tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
];

export function CollabDecisionStatusBanner({
  stats,
  tasks = [],
  alerts,
  onStartNegotiation,
  className,
}: CollabDecisionStatusBannerProps) {
  const summaryView = useMemo(
    () => buildDecisionAiSummaryView({ stats, tasks, alerts }),
    [stats, tasks, alerts],
  );

  return (
    <section className={cn(workbenchCard, 'p-2.5', className)}>
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

        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground">AI 摘要</p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {summaryView.highlights?.length ? (
                <>
                  {summaryView.prefix}
                  {summaryView.highlights.map((item, index) => (
                    <span key={item}>
                      <span className="font-medium text-primary">{item}</span>
                      {index < summaryView.highlights!.length - 1 ? '、' : null}
                    </span>
                  ))}
                  {summaryView.suffix}
                </>
              ) : (
                summaryView.text
              )}
            </p>
          </div>
        </div>

        {onStartNegotiation ? (
          <Button
            type="button"
            size="sm"
            className="h-7 shrink-0 gap-1 self-start px-2.5 text-xs xl:self-center"
            onClick={onStartNegotiation}
          >
            <Plus className="h-3.5 w-3.5" />
            开始新协商
          </Button>
        ) : null}
      </div>
    </section>
  );
}
