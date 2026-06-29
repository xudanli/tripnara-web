/**
 * Budget Tab 骨架屏 — 与 BudgetPlanningWorkbench 三栏布局对齐
 */

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function BudgetTabSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-full min-h-[480px] flex-col', className)}>
      <div className="shrink-0 border-b border-border bg-card px-4 py-3 sm:px-5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-3 w-48" />
        <div className="mt-3 flex justify-end gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[18%_1fr_22%]">
        <aside className="space-y-3 border-b border-border/60 p-3 xl:border-b-0 xl:border-r">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </aside>
        <main className="space-y-3 border-b border-border/60 p-3 xl:border-b-0 xl:border-r">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </main>
        <aside className="space-y-3 p-3">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-md" />
        </aside>
      </div>
    </div>
  );
}
