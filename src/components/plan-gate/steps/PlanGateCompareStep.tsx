import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';
import type { TripDetail } from '@/types/trip';
import { WorkbenchOptionComparisonPanel } from '@/components/planning-workbench/WorkbenchOptionComparisonPanel';
import { usePlanGateCompare } from '@/hooks/usePlanGateCompare';
import { PlanGateDiffMap } from '../PlanGateDiffMap';
import { PlanGateMemberChangesPanel } from '../PlanGateMemberChangesPanel';
import { hasPlanGateSplitMeetupBlocker } from '@/hooks/usePlanGateFeasibility';
import {
  PLAN_GATE_RISK_CHANGE_LABEL,
  planGateRiskChangeClass,
} from '@/lib/plan-gate-draft-diff.util';
import { cn } from '@/lib/utils';
import { workbenchDecisionCheckerMetricValueClass } from '@/components/plan-studio/workbench/workbench-ui';
import {
  planGateCard,
  planGateMetricCell,
  planGateMetricGrid,
  planGateMetricLabel,
  planGateMetricValue,
  planGateSectionTitle,
  planGateTwoColumn,
} from '../plan-gate-ui';

export interface PlanGateCompareStepProps {
  tripId: string;
  trip: TripDetail | null;
  result: ExecutePlanningWorkbenchResponse;
  currency?: string;
}

