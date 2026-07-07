import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TripOutcomeResponse } from '@/types/self-evolution';
import { TRIP_OUTCOME_DIMENSION_LABELS } from '../hooks/useSelfEvolution';
import { DimensionBar } from './DimensionBar';

interface TripOutcomeDashboardProps {
  outcome: TripOutcomeResponse;
  className?: string;
}

function OverallScoreRing({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score * circumference);

  return (
    <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
      <svg className="-rotate-90" width="112" height="112" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold tabular-nums">{pct}</p>
        <p className="text-[10px] text-muted-foreground">总体评分</p>
      </div>
    </div>
  );
}

export function TripOutcomeDashboard({ outcome, className }: TripOutcomeDashboardProps) {
  const gapPct = Math.abs(outcome.expectationGap.gap * 100);
  const exceeded = outcome.expectationGap.gap > 0;

  const dimensionEntries = Object.entries(outcome.dimensions) as Array<
    [keyof typeof TRIP_OUTCOME_DIMENSION_LABELS, { score: number }]
  >;

  return (
    <section className={cn('rounded-xl border border-border bg-card p-5 space-y-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">旅行结果分析</h3>
          <p className="text-sm text-muted-foreground">6 维旅行结果评分 · Round 3</p>
        </div>
        <OverallScoreRing score={outcome.overallScore} />
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">维度评分</h4>
        {dimensionEntries.map(([key, dim]) => (
          <DimensionBar
            key={key}
            label={TRIP_OUTCOME_DIMENSION_LABELS[key] ?? key}
            value={dim.score}
            weight={outcome.weights[key as keyof typeof outcome.weights]}
          />
        ))}
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
        <h4 className="text-sm font-medium text-foreground">期望差距</h4>
        <p className={cn('mt-1 text-sm', exceeded ? 'text-gate-allow-foreground' : 'text-amber-600')}>
          {exceeded
            ? `超出预期 ${gapPct.toFixed(0)}%`
            : `低于预期 ${gapPct.toFixed(0)}%`}
        </p>
      </div>

      {(outcome.groupAggregation.satisfiedMembers.length > 0 ||
        outcome.groupAggregation.unsatisfiedMembers.length > 0) && (
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-2">
          <h4 className="text-sm font-medium text-foreground">群组满意度</h4>
          <p className="text-sm text-muted-foreground">
            策略 {outcome.groupAggregation.strategy} · 聚合分数{' '}
            {(outcome.groupAggregation.aggregatedScore * 100).toFixed(0)}%
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-gate-allow-border text-gate-allow-foreground">
              满意 {outcome.groupAggregation.satisfiedMembers.length} 人
            </Badge>
            {outcome.groupAggregation.unsatisfiedMembers.length > 0 && (
              <Badge variant="outline" className="border-amber-200 text-amber-700">
                不满意 {outcome.groupAggregation.unsatisfiedMembers.length} 人
              </Badge>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
