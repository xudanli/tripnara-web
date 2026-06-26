/**
 * Budget Tab 骨架屏 — 与 TripBudgetPanel 卡片布局对齐
 */

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function skeletonCard(className?: string) {
  return cn('rounded-lg border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-4', className);
}

export function BudgetTabSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto max-w-3xl space-y-4', className)}>
      <div className={skeletonCard()}>
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-md shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0" />
        </div>
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
      <div className={skeletonCard()}>
        <div className="flex justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
