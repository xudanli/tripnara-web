/**
 * 行程详情页骨架屏
 *  mimicking Tab + Day 卡片 + 侧边栏布局
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

function DayCardSkeleton() {
  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3 w-24 mt-1" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-1 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 flex-1 rounded" />
          <Skeleton className="h-8 flex-1 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TripDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('h-full flex flex-col overflow-hidden', className)}>
      {/* 顶部 Header 骨架 */}
      <div className="border-b bg-white px-4 sm:px-6 py-2.5 sm:py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <div className="relative z-10 border-b bg-white px-4 sm:px-6 shadow-sm flex-shrink-0">
            <TabsList className="h-11">
              <TabsTrigger value="overview">总览</TabsTrigger>
              <TabsTrigger value="plan">规划</TabsTrigger>
              <TabsTrigger value="budget">预算</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50/50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
              <div className="lg:col-span-12 xl:col-span-8 space-y-3 sm:space-y-4">
                {[1, 2, 3].map((i) => (
                  <DayCardSkeleton key={i} />
                ))}
              </div>
              <div className="lg:col-span-12 xl:col-span-4 space-y-3 sm:space-y-4">
                <Card>
                  <CardHeader className="p-3 sm:p-4">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
                    <Skeleton className="h-8 w-full rounded" />
                    <Skeleton className="h-8 w-full rounded" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-3 sm:p-4">
                    <Skeleton className="h-4 w-20" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <Skeleton className="h-20 w-full rounded" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
