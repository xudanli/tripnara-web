/**
 * 规划Tab - 时间轴视图组件
 * 显示每日行程项列表，支持添加、编辑、删除操作
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Plus, MapPin, Clock, Edit, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TripDay, ItineraryItem, DayMetricsResponse } from '@/types/trip';
import { EmptyStateCard } from '@/components/ui/empty-state-images';

interface PlanTimelineViewProps {
  tripDays: TripDay[];
  dayMetricsMap: Map<string, DayMetricsResponse>;
  onAddItem?: (dayId: string) => void;
  onEditItem?: (item: ItineraryItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onViewItem?: (item: ItineraryItem) => void;
  disabled?: boolean; // 已取消状态下禁用操作
}

export default function PlanTimelineView({
  tripDays,
  dayMetricsMap,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onViewItem,
  disabled = false,
}: PlanTimelineViewProps) {
  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return format(date, 'HH:mm');
    } catch {
      return timeStr;
    }
  };

  const getItemTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ACTIVITY: '活动',
      FOOD: '美食',
      ACCOMMODATION: '住宿',
      TRANSPORTATION: '交通',
    };
    return labels[type] || type;
  };

  const getItemTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ACTIVITY: 'bg-blue-100 text-blue-700',
      FOOD: 'bg-orange-100 text-orange-700',
      ACCOMMODATION: 'bg-purple-100 text-purple-700',
      TRANSPORTATION: 'bg-green-100 text-green-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (tripDays.length === 0) {
    return (
      <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="py-24 px-8 min-h-[60vh] flex items-center justify-center">
          <EmptyStateCard
            type="no-trip-added"
            title="你还没有添加任何行程项"
            description="添加第一站，开启你的专属旅程吧！"
            imageWidth={180}
            imageHeight={180}
            action={
              disabled ? null : (
                <Button
                  size="lg"
                  onClick={() => {
                    const firstDay = tripDays[0];
                    if (firstDay && onAddItem) {
                      onAddItem(firstDay.id);
                    }
                  }}
                  className="mt-4"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  创建第一个行程项
                </Button>
              )
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {tripDays.map((day, idx) => {
        const dayMetrics = dayMetricsMap.get(day.date);
        const items = day.ItineraryItem || [];
        const dayDate = new Date(day.date);
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[dayDate.getUTCDay()];

        return (
          <Card key={day.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl font-bold">
                      Day {idx + 1}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground font-medium">
                      {format(dayDate, 'yyyy.MM.dd')} {weekday}
                    </div>
                  </div>
                  {day.theme && (
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {day.theme}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <MapPin className="w-3 h-3" />
                      共 {items.length} 个行程项
                    </Badge>
                    {dayMetrics && dayMetrics.conflicts.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {dayMetrics.conflicts.length} 个冲突
                      </Badge>
                    )}
                  </div>
                </div>
                {/* ✅ 快速添加按钮（右上角） */}
                {!disabled && onAddItem && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddItem(day.id)}
                    className="flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">添加</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {items.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    这一天还没有行程项
                  </p>
                  {!disabled && onAddItem && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAddItem(day.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加行程项
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => {
                    const placeName = item.Place?.nameCN || item.Place?.nameEN || item.note || '未命名地点';
                    
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors',
                          'group'
                        )}
                      >
                        <div className="flex-shrink-0">
                          <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={cn('text-xs', getItemTypeColor(item.type))}
                            >
                              {getItemTypeLabel(item.type)}
                            </Badge>
                            <span className="font-semibold text-sm truncate">
                              {placeName}
                            </span>
                          </div>
                          {item.startTime && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatTime(item.startTime)}
                              {item.endTime && ` - ${formatTime(item.endTime)}`}
                            </div>
                          )}
                        </div>
                        {!disabled && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {onViewItem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewItem(item)}
                                className="h-8 w-8 p-0"
                              >
                                <MapPin className="w-4 h-4" />
                              </Button>
                            )}
                            {onEditItem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditItem(item)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {onDeleteItem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteItem(item.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!disabled && onAddItem && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAddItem(day.id)}
                      className="w-full mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加行程项
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
