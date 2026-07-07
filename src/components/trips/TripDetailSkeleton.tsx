/**
 * 行程详情页骨架屏
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import TripDetailTabNav from '@/components/trips/detail/TripDetailTabNav';
import { cn } from '@/lib/utils';

function DayCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 flex-1 rounded" />
        <Skeleton className="h-8 flex-1 rounded" />
      </div>
    </div>
  );
}

export function TripDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('h-full flex flex-col overflow-hidden', className)}>
      <div className="border-b bg-white px-4 sm:px-6 py-4 shadow-sm flex-shrink-0 space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Tabs defaultValue="timeline" className="flex-1 flex flex-col overflow-hidden">
          <TripDetailTabNav />
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-muted/30">
            <TabsContent value="timeline" className="mt-0 space-y-3">
              {[1, 2, 3].map((i) => (
                <DayCardSkeleton key={i} />
              ))}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
