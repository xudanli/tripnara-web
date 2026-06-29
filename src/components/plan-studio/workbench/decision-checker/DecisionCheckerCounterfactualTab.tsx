import { ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DecisionCheckerCounterfactualDto } from '@/types/decision-checker';
import {
  DecisionCheckerAiBox,
  DecisionCheckerBadge,
  DecisionCheckerEmpty,
  DecisionCheckerMetricGrid,
  DecisionCheckerSection,
  scenarioBadgeLabel,
  scenarioBorderClass,
  formatDecisionCheckerText,
} from './decision-checker-ui';

export interface DecisionCheckerCounterfactualTabProps {
  model: DecisionCheckerCounterfactualDto;
  loading?: boolean;
  unavailable?: boolean;
  error?: string | null;
  onSelectScenario?: (scenarioId: string) => void;
  displayTimezone?: string;
}

export function DecisionCheckerCounterfactualTab({
  model,
  loading,
  unavailable,
  error,
  onSelectScenario,
  displayTimezone,
}: DecisionCheckerCounterfactualTabProps) {
  const { headline, subheadline, scenarios: scenarioRows, ifUnchanged } = model;
  const scenarios = scenarioRows ?? [];

  if (loading) {
    return <DecisionCheckerEmpty>正在生成反事实分析…</DecisionCheckerEmpty>;
  }

  if (error) {
    return <DecisionCheckerEmpty>{error}</DecisionCheckerEmpty>;
  }

  if (unavailable) {
    return <DecisionCheckerEmpty>决策检查器接口尚未就绪，暂无反事实分析。</DecisionCheckerEmpty>;
  }

  if (!scenarios.length && !ifUnchanged) {
    return (
      <DecisionCheckerEmpty>
        反事实分析将在方案对比或 What-If 调整后可用。可先运行路线优化或查看松弛建议。
      </DecisionCheckerEmpty>
    );
  }

  return (
    <div className="space-y-3">
      {scenarios.length > 0 ? (
        <section>
          <h3 className="mb-1 text-xs font-semibold text-foreground">
            {headline ?? '如果调整这些内容，会怎样？'}
          </h3>
          {subheadline ? (
            <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{subheadline}</p>
          ) : null}
          <div className="space-y-2">
            {scenarios.map((scenario) => {
              const badge = scenario.badgeLabel ?? scenarioBadgeLabel(scenario.badge);
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onSelectScenario?.(scenario.id)}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-colors hover:brightness-[0.98]',
                    scenarioBorderClass(scenario.variant ?? 'blue'),
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          {scenario.letter ? `${scenario.letter} ` : ''}
                          {scenario.title}
                        </span>
                        {badge ? (
                          <DecisionCheckerBadge
                            tone={
                              scenario.badge === 'recommended'
                                ? 'success'
                                : scenario.badge === 'best'
                                  ? 'info'
                                  : 'warning'
                            }
                          >
                            {badge}
                          </DecisionCheckerBadge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {formatDecisionCheckerText(scenario.description, displayTimezone)}
                      </p>
                      <div className="mt-2">
                        <DecisionCheckerMetricGrid
                          metrics={scenario.metrics}
                          displayTimezone={displayTimezone}
                        />
                      </div>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {ifUnchanged ? (
        <DecisionCheckerSection
          title="如果不修改会怎样"
          action={
            <DecisionCheckerBadge tone={ifUnchanged.riskLevel === 'high' ? 'danger' : 'warning'}>
              {ifUnchanged.label}
            </DecisionCheckerBadge>
          }
          className="border-red-200/70 bg-red-50/30"
        >
          <div className="grid gap-2 sm:grid-cols-3">
            {ifUnchanged.points?.map((point) => (
              <div key={point.title} className="rounded-lg border border-red-200/60 bg-background/70 px-2.5 py-2">
                <p className="text-xs font-medium text-foreground">{point.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {formatDecisionCheckerText(point.description, displayTimezone)}
                </p>
              </div>
            ))}
          </div>
          {ifUnchanged.recommendation?.text ? (
            <DecisionCheckerAiBox className="mt-3 border-red-200/50 bg-red-50/40 text-red-950">
              <p className="flex items-center gap-1.5 font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                {formatDecisionCheckerText(ifUnchanged.recommendation.text, displayTimezone)}
              </p>
            </DecisionCheckerAiBox>
          ) : null}
        </DecisionCheckerSection>
      ) : null}
    </div>
  );
}
