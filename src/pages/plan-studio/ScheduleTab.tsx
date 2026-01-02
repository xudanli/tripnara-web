import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle, Clock, MapPin, GripVertical, MoreVertical } from 'lucide-react';
import { tripsApi, itineraryItemsApi } from '@/api/trips';
import { itineraryOptimizationApi } from '@/api/itinerary-optimization';
import type { TripDetail, ScheduleResponse, ScheduleItem, ItineraryItemDetail, ItineraryItem, ReplaceItineraryItemResponse, DayMetricsResponse, PlanStudioConflict } from '@/types/trip';
import type { OptimizeRouteRequest } from '@/types/itinerary-optimization';
import { format } from 'date-fns';
import { useDrawer } from '@/components/layout/DashboardLayout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditItineraryItemDialog } from '@/components/trips/EditItineraryItemDialog';
import { ReplaceItineraryItemDialog } from '@/components/trips/ReplaceItineraryItemDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';
import { toast } from 'sonner';
import ItineraryItemRow from '@/components/plan-studio/ItineraryItemRow';

interface ScheduleTabProps {
  tripId: string;
  personaMode?: PersonaMode;
  refreshKey?: number; // 用于触发刷新
}

export default function ScheduleTab({ tripId, personaMode = 'abu', refreshKey }: ScheduleTabProps) {
  const { t } = useTranslation();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [schedules, setSchedules] = useState<Map<string, ScheduleResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [itineraryItemsMap, setItineraryItemsMap] = useState<Map<string, ItineraryItemDetail[]>>(new Map());
  const [dayMetricsMap, setDayMetricsMap] = useState<Map<string, DayMetricsResponse>>(new Map());
  const [conflicts, setConflicts] = useState<PlanStudioConflict[]>([]);
  const { setDrawerOpen, setDrawerTab, setHighlightItemId } = useDrawer();
  
  // 对话框状态
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [replacingItem, setReplacingItem] = useState<{ id: string; placeName?: string } | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingItem, setMovingItem] = useState<{ id: string; currentDayId: string } | null>(null);
  const [moveDayId, setMoveDayId] = useState<string>('');
  const [moveStartTime, setMoveStartTime] = useState<string>('');
  const [moveEndTime, setMoveEndTime] = useState<string>('');
  const [moving, setMoving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ id: string; placeName: string } | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [addingBuffers, setAddingBuffers] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [tripId, refreshKey]); // 当 refreshKey 变化时也刷新

  // 转换时间格式的辅助函数
  const formatTime = (isoTime: string): string => {
    try {
      const date = new Date(isoTime);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // 从 ItineraryItem 转换为 ScheduleItem（保留 id 在 metadata 中）
  const convertItineraryItemsToScheduleItems = (items: ItineraryItemDetail[]): ScheduleItem[] => {
    return items
      .filter(item => item.startTime && item.endTime)
      .map((item) => ({
        startTime: formatTime(item.startTime),
        endTime: formatTime(item.endTime),
        placeId: item.placeId || 0,
        placeName: (item.Place?.nameCN && item.Place.nameCN.trim()) 
          ? item.Place.nameCN 
          : (item.Place?.nameEN && item.Place.nameEN.trim()) 
            ? item.Place.nameEN 
            : '未知地点',
        type: item.type,
        metadata: {
          itemId: item.id, // 保存 ItineraryItem 的 id，用于删除操作
        },
      }))
      .filter(item => item.startTime && item.endTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const loadTrip = async () => {
    try {
      setLoading(true);
      const data = await tripsApi.getById(tripId);
      setTrip(data);
      
      // 加载所有日期的 Schedule 和 ItineraryItem
      if (data.TripDay && data.TripDay.length > 0) {
        const scheduleMap = new Map<string, ScheduleResponse>();
        
        for (const day of data.TripDay) {
          try {
            // 先尝试获取 Schedule
            const scheduleResponse = await tripsApi.getSchedule(tripId, day.date);
            
            // 如果 Schedule 有数据，直接使用
            if (scheduleResponse.schedule && scheduleResponse.schedule.items && scheduleResponse.schedule.items.length > 0) {
              scheduleMap.set(day.date, scheduleResponse);
            } else {
              // Schedule 为空，尝试从 ItineraryItem API 获取
              try {
                const itineraryItems = await itineraryItemsApi.getAll(day.id);
                
                if (itineraryItems && itineraryItems.length > 0) {
                  // 保存 ItineraryItem 数据用于显示
                  setItineraryItemsMap(prev => new Map(prev).set(day.date, itineraryItems));
                  
                  const scheduleItems = convertItineraryItemsToScheduleItems(itineraryItems);
                  
                  scheduleMap.set(day.date, {
                    date: day.date,
                    schedule: scheduleItems.length > 0 ? {
                      items: scheduleItems,
                    } : null,
                    persisted: false,
                  });
                } else {
                  // 也检查 trip 数据中是否包含 ItineraryItem（作为后备）
                  if (day.ItineraryItem && day.ItineraryItem.length > 0) {
                    const items = day.ItineraryItem as ItineraryItemDetail[];
                    // 保存 ItineraryItem 数据用于显示
                    setItineraryItemsMap(prev => new Map(prev).set(day.date, items));
                    
                    const scheduleItems = convertItineraryItemsToScheduleItems(items);
                    
                    scheduleMap.set(day.date, {
                      date: day.date,
                      schedule: scheduleItems.length > 0 ? {
                        items: scheduleItems,
                      } : null,
                      persisted: false,
                    });
                  } else {
                    scheduleMap.set(day.date, {
                      date: day.date,
                      schedule: null,
                      persisted: false,
                    });
                  }
                }
              } catch (itemErr) {
                console.error(`Failed to load itinerary items for ${day.date}:`, itemErr);
                // 如果获取 ItineraryItem 也失败，检查 trip 数据
                if (day.ItineraryItem && day.ItineraryItem.length > 0) {
                  const scheduleItems = convertItineraryItemsToScheduleItems(day.ItineraryItem as ItineraryItemDetail[]);
                  
                  scheduleMap.set(day.date, {
                    date: day.date,
                    schedule: scheduleItems.length > 0 ? {
                      items: scheduleItems,
                    } : null,
                    persisted: false,
                  });
                } else {
                  scheduleMap.set(day.date, {
                    date: day.date,
                    schedule: null,
                    persisted: false,
                  });
                }
              }
            }
          } catch (err) {
            console.error(`Failed to load schedule for ${day.date}:`, err);
            // 如果获取 Schedule 失败，尝试从 ItineraryItem API 获取
            try {
              const itineraryItems = await itineraryItemsApi.getAll(day.id);
              
              if (itineraryItems && itineraryItems.length > 0) {
                // 保存 ItineraryItem 数据用于显示
                setItineraryItemsMap(prev => new Map(prev).set(day.date, itineraryItems));
                
                const scheduleItems = convertItineraryItemsToScheduleItems(itineraryItems);
                
                scheduleMap.set(day.date, {
                  date: day.date,
                  schedule: scheduleItems.length > 0 ? {
                    items: scheduleItems,
                  } : null,
                  persisted: false,
                });
              } else {
                scheduleMap.set(day.date, {
                  date: day.date,
                  schedule: null,
                  persisted: false,
                });
              }
            } catch (itemErr) {
              console.error(`Failed to load itinerary items for ${day.date}:`, itemErr);
              scheduleMap.set(day.date, {
                date: day.date,
                schedule: null,
                persisted: false,
              });
            }
          }
        }
        setSchedules(scheduleMap);
        
        // 加载每日指标和冲突（传入 trip 数据，避免异步 state 问题）
        await loadMetricsAndConflicts(data.id, data);
      }
    } catch (err) {
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetricsAndConflicts = async (tripId: string, tripData?: TripDetail) => {
    try {
      // 加载冲突列表
      const conflictsData = await tripsApi.getConflicts(tripId);
      setConflicts(conflictsData.conflicts);
      
      // 加载所有日期的指标（使用传入的 tripData 或当前的 trip state）
      const currentTrip = tripData || trip;
      if (currentTrip && currentTrip.TripDay && currentTrip.TripDay.length > 0) {
        const metricsData = await tripsApi.getMetrics(tripId);
        const metricsMap = new Map<string, DayMetricsResponse>();
        metricsData.days.forEach(day => {
          metricsMap.set(day.date, day);
        });
        setDayMetricsMap(metricsMap);
      }
    } catch (err) {
      console.error('Failed to load metrics and conflicts:', err);
      // 如果接口未实现，静默失败，不显示数据
    }
  };

  const handleFixConflict = (conflictType: string, dayDate: string) => {
    setDrawerTab('risk');
    setDrawerOpen(true);
    setHighlightItemId(`${conflictType}-${dayDate}`);
  };

  const handleDeleteItem = (itemId: string, placeName: string) => {
    setDeletingItem({ id: itemId, placeName });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!deletingItem) return;

    try {
      await itineraryItemsApi.delete(deletingItem.id);
      toast.success(t('planStudio.scheduleTab.deleteSuccess', { placeName: deletingItem.placeName }));
      await loadTrip();
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (err: any) {
      console.error('Failed to delete itinerary item:', err);
      toast.error(err.message || t('planStudio.scheduleTab.deleteFailed'));
    }
  };

  const handleEditItem = async (itemId: string) => {
    try {
      const item = await itineraryItemsApi.getById(itemId);
      setEditingItem(item);
      setEditDialogOpen(true);
    } catch (err: any) {
      console.error('Failed to load item for editing:', err);
      toast.error(err.message || t('planStudio.scheduleTab.loadItemFailed'));
    }
  };

  const handleReplaceItem = (itemId: string, placeName: string) => {
    setReplacingItem({ id: itemId, placeName });
    setReplaceDialogOpen(true);
  };

  const handleReplaceSuccess = async (result: ReplaceItineraryItemResponse) => {
    if (!replacingItem) return;
    try {
      await itineraryItemsApi.update(replacingItem.id, {
        placeId: result.newItem.placeId,
        startTime: result.newItem.startTime,
        endTime: result.newItem.endTime,
        note: result.newItem.reason,
      });
      toast.success(t('planStudio.scheduleTab.replaceSuccess'));
      await loadTrip();
      setReplaceDialogOpen(false);
      setReplacingItem(null);
    } catch (err: any) {
      console.error('Failed to update item after replace:', err);
      toast.error(err.message || t('planStudio.scheduleTab.replaceFailed'));
    }
  };

  const handleMoveItem = async (itemId: string, currentDayId: string) => {
    try {
      const item = await itineraryItemsApi.getById(itemId);
      setMovingItem({ id: itemId, currentDayId });
      if (item.startTime) {
        const startDate = new Date(item.startTime);
        setMoveStartTime(startDate.toISOString().slice(0, 16));
      }
      if (item.endTime) {
        const endDate = new Date(item.endTime);
        setMoveEndTime(endDate.toISOString().slice(0, 16));
      }
      setMoveDialogOpen(true);
    } catch (err: any) {
      console.error('Failed to load item for moving:', err);
      toast.error(err.message || t('planStudio.scheduleTab.loadItemFailed'));
    }
  };

  const handleConfirmMove = async () => {
    if (!movingItem || !moveDayId || !moveStartTime || !moveEndTime) {
      toast.error(t('planStudio.scheduleTab.moveMissingFields'));
      return;
    }

    try {
      setMoving(true);
      await itineraryItemsApi.update(movingItem.id, {
        tripDayId: moveDayId,
        startTime: new Date(moveStartTime).toISOString(),
        endTime: new Date(moveEndTime).toISOString(),
      });
      toast.success(t('planStudio.scheduleTab.moveSuccess'));
      await loadTrip();
      setMoveDialogOpen(false);
      setMovingItem(null);
      setMoveDayId('');
      setMoveStartTime('');
      setMoveEndTime('');
    } catch (err: any) {
      console.error('Failed to move item:', err);
      toast.error(err.message || t('planStudio.scheduleTab.moveFailed'));
    } finally {
      setMoving(false);
    }
  };

  const handleSplitItem = async (_itemId: string) => {
    toast.info(t('planStudio.scheduleTab.splitNotImplemented'));
  };

  const handleSkipItem = async (itemId: string, placeName: string) => {
    await handleDeleteItem(itemId, placeName);
  };

  const handleRunOptimize = async () => {
    if (!trip || !trip.TripDay || trip.TripDay.length === 0) {
      toast.error('暂无行程数据');
      return;
    }

    try {
      setOptimizing(true);

      // 收集所有地点的 ID
      const placeIds: number[] = [];
      for (const day of trip.TripDay) {
        if (day.ItineraryItem) {
          for (const item of day.ItineraryItem) {
            if (item.placeId && !placeIds.includes(item.placeId)) {
              placeIds.push(item.placeId);
            }
          }
        }
      }

      if (placeIds.length === 0) {
        toast.error('没有可优化的地点');
        return;
      }

      // 获取第一个日期作为配置基础
      const firstDay = trip.TripDay[0];
      const startDate = new Date(firstDay.date);
      const endDate = new Date(trip.endDate);

      // 构建优化请求
      const request: OptimizeRouteRequest = {
        placeIds,
        config: {
          date: firstDay.date,
          startTime: new Date(startDate.setHours(9, 0, 0, 0)).toISOString(),
          endTime: new Date(endDate.setHours(18, 0, 0, 0)).toISOString(),
          pacingFactor: 1.0, // 标准节奏
        },
      };

      // 调用优化接口
      const optimizeResult = await itineraryOptimizationApi.optimize(request);
      
      // 验证优化结果
      if (!optimizeResult || !optimizeResult.schedule || optimizeResult.schedule.length === 0) {
        toast.error('优化结果为空，无法应用');
        return;
      }
      
      // 应用优化结果到行程
      try {
        // 构建优化结果数据
        const route = optimizeResult.schedule.map(item => {
          const node = optimizeResult.nodes?.[item.nodeIndex];
          if (!node) {
            console.warn('Node not found for index:', item.nodeIndex);
            return null;
          }
          return {
            placeId: node.id || 0, // PlaceNode 使用 id 字段
            startTime: item.startTime,
            endTime: item.endTime,
            type: 'ACTIVITY',
          };
        }).filter(item => item !== null) as Array<{
          placeId: number;
          startTime: string;
          endTime: string;
          type: string;
        }>;
        
        // 验证 route 数据
        if (route.length === 0) {
          toast.error('优化结果中没有有效的行程项');
          return;
        }
        
        const applyResult = await tripsApi.applyOptimization(tripId, {
          result: {
            route,
            nodes: optimizeResult.nodes || [],
            schedule: optimizeResult.schedule,
            happinessScore: optimizeResult.happinessScore,
            scoreBreakdown: optimizeResult.scoreBreakdown,
          },
          options: {
            replaceExisting: true,
            preserveManualEdits: true,
            dryRun: false,
          },
        });
        
        // 检查响应是否有效
        if (!applyResult) {
          throw new Error('应用优化结果失败：响应为空');
        }
        
        if (applyResult.success) {
          toast.success(`优化完成！已应用 ${applyResult.appliedItems || 0} 个行程项`);
        } else {
          toast.warning('优化完成，但应用结果时出错：响应格式不正确');
        }
      } catch (applyErr: any) {
        console.error('Failed to apply optimization:', applyErr);
        // 如果应用失败，仍然显示优化结果
        toast.warning('优化完成，但应用结果时出错：' + (applyErr.message || '未知错误'));
      }
      
      // 重新加载行程数据
      await loadTrip();
    } catch (err: any) {
      console.error('Failed to optimize:', err);
      toast.error(err.message || '优化失败');
    } finally {
      setOptimizing(false);
    }
  };

  const handleAutoAddBuffers = async () => {
    if (!trip) {
      toast.error('暂无行程数据');
      return;
    }

    try {
      setAddingBuffers(true);

      // 调用行程调整接口，自动添加缓冲
      await tripsApi.adjust(tripId, {
        modifications: [
          {
            type: 'ADD_BUFFERS',
            options: {
              bufferDuration: 30, // 默认30分钟缓冲
              applyToAllDays: true, // 应用到所有日期
            },
          },
        ],
      });

      toast.success('已自动添加缓冲时间');
      
      // 重新加载行程数据
      await loadTrip();
    } catch (err: any) {
      console.error('Failed to add buffers:', err);
      toast.error(err.message || '添加缓冲失败');
    } finally {
      setAddingBuffers(false);
    }
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
    <>
      <div className="grid grid-cols-12 gap-6">
        {/* 左（8/12）：Day Timeline */}
        <div className="col-span-12 lg:col-span-8 space-y-6" data-tour="schedule-timeline">
        {trip.TripDay.map((day, idx) => {
          const schedule = schedules.get(day.date);
          const items = schedule?.schedule?.items || [];
          const dayItems = itineraryItemsMap.get(day.date) || [];
          
          // 使用 API 返回的指标数据（不再使用硬编码的后备计算）
          const apiMetrics = dayMetricsMap.get(day.date);
          
          // 获取该日的冲突（从 API 返回的冲突列表中过滤）
          const dayConflicts = conflicts.filter(c => c.affectedDays.includes(day.date));
          
          // 每日指标（仅使用 API 数据，如果没有则显示默认值）
          const dailyMetrics = apiMetrics ? {
            walk: apiMetrics.metrics.walk,
            drive: apiMetrics.metrics.drive,
            buffer: apiMetrics.metrics.buffer,
            conflicts: apiMetrics.conflicts.map(c => c.title),
          } : {
            walk: 0,
            drive: 0,
            buffer: 0,
            conflicts: [],
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
                  {/* 每日摘要 - 仅显示 API 数据 */}
                  {apiMetrics ? (
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
                  ) : (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="text-xs italic text-gray-400">指标数据加载中...</span>
                    </div>
                  )}

                  {/* 冲突提示 - 优先显示 API 返回的冲突 */}
                  {(dayConflicts.length > 0 || dailyMetrics.conflicts.length > 0) && (
                    <div className="space-y-1">
                      {/* 显示 API 返回的冲突（优先） */}
                      {dayConflicts.map((conflict) => (
                        <div
                          key={conflict.id}
                          className={`flex items-center gap-2 text-sm p-2 rounded ${
                            conflict.severity === 'HIGH' 
                              ? 'text-red-600 bg-red-50' 
                              : conflict.severity === 'MEDIUM'
                              ? 'text-yellow-600 bg-yellow-50'
                              : 'text-blue-600 bg-blue-50'
                          }`}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <div className="flex-1">
                            <div className="font-medium">{conflict.title}</div>
                            <div className="text-xs">{conflict.description}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto h-6 text-xs"
                            onClick={() => handleFixConflict(conflict.id, day.date)}
                          >
                            {t('planStudio.scheduleTab.fix')}
                          </Button>
                        </div>
                      ))}
                      {/* 显示前端计算的冲突（后备，仅在 API 没有冲突时显示） */}
                      {dayConflicts.length === 0 && dailyMetrics.conflicts.map((conflict, cIdx) => (
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
                            {t('planStudio.scheduleTab.fix')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 时间轴卡片 - 使用新的 ItineraryItemRow 组件 */}
                  <div className="mt-4 space-y-2">
                    {(() => {
                      // 优先使用 ItineraryItemDetail 数据（更完整）
                      const dayItems = itineraryItemsMap.get(day.date) || [];
                      
                      if (dayItems.length > 0) {
                        return dayItems.map((item, itemIdx) => (
                          <ItineraryItemRow
                            key={item.id}
                            item={item}
                            dayIndex={idx}
                            itemIndex={itemIdx}
                            personaMode={personaMode}
                            onEdit={(item) => handleEditItem(item.id)}
                            onDelete={(item) => handleDeleteItem(item.id, item.Place?.nameCN || item.Place?.nameEN || '')}
                            onReplace={(item) => handleReplaceItem(item.id, item.Place?.nameCN || item.Place?.nameEN || '')}
                            onApplyPatch={personaMode === 'neptune' ? (_item) => {
                              // TODO: 实现应用补丁功能
                              toast.info(t('planStudio.scheduleTab.applyPatchNotImplemented'));
                            } : undefined}
                          />
                        ));
                      }
                      
                      // 如果没有 ItineraryItemDetail，回退到 ScheduleItem
                      if (items.length > 0) {
                        return items.map((item, itemIdx) => {
                          // 尝试从 metadata 中找到对应的 ItineraryItem
                          if (item.metadata && item.metadata.itemId) {
                            const fullItem = dayItems.find(i => i.id === item.metadata!.itemId);
                            if (fullItem) {
                              return (
                                <ItineraryItemRow
                                  key={fullItem.id}
                                  item={fullItem}
                                  dayIndex={idx}
                                  itemIndex={itemIdx}
                                  personaMode={personaMode}
                                  onEdit={(item) => handleEditItem(item.id)}
                                  onDelete={(item) => handleDeleteItem(item.id, item.Place?.nameCN || item.Place?.nameEN || '')}
                                  onReplace={(item) => handleReplaceItem(item.id, item.Place?.nameCN || item.Place?.nameEN || '')}
                                />
                              );
                            }
                          }
                          
                          // 如果找不到完整数据，显示简化版本
                          return (
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
                                {item.metadata?.itemId && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditItem(item.metadata!.itemId);
                                      }}
                                    >
                                      {t('planStudio.scheduleTab.actions.edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSplitItem(item.metadata!.itemId);
                                      }}
                                    >
                                      {t('planStudio.scheduleTab.actions.split')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const day = trip?.TripDay?.find(d => schedules.get(d.date)?.schedule?.items?.some(i => i.metadata?.itemId === item.metadata!.itemId));
                                        if (day) {
                                          handleMoveItem(item.metadata!.itemId, day.id);
                                        }
                                      }}
                                    >
                                      {t('planStudio.scheduleTab.actions.move')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReplaceItem(item.metadata!.itemId, item.placeName);
                                      }}
                                    >
                                      {t('planStudio.scheduleTab.actions.replace')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSkipItem(item.metadata!.itemId, item.placeName);
                                      }}
                                    >
                                      {t('planStudio.scheduleTab.actions.skip')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteItem(item.metadata!.itemId, item.placeName);
                                      }}
                                    >
                                      {t('planStudio.scheduleTab.actions.delete')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                          );
                        });
                      }
                      
                      return (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        该日暂无安排
                      </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 右（4/12）：指标面板 + 冲突列表 */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        {/* 指标面板 - 使用 API 数据 */}
        <Card>
          <CardHeader>
            <CardTitle>每日指标</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              // 计算平均指标（从所有日期的指标中计算）
              let totalWalk = 0;
              let totalDrive = 0;
              let totalBuffer = 0;
              let dayCount = 0;
              
              dayMetricsMap.forEach(dayMetrics => {
                totalWalk += dayMetrics.metrics.walk;
                totalDrive += dayMetrics.metrics.drive;
                totalBuffer += dayMetrics.metrics.buffer;
                dayCount++;
              });
              
              const avgWalk = dayCount > 0 ? (totalWalk / dayCount).toFixed(1) : '0';
              const avgDrive = dayCount > 0 ? Math.round(totalDrive / dayCount) : 0;
              const avgBuffer = dayCount > 0 ? Math.round(totalBuffer / dayCount) : 0;
              
              return (
                <>
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">平均步行</div>
                    <div className="text-2xl font-bold">{avgWalk} km</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">平均车程</div>
                    <div className="text-2xl font-bold">{avgDrive} min</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">平均缓冲</div>
                    <div className="text-2xl font-bold">{avgBuffer} min</div>
            </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* 冲突列表 - 使用 API 数据 */}
        <Card data-tour="schedule-conflicts">
          <CardHeader>
            <CardTitle>冲突列表</CardTitle>
          </CardHeader>
          <CardContent>
            {conflicts.length > 0 ? (
            <div className="space-y-2">
                {conflicts.map((conflict) => (
              <div
                    key={conflict.id}
                    className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                      conflict.severity === 'HIGH' 
                        ? 'border-red-200 bg-red-50' 
                        : conflict.severity === 'MEDIUM'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                    onClick={() => handleFixConflict(conflict.id, conflict.affectedDays[0] || '')}
              >
                    <div className="text-sm font-medium">{conflict.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {conflict.affectedDays.map((d: string) => {
                        const dayIndex = trip?.TripDay?.findIndex(day => day.date === d) ?? -1;
                        return dayIndex >= 0 ? `Day ${dayIndex + 1}` : d;
                      }).join(', ')}
              </div>
              </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                暂无冲突
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="space-y-2">
          <Button 
            className="w-full" 
            data-tour="schedule-optimize" 
            onClick={handleRunOptimize}
            disabled={optimizing}
          >
            {optimizing ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                {t('planStudio.scheduleTab.optimizing')}
              </>
            ) : (
              t('planStudio.scheduleTab.runOptimize')
            )}
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleAutoAddBuffers}
            disabled={addingBuffers}
          >
            {addingBuffers ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                {t('planStudio.scheduleTab.addingBuffers')}
              </>
            ) : (
              t('planStudio.scheduleTab.autoAddBuffers')
            )}
          </Button>
        </div>
      </div>
    </div>
      {/* 编辑对话框 */}
      {editingItem && (
        <EditItineraryItemDialog
          item={editingItem!}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setEditingItem(null);
            }
          }}
          onSuccess={loadTrip}
        />
      )}

      {/* 替换对话框 */}
      {replacingItem && (
        <ReplaceItineraryItemDialog
          tripId={tripId}
          itemId={replacingItem.id}
          placeName={replacingItem.placeName}
          open={replaceDialogOpen}
          onOpenChange={(open) => {
            setReplaceDialogOpen(open);
            if (!open) {
              setReplacingItem(null);
            }
          }}
          onSuccess={handleReplaceSuccess}
        />
      )}

      {/* 移动对话框 */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('planStudio.scheduleTab.moveDialog.title')}</DialogTitle>
            <DialogDescription>{t('planStudio.scheduleTab.moveDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {trip && trip.TripDay && trip.TripDay.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label>{t('planStudio.scheduleTab.moveDialog.selectDate')}</Label>
                  <Select value={moveDayId} onValueChange={setMoveDayId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('planStudio.scheduleTab.moveDialog.selectDatePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {trip.TripDay.map((day, index) => (
                        <SelectItem key={day.id} value={day.id}>
                          Day {index + 1} - {format(new Date(day.date), 'yyyy-MM-dd')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('planStudio.scheduleTab.moveDialog.startTime')}</Label>
                    <Input
                      type="datetime-local"
                      value={moveStartTime}
                      onChange={(e) => setMoveStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('planStudio.scheduleTab.moveDialog.endTime')}</Label>
                    <Input
                      type="datetime-local"
                      value={moveEndTime}
                      onChange={(e) => setMoveEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t('planStudio.scheduleTab.moveDialog.noAvailableDates')}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)} disabled={moving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmMove} disabled={moving || !moveDayId || !moveStartTime || !moveEndTime}>
              {moving ? <Spinner className="w-4 h-4 mr-2" /> : null}
              {t('planStudio.scheduleTab.moveDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('planStudio.scheduleTab.actions.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem && t('planStudio.scheduleTab.confirmDelete', { placeName: deletingItem.placeName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setDeletingItem(null);
            }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteItem}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {t('planStudio.scheduleTab.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

