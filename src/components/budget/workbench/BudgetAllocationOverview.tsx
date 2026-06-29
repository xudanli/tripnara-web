import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import {
  workbenchBudgetAllocationDonutTrack,
  workbenchBudgetAllocationDonutCell,
  workbenchBudgetAllocationGrid,
  workbenchBudgetAllocationLegendAmount,
  workbenchBudgetAllocationLegendCell,
  workbenchBudgetAllocationLegendDot,
  workbenchBudgetAllocationLegendName,
  workbenchBudgetAllocationLegendPct,
  workbenchBudgetAllocationLegendRow,
  workbenchBudgetAllocationShell,
  workbenchBudgetAllocationStructureBadge,
  workbenchBudgetAllocationSummaryHero,
  workbenchBudgetAllocationSummaryShell,
  workbenchBudgetAllocationTitle,
  workbenchBudgetCategoryColors,
  workbenchDecisionCheckerBadgeClass,
  workbenchSecondaryMetric,
} from '@/components/plan-studio/workbench/workbench-ui';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency } from '@/utils/format';
import { equalAllocations, sumAllocations } from '@/lib/trip-budget-structure';
import type { BudgetAllocations } from '@/types/trip-budget';
import type { BudgetViewMode } from './budget-planning.util';

export type AllocationDataSource = 'actual' | 'structure' | 'none';

export interface AllocationSegment {
  key: string;
  name: string;
  value: number;
  color: string;
}

/** 与设计稿图例顺序一致 */
const SEGMENT_DISPLAY_ORDER = [
  'transportation',
  'accommodation',
  'food',
  'experience',
  'car_rental',
  'shopping',
  'reserve',
  'other',
] as const;

export interface BudgetAllocationOverviewProps {
  isZh: boolean;
  currency: string;
  viewMode: BudgetViewMode;
  memberCount: number;
  displayTotal: number;
  displayRemaining: number;
  bufferRate: number;
  estimatedTotal: number;
  dataSource: AllocationDataSource;
  riskLevel: 'low' | 'medium' | 'high';
  segments: AllocationSegment[];
}

function riskLabel(level: 'low' | 'medium' | 'high', isZh: boolean) {
  if (level === 'high') return isZh ? '偏高' : 'High';
  if (level === 'medium') return isZh ? '中等' : 'Medium';
  return isZh ? '可控' : 'Low';
}

function orderSegments(segments: AllocationSegment[]): AllocationSegment[] {
  const map = new Map(segments.map((seg) => [seg.key, seg]));
  return SEGMENT_DISPLAY_ORDER.map((key) => map.get(key)).filter(Boolean) as AllocationSegment[];
}

