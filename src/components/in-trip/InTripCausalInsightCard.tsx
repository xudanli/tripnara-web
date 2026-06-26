import { useEffect } from 'react';
import { CausalInsightPanel } from '@/components/causal';
import { useInTripCausalInsight } from '@/hooks/useInTripCausalInsight';
import { cn } from '@/lib/utils';

interface InTripCausalInsightCardProps {
  tripId: string;
  className?: string;
  /** telemetry 闭环后递增以刷新 session 视图 */
  refreshKey?: number;
  /** 无规划缓存时展示提示（冰岛等门控场景推荐开启） */
  showPlanningHint?: boolean;
}

function telemetryStatusLabel(telemetry: InTripCausalTelemetryResult): string | null {
  if (telemetry.path === 'ops_outcome' && telemetry.causalCounterfactualClosed) {
    return '实况已回填，因果闭环完成';
  }
  if (telemetry.path === 'causal_outcome') {
    return '已通过 causal-outcome 写入实况';
  }
  if (telemetry.path === 'skipped') {
    return '闭环未写入：请先在规划期生成方案（缺少 state / snapshot）';
  }
  if (telemetry.path === 'failed') {
    return telemetry.error ? `闭环失败：${telemetry.error}` : '闭环失败';
  }
  return null;
}

/** 行中页：展示规划期因果投影 + telemetry 闭环后的预测 vs 实况 */
export function InTripCausalInsightCard({
  tripId,
  className,
  refreshKey = 0,
  showPlanningHint = false,
}: InTripCausalInsightCardProps) {
  const { model, refresh } = useInTripCausalInsight(tripId);

  useEffect(() => {
    refresh();
  }, [refreshKey, refresh]);

  const hasInsight = Boolean(model.projection || model.counterfactual || model.iceland);
  const telemetryNote = model.lastTelemetry ? telemetryStatusLabel(model.lastTelemetry) : null;

  if (!hasInsight && !showPlanningHint && !telemetryNote) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {!hasInsight && showPlanningHint && !model.hasSession ? (
        <p className="rounded-md border border-dashed border-violet-200/80 bg-violet-50/40 px-3 py-2 text-xs text-muted-foreground dark:bg-violet-950/20">
          完成规划工作台或徒步 generate-plan 后，可在此查看因果预测；环境事件锁定后将自动对比实况。
        </p>
      ) : null}

      {telemetryNote ? (
        <p
          className={cn(
            'rounded-md px-3 py-2 text-xs',
            model.lastTelemetry?.path === 'skipped' || model.lastTelemetry?.path === 'failed'
              ? 'border border-amber-200/70 bg-amber-50/50 text-amber-900 dark:bg-amber-950/20'
              : 'border border-emerald-200/70 bg-emerald-50/40 text-emerald-900 dark:bg-emerald-950/20',
          )}
        >
          {telemetryNote}
        </p>
      ) : null}

      {hasInsight ? (
        <CausalInsightPanel
          projection={model.projection}
          counterfactual={model.counterfactual}
          iceland={model.iceland}
          calibration={model.calibration}
        />
      ) : null}
    </div>
  );
}
