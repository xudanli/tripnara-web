/**
 * 行程 Tab 骨架屏
 * 在时间轴加载时展示，减轻等待焦虑，符合 TripNARA 克制、专业的设计原则
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** 单日时间轴骨架 */
function DayCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 交通摘要 */}
          <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>

          {/* 行程项行 x4 */}
          <div className="mt-4 space-y-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
                {/* 时间 */}
                <Skeleton className="h-4 w-14 shrink-0 mt-0.5" />
                {/* 图标占位 */}
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                {/* 内容 */}
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                {/* 操作区 */}
                <div className="flex gap-1 shrink-0">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** 右侧健康度卡片骨架 */
function HealthCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** 准备度卡片骨架 */
function ReadinessCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-9 w-full rounded-md" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 rounded" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded" />
          <Skeleton className="h-9 flex-1 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ScheduleTabSkeletonProps {
  className?: string;
  /** 显示的天数卡片数，默认 2 */
  dayCount?: number;
}

export function ScheduleTabSkeleton({ className, dayCount = 2 }: ScheduleTabSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-12 gap-6', className)}>
      {/* 左：时间轴 */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        {Array.from({ length: dayCount }).map((_, i) => (
          <DayCardSkeleton key={i} />
        ))}
      </div>

      {/* 右：健康度 + 准备度 */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <HealthCardSkeleton />
        <ReadinessCardSkeleton />
      </div>
    </div>
  );
}
