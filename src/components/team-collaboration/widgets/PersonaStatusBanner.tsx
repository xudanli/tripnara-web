import { useMemo } from 'react';
import {
  Activity,
  HeartHandshake,
  History,
  Info,
  PieChart,
  RefreshCw,
  Sparkles,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildPersonaAiSummaryView,
  buildPersonaBannerStats,
  personaStatLabelTone,
} from '@/lib/collab-persona-stats.util';
import { isDecisionProfilingReuseEnabled } from '@/lib/decision-profiling-reuse-feature';
import type { FrictionRadarData, OnboardingStatus } from '@/types/trip-decision-profiling';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface PersonaStatusBannerProps {
  friction: FrictionRadarData | null | undefined;
  onboarding: OnboardingStatus | null | undefined;
  reusing?: boolean;
  onStartQuiz?: () => void;
  onReuseProfile?: () => void;
  className?: string;
}

const STAT_ITEMS = [
  {
    key: 'teamSync' as const,
    label: '团队合拍度',
    icon: HeartHandshake,
    tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    suffix: '/100',
    labelKey: 'teamSyncLabel' as const,
    hint: '综合风格与节奏匹配程度',
  },
  {
    key: 'frictionScore' as const,
    label: '摩擦分',
    icon: Activity,
    tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    suffix: '/100',
    labelKey: 'frictionLabel' as const,
    hint: '成员间潜在分歧强度',
  },
  {
    key: 'budgetOverlapPct' as const,
    label: '预算重叠度',
    icon: PieChart,
    tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    suffix: '%',
    labelKey: 'budgetLabel' as const,
    hint: '消费预期重合比例',
  },
  {
    key: 'paceSyncPct' as const,
    label: '节奏同步度',
    icon: Waves,
    tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    suffix: '%',
    labelKey: 'paceLabel' as const,
    hint: '行程强度与步调一致性',
  },
];

function StatDivider() {
  return (
    <div
      className="mx-2 hidden w-px shrink-0 self-stretch bg-border/60 xl:block"
      aria-hidden
    />
  );
}

export function PersonaStatusBanner({
  friction,
  onboarding,
  reusing,
  onStartQuiz,
  onReuseProfile,
  className,
}: PersonaStatusBannerProps) {
  const stats = useMemo(() => buildPersonaBannerStats(friction), [friction]);
  const summaryView = useMemo(
    () => buildPersonaAiSummaryView(friction, onboarding?.teamCompletionRate ?? 0),
    [friction, onboarding?.teamCompletionRate],
  );

  const quizDone = onboarding?.quizCompleted ?? false;
  const reuseEligible =
    isDecisionProfilingReuseEnabled() && onboarding?.reuse?.eligible && !quizDone;

  return (
    <section className={cn(workbenchCard, 'p-2.5', className)}>
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-stretch xl:gap-0">
        <div className="flex shrink-0 flex-wrap items-stretch xl:flex-nowrap">
          {STAT_ITEMS.map((item, index) => (
            <div key={item.key} className="flex items-stretch">
              {index > 0 ? <StatDivider /> : null}
              <div className="flex min-w-[132px] items-start gap-2 px-0.5 py-0.5 sm:min-w-[148px]">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    item.tone,
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <span className="truncate">{item.label}</span>
                    <Info className="h-3 w-3 shrink-0 opacity-50" aria-label={item.hint} />
                  </p>
                  <p className="text-lg font-semibold tabular-nums leading-tight text-foreground">
                    {stats[item.key]}
                    <span className="text-sm font-normal text-muted-foreground">{item.suffix}</span>
                  </p>
                  <p
                    className={cn(
                      'text-[10px] font-medium',
                      personaStatLabelTone(stats[item.labelKey]),
                    )}
                  >
                    {stats[item.labelKey]}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <StatDivider />

        <div className="flex min-w-0 flex-1 flex-col gap-2 xl:pl-1">
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-primary">AI 总结</p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                {summaryView.highlights?.length ? (
                  <>
                    {summaryView.prefix}
                    {summaryView.highlights.map((topic, index) => (
                      <span key={topic}>
                        {index > 0 ? '和' : null}
                        <span className="font-medium text-primary">{topic}</span>
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

          {(((quizDone || reuseEligible) && onReuseProfile) || onStartQuiz) ? (
            <div className="flex flex-wrap items-center justify-end gap-1.5 xl:pl-9">
              {(quizDone || reuseEligible) && onReuseProfile ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2.5 text-xs"
                  disabled={reusing || (quizDone && !reuseEligible)}
                  onClick={reuseEligible ? onReuseProfile : undefined}
                >
                  <History className="h-3.5 w-3.5" />
                  沿用上次结果
                </Button>
              ) : null}
              {onStartQuiz ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1 px-2.5 text-xs"
                  onClick={onStartQuiz}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {quizDone ? '重新测评' : '开始测评'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
