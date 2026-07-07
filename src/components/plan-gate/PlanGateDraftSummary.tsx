import { formatCurrency } from '@/utils/format';
import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';
import { resolvePlanGateDisplayMetrics } from '@/lib/normalize-plan-gate.util';
import { humanizeWorkbenchDisplayText } from '@/lib/planning-workbench-ux.util';
import {
  readPlanStateExecutabilityScore,
  usePlanGateFeasibility,
} from '@/hooks/usePlanGateFeasibility';
import {
  planGateCard,
  planGateMetricCell,
  planGateMetricGrid,
  planGateMetricLabel,
  planGateMetricValue,
  planGateSectionTitle,
} from './plan-gate-ui';
import { workbenchDecisionCheckerMetricValueClass } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

export interface PlanGateDraftSummaryProps {
  result: ExecutePlanningWorkbenchResponse;
  tripId?: string;
  currency?: string;
}

function formatMinutes(minutes?: number): string {
  if (minutes == null || Number.isNaN(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

export function PlanGateDraftSummary({ result, tripId, currency = 'CNY' }: PlanGateDraftSummaryProps) {
  const planGate = result.uiOutput.planGate;
  const embeddedMetrics = resolvePlanGateDisplayMetrics(planGate);
  const metadataScore = readPlanStateExecutabilityScore(result.planState);

  const { metrics, loading: feasibilityLoading } = usePlanGateFeasibility({
    tripId: tripId ?? '',
    planId: result.planState?.plan_id,
    embeddedMetrics,
    metadataScore,
    enabled: Boolean(tripId),
  });

  const version = planGate?.verification.draftLabel ?? `A${result.planState?.plan_version ?? '—'}`;
  const summary =
    planGate?.verification.headline ??
    humanizeWorkbenchDisplayText(result.uiOutput.consolidatedDecision?.summary);
  const budgetPreview = result.uiOutput.budgetPreview;
  const metricCurrency = metrics?.currency ?? currency;

  return (
    <div className={planGateCard}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className={planGateSectionTitle}>方案草案 {version}</h3>
          {summary ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{summary}</p>
          ) : null}
        </div>
      </div>

      <div className={planGateMetricGrid}>
        <div className={planGateMetricCell}>
          <p className={planGateMetricLabel}>可执行性</p>
          <p className={planGateMetricValue}>
            {feasibilityLoading ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : metrics?.executability != null ? (
              Math.round(metrics.executability)
            ) : (
              '—'
            )}
          </p>
          {metrics?.executabilityDelta != null ? (
            <p
              className={cn(
                'mt-0.5 text-[10px] tabular-nums',
                workbenchDecisionCheckerMetricValueClass(
                  metrics.executabilityDelta >= 0 ? 'good' : 'bad',
                ),
              )}
            >
              {metrics.executabilityDelta >= 0 ? '+' : ''}
              {Math.round(metrics.executabilityDelta)}
            </p>
          ) : null}
        </div>
        <div className={planGateMetricCell}>
          <p className={planGateMetricLabel}>人均预算</p>
          <p className={planGateMetricValue}>
            {metrics?.budgetPerPerson != null
              ? formatCurrency(metrics.budgetPerPerson, metricCurrency)
              : budgetPreview?.totalEstimate != null
                ? formatCurrency(budgetPreview.totalEstimate, metricCurrency)
                : '—'}
          </p>
          {metrics?.budgetPerPersonDelta != null ? (
            <p
              className={cn(
                'mt-0.5 text-[10px] tabular-nums',
                workbenchDecisionCheckerMetricValueClass(
                  metrics.budgetPerPersonDelta <= 0 ? 'good' : 'bad',
                ),
              )}
            >
              {metrics.budgetPerPersonDelta >= 0 ? '+' : ''}
              {formatCurrency(metrics.budgetPerPersonDelta, metricCurrency)}
            </p>
          ) : null}
        </div>
        <div className={planGateMetricCell}>
          <p className={planGateMetricLabel}>总驾驶</p>
          <p className={planGateMetricValue}>{formatMinutes(metrics?.totalDrivingMinutes)}</p>
          {metrics?.totalDrivingMinutesDelta != null ? (
            <p
              className={cn(
                'mt-0.5 text-[10px] tabular-nums',
                workbenchDecisionCheckerMetricValueClass(
                  metrics.totalDrivingMinutesDelta <= 0 ? 'good' : 'bad',
                ),
              )}
            >
              {metrics.totalDrivingMinutesDelta >= 0 ? '+' : ''}
              {formatMinutes(Math.abs(metrics.totalDrivingMinutesDelta))}
            </p>
          ) : null}
        </div>
        <div className={planGateMetricCell}>
          <p className={planGateMetricLabel}>影响天数</p>
          <p className={planGateMetricValue}>
            {metrics?.affectedDayCount != null ? `${metrics.affectedDayCount} 天` : '—'}
          </p>
        </div>
        <div className={planGateMetricCell}>
          <p className={planGateMetricLabel}>成员</p>
          <p className={planGateMetricValue}>{metrics?.memberCount ?? '—'}</p>
        </div>
      </div>

      {result.uiOutput.consolidatedDecision?.nextSteps?.length ? (
        <ul className="mt-3 space-y-1 border-t border-border/40 pt-3">
          {result.uiOutput.consolidatedDecision.nextSteps.slice(0, 5).map((step) => (
            <li key={step} className="text-[11px] text-muted-foreground">
              · {humanizeWorkbenchDisplayText(step) || step}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
