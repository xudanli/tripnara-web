import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlanGateCommitResult } from '@/types/plan-gate';
import { dispatchPlanGateNextAction } from '@/lib/plan-gate-draft-diff.util';
import { formatCurrency } from '@/utils/format';
import { resolvePlanGatePreTripTasksTotal } from '@/hooks/usePlanGatePreTripTasks';
import { formatPlanGateMaterializationSummary } from '@/lib/plan-gate-timeline.util';
import { PlanGatePreTripTasksPanel } from '../PlanGatePreTripTasksPanel';
import { planGateCard, planGatePrimaryButton, planGateSectionTitle } from '../plan-gate-ui';

export interface PlanGateSuccessStepProps {
  result: PlanGateCommitResult;
  tripId: string;
  onClose: () => void;
  onViewPreTripTasks?: () => void;
}

function formatMinutes(minutes?: number): string {
  if (minutes == null || Number.isNaN(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatMetricDelta(
  label: string,
  delta?: { from?: number; to?: number; delta?: number },
  formatter: (n: number) => string = String,
): string | null {
  if (!delta) return null;
  if (delta.from != null && delta.to != null) {
    return `${label}：${formatter(delta.from)} → ${formatter(delta.to)}`;
  }
  if (delta.delta != null) {
    const sign = delta.delta >= 0 ? '+' : '';
    return `${label}：${sign}${formatter(Math.abs(delta.delta))}`;
  }
  return null;
}

export function PlanGateSuccessStep({
  result,
  tripId,
  onClose,
  onViewPreTripTasks,
}: PlanGateSuccessStepProps) {
  const headline =
    result.headline ??
    (result.committedVersionLabel
      ? `方案 ${result.committedVersionLabel} 已写入时间轴`
      : '方案已写入时间轴');

  const metricSummaries = [
    formatMetricDelta('可执行性', result.metrics?.executability, (n) => String(Math.round(n))),
    formatMetricDelta('人均预算', result.metrics?.budgetPerPerson, (n) => formatCurrency(n, 'CNY')),
    formatMetricDelta('总驾驶', result.metrics?.totalDrivingMinutes, formatMinutes),
    formatMetricDelta('影响天数', result.metrics?.affectedDays, (n) => `${n} 天`),
  ].filter((item): item is string => item != null);

  const preTripTotal = resolvePlanGatePreTripTasksTotal(
    result.preTripTasks,
    result.preTripTasksCount,
  );
  const materializationSummary = formatPlanGateMaterializationSummary(
    result.timelineMaterialization,
  );

  const handleNextAction = (action: string) => {
    dispatchPlanGateNextAction(action, tripId);
    onClose();
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className={planGateCard}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-gate-allow-foreground" />
          <div>
            <h3 className={planGateSectionTitle}>{headline}</h3>
            {result.committedAt ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                提交于 {new Date(result.committedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>

        {result.updates && result.updates.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-medium text-foreground">更新内容</p>
            <ul className="space-y-1">
              {result.updates.map((item) => (
                <li key={item} className="text-[11px] text-muted-foreground">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {metricSummaries.length > 0 ? (
          <div className="mt-4 space-y-2 border-t border-border/40 pt-3">
            <p className="text-[11px] font-medium text-foreground">指标变化</p>
            <ul className="space-y-1">
              {metricSummaries.map((item) => (
                <li key={item} className="text-[11px] text-muted-foreground">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {materializationSummary ? (
          <div className="mt-4 space-y-2 border-t border-border/40 pt-3">
            <p className="text-[11px] font-medium text-foreground">时间轴物化</p>
            <p className="text-[11px] text-muted-foreground">· {materializationSummary}</p>
            {result.timelineMaterialization?.degradedToProposed ? (
              <p className="text-[11px] text-gate-confirm-foreground">
                物化未完全成功，方案已降级为 PROPOSED，请刷新时间轴后检查
              </p>
            ) : null}
            {result.timelineMaterialization?.partialCommit &&
            result.timelineMaterialization.commitDays?.length ? (
              <p className="text-[11px] text-muted-foreground">
                · 部分提交天数：第 {result.timelineMaterialization.commitDays.join('、')} 天
              </p>
            ) : null}
          </div>
        ) : null}

        {preTripTotal > 0 && !result.preTripTasks?.tasks?.length ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            已生成 {preTripTotal} 项行前准备任务
          </p>
        ) : null}
      </div>

      {result.preTripTasks && result.preTripTasks.total > 0 ? (
        <PlanGatePreTripTasksPanel
          preTripTasks={result.preTripTasks}
          title="已创建的行前任务"
          onViewAll={onViewPreTripTasks}
        />
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        {(result.nextActions ?? []).map((action) => (
          <Button
            key={action.action}
            variant={action.action === 'view_timeline' ? 'default' : 'outline'}
            className={action.action === 'view_timeline' ? planGatePrimaryButton : 'text-xs'}
            onClick={() => handleNextAction(action.action)}
          >
            {action.label}
          </Button>
        ))}
        <Button variant="ghost" className="text-xs" onClick={onClose}>
          完成
        </Button>
      </div>
    </div>
  );
}
