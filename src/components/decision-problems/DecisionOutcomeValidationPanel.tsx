import { CheckCircle2, HelpCircle, Loader2, MinusCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  buildOutcomeComparisonRows,
  experienceMetricLabel,
  failureReasonLabel,
  formatExpectedOutcome,
  formatObservedOutcome,
  hasDataStaleFailure,
  observedSourceLabel,
  outcomeVerdictBadgeClass,
  outcomeVerdictLabel,
  resolveValidationHeadline,
} from '@/lib/decision-outcome-validation.util';
import type {
  DecisionOutcomeValidation,
  DecisionOutcomeValidationSummary,
  DecisionOutcomeVerdict,
  ExperienceOutcome,
} from '@/types/decision-problem';

function VerdictIcon({ verdict }: { verdict: DecisionOutcomeVerdict | undefined }) {
  const normalized = String(verdict ?? 'PENDING').trim().toUpperCase();
  if (normalized === 'CONFIRMED') {
    return <CheckCircle2 className="h-4 w-4 text-gate-allow-foreground" aria-hidden />;
  }
  if (normalized === 'PARTIALLY_CONFIRMED') {
    return <MinusCircle className="h-4 w-4 text-warning" aria-hidden />;
  }
  if (normalized === 'REFUTED') {
    return <XCircle className="h-4 w-4 text-gate-reject-foreground" aria-hidden />;
  }
  return <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

export interface DecisionOutcomeValidationPanelProps {
  validation: DecisionOutcomeValidation | DecisionOutcomeValidationSummary | null | undefined;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  compact?: boolean;
  className?: string;
}

export function DecisionOutcomeValidationPanel({
  validation,
  loading,
  error,
  onRefresh,
  compact = false,
  className,
}: DecisionOutcomeValidationPanelProps) {
  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 py-6 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        正在验证决策效果…
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('rounded-lg border border-destructive/30 bg-destructive/5 p-4', className)}>
        <p className="text-sm text-destructive">{error}</p>
        {onRefresh ? (
          <Button type="button" variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={onRefresh}>
            重试
          </Button>
        ) : null}
      </div>
    );
  }

  if (!validation) {
    return (
      <div className={cn('rounded-lg border border-dashed p-4 text-sm text-muted-foreground', className)}>
        决策尚未执行或暂无验证结果
      </div>
    );
  }

  const rows =
    'expectedOutcomes' in validation && validation.expectedOutcomes?.length
      ? buildOutcomeComparisonRows(validation as DecisionOutcomeValidation)
      : [];

  const failureReasons =
    'failureReasons' in validation ? validation.failureReasons : undefined;
  const experienceOutcomes =
    'experienceOutcomes' in validation ? validation.experienceOutcomes : undefined;
  const showStaleWarning = hasDataStaleFailure(
    'failureReasons' in validation ? (validation as DecisionOutcomeValidation) : null,
  );

  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <VerdictIcon verdict={validation.verdict} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">预测 vs 实际</p>
              <Badge
                variant="outline"
                className={cn('text-[10px]', outcomeVerdictBadgeClass(validation.verdict))}
              >
                {outcomeVerdictLabel(validation.verdict)}
              </Badge>
              {validation.confidence != null ? (
                <span className="text-[11px] text-muted-foreground">
                  置信度 {Math.round(validation.confidence * 100)}%
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {resolveValidationHeadline(validation)}
            </p>
            {showStaleWarning ? (
              <p className="mt-1 text-xs text-warning">
                Ledger 已重算，原预测可能过期
              </p>
            ) : null}
            {failureReasons?.length ? (
              <ul className="mt-1 space-y-0.5">
                {failureReasons.map((reason) => (
                  <li key={reason} className="text-[11px] text-muted-foreground">
                    · {failureReasonLabel(reason)}
                  </li>
                ))}
              </ul>
            ) : null}
            {validation.evaluatedAt ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                验证于 {new Date(validation.evaluatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>
        {onRefresh ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={onRefresh}>
            刷新
          </Button>
        ) : null}
      </div>

      {!compact && rows.length > 0 ? (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[420px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/60">
                <th className="py-2 pr-3 text-left font-medium text-muted-foreground">指标</th>
                <th className="py-2 px-2 text-left font-medium text-muted-foreground">预期</th>
                <th className="py-2 px-2 text-left font-medium text-muted-foreground">观测</th>
                <th className="py-2 pl-2 text-left font-medium text-muted-foreground w-16">匹配</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.metric} className="border-b border-border/40 last:border-0">
                  <td className="py-2 pr-3 text-muted-foreground">{row.label}</td>
                  <td className="py-2 px-2">
                    {row.expected ? formatExpectedOutcome(row.expected) : '—'}
                  </td>
                  <td className="py-2 px-2">
                    {row.observed ? (
                      <span>
                        {formatObservedOutcome(row.observed)}
                        {row.observed.source ? (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            · {observedSourceLabel(row.observed.source)}
                          </span>
                        ) : null}
                        {row.observed.confidence != null ? (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            ({Math.round(row.observed.confidence * 100)}%)
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2 pl-2">
                    {row.matched == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : row.matched ? (
                      <span className="text-gate-allow-foreground">✓</span>
                    ) : (
                      <span className="text-gate-reject-foreground">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!compact && experienceOutcomes?.length ? (
        <ExperienceOutcomesSection items={experienceOutcomes} />
      ) : null}
    </section>
  );
}

function ExperienceOutcomesSection({ items }: { items: ExperienceOutcome[] }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">体验反馈（不参与主 verdict）</p>
      <ul className="space-y-1.5 text-xs">
        {items.map((item, index) => (
          <li key={`${item.metric}-${index}`} className="flex flex-wrap gap-x-2 gap-y-0.5">
            <span className="font-medium">{experienceMetricLabel(item.metric)}</span>
            <span>{String(item.value)}</span>
            <span className="text-muted-foreground">· {item.source}</span>
            {item.context ? <span className="text-muted-foreground">· {item.context}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DecisionOutcomeVerdictBadge({
  verdict,
  className,
}: {
  verdict: DecisionOutcomeVerdict | undefined;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px]', outcomeVerdictBadgeClass(verdict), className)}
    >
      {outcomeVerdictLabel(verdict)}
    </Badge>
  );
}
