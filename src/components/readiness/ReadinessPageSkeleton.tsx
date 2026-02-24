/**
 * 准备度页面骨架屏
 *  mimicking Header + 分数 + Blockers 布局
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ReadinessPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header 骨架 */}
      <div className="border-b bg-background px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex gap-2 justify-end">
              <Skeleton className="h-10 w-32 rounded" />
              <Skeleton className="h-10 w-10 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Core 区域骨架 */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Card>
                <CardContent className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
