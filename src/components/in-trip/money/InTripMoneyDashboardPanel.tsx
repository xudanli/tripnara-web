import { format } from 'date-fns';
import { Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  bucketUsageBarClass,
  bucketUsageTextClass,
} from '@/lib/in-trip-money';
import type { MoneyDashboard } from '@/types/in-trip-money';
import { formatCurrency } from '@/utils/format';

interface InTripMoneyDashboardPanelProps {
  data: MoneyDashboard | null;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  onRecordExpense?: () => void;
  onViewRebalance?: () => void;
  className?: string;
}

export function InTripMoneyDashboardPanel({
  data,
  loading,
  error,
  disabled,
  onRecordExpense,
  onViewRebalance,
  className,
}: InTripMoneyDashboardPanelProps) {
  if (loading) {
    return (
      <Card className={cn('col-span-12', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (disabled) {
    return null;
  }

  if (error) {
    return (
      <Card className={cn('col-span-12 border-dashed', className)}>
        <CardContent className="py-4 text-sm text-muted-foreground text-center">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className={cn('col-span-12', className)}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-gate-allow-foreground" aria-hidden />
          消费智能 · Money Brain
        </CardTitle>
        <div className="flex items-center gap-2">
          {data.pendingRebalanceCount > 0 && onViewRebalance && (
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onViewRebalance}>
              再平衡
              <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">
                {data.pendingRebalanceCount}
              </Badge>
            </Button>
          )}
          {onRecordExpense && (
            <Button type="button" size="sm" className="h-8 text-xs" onClick={onRecordExpense}>
              记一笔
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap items-baseline gap-3 text-sm">
          <span>
            今日已花{' '}
            <strong className="text-foreground">
              {formatCurrency(data.todaySpendCny, 'CNY')}
            </strong>
          </span>
          {data.dailyBudget != null && (
            <span className="text-muted-foreground">
              / 日均 {formatCurrency(data.dailyBudget, data.currency)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.buckets.map((bucket) => (
            <div key={bucket.bucket} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{bucket.label}</span>
                <span className={cn(bucketUsageTextClass(bucket.usagePercent))}>
                  {bucket.usagePercent}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', bucketUsageBarClass(bucket.usagePercent))}
                  style={{ width: `${Math.min(bucket.usagePercent, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {formatCurrency(bucket.actual, bucket.currency)} /{' '}
                {formatCurrency(bucket.planned, bucket.currency)}
              </p>
            </div>
          ))}
        </div>

        {data.todayTransactions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">今日消费</p>
            <ul className="space-y-1.5">
              {data.todayTransactions.slice(0, 5).map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {tx.merchant || tx.description || tx.category}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(tx.recordedAt), 'HH:mm')} · {tx.bucketAssignment}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">
                    {formatCurrency(tx.amountCny, 'CNY')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