export function PlanGateCompareStep({
  tripId,
  trip,
  result,
  currency = 'CNY',
}: PlanGateCompareStepProps) {
  const compare = usePlanGateCompare({
    tripId,
    trip,
    result,
    currency,
    enabled: true,
  });

  const draftDiff = compare.draftDiff;
  const draftVersion =
    draftDiff?.draftLabel ?? `A${result.planState.plan_version ?? '—'}`;
  const baselineLabel =
    draftDiff?.baselineLabel ?? compare.baselineMetrics.label;
  const splitBlockers = result.uiOutput.planGate?.submitEligibility.blockers ?? [];
  const hasSplitBlocker = hasPlanGateSplitMeetupBlocker(splitBlockers);

  return (
    <div className="space-y-4">
      {hasSplitBlocker ? (
        <div className="rounded-lg border border-gate-reject-border/50 bg-gate-reject/8 px-3 py-2.5">
          <p className="text-[11px] font-medium text-foreground">提交阻塞</p>
          <ul className="mt-1 space-y-0.5">
            {splitBlockers.map((item) => (
              <li key={item} className="text-[11px] text-muted-foreground">
                · {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={planGateSectionTitle}>方案对比</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            对比草案 {draftVersion} 与 {baselineLabel}，确认主要变更后再提交。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={compare.selectedBaselineId}
            onValueChange={(value) => void compare.selectBaseline(value)}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="选择基准" />
            </SelectTrigger>
            <SelectContent>
              {compare.baselineOptions.map((option) => (
                <SelectItem key={option.id} value={option.id} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={compare.loading}
            onClick={() => void compare.refreshCompare()}
          >
            {compare.loading ? (
              <Spinner className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            刷新
          </Button>
        </div>
      </div>

      {compare.loading ? (
        <div className={cn(planGateCard, 'flex items-center gap-2 text-xs text-muted-foreground')}>
          <Spinner className="h-4 w-4" />
          正在加载对比数据…
        </div>
      ) : null}

      {draftDiff?.mapGeoJson ? (
        <div className={planGateCard}>
          <h4 className="mb-3 text-xs font-medium text-foreground">路线对比地图</h4>
          <PlanGateDiffMap mapGeoJson={draftDiff.mapGeoJson} height={280} />
        </div>
      ) : null}

      <div className={planGateMetricGrid}>
        {compare.metricRows.slice(0, 5).map((row) => (
          <div key={row.id} className={planGateMetricCell}>
            <p className={planGateMetricLabel}>{row.label}</p>
            <p className={planGateMetricValue}>{row.draftValue}</p>
            {row.delta ? (
              <p
                className={cn(
                  'mt-0.5 text-[10px] tabular-nums',
                  workbenchDecisionCheckerMetricValueClass(row.tone ?? 'neutral'),
                )}
              >
                {row.delta}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className={planGateTwoColumn}>
        <div className="space-y-4">
          <div className={planGateCard}>
            <h4 className="mb-3 text-xs font-medium text-foreground">指标对比</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">指标</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground">
                      {compare.baselineMetrics.label}
                    </th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground">
                      {compare.draftMetrics?.label ?? `草案 ${draftVersion}`}
                    </th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground">变化</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.metricRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/40">
                      <td className="px-2 py-2 text-foreground">{row.label}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                        {row.baselineValue}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-foreground">
                        {row.draftValue}
                      </td>
                      <td
                        className={cn(
                          'px-2 py-2 text-right tabular-nums',
                          workbenchDecisionCheckerMetricValueClass(row.tone ?? 'neutral'),
                        )}
                      >
                        {row.delta ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {compare.optionComparison ? (
            <div className={planGateCard}>
              <h4 className="mb-3 text-xs font-medium text-foreground">候选方案评分</h4>
              <WorkbenchOptionComparisonPanel comparison={compare.optionComparison} />
            </div>
          ) : null}

          {compare.compareResult?.differences?.length ? (
            <div className={planGateCard}>
              <h4 className="mb-3 text-xs font-medium text-foreground">字段差异</h4>
              <ul className="space-y-2">
                {compare.compareResult.differences.map((diff, index) => (
                  <li
                    key={`${diff.field}-${index}`}
                    className={cn(
                      'rounded-lg border px-2.5 py-2',
                      diff.impact === 'high'
                        ? 'border-gate-reject-border/50 bg-gate-reject/8'
                        : diff.impact === 'medium'
                          ? 'border-gate-confirm-border/50 bg-gate-confirm/8'
                          : 'border-border/60 bg-muted/15',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-foreground">{diff.field}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {diff.impact === 'high' ? '高影响' : diff.impact === 'medium' ? '中影响' : '低影响'}
                      </Badge>
                    </div>
                    {diff.description ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">{diff.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {draftDiff?.memberChanges && draftDiff.memberChanges.length > 0 ? (
            <PlanGateMemberChangesPanel memberChanges={draftDiff.memberChanges} />
          ) : null}

          {draftDiff?.timelineChanges && draftDiff.timelineChanges.length > 0 ? (
            <div className={planGateCard}>
              <h4 className="mb-3 text-xs font-medium text-foreground">时间轴变更</h4>
              <ul className="space-y-2">
                {draftDiff.timelineChanges.map((change, index) => (
                  <li
                    key={`${change.kind}-${change.day}-${index}`}
                    className={cn(
                      'rounded-lg border px-2.5 py-2',
                      change.impact === 'high'
                        ? 'border-gate-reject-border/50 bg-gate-reject/8'
                        : change.impact === 'medium'
                          ? 'border-gate-confirm-border/50 bg-gate-confirm/8'
                          : 'border-border/60 bg-muted/15',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-foreground">
                        {change.label ?? change.kind}
                        {change.day != null ? ` · 第 ${change.day} 天` : ''}
                      </span>
                      {change.impact ? (
                        <Badge variant="outline" className="text-[10px]">
                          {change.impact === 'high'
                            ? '高影响'
                            : change.impact === 'medium'
                              ? '中影响'
                              : '低影响'}
                        </Badge>
                      ) : null}
                    </div>
                    {change.before && change.after ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {change.before} → {change.after}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={planGateCard}>
            <h4 className="mb-3 text-xs font-medium text-foreground">主要变更</h4>
            {compare.changeItems.length > 0 ? (
              <ul className="space-y-1.5">
                {compare.changeItems.map((item) => (
                  <li key={item} className="text-[11px] leading-relaxed text-muted-foreground">
                    · {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                暂无结构化变更摘要。草案与基准的整体指标见左侧对比表。
              </p>
            )}
          </div>

          {draftDiff?.mapChanges && draftDiff.mapChanges.length > 0 ? (
            <div className={planGateCard}>
              <h4 className="mb-3 text-xs font-medium text-foreground">路线变更</h4>
              <ul className="space-y-1.5">
                {draftDiff.mapChanges.map((change, index) => (
                  <li
                    key={`map-${change.day}-${index}`}
                    className="text-[11px] leading-relaxed text-muted-foreground"
                  >
                    · {change.label ?? `第 ${change.day ?? '—'} 天`}
                    {change.changeType ? `（${change.changeType}）` : ''}
                    {change.distanceKmDelta != null
                      ? ` · ${change.distanceKmDelta >= 0 ? '+' : ''}${change.distanceKmDelta.toFixed(1)} km`
                      : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {draftDiff?.riskChanges && draftDiff.riskChanges.length > 0 ? (
            <div className={planGateCard}>
              <h4 className="mb-3 text-xs font-medium text-foreground">风险变化</h4>
              <ul className="space-y-1.5">
                {draftDiff.riskChanges.map((change, index) => (
                  <li
                    key={`risk-${change.label}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-2"
                  >
                    <span className="text-[11px] text-foreground">{change.label}</span>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', planGateRiskChangeClass(change.kind))}
                    >
                      {PLAN_GATE_RISK_CHANGE_LABEL[change.kind as keyof typeof PLAN_GATE_RISK_CHANGE_LABEL] ??
                        change.kind}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {compare.compareResult?.summary ? (
            <div className={planGateCard}>
              <h4 className="mb-3 text-xs font-medium text-foreground">对比摘要</h4>
              <div className="space-y-2 text-[11px] text-muted-foreground">
                {compare.compareResult.summary.bestBudget ? (
                  <p>最佳预算：{compare.compareResult.summary.bestBudget}</p>
                ) : null}
                {compare.compareResult.summary.bestRoute ? (
                  <p>最佳路线：{compare.compareResult.summary.bestRoute}</p>
                ) : null}
                {compare.compareResult.summary.bestTime ? (
                  <p>最佳时间：{compare.compareResult.summary.bestTime}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
