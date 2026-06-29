import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { workbenchDecisionCheckerBadgeClass, workbenchInsetSection } from '@/components/plan-studio/workbench/workbench-ui';
import { formatBudgetVerdict } from '@/lib/budget-compare.util';
import type { BudgetComparisonRow } from '@/lib/budget-compare.util';
import { formatCurrency } from '@/utils/format';
import type { AllocationDataSource, AllocationSegment } from './BudgetAllocationOverview';
import { BudgetAllocationOverview } from './BudgetAllocationOverview';
import type { BudgetDailyBucket, BudgetLineRow, BudgetViewMode } from './budget-planning.util';
import { BudgetDailyTimeline } from './BudgetDailyTimeline';
import { BudgetItineraryTable } from './BudgetItineraryTable';

export interface BudgetPlanningMainPanelProps {
  isZh: boolean;
  currency: string;
  viewMode: BudgetViewMode;
  memberCount: number;
  displayTotal: number;
  displayRemaining: number;
  bufferRate: number;
  estimatedTotal: number;
  usagePercent: number;
  riskLevel: 'low' | 'medium' | 'high';
  allocationSegments: AllocationSegment[];
  allocationSource: AllocationDataSource;
  dailyBuckets: BudgetDailyBucket[];
  lineRows: BudgetLineRow[];
  comparisonRows?: BudgetComparisonRow[];
  comparisonLoading?: boolean;
  recommendedPlanId?: string | null;
  onEditRow?: (row: BudgetLineRow) => void;
}

export function BudgetPlanningMainPanel({
  isZh,
  currency,
  viewMode,
  memberCount,
  displayTotal,
  displayRemaining,
  bufferRate,
  estimatedTotal,
  usagePercent: _usagePercent,
  riskLevel,
  allocationSegments,
  allocationSource,
  dailyBuckets,
  lineRows,
  comparisonRows = [],
  comparisonLoading = false,
  recommendedPlanId,
  onEditRow,
}: BudgetPlanningMainPanelProps) {
  const hasComparison = comparisonRows.length > 0;

  return (
    <div className="space-y-3 p-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <BudgetAllocationOverview
          isZh={isZh}
          currency={currency}
          viewMode={viewMode}
          memberCount={memberCount}
          displayTotal={displayTotal}
          displayRemaining={displayRemaining}
          bufferRate={bufferRate}
          estimatedTotal={estimatedTotal}
          dataSource={allocationSource}
          riskLevel={riskLevel}
          segments={allocationSegments}
        />
        <BudgetDailyTimeline buckets={dailyBuckets} currency={currency} isZh={isZh} />
      </div>

      <BudgetItineraryTable rows={lineRows} currency={currency} isZh={isZh} onEditRow={onEditRow} />

      <section className={cn(workbenchInsetSection, 'overflow-hidden p-0')}>
        <div className="border-b border-border/60 px-3 py-2.5">
          <p className="text-sm font-semibold tracking-tight">
            {isZh ? '预算方案对比' : 'Plan comparison'}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {hasComparison
              ? recommendedPlanId
                ? isZh
                  ? '基于 budget/compare 评估，推荐方案已高亮'
                  : 'From budget/compare; recommended plan highlighted'
                : isZh
                  ? '多方案预算门控对比'
                  : 'Multi-plan budget gate comparison'
              : isZh
                ? comparisonLoading
                  ? '正在加载方案对比…'
                  : '需至少一个规划方案与 L1 总预算'
                : comparisonLoading
                  ? 'Loading plan comparison…'
                  : 'Requires at least one plan and L1 budget'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground">
                <th className="px-3 py-2 font-medium">{isZh ? '方案' : 'Plan'}</th>
                <th className="px-3 py-2 font-medium">{isZh ? '成本' : 'Cost'}</th>
                <th className="px-3 py-2 font-medium">{isZh ? '成本分' : 'Cost score'}</th>
                <th className="px-3 py-2 font-medium">{isZh ? '门控' : 'Verdict'}</th>
                <th className="px-3 py-2 font-medium">{isZh ? '违规' : 'Violations'}</th>
                <th className="px-3 py-2 font-medium">{isZh ? '首要热点' : 'Top hotspot'}</th>
              </tr>
            </thead>
            <tbody>
              {comparisonLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                    {isZh ? '对比计算中…' : 'Comparing plans…'}
                  </td>
                </tr>
              ) : hasComparison ? (
                comparisonRows.map((plan) => (
                  <tr
                    key={plan.planId}
                    className={cn(
                      'border-b border-border/40 last:border-0',
                      plan.recommended && 'bg-gate-allow/10',
                    )}
                  >
                    <td className="px-3 py-2.5 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {plan.label}
                        {plan.recommended ? (
                          <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal">
                            {isZh ? '推荐' : 'Pick'}
                          </Badge>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {plan.costDisplayValue ? (
                        <span className="font-medium tabular-nums">{plan.costDisplayValue}</span>
                      ) : (
                        <span className="tabular-nums">
                          {formatCurrency(
                            viewMode === 'per_capita' && memberCount > 1
                              ? plan.estimatedCost / memberCount
                              : plan.estimatedCost,
                            currency,
                          )}
                          {plan.budgetUsagePercent > 0 ? (
                            <span className="ml-1 text-muted-foreground">
                              · {plan.budgetUsagePercent.toFixed(0)}%
                            </span>
                          ) : null}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {plan.costScore != null ? plan.costScore.toFixed(0) : plan.budgetUsagePercent.toFixed(0)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-normal',
                            workbenchDecisionCheckerBadgeClass(
                              plan.risk === 'high' ? 'danger' : plan.risk === 'medium' ? 'warning' : 'success',
                            ),
                          )}
                        >
                          {formatBudgetVerdict(plan.verdict, isZh)}
                        </Badge>
                        {plan.gateStatus && plan.gateStatus !== plan.verdict ? (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            Gate: {formatBudgetVerdict(plan.gateStatus, isZh)}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{plan.violationCount}</td>
                    <td className="max-w-[140px] truncate px-3 py-2.5 text-[11px] text-muted-foreground">
                      {plan.topHotspot ?? '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                    {isZh ? '暂无多方案对比数据' : 'No comparison data yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
