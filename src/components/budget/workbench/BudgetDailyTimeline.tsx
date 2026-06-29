import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { workbenchInsetSection, workbenchSecondaryMetric } from '@/components/plan-studio/workbench/workbench-ui';
import { formatCurrency } from '@/utils/format';
import type { BudgetDailyBucket } from './budget-planning.util';

export interface BudgetDailyTimelineProps {
  buckets: BudgetDailyBucket[];
  currency: string;
  isZh: boolean;
}

export function BudgetDailyTimeline({ buckets, currency, isZh }: BudgetDailyTimelineProps) {
  if (buckets.length === 0) {
    return (
      <section
        className={cn(
          workbenchInsetSection,
          'flex h-full min-h-[220px] flex-col items-center justify-center p-4 text-center',
        )}
      >
        <p className="text-xs font-medium text-foreground">
          {isZh ? '暂无行程天数' : 'No trip days yet'}
        </p>
        <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-muted-foreground">
          {isZh ? '完善行程日期后，将展示每日预算节奏' : 'Add trip dates to see daily budget pacing.'}
        </p>
      </section>
    );
  }

  const hasSpending = buckets.some((bucket) => bucket.amount > 0);
  const maxAmount = Math.max(
    ...buckets.map((b) => b.amount),
    ...buckets.map((b) => b.dailyBudget ?? 0),
    1,
  );
  const axisMax = Math.ceil(maxAmount / 1000) * 1000 || 1000;

  return (
    <section className={cn(workbenchInsetSection, 'h-full')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold tracking-tight">
          {isZh ? '日均预算时间轴' : 'Daily budget timeline'}
        </p>
        <p className="text-[10px] text-muted-foreground">
          ({currency}{isZh ? ' / 人' : ' / pp'})
        </p>
      </div>

      {!hasSpending ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5">
          <p className="text-[11px] font-medium text-foreground">
            {isZh ? '尚未录入每日费用' : 'No daily costs recorded yet'}
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
            {isZh
              ? '在时间轴为活动添加预估费用后，将显示每日支出与超支提示'
              : 'Add estimated costs to schedule items to see daily spend bars.'}
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {buckets.map((bucket) => {
          const widthPct = bucket.amount > 0 ? Math.max(4, (bucket.amount / axisMax) * 100) : 0;
          return (
            <div key={bucket.dayIndex} className="grid grid-cols-[76px_minmax(0,1fr)_72px] items-center gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{bucket.label}</p>
                {bucket.dateLabel ? (
                  <p className="text-[10px] text-muted-foreground">{bucket.dateLabel}</p>
                ) : null}
              </div>

              <div
                className={cn(
                  'relative h-7 rounded-full',
                  hasSpending ? 'bg-muted/60' : 'border border-dashed border-border/60 bg-muted/25',
                )}
              >
                {hasSpending ? (
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-all',
                      bucket.overBudget ? 'bg-gate-confirm/45' : 'bg-primary/20',
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                ) : null}
                {bucket.overBudget && hasSpending ? (
                  <AlertTriangle className="absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gate-confirm-foreground" />
                ) : null}
              </div>

              <p
                className={cn(
                  'text-right text-xs font-semibold tabular-nums',
                  bucket.amount > 0 ? workbenchSecondaryMetric : 'text-muted-foreground',
                )}
              >
                {bucket.amount > 0 ? formatCurrency(bucket.amount, currency) : '—'}
              </p>
            </div>
          );
        })}
      </div>

      {hasSpending ? (
        <div className="mt-4 flex justify-between border-t border-border/50 pt-2 text-[10px] tabular-nums text-muted-foreground">
          <span>0</span>
          <span>{Math.round(axisMax / 3000)}k</span>
          <span>{Math.round(axisMax / 1500)}k</span>
          <span>{Math.round(axisMax / 1000)}k</span>
        </div>
      ) : null}
    </section>
  );
}