export function BudgetAllocationOverview({
  isZh,
  currency,
  viewMode,
  memberCount,
  displayTotal,
  displayRemaining,
  bufferRate,
  estimatedTotal,
  dataSource,
  riskLevel,
  segments,
}: BudgetAllocationOverviewProps) {
  const perCapita = viewMode === 'per_capita' && memberCount > 1;
  const personSuffix = isZh ? ' /人' : ' /pp';
  const groupTotal = perCapita ? displayTotal * memberCount : displayTotal;

  const chartData = useMemo(() => {
    const ordered = orderSegments(segments.filter((seg) => seg.value > 0));
    const segmentSum = ordered.reduce((sum, seg) => sum + seg.value, 0);
    const basis =
      dataSource === 'actual' && estimatedTotal > 0
        ? segmentSum
        : displayTotal > 0
          ? displayTotal
          : segmentSum;
    return ordered.map((seg) => ({
      ...seg,
      percentage: basis > 0 ? (seg.value / basis) * 100 : 0,
    }));
  }, [segments, dataSource, estimatedTotal, displayTotal]);

  const donutTotal = displayTotal > 0 ? displayTotal : chartData.reduce((sum, item) => sum + item.value, 0);
  const isStructurePreview = dataSource === 'structure';

  const summaryPanel = (
    <div className={workbenchBudgetAllocationSummaryShell}>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {isZh ? '当前方案总预算' : 'Current plan total'}
        </p>
        <p className={cn('mt-1', workbenchBudgetAllocationSummaryHero)}>
          {formatCurrency(displayTotal, currency)}
          {perCapita ? (
            <span className="text-xs font-semibold text-muted-foreground">{personSuffix}</span>
          ) : null}
        </p>
        {perCapita && memberCount > 1 ? (
          <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
            {formatCurrency(groupTotal, currency)}
            {isZh ? `（${memberCount}人）` : ` (${memberCount} ppl)`}
          </p>
        ) : null}
      </div>

      <div className="space-y-2.5 border-t border-border/50 pt-3 text-[11px]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground">{isZh ? '人均预算' : 'Per person'}</span>
          <span className={cn('font-semibold', workbenchSecondaryMetric)}>
            {formatCurrency(displayTotal, currency)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground">{isZh ? '预算缓冲' : 'Buffer'}</span>
          <span className="font-semibold tabular-nums text-gate-allow-foreground">
            {formatCurrency(Math.max(displayRemaining, 0), currency)}
            <span className="ml-1 font-normal text-muted-foreground">
              ({bufferRate.toFixed(1)}%)
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 text-muted-foreground">{isZh ? '超支风险' : 'Overspend risk'}</span>
          <span className="inline-flex items-center gap-1">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                workbenchDecisionCheckerBadgeClass(
                  riskLevel === 'high' ? 'danger' : riskLevel === 'medium' ? 'warning' : 'success',
                ),
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  riskLevel === 'high'
                    ? 'bg-gate-reject-foreground'
                    : riskLevel === 'medium'
                      ? 'bg-gate-confirm-foreground'
                      : 'bg-gate-allow-foreground',
                )}
              />
              {riskLabel(riskLevel, isZh)}
            </span>
            <TooltipProvider delayDuration={200}>
              <UiTooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={isZh ? '超支风险说明' : 'Overspend risk info'}
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {isZh
                    ? '基于日均节奏、单项占比与缓冲率综合评估'
                    : 'Based on daily pacing, item share, and buffer rate'}
                </TooltipContent>
              </UiTooltip>
            </TooltipProvider>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <section className={workbenchBudgetAllocationShell}>
      <div className="flex flex-wrap items-center gap-2">
        <p className={workbenchBudgetAllocationTitle}>
          {isZh ? '预算分配概览' : 'Budget allocation'}
        </p>
        {isStructurePreview && chartData.length > 0 ? (
          <span className={workbenchBudgetAllocationStructureBadge}>
            {isZh ? '结构预算' : 'Structure'}
          </span>
        ) : null}
      </div>

      {displayTotal <= 0 && chartData.length === 0 ? (
        <div className="mt-4 space-y-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {isZh ? '请先设置总预算，再录入行程费用以查看分类占比' : 'Set a total budget, then add itinerary costs to see the breakdown.'}
          </p>
          {summaryPanel}
        </div>
      ) : (
        <div className={workbenchBudgetAllocationGrid}>
          <div
            className={workbenchBudgetAllocationDonutCell}
            style={{ width: 128, height: 128 }}
          >
            <div className={workbenchBudgetAllocationDonutTrack} />
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={62}
                  paddingAngle={1.5}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.5rem',
                    border: '1px solid hsl(var(--border) / 0.7)',
                    fontSize: '11px',
                  }}
                  formatter={(value: number, _name, item) => [
                    `${formatCurrency(value, currency)} (${(item.payload as { percentage: number }).percentage.toFixed(1)}%)`,
                    (item.payload as { name: string }).name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
              <p className={cn('text-[15px] font-bold leading-none', workbenchSecondaryMetric)}>
                {formatCurrency(donutTotal, currency)}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                {isZh ? '总预算' : 'Total'}
                {perCapita ? personSuffix : ''}
              </p>
            </div>
          </div>

          <ul className={workbenchBudgetAllocationLegendCell}>
            {chartData.map((item) => (
              <li key={item.key} className={workbenchBudgetAllocationLegendRow}>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={workbenchBudgetAllocationLegendDot}
                    style={{ backgroundColor: item.color }}
                  />
                  <span className={workbenchBudgetAllocationLegendName}>{item.name}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className={workbenchBudgetAllocationLegendAmount}>
                    {formatCurrency(item.value, currency)}
                  </span>
                  <span className={workbenchBudgetAllocationLegendPct}>
                    {item.percentage.toFixed(1)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {summaryPanel}
        </div>
      )}
    </section>
  );
}

export function buildAllocationSegments(
  breakdown: BudgetAllocations | undefined,
  intentTotal: number,
  estimatedTotal: number,
  isZh: boolean,
  structureAllocations?: BudgetAllocations,
): { segments: AllocationSegment[]; source: AllocationDataSource } {
  const labelMap: Record<string, { zh: string; en: string }> = {
    transportation: { zh: '交通', en: 'Transport' },
    accommodation: { zh: '住宿', en: 'Stay' },
    food: { zh: '餐饮', en: 'Dining' },
    experience: { zh: '活动', en: 'Activities' },
    car_rental: { zh: '租车', en: 'Car rental' },
    shopping: { zh: '购物', en: 'Shopping' },
    other: { zh: '其他', en: 'Other' },
    reserve: { zh: '备用金', en: 'Reserve' },
  };

  const hasSpending = (allocations?: BudgetAllocations) =>
    Boolean(allocations && sumAllocations(allocations) > 0);

  let source: AllocationDataSource;
  let base: BudgetAllocations;

  if (hasSpending(breakdown)) {
    source = 'actual';
    base = breakdown!;
  } else if (hasSpending(structureAllocations)) {
    source = 'structure';
    base = structureAllocations!;
  } else if (intentTotal > 0) {
    source = 'structure';
    base = equalAllocations(intentTotal);
  } else {
    return { segments: [], source: 'none' };
  }

  const carRentalShare = base.transportation > 0 ? 0.28 : 0;
  const transportMain = base.transportation * (1 - carRentalShare);
  const carRental = base.transportation * carRentalShare;
  const shoppingShare = base.other > 0 ? 0.68 : 0;
  const shopping = base.other * shoppingShare;
  const otherRest = base.other * (1 - shoppingShare);

  const values: Record<string, number> = {
    transportation: transportMain,
    accommodation: base.accommodation,
    food: base.food,
    experience: base.experience,
    car_rental: carRental,
    shopping,
    other: otherRest,
  };

  const allocated = Object.values(values).reduce((sum, value) => sum + value, 0);
  const buffer = Math.max(0, intentTotal - estimatedTotal);
  if (buffer > 0 && intentTotal > 0 && estimatedTotal > 0) {
    values.reserve = buffer;
  } else if (source === 'structure' && intentTotal > allocated + 1) {
    values.reserve = intentTotal - allocated;
  }

  const segments = SEGMENT_DISPLAY_ORDER.map((key) => {
    const value = values[key] ?? 0;
    if (value <= 0) return null;
    const labels = labelMap[key] ?? { zh: key, en: key };
    return {
      key,
      name: isZh ? labels.zh : labels.en,
      value,
      color: workbenchBudgetCategoryColors[key] ?? workbenchBudgetCategoryColors.other,
    };
  }).filter(Boolean) as AllocationSegment[];

  return { segments, source };
}
