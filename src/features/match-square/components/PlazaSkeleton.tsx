import { Skeleton } from '@/components/ui/skeleton';
import { plazaSkeleton } from '../lib/plaza-visual';

export function PlazaSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy aria-label="加载招募列表">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={plazaSkeleton.root}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1.5">
              <Skeleton className={plazaSkeleton.bone + ' h-3.5 w-40'} />
              <Skeleton className={plazaSkeleton.bone + ' h-3 w-full max-w-sm'} />
              <div className="flex gap-1">
                <Skeleton className={plazaSkeleton.bone + ' h-5 w-16 rounded-md'} />
                <Skeleton className={plazaSkeleton.bone + ' h-5 w-14 rounded-md'} />
              </div>
            </div>
            <Skeleton className={plazaSkeleton.bone + ' h-6 w-12 rounded-md'} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Skeleton className={plazaSkeleton.bone + ' h-3 w-48'} />
            <Skeleton className={plazaSkeleton.bone + ' h-7 w-16 rounded-md'} />
          </div>
        </div>
      ))}
    </div>
  );
}
