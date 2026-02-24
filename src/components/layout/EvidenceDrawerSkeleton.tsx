/**
 * Evidence Drawer 骨架屏
 */

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function EvidenceItemSkeleton() {
  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function EvidenceDrawerSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('p-4 space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <EvidenceItemSkeleton key={i} />
      ))}
    </div>
  );
}
