import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/format';
import type { PlanGateInputsSummary } from '@/hooks/usePlanGateFlow';
import type { TripDetail } from '@/types/trip';
import { planGateCard, planGatePrimaryButton, planGateSectionTitle } from '../plan-gate-ui';

export interface PlanGateEmptyStepProps {
  trip: TripDetail | null;
  tripLoading: boolean;
  tripLoadError: string | null;
  loading: boolean;
  inputsSummary: PlanGateInputsSummary;
  onGenerate: () => void;
  onRetryLoad: () => void;
}

export function PlanGateEmptyStep({
  trip,
  tripLoading,
  tripLoadError,
  loading,
  inputsSummary,
  onGenerate,
  onRetryLoad,
}: PlanGateEmptyStepProps) {
  const currency = inputsSummary.budgetCurrency ?? 'CNY';

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className={planGateCard}>
        <h3 className={planGateSectionTitle}>生成可提交的完整方案</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          生成后不会立即修改时间轴，需完成验证与确认后再提交。
        </p>

        <ul className="mt-4 space-y-2">
          {inputsSummary.constraintCount != null ? (
            <li className="flex items-center gap-2 text-xs text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-gate-allow-foreground" />
              {inputsSummary.constraintCount} 条已确认约束
            </li>
          ) : null}
          {inputsSummary.decisionCount != null ? (
            <li className="flex items-center gap-2 text-xs text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-gate-allow-foreground" />
              {inputsSummary.decisionCount} 项决策结论
            </li>
          ) : null}
          {inputsSummary.budgetPerPerson != null ? (
            <li className="flex items-center gap-2 text-xs text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-gate-allow-foreground" />
              当前预算 {formatCurrency(inputsSummary.budgetPerPerson, currency)} / 人
            </li>
          ) : null}
          {inputsSummary.memberCount != null ? (
            <li className="flex items-center gap-2 text-xs text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-gate-allow-foreground" />
              {inputsSummary.memberCount} 位成员的参与安排
            </li>
          ) : null}
          <li className="flex items-center gap-2 text-xs text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-gate-allow-foreground" />
            最新道路与天气数据
          </li>
        </ul>

          {inputsSummary.warnings && inputsSummary.warnings.length > 0 ? (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-gate-confirm-border/40 bg-gate-confirm/8 px-2.5 py-2 text-[11px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate-confirm-foreground" />
              {inputsSummary.warnings[0]}
            </p>
          ) : null}
          {inputsSummary.blockers && inputsSummary.blockers.length > 0 ? (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-gate-reject-border/40 bg-gate-reject/8 px-2.5 py-2 text-[11px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate-reject-foreground" />
              {inputsSummary.blockers[0]}
            </p>
          ) : null}
          {inputsSummary.missingInfoCount ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-gate-confirm-border/40 bg-gate-confirm/8 px-2.5 py-2 text-[11px] text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate-confirm-foreground" />
            仍有 {inputsSummary.missingInfoCount} 项信息缺失，但不影响先生成草案。
          </p>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-2">
        {trip ? (
          <p className="text-center text-xs text-muted-foreground">
            {trip.destination || '未设置目的地'} · {trip.TripDay?.length ?? 0} 天行程
          </p>
        ) : null}
        <Button
          className={planGatePrimaryButton}
          disabled={loading || tripLoading || !trip}
          onClick={onGenerate}
        >
          {tripLoading ? '加载行程中…' : loading ? '生成中…' : '生成方案草案'}
        </Button>
        {tripLoadError ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-destructive">{tripLoadError}</p>
            <Button variant="outline" size="sm" onClick={onRetryLoad}>
              重试加载
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
