import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RecruitingOutcome } from '@/types/match-square';
import {
  recruitingSuccessLevelColor,
  recruitingSuccessLevelLabel,
} from '../lib/recruiting-attribution.util';

interface RecruitingOutcomeSectionProps {
  outcome: RecruitingOutcome | null | undefined;
  className?: string;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function RecruitingOutcomeSection({ outcome, className }: RecruitingOutcomeSectionProps) {
  if (!outcome) {
    return (
      <section
        className={cn(
          'rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center',
          className
        )}
      >
        <p className="text-sm text-muted-foreground">招募结果将在关联行程完成后评估</p>
      </section>
    );
  }

  const { metrics } = outcome;

  return (
    <section className={cn('rounded-xl border border-border bg-card p-4 space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">招募结果评估</h2>
        <Badge
          variant="outline"
          className={cn('border', recruitingSuccessLevelColor(outcome.successLevel))}
        >
          {recruitingSuccessLevelLabel(outcome.successLevel)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="招募耗时" value={`${metrics.timeToFill} 天`} />
        <MetricCard label="申请数量" value={metrics.applicationCount} />
        <MetricCard label="批准数量" value={metrics.approvedCount} />
        <MetricCard
          label="转化率"
          value={`${(metrics.conversionRate * 100).toFixed(1)}%`}
        />
        <MetricCard
          label="匹配成功率"
          value={`${(metrics.matchSuccessRate * 100).toFixed(1)}%`}
        />
        <MetricCard
          label="团队表现"
          value={`${(metrics.teamPerformance * 100).toFixed(0)}`}
        />
      </div>

      {outcome.factors.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">影响因素</h3>
          <div className="space-y-2">
            {outcome.factors.map((factor) => (
              <div
                key={`${factor.type}-${factor.description}`}
                className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{factor.type}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    影响度 {(factor.impact * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{factor.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {outcome.recommendations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">优化建议</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {outcome.recommendations.map((rec) => (
              <li key={rec}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        数据质量 {(outcome.dataQuality * 100).toFixed(0)}% · 置信度{' '}
        {(outcome.confidence * 100).toFixed(0)}%
      </p>
    </section>
  );
}
