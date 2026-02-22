/**
 * 执行阶段 - 行程时间线
 * 主区展示今日/全部行程，降低认知负荷
 * 参考: docs/execute-page-ux-optimization-plan.md
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, ArrowRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { TripDetail, TripState, ScheduleResponse } from '@/types/trip';
import type { ScheduleItem } from '@/types/trip';

interface ExecuteItineraryTimelineProps {
  trip: TripDetail | null;
  tripState: TripState | null;
  todaySchedule: ScheduleResponse | null;
  formatPlaceName: (placeName: string, place?: { nameCN?: string; nameEN?: string | null }) => string;
  findPlaceById: (placeId: number) => { nameCN?: string; nameEN?: string | null } | undefined;
}

/** 今日模式：单日行程项（按 placeId 匹配） */
function TodayItemsList({
  items,
  currentPlaceId,
  nextPlaceId,
  formatPlaceName,
  findPlaceById,
}: {
  items: ScheduleItem[];
  currentPlaceId?: number | null;
  nextPlaceId?: number | null;
  formatPlaceName: (a: string, b?: any) => string;
  findPlaceById: (id: number) => any;
}) {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Calendar className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">暂无今日安排</p>
        <p className="text-xs">今天没有计划的活动</p>
      </div>
    );
  }

  const currentIdx = currentPlaceId != null ? items.findIndex(i => i.placeId === currentPlaceId) : -1;

  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const isCurrent = item.placeId === currentPlaceId;
        const isNext = item.placeId === nextPlaceId;
        const isPast = currentIdx >= 0 && idx < currentIdx;

        return (
          <div
            key={`${item.placeId}-${idx}`}
            className={cn(
              'p-3 border rounded-lg transition-colors',
              isCurrent && 'bg-primary/10 border-primary',
              isNext && 'bg-amber-50 border-amber-200',
              isPast && 'opacity-60',
              !isCurrent && !isNext && !isPast && 'bg-card'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {formatPlaceName(item.placeName, findPlaceById(item.placeId))}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {/^\d{2}:\d{2}$/.test(item.startTime) ? item.startTime : format(new Date(item.startTime), 'HH:mm')}
                  {' - '}
                  {/^\d{2}:\d{2}$/.test(item.endTime) ? item.endTime : format(new Date(item.endTime), 'HH:mm')}
                </div>
              </div>
              <div className="flex-shrink-0">
                {isCurrent && <Badge className="bg-primary">当前</Badge>}
                {isNext && <Badge variant="outline" className="border-amber-400 text-amber-700">下一站</Badge>}
                {!isCurrent && !isNext && !isPast && <Badge variant="outline">待执行</Badge>}
                {isPast && <Badge variant="secondary" className="opacity-70">已完成</Badge>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 全部模式：按日分组 */
function AllDaysList({
  trip,
  currentDayId,
  currentItemId,
  nextStopItemId,
  formatPlaceName,
}: {
  trip: TripDetail | null;
  currentDayId?: string | null;
  currentItemId?: string | null;
  nextStopItemId?: string | null;
  formatPlaceName: (a: string, b?: any) => string;
}) {
  const days = trip?.TripDay || [];
  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Calendar className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">暂无行程</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {days.map((day) => {
        const items = day.ItineraryItem || [];
        const isCurrentDay = day.id === currentDayId;

        return (
          <div key={day.id} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2 z-10">
              <Calendar className="w-4 h-4" />
              {format(new Date(day.date), 'M月d日 EEEE', { locale: zhCN })}
              {isCurrentDay && (
                <Badge variant="secondary" className="text-xs">今天</Badge>
              )}
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => {
                const isCurrent = isCurrentDay && currentItemId === item.id;
                const isNext = isCurrentDay && nextStopItemId === item.id;
                const currentIdx = isCurrentDay && currentItemId ? items.findIndex(i => i.id === currentItemId) : -1;
                const isPast = isCurrentDay && currentIdx >= 0 && idx < currentIdx;
                const placeName = item.Place?.nameCN || item.Place?.nameEN || item.note || '未知';

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-3 border rounded-lg transition-colors',
                      isCurrent && 'bg-primary/10 border-primary',
                      isNext && 'bg-amber-50 border-amber-200',
                      isPast && 'opacity-60',
                      !isCurrent && !isNext && !isPast && 'bg-card'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {formatPlaceName(placeName, item.Place)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.startTime && (/^\d{2}:\d{2}$/.test(item.startTime) ? item.startTime : format(new Date(item.startTime), 'HH:mm'))}
                          {item.endTime && ` - ${/^\d{2}:\d{2}$/.test(item.endTime) ? item.endTime : format(new Date(item.endTime), 'HH:mm')}`}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isCurrent && <Badge className="bg-primary">当前</Badge>}
                        {isNext && <Badge variant="outline" className="border-amber-400 text-amber-700">下一站</Badge>}
                        {isPast && <Badge variant="secondary" className="opacity-70">已完成</Badge>}
                        {!isCurrent && !isNext && !isPast && isCurrentDay && <Badge variant="outline">待执行</Badge>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">当天暂无安排</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ExecuteItineraryTimeline({
  trip,
  tripState,
  todaySchedule,
  formatPlaceName,
  findPlaceById,
}: ExecuteItineraryTimelineProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');

  const todayItems = todaySchedule?.schedule?.items || [];
  const currentItemId = tripState?.currentItemId;
  const nextStopItemId = tripState?.nextStop?.itemId;
  const nextPlaceId = tripState?.nextStop?.placeId ?? undefined;

  // 今日模式：从 currentItemId 推导 currentPlaceId（今日 TripDay 中对应 ItineraryItem 的 placeId）
  const currentPlaceId = (() => {
    if (!currentItemId || !trip?.TripDay || !todaySchedule?.date) return undefined;
    const todayDay = trip.TripDay.find(
      d => format(new Date(d.date), 'yyyy-MM-dd') === format(new Date(todaySchedule!.date), 'yyyy-MM-dd')
    );
    const item = todayDay?.ItineraryItem?.find(i => i.id === currentItemId);
    return item?.placeId ?? undefined;
  })();

  return (
    <Card data-tour="itinerary-timeline">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRight className="h-5 w-5" />
            行程
          </CardTitle>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'today' | 'all')}>
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs">今日</TabsTrigger>
              <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="pt-0 max-h-[60vh] overflow-y-auto">
        {activeTab === 'today' ? (
          <TodayItemsList
            items={todayItems}
            currentPlaceId={currentPlaceId}
            nextPlaceId={nextPlaceId}
            formatPlaceName={formatPlaceName}
            findPlaceById={findPlaceById}
          />
        ) : (
          <AllDaysList
            trip={trip}
            currentDayId={tripState?.currentDayId}
            currentItemId={currentItemId}
            nextStopItemId={nextStopItemId}
            formatPlaceName={formatPlaceName}
          />
        )}
      </CardContent>
    </Card>
  );
}
