import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle, Clock, MapPin, GripVertical, MoreVertical } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import type { TripDetail, ScheduleResponse } from '@/types/trip';
import { format } from 'date-fns';
import { useDrawer } from '@/components/layout/DashboardLayout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';

interface ScheduleTabProps {
  tripId: string;
  personaMode?: PersonaMode;
}

export default function ScheduleTab({ tripId, personaMode = 'abu' }: ScheduleTabProps) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [schedules, setSchedules] = useState<Map<string, ScheduleResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const { setDrawerOpen, setDrawerTab, setHighlightItemId } = useDrawer();

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const data = await tripsApi.getById(tripId);
      setTrip(data);
      
      // 加载所有日期的 Schedule
      if (data.TripDay && data.TripDay.length > 0) {
        const scheduleMap = new Map<string, ScheduleResponse>();
        for (const day of data.TripDay) {
          try {
            const schedule = await tripsApi.getSchedule(tripId, day.date);
            scheduleMap.set(day.date, schedule);
          } catch (err) {
            console.error(`Failed to load schedule for ${day.date}:`, err);
          }
        }
        setSchedules(scheduleMap);
      }
    } catch (err) {
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFixConflict = (conflictType: string, dayDate: string) => {
    setDrawerTab('risk');
    setDrawerOpen(true);
    setHighlightItemId(`${conflictType}-${dayDate}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!trip || !trip.TripDay || trip.TripDay.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>暂无行程安排</p>
          <p className="text-sm mt-2">请先在 Places Tab 添加地点</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* 左（8/12）：Day Timeline */}
      <div className="col-span-12 lg:col-span-8 space-y-6" data-tour="schedule-timeline">
        {trip.TripDay.map((day, idx) => {
          const schedule = schedules.get(day.date);
          const items = schedule?.schedule?.items || [];
          
          // 计算每日指标（TODO: 从 API 获取真实数据）
          const dailyMetrics = {
            walk: 8.5,
            drive: 30,
            buffer: 45,
            conflicts: ['午餐时间窗过短'],
          };

          return (
            <Card key={day.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Day {idx + 1} - {format(new Date(day.date), 'yyyy-MM-dd')}
                  </CardTitle>
                  <Badge variant="outline">{day.date}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 每日摘要 */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>总步行: {dailyMetrics.walk} km</span>
                    </div>
                    <span>•</span>
                    <span>车程: {dailyMetrics.drive} min</span>
                    <span>•</span>
                    <span>缓冲: {dailyMetrics.buffer} min</span>
                  </div>

                  {/* 冲突提示 */}
                  {dailyMetrics.conflicts.length > 0 && (
                    <div className="space-y-1">
                      {dailyMetrics.conflicts.map((conflict, cIdx) => (
                        <div
                          key={cIdx}
                          className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span>{conflict}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto h-6 text-xs"
                            onClick={() => handleFixConflict(conflict, day.date)}
                          >
                            Fix
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 时间轴卡片 */}
                  <div className="mt-4 space-y-2">
                    {items.length > 0 ? (
                      items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="p-3 border rounded-lg cursor-move hover:border-primary transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary" />
                                  {item.placeName}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {item.startTime} - {item.endTime}
                                </div>
                              </div>
                              <Badge variant="outline">{item.type}</Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Split</DropdownMenuItem>
                                <DropdownMenuItem>Move</DropdownMenuItem>
                                <DropdownMenuItem>Replace</DropdownMenuItem>
                                <DropdownMenuItem>Skip</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        该日暂无安排
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 右（4/12）：指标面板 + 冲突列表 */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        {/* 指标面板 */}
        <Card>
          <CardHeader>
            <CardTitle>每日指标</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">平均步行</div>
              <div className="text-2xl font-bold">8.5 km</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">平均车程</div>
              <div className="text-2xl font-bold">30 min</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">平均缓冲</div>
              <div className="text-2xl font-bold">45 min</div>
            </div>
          </CardContent>
        </Card>

        {/* 冲突列表 */}
        <Card data-tour="schedule-conflicts">
          <CardHeader>
            <CardTitle>冲突列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div
                className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                onClick={() => handleFixConflict('time_window', 'all')}
              >
                <div className="text-sm font-medium">时间窗冲突</div>
                <div className="text-xs text-muted-foreground">Day 1, Day 2</div>
              </div>
              <div
                className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                onClick={() => handleFixConflict('transport', 'all')}
              >
                <div className="text-sm font-medium">交通过长</div>
                <div className="text-xs text-muted-foreground">Day 2</div>
              </div>
              <div
                className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                onClick={() => handleFixConflict('fatigue', 'all')}
              >
                <div className="text-sm font-medium">体力超载</div>
                <div className="text-xs text-muted-foreground">Day 3</div>
              </div>
              <div
                className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                onClick={() => handleFixConflict('meal', 'all')}
              >
                <div className="text-sm font-medium">缺餐</div>
                <div className="text-xs text-muted-foreground">Day 1</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="space-y-2">
          <Button className="w-full" data-tour="schedule-optimize" onClick={() => {
            // TODO: 调用优化 API
            console.log('Run Optimize');
          }}>
            Run Optimize
          </Button>
          <Button variant="outline" className="w-full" onClick={() => {
            // TODO: 自动添加缓冲
            console.log('Auto-add buffers');
          }}>
            Auto-add buffers
          </Button>
        </div>
      </div>
    </div>
  );
}

