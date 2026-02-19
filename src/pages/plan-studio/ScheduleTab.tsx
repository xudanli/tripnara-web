import { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle, MapPin, GripVertical, MoreVertical, Plus, Shield, Activity, Wrench, Info, ClipboardCheck, ExternalLink, Calendar } from 'lucide-react';
import { tripsApi, itineraryItemsApi } from '@/api/trips';
import { itineraryOptimizationApi } from '@/api/itinerary-optimization';
import { tripPlannerApi } from '@/api/trip-planner';
import { readinessApi, type ScoreBreakdownResponse } from '@/api/readiness';
import type { TripDetail, ScheduleResponse, ScheduleItem, ItineraryItemDetail, ItineraryItem, ReplaceItineraryItemResponse, DayMetricsResponse, PlanStudioConflict, DayTravelInfoResponse, PersonaAlert } from '@/types/trip';
import type { SuggestionStats } from '@/types/suggestion';
import type { OptimizeRouteRequest } from '@/types/itinerary-optimization';
import type { PlaceCategory } from '@/types/places-routes';
import { format } from 'date-fns';
import { DrawerContext } from '@/components/layout/DashboardLayout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditItineraryItemDialog } from '@/components/trips/EditItineraryItemDialog';
import { ReplaceItineraryItemDialog } from '@/components/trips/ReplaceItineraryItemDialog';
import { EnhancedAddItineraryItemDialog } from '@/components/trips/EnhancedAddItineraryItemDialog';
import { getTimezoneByCountry } from '@/utils/timezone';
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
import { cn } from '@/lib/utils';
import {
  getGateStatusClasses,
} from '@/lib/gate-status';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
// PersonaMode 已移除 - 三人格现在是系统内部工具
import { toast } from 'sonner';
import ItineraryItemRow from '@/components/plan-studio/ItineraryItemRow';
import { TravelSegmentIndicator, TravelSummary } from '@/components/plan-studio/TravelSegmentIndicator';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import { usePlaceImages } from '@/hooks/usePlaceImages';
import PlanStudioContext, { type PendingSuggestion } from '@/contexts/PlanStudioContext';

interface ScheduleTabProps {
  tripId: string;
  refreshKey?: number; // 用于触发刷新
  onOpenReadinessDrawer?: (findingId?: string) => void;
}

export default function ScheduleTab({ tripId, refreshKey, onOpenReadinessDrawer }: ScheduleTabProps) {
  const { t, i18n } = useTranslation();
  
  // 左右联动上下文 - 使用 useContext 直接访问（可能为 null）
  const planStudioContext = useContext(PlanStudioContext);
  
  // 🚀 使用 ref 存储 context，避免在依赖项中使用导致循环
  const planStudioContextRef = useRef(planStudioContext);
  useEffect(() => {
    planStudioContextRef.current = planStudioContext;
  }, [planStudioContext]);
  
  // 从 context 中解构需要的 actions（使用 useMemo 稳定对象引用）
  const planStudioActions = useMemo(() => {
    if (!planStudioContext) return null;
    return {
      selectDay: planStudioContext.selectDay,
      selectItem: planStudioContext.selectItem,
      clearSelection: planStudioContext.clearSelection,
      recordAction: planStudioContext.recordAction,
      askAssistantAbout: planStudioContext.askAssistantAbout,
    };
  }, [planStudioContext]); // 直接依赖整个 context 对象
  
  // 审批相关状态（保留以备将来使用）
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  
  const handleApprovalComplete = async (approved: boolean) => {
    if (approved) {
      toast.success('审批已批准，系统正在继续执行...');
      await loadTrip();
    } else {
      toast.info('审批已拒绝，系统将调整策略');
    }
    setApprovalDialogOpen(false);
    setPendingApprovalId(null);
  };
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [schedules, setSchedules] = useState<Map<string, ScheduleResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  
  // 🆕 检测未保存的时间轴改动
  // 🚀 性能优化：使用 useRef 存储 schedules 和 context，避免无限循环
  const schedulesRef = useRef<Map<string, ScheduleResponse>>(new Map());
  const prevHasUnsavedRef = useRef<boolean>(false);
  const setHasUnsavedScheduleChangesRef = useRef<((hasChanges: boolean) => void) | null>(null);
  
  // 更新 context 方法 ref（使用 ref 存储，避免依赖导致循环）
  // 🚀 关键：不将 planStudioContext 放在依赖数组中，只在组件渲染时更新 ref
  if (planStudioContext) {
    setHasUnsavedScheduleChangesRef.current = planStudioContext.setHasUnsavedScheduleChanges;
  } else {
    setHasUnsavedScheduleChangesRef.current = null;
  }
  
  // 只在 schedules Map 的内容真正变化时才更新
  useEffect(() => {
    const setHasUnsaved = setHasUnsavedScheduleChangesRef.current;
    if (!setHasUnsaved) return;
    
    // 检查 schedules Map 的内容是否真的变化了
    const currentSchedules = schedules;
    const prevSchedules = schedulesRef.current;
    
    // 比较两个 Map 的内容是否相同
    let hasChanged = false;
    if (currentSchedules.size !== prevSchedules.size) {
      hasChanged = true;
    } else {
      for (const [date, schedule] of currentSchedules.entries()) {
        const prevSchedule = prevSchedules.get(date);
        if (!prevSchedule || prevSchedule.persisted !== schedule.persisted) {
          hasChanged = true;
          break;
        }
      }
    }
    
    // 如果内容变化了，更新 ref 并检查是否需要更新 context
    if (hasChanged) {
      schedulesRef.current = new Map(currentSchedules);
      
      const hasUnsaved = Array.from(currentSchedules.values()).some(
        schedule => schedule.persisted === false
      );
      
      // 只在值真正变化时才更新 context
      if (prevHasUnsavedRef.current !== hasUnsaved) {
        prevHasUnsavedRef.current = hasUnsaved;
        setHasUnsaved(hasUnsaved);
      }
    }
  }, [schedules]); // 🚀 只依赖 schedules，不依赖 planStudioContext
  const [itineraryItemsMap, setItineraryItemsMap] = useState<Map<string, ItineraryItemDetail[]>>(new Map());
  const [dayMetricsMap, setDayMetricsMap] = useState<Map<string, DayMetricsResponse>>(new Map());
  const [dayTravelInfoMap, setDayTravelInfoMap] = useState<Map<string, DayTravelInfoResponse>>(new Map());
  const [conflicts, setConflicts] = useState<PlanStudioConflict[]>([]);
  const [personaAlerts, setPersonaAlerts] = useState<PersonaAlert[]>([]);
  const [suggestionStats, setSuggestionStats] = useState<SuggestionStats | null>(null);
  
  // 安全使用 DrawerContext（若不在 DashboardLayout 中则使用空函数，避免报错）
  const drawerContext = useContext(DrawerContext);
  const setDrawerOpen = drawerContext?.setDrawerOpen ?? (() => {});
  const setDrawerTab = drawerContext?.setDrawerTab ?? (() => {});
  const setHighlightItemId = drawerContext?.setHighlightItemId ?? (() => {});
  
  // 准备度相关状态
  const [readinessData, setReadinessData] = useState<ScoreBreakdownResponse | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  
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
  
  // 添加行程项对话框状态
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [addItemDay, setAddItemDay] = useState<TripDetail['TripDay'][0] | null>(null);
  
  // 搜索附近对话框状态
  const [searchNearbyDialogOpen, setSearchNearbyDialogOpen] = useState(false);
  const [searchNearbyItem, setSearchNearbyItem] = useState<ItineraryItem | null>(null);
  const [searchNearbyDay, setSearchNearbyDay] = useState<TripDetail['TripDay'][0] | null>(null);
  const [searchNearbyCategory, setSearchNearbyCategory] = useState<PlaceCategory | 'all' | undefined>(undefined);

  // 收集所有地点信息用于批量加载图片（使用 useMemo 避免每次渲染都创建新数组）
  // 使用稳定的依赖：基于 place IDs 的字符串，而不是整个 Map 对象
  const placeIdsKey = useMemo(() => {
    const ids: number[] = [];
    const seenIds = new Set<number>();
    
    itineraryItemsMap.forEach(items => {
      // 添加防护：确保 items 是数组
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (item.Place && item.Place.id && !seenIds.has(item.Place.id)) {
            seenIds.add(item.Place.id);
            ids.push(item.Place.id);
          }
        });
      }
    });
    
    return ids.sort((a, b) => a - b).join(',');
  }, [itineraryItemsMap]);

  const allPlaces = useMemo(() => {
    const places: Array<{ id: number; nameCN?: string; nameEN?: string | null; category?: string }> = [];
    const seenIds = new Set<number>();
    
    itineraryItemsMap.forEach(items => {
      // 添加防护：确保 items 是数组
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (item.Place && item.Place.id && !seenIds.has(item.Place.id)) {
            seenIds.add(item.Place.id);
            places.push({
              id: item.Place.id,
              nameCN: item.Place.nameCN,
              nameEN: item.Place.nameEN,
              category: item.Place.category,
            });
          }
        });
      }
    });
    
    return places;
  }, [placeIdsKey]); // 使用稳定的 placeIdsKey 作为依赖

  // 批量加载地点图片
  const { images: placeImagesMap } = usePlaceImages(allPlaces, {
    enabled: allPlaces.length > 0,
    country: trip?.destination, // 使用目的地作为国家参数
  });

  // 默认天气位置（用于行程项天气显示，当 Place 没有坐标时使用）
  const defaultWeatherLocation = useMemo(() => {
    // 常见国家首都坐标
    const COORDS: Record<string, { lat: number; lng: number }> = {
      'IS': { lat: 64.1466, lng: -21.9426 }, // 冰岛
      'JP': { lat: 35.6762, lng: 139.6503 }, // 日本
      'TH': { lat: 13.7563, lng: 100.5018 }, // 泰国
      'KR': { lat: 37.5665, lng: 126.9780 }, // 韩国
      'US': { lat: 40.7128, lng: -74.0060 }, // 美国
      'GB': { lat: 51.5074, lng: -0.1278 },  // 英国
      'FR': { lat: 48.8566, lng: 2.3522 },   // 法国
      'CN': { lat: 39.9042, lng: 116.4074 }, // 中国
      'SG': { lat: 1.3521, lng: 103.8198 },  // 新加坡
      'AU': { lat: -33.8688, lng: 151.2093 }, // 澳大利亚
      'NZ': { lat: -36.8485, lng: 174.7633 }, // 新西兰
      'DE': { lat: 52.5200, lng: 13.4050 },  // 德国
      'IT': { lat: 41.9028, lng: 12.4964 },  // 意大利
      'ES': { lat: 40.4168, lng: -3.7038 },  // 西班牙
    };
    
    if (!trip?.destination) return null;
    const countryCode = trip.destination.split(',')[0]?.trim().toUpperCase();
    return COORDS[countryCode] || null;
  }, [trip?.destination]);

  // 转换时间格式的辅助函数（在组件外部使用，需要保留）
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

  const loadTrip = useCallback(async () => {
    // 从 ItineraryItem 转换为 ScheduleItem（保留 id 在 metadata 中）
    const convertItineraryItemsToScheduleItems = (items: ItineraryItemDetail[]): ScheduleItem[] => {
      // 后端已经按 startTime 排序返回，前端也做一次排序以确保一致性
      return items
        .filter(item => item.startTime && item.endTime)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
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
        .filter(item => item.startTime && item.endTime);
    };
    try {
      setLoading(true);
      // 先清除所有天的数据，避免显示旧数据
      setItineraryItemsMap(new Map());
      
      const data = await tripsApi.getById(tripId);
      console.log('[ScheduleTab] 加载的行程数据:', {
        tripId: data.id,
        destination: data.destination,
        // destination 应该是国家代码如 "IS"（冰岛）、"JP"（日本）
      });
      setTrip(data);
      
      // 加载所有日期的 Schedule 和 ItineraryItem
      // 🚀 性能优化：并行加载所有天的数据，而不是串行
      if (data.TripDay && data.TripDay.length > 0) {
        const scheduleMap = new Map<string, ScheduleResponse>();
        
        // 🚀 并行加载所有天的行程项和时间表
        const itemsMap = new Map<string, ItineraryItemDetail[]>();
        
        const dayLoadPromises = data.TripDay.map(async (day) => {
          let dayItems: ItineraryItemDetail[] | null = null;
          let scheduleResponse: ScheduleResponse | null = null;
          
          // 🚀 并行加载行程项和时间表（每个天内部也并行）
          const [itemsResult, scheduleResult] = await Promise.allSettled([
            // 加载行程项
            itineraryItemsApi.getAll(day.id, true).catch((err) => {
              console.error(`Failed to load items for day ${day.date}:`, err);
              return null;
            }),
            // 加载时间表
            tripsApi.getSchedule(tripId, day.date).catch((err) => {
              console.error(`Failed to load schedule for ${day.date}:`, err);
              return null;
            }),
          ]);
          
          // 处理行程项结果
          if (itemsResult.status === 'fulfilled' && itemsResult.value) {
            dayItems = itemsResult.value;
          } else if (day.ItineraryItem && day.ItineraryItem.length > 0) {
            dayItems = day.ItineraryItem as ItineraryItemDetail[];
          }
          
          // 处理时间表结果
          if (scheduleResult.status === 'fulfilled' && scheduleResult.value) {
            scheduleResponse = scheduleResult.value;
          }
          
          // 处理行程项数据
          if (dayItems && dayItems.length > 0) {
            // 🔍 调试：检查所有行程项，特别是酒店相关的
            const hotelItems = dayItems.filter(item => 
              item.Place?.category === 'HOTEL' || item.type === 'ACTIVITY' && item.Place?.category === 'HOTEL'
            );
            const checkoutItems = dayItems.filter(item => 
              item.crossDayInfo?.displayMode === 'checkout' || item.crossDayInfo?.isCheckoutItem
            );
            const checkinItems = dayItems.filter(item => 
              item.crossDayInfo?.displayMode === 'checkin'
            );
            
            console.log(`[ScheduleTab] Day ${day.date} 行程项统计:`, {
              total: dayItems.length,
              hotelItems: hotelItems.length,
              checkinItems: checkinItems.length,
              checkoutItems: checkoutItems.length,
            });
            
            // 后端已经按 startTime 排序返回，前端也做一次排序以确保一致性
            // 🆕 对于退房项，使用 endTime 进行排序（因为退房项显示的是退房时间）
            const sortedItems = [...dayItems].sort((a, b) => {
              // 如果都是退房项，按 endTime 排序
              const aIsCheckout = a.crossDayInfo?.displayMode === 'checkout' || a.crossDayInfo?.isCheckoutItem;
              const bIsCheckout = b.crossDayInfo?.displayMode === 'checkout' || b.crossDayInfo?.isCheckoutItem;
              
              if (aIsCheckout && bIsCheckout) {
                return (a.endTime || '').localeCompare(b.endTime || '');
              }
              // 如果只有一个是退房项，退房项排在后面（因为退房时间通常较晚）
              if (aIsCheckout && !bIsCheckout) {
                return 1;
              }
              if (!aIsCheckout && bIsCheckout) {
                return -1;
              }
              // 都不是退房项，按 startTime 排序
              return (a.startTime || '').localeCompare(b.startTime || '');
            });
            itemsMap.set(day.date, sortedItems);
          } else if (day.ItineraryItem && day.ItineraryItem.length > 0) {
            // 回退：使用 trip 数据中的 ItineraryItem
            const items = day.ItineraryItem as ItineraryItemDetail[];
            itemsMap.set(day.date, items);
          }
          
          // 处理时间表数据
          if (scheduleResponse && scheduleResponse.schedule && scheduleResponse.schedule.items && scheduleResponse.schedule.items.length > 0) {
            // Schedule 有数据，直接使用
            scheduleMap.set(day.date, scheduleResponse);
          } else {
            // Schedule 为空，使用 trip 数据中的 ItineraryItem
            if (dayItems && dayItems.length > 0) {
              const scheduleItems = convertItineraryItemsToScheduleItems(dayItems);
              scheduleMap.set(day.date, {
                date: day.date,
                schedule: scheduleItems.length > 0 ? {
                  items: scheduleItems,
                } : null,
                persisted: false,
              });
            } else if (day.ItineraryItem && day.ItineraryItem.length > 0) {
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
        });
        
        // 🚀 等待所有天的数据加载完成
        await Promise.all(dayLoadPromises);
        
        // 批量更新状态（减少重新渲染次数）
        setItineraryItemsMap(new Map(itemsMap));
        setSchedules(scheduleMap);
        
        // 🆕 检测未保存的时间轴改动（移除这里的直接调用，由 useEffect 统一处理）
        // 注意：这里不再直接调用 setHasUnsavedScheduleChanges，避免重复更新
        
        // 加载每日指标和冲突（传入 trip 数据，避免异步 state 问题）
        await loadMetricsAndConflicts(data.id, data);
      }
    } catch (err) {
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  }, [tripId]); // 🚀 移除 planStudioContext 依赖，避免无限循环

  // 在 loadTrip 定义后使用它
  useEffect(() => {
    loadTrip();
  }, [tripId, refreshKey, loadTrip]); // 当 refreshKey 变化时也刷新

  const loadMetricsAndConflicts = async (tripId: string, tripData?: TripDetail) => {
    try {
      // 加载冲突列表
      const conflictsData = await tripsApi.getConflicts(tripId);
      setConflicts(conflictsData.conflicts);
      
      // 加载三人格提醒和建议统计（用于健康度卡片）
      try {
        const [alerts, stats] = await Promise.all([
          tripsApi.getPersonaAlerts(tripId),
          tripsApi.getSuggestionStats(tripId),
        ]);
        setPersonaAlerts(alerts);
        setSuggestionStats(stats);
      } catch (alertErr) {
        console.error('Failed to load persona alerts:', alertErr);
        // 静默失败，健康度卡片将显示默认状态
      }
      
      // 加载准备度数据（用于准备度入口卡片）
      // 使用 getScoreBreakdown API，它返回更完整的数据（分数、findings、risks）
      try {
        setLoadingReadiness(true);
        const readiness = await readinessApi.getScoreBreakdown(tripId);
        setReadinessData(readiness);
      } catch (readinessErr) {
        console.error('Failed to load readiness data:', readinessErr);
        // 静默失败，准备度卡片将显示默认状态
      } finally {
        setLoadingReadiness(false);
      }
      
      // 加载所有日期的指标（使用传入的 tripData 或当前的 trip state）
      const currentTrip = tripData || trip;
      if (currentTrip && currentTrip.TripDay && currentTrip.TripDay.length > 0) {
        const metricsData = await tripsApi.getMetrics(tripId);
        const metricsMap = new Map<string, DayMetricsResponse>();
        // 添加防护：确保 days 是数组
        if (metricsData && metricsData.days && Array.isArray(metricsData.days)) {
          metricsData.days.forEach(day => {
            metricsMap.set(day.date, day);
          });
        }
        setDayMetricsMap(metricsMap);
        
        // 加载每天的交通信息
        await loadDayTravelInfo(tripId, currentTrip);
      }
    } catch (err) {
      console.error('Failed to load metrics and conflicts:', err);
      // 如果接口未实现，静默失败，不显示数据
    }
  };

  // 加载每天的交通信息
  const loadDayTravelInfo = async (tripId: string, tripData: TripDetail) => {
    try {
      const travelInfoMap = new Map<string, DayTravelInfoResponse>();
      
      for (const day of tripData.TripDay || []) {
        try {
          const travelInfo = await itineraryItemsApi.getDayTravelInfo(tripId, day.id);
          if (travelInfo && travelInfo.segments && travelInfo.segments.length > 0) {
            travelInfoMap.set(day.date, travelInfo);
          }
        } catch (err) {
          // 静默失败，某天没有交通信息是正常的
          console.debug(`[ScheduleTab] 获取 ${day.date} 交通信息失败:`, err);
        }
      }
      
      setDayTravelInfoMap(travelInfoMap);
    } catch (err) {
      console.error('Failed to load day travel info:', err);
    }
  };

  // 注册建议应用回调 - 处理 NARA 推荐的地点添加到行程
  const setOnApplySuggestion = planStudioContext?.setOnApplySuggestion;
  useEffect(() => {
    if (!setOnApplySuggestion) return;
    
    setOnApplySuggestion(async (suggestion: PendingSuggestion) => {
      try {
        if (suggestion.type === 'add_place' && suggestion.place && trip?.TripDay) {
          // 找到目标天
          const targetDayIndex = suggestion.targetDay - 1;
          const targetDay = trip.TripDay[targetDayIndex];
          
          if (!targetDay) {
            toast.error(`第 ${suggestion.targetDay} 天不存在`);
            return false;
          }
          
          // 获取 sessionId（从 planStudioContext 或创建新会话）
          // 注意：ScheduleTab 没有直接访问 sessionId，需要通过其他方式获取
          // 暂时先创建会话或使用 itineraryItemsApi 直接添加
          // TODO: 需要从 planStudioContext 或 TripPlannerAssistant 获取 sessionId
          
          // 临时方案：如果没有 sessionId，直接使用 itineraryItemsApi 添加
          // 理想情况下应该通过 tripPlannerApi.applySuggestion，但需要 sessionId
          // 这里先尝试创建会话
          let sessionId: string | undefined;
          try {
            const startResponse = await tripPlannerApi.start({ tripId });
            sessionId = startResponse.sessionId;
          } catch (err: any) {
            console.warn('创建会话失败，将直接添加:', err);
            // 如果创建会话失败，可以考虑直接使用 itineraryItemsApi
            // 但为了保持一致性，这里先返回错误
            toast.error('无法创建会话，请稍后重试');
            return false;
          }
          
          // 解析时间段（如果有）
          let timeSlot: { start: string; end: string } | undefined;
          if (suggestion.suggestedTime) {
            // 假设 suggestedTime 是 "HH:mm-HH:mm" 格式
            const [start, end] = suggestion.suggestedTime.split('-');
            if (start && end) {
              timeSlot = { start, end };
            }
          }
          
          await tripPlannerApi.applySuggestion({
            tripId,
            sessionId,
            suggestionId: suggestion.id,
            targetDay: suggestion.targetDay,
            timeSlot,
            suggestionType: suggestion.type,
            place: {
              name: suggestion.place.name,
              nameCN: suggestion.place.nameCN,
              category: suggestion.place.category,
              address: suggestion.place.address,
              location: suggestion.place.location,
            },
          });
          
          toast.success('已添加到行程');
          await loadTrip(); // 重新加载行程数据
          return true;
        }
        return false;
      } catch (err: any) {
        console.error('应用建议失败:', err);
        toast.error(err.message || '添加失败，请重试');
        return false;
      }
    });
  }, [setOnApplySuggestion, trip, tripId, loadTrip]);

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

    const itemToDelete = deletingItem;
    
    try {
      // 1. 删除行程项
      await itineraryItemsApi.delete(itemToDelete.id);
      
      // 2. 显示成功提示
      toast.success(t('planStudio.scheduleTab.deleteSuccess', { placeName: itemToDelete.placeName }));
      
      // 3. 关闭对话框并清理状态
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      
      // 4. 刷新页面数据
      await loadTrip();
      
      // 注意：不再自动调用 Orchestrator
      // 原因：删除行程项是用户的确定性操作，不需要 AI 实时检查
      // AI 检查应该在用户主动触发时执行（如点击"检查行程"或"一键优化"）
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

  const handleSearchNearby = (item: ItineraryItem, category?: PlaceCategory) => {
    // 找到 item 对应的 day
    const day = trip?.TripDay?.find(d => 
      d.ItineraryItem?.some(i => i.id === item.id)
    );
    
    if (!day) {
      toast.error('无法找到对应的行程日期');
      return;
    }
    
    const place = item.Place;
    if (!place) {
      toast.error('该地点没有地点信息，无法搜索附近');
      return;
    }
    
    // 检查坐标（支持多种格式）
    const hasCoordinates = 
      (place.latitude !== undefined && place.longitude !== undefined) ||
      (place.lat !== undefined && place.lng !== undefined);
    
    if (!hasCoordinates) {
      toast.error('该地点没有坐标信息，无法搜索附近');
      return;
    }
    
    setSearchNearbyItem(item);
    setSearchNearbyDay(day);
    setSearchNearbyCategory(category);
    setSearchNearbyDialogOpen(true);
  };

  const handleReplaceSuccess = async (result: ReplaceItineraryItemResponse) => {
    if (!replacingItem) return;
    try {
      // 更新行程项
      await itineraryItemsApi.update(replacingItem.id, {
        placeId: result.newItem.placeId,
        startTime: result.newItem.startTime,
        endTime: result.newItem.endTime,
        note: result.newItem.reason,
      });
      
      // 注意：不再自动调用 Orchestrator
      // 原因：替换行程项是用户的确定性操作，不需要 AI 实时检查
      
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
      
      // 更新行程项
      await itineraryItemsApi.update(movingItem.id, {
        tripDayId: moveDayId,
        startTime: new Date(moveStartTime).toISOString(),
        endTime: new Date(moveEndTime).toISOString(),
      });
      
      // 注意：不再自动调用 Orchestrator
      // 原因：移动行程项是用户的确定性操作，不需要 AI 实时检查
      
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
        {trip && trip.TripDay && Array.isArray(trip.TripDay) ? trip.TripDay.map((day, idx) => {
          const schedule = schedules.get(day.date);
          const items = schedule?.schedule?.items || [];
          
          // 标准化日期格式（处理 ISO 和短格式的差异）
          const normalizedDate = day.date.includes('T') ? day.date.split('T')[0] : day.date;
          
          // 使用 API 返回的指标数据（不再使用硬编码的后备计算）
          const apiMetrics = dayMetricsMap.get(normalizedDate) || dayMetricsMap.get(day.date);
          
          // 获取该日的冲突（从 API 返回的冲突列表中过滤）
          const dayConflicts = conflicts.filter(c => 
            c.affectedDays.includes(day.date) || c.affectedDays.includes(normalizedDate)
          );
          
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

          // 格式化日期显示（处理时区）
          const dayDate = new Date(day.date);
          const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
          const weekday = weekdays[dayDate.getUTCDay()];
          
          return (
            <Card key={day.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      Day {idx + 1} - {format(dayDate, 'yyyy-MM-dd')}
                    </CardTitle>
                    {/* ✅ 显示当天主题（如果存在） */}
                    {day.theme && (
                      <p className="text-sm text-muted-foreground font-medium mt-1">
                        {day.theme}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {weekday}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 交通信息摘要 */}
                  {(() => {
                    const travelSummary = dayTravelInfoMap.get(normalizedDate)?.summary || dayTravelInfoMap.get(day.date)?.summary;
                    return travelSummary ? (
                      <TravelSummary 
                        totalDuration={travelSummary.totalDuration}
                        totalDistance={travelSummary.totalDistance}
                        segmentCount={travelSummary.segmentCount}
                      />
                    ) : null;
                  })()}

                  {/* 冲突提示 - 优先显示 API 返回的冲突 */}
                  {(dayConflicts.length > 0 || dailyMetrics.conflicts.length > 0) && (
                    <div className="space-y-1">
                      {/* 显示 API 返回的冲突（优先） */}
                      {dayConflicts.map((conflict) => (
                        <div
                          key={conflict.id}
                          className={cn(
                            'flex items-center gap-2 text-sm p-2 rounded',
                            conflict.severity === 'HIGH' 
                              ? getGateStatusClasses('REJECT')
                              : conflict.severity === 'MEDIUM'
                              ? getGateStatusClasses('SUGGEST_REPLACE')
                              : getGateStatusClasses('NEED_CONFIRM')
                          )}
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
                          className={cn('flex items-center gap-2 text-sm p-2 rounded', getGateStatusClasses('SUGGEST_REPLACE'))}
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
                  <div className="mt-4 space-y-0">
                    {(() => {
                      // 优先使用 ItineraryItemDetail 数据（更完整）
                      const dayItems = itineraryItemsMap.get(day.date) || itineraryItemsMap.get(normalizedDate) || [];
                      const travelInfo = dayTravelInfoMap.get(normalizedDate) || dayTravelInfoMap.get(day.date);
                      
                      if (dayItems.length > 0) {
                        return dayItems.map((item, itemIdx) => {
                          // 查找该行程项的交通段（从上一地点到这里）
                          const apiSegment = travelInfo?.segments?.find(s => s.toItemId === item.id);
                          const prevItem = itemIdx > 0 ? dayItems[itemIdx - 1] : null;
                          
                          // 检查 item 是否有手动设置的交通信息（使用 !== undefined && !== null 判断，避免 0 被误判）
                          const hasManualTravelInfo = 
                            (item.travelFromPreviousDuration !== undefined && item.travelFromPreviousDuration !== null) ||
                            (item.travelFromPreviousDistance !== undefined && item.travelFromPreviousDistance !== null) ||
                            (item.travelMode !== undefined && item.travelMode !== null);
                          
                          // 优先使用 item 自身的交通信息（用户手动设置的值），否则使用 API 返回的计算值
                          // ✅ 确保 segment 不会是空对象，必须至少有一个有效字段
                          const segment = hasManualTravelInfo
                            ? {
                                fromItemId: prevItem?.id || '',
                                toItemId: item.id,
                                fromPlace: prevItem?.Place?.nameCN || prevItem?.Place?.nameEN || '',
                                toPlace: item.Place?.nameCN || item.Place?.nameEN || '',
                                duration: item.travelFromPreviousDuration ?? apiSegment?.duration ?? null,
                                distance: item.travelFromPreviousDistance ?? apiSegment?.distance ?? null,
                                travelMode: item.travelMode ?? apiSegment?.travelMode ?? null,
                              }
                            : (apiSegment && 
                                typeof apiSegment === 'object' && 
                                'toItemId' in apiSegment &&
                                (apiSegment.duration !== null && apiSegment.duration !== undefined ||
                                 apiSegment.distance !== null && apiSegment.distance !== undefined ||
                                 apiSegment.travelMode !== null && apiSegment.travelMode !== undefined)
                                ? apiSegment 
                                : null);
                          
                          return (
                            <div key={item.id}>
                              {/* 交通段指示器（如果有的话） */}
                              {itemIdx > 0 && (
                                segment ? (
                                  <TravelSegmentIndicator segment={segment} />
                                ) : (
                                  // ✅ 如果没有交通段数据，显示占位符提示
                                  <div className="flex items-center justify-center py-1">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs text-slate-400 bg-slate-50 border-slate-200">
                                      <span className="opacity-50">缺少交通信息</span>
                                    </div>
                                  </div>
                                )
                              )}
                              
                              <ItineraryItemRow
                            key={item.id}
                            item={item}
                            dayIndex={idx}
                            itemIndex={itemIdx}
                            personaMode="auto"
                            timezone={getTimezoneByCountry(trip?.destination || '')}
                            placeImages={item.Place?.id ? placeImagesMap.get(item.Place.id) : undefined}
                            defaultWeatherLocation={defaultWeatherLocation}
                            onEdit={(item) => handleEditItem(item.id)}
                            onDelete={(item) => handleDeleteItem(item.id, item.Place?.nameCN || item.Place?.nameEN || '')}
                            onReplace={(item) => handleReplaceItem(item.id, item.Place?.nameCN || item.Place?.nameEN || '')}
                            onSearchNearby={handleSearchNearby}
                            onApplyPatch={(_item) => {
                              // 应用补丁功能 - 现在通过自动触发机制处理
                              toast.info(t('planStudio.scheduleTab.applyPatchNotImplemented'));
                            }}
                            onAskNara={planStudioActions ? (item, question) => {
                              // 计算前后衔接信息
                              const currentIndex = dayItems.findIndex(i => i.id === item.id);
                              const prevItem = currentIndex > 0 ? dayItems[currentIndex - 1] : null;
                              const nextItem = currentIndex < dayItems.length - 1 ? dayItems[currentIndex + 1] : null;
                              
                              // 计算当天统计
                              const dayStats = {
                                totalItems: dayItems.length,
                                hasMeal: dayItems.some(i => i.type === 'MEAL_ANCHOR' || i.type === 'MEAL_FLOATING'),
                                hasTransit: dayItems.some(i => i.type === 'TRANSIT'),
                              };
                              
                              // 构建完整上下文
                              const context = {
                                dayIndex: idx + 1,
                                date: day.date,
                                itemId: item.id,
                                placeName: item.Place?.nameCN || item.Place?.nameEN || '',
                                itemType: item.type,
                                itemTime: { start: item.startTime, end: item.endTime },
                                prevItem: prevItem ? { 
                                  name: prevItem.Place?.nameCN || '', 
                                  endTime: prevItem.endTime,
                                } : undefined,
                                nextItem: nextItem ? { 
                                  name: nextItem.Place?.nameCN || '', 
                                  startTime: nextItem.startTime,
                                } : undefined,
                                dayStats,
                              };
                              
                              // 选中当天和行程项（同步 UI 状态）
                              planStudioActions.selectDay(idx + 1, day.date, dayStats);
                              planStudioActions.selectItem(item.id, context.placeName, item.type, {
                                itemTime: context.itemTime,
                                prevItem: context.prevItem,
                                nextItem: context.nextItem,
                                dayStats,
                              });
                              
                              // 触发助手提问（直接传递 context，避免异步状态问题）
                              planStudioActions.askAssistantAbout(question, context);
                            } : undefined}
                              />
                            </div>
                          );
                        });
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
                                  personaMode="auto"
                                  timezone={getTimezoneByCountry(trip?.destination || '')}
                                  placeImages={fullItem.Place?.id ? placeImagesMap.get(fullItem.Place.id) : undefined}
                                  defaultWeatherLocation={defaultWeatherLocation}
                                  onEdit={(item) => handleEditItem(item.id)}
                                  onDelete={(item) => handleDeleteItem(item.id, item.Place?.nameCN || item.Place?.nameEN || '')}
                                  onReplace={(item) => handleReplaceItem(item.id, item.Place?.nameCN || item.Place?.nameEN || '')}
                                  onSearchNearby={handleSearchNearby}
                                  onAskNara={planStudioActions ? (item, question) => {
                                    // 计算当天统计
                                    const dayStats = {
                                      totalItems: dayItems.length,
                                      hasMeal: dayItems.some(i => i.type === 'MEAL_ANCHOR' || i.type === 'MEAL_FLOATING'),
                                      hasTransit: dayItems.some(i => i.type === 'TRANSIT'),
                                    };
                                    
                                    // 计算前后衔接
                                    const currentIndex = dayItems.findIndex(i => i.id === item.id);
                                    const prevItem = currentIndex > 0 ? dayItems[currentIndex - 1] : null;
                                    const nextItem = currentIndex < dayItems.length - 1 ? dayItems[currentIndex + 1] : null;
                                    
                                    // 构建完整上下文
                                    const context = {
                                      dayIndex: idx + 1,
                                      date: day.date,
                                      itemId: item.id,
                                      placeName: item.Place?.nameCN || item.Place?.nameEN || '',
                                      itemType: item.type,
                                      itemTime: { start: item.startTime, end: item.endTime },
                                      prevItem: prevItem ? { name: prevItem.Place?.nameCN || '', endTime: prevItem.endTime } : undefined,
                                      nextItem: nextItem ? { name: nextItem.Place?.nameCN || '', startTime: nextItem.startTime } : undefined,
                                      dayStats,
                                    };
                                    
                                    planStudioActions.selectDay(idx + 1, day.date, dayStats);
                                    planStudioActions.selectItem(item.id, context.placeName, item.type, {
                                      itemTime: context.itemTime,
                                      prevItem: context.prevItem,
                                      nextItem: context.nextItem,
                                      dayStats,
                                    });
                                    planStudioActions.askAssistantAbout(question, context);
                                  } : undefined}
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
                                  {formatTime(item.startTime)} - {formatTime(item.endTime)}
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
                    
                    {/* 添加行程项按钮 */}
                    <Button
                      variant="outline"
                      className="w-full mt-4 border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
                      onClick={() => {
                        setAddItemDay(day);
                        setAddItemDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加行程项
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }) : null}
      </div>

      {/* 右（4/12）：健康度卡片 + 冲突列表 */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        {/* 行程健康度摘要卡片 */}
        <Card data-tour="schedule-health">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg">🐻‍❄️</span>
              行程健康度
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 三人格评估状态 */}
            <div className="space-y-3">
              {/* Abu - 安全 */}
              {(() => {
                const abuWarnings = personaAlerts.filter(a => a.persona === 'ABU' && a.severity === 'warning').length;
                const abuInfos = personaAlerts.filter(a => a.persona === 'ABU' && a.severity === 'info').length;
                const abuStatus = abuWarnings > 0 ? 'warning' : abuInfos > 0 ? 'info' : 'success';
                return (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className={cn(
                        "h-4 w-4",
                        abuStatus === 'warning' ? 'text-red-500' : 
                        abuStatus === 'info' ? 'text-amber-500' : 'text-green-500'
                      )} />
                      <span className="text-sm font-medium">Abu (安全)</span>
                    </div>
                    <Badge variant={abuStatus === 'warning' ? 'destructive' : abuStatus === 'info' ? 'secondary' : 'outline'} className={cn(
                      "text-xs",
                      abuStatus === 'success' && 'bg-green-50 text-green-700 border-green-200'
                    )}>
                      {abuStatus === 'warning' ? `${abuWarnings} 风险` : 
                       abuStatus === 'info' ? `${abuInfos} 提醒` : '✓ 通过'}
                    </Badge>
                  </div>
                );
              })()}
              
              {/* Dr.Dre - 节奏 */}
              {(() => {
                const drDreTotal = suggestionStats?.byPersona?.drdre?.total || 0;
                const drDreBlockers = suggestionStats?.byPersona?.drdre?.bySeverity?.blocker || 0;
                const drDreStatus = drDreBlockers > 0 ? 'warning' : drDreTotal > 0 ? 'info' : 'success';
                return (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className={cn(
                        "h-4 w-4",
                        drDreStatus === 'warning' ? 'text-red-500' : 
                        drDreStatus === 'info' ? 'text-amber-500' : 'text-green-500'
                      )} />
                      <span className="text-sm font-medium">Dr.Dre (节奏)</span>
                    </div>
                    <Badge variant={drDreStatus === 'warning' ? 'destructive' : drDreStatus === 'info' ? 'secondary' : 'outline'} className={cn(
                      "text-xs",
                      drDreStatus === 'success' && 'bg-green-50 text-green-700 border-green-200'
                    )}>
                      {drDreStatus === 'warning' ? `${drDreBlockers} 阻塞` : 
                       drDreStatus === 'info' ? `${drDreTotal} 建议` : '✓ 良好'}
                    </Badge>
                  </div>
                );
              })()}
              
              {/* Neptune - 完整 */}
              {(() => {
                const neptuneTotal = suggestionStats?.byPersona?.neptune?.total || 0;
                const neptuneBlockers = suggestionStats?.byPersona?.neptune?.bySeverity?.blocker || 0;
                const neptuneStatus = neptuneBlockers > 0 ? 'warning' : neptuneTotal > 0 ? 'info' : 'success';
                return (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className={cn(
                        "h-4 w-4",
                        neptuneStatus === 'warning' ? 'text-red-500' : 
                        neptuneStatus === 'info' ? 'text-amber-500' : 'text-green-500'
                      )} />
                      <span className="text-sm font-medium">Neptune (完整)</span>
                    </div>
                    <Badge variant={neptuneStatus === 'warning' ? 'destructive' : neptuneStatus === 'info' ? 'secondary' : 'outline'} className={cn(
                      "text-xs",
                      neptuneStatus === 'success' && 'bg-green-50 text-green-700 border-green-200'
                    )}>
                      {neptuneStatus === 'warning' ? `${neptuneBlockers} 问题` : 
                       neptuneStatus === 'info' ? `${neptuneTotal} 优化` : '✓ 完整'}
                    </Badge>
                  </div>
                );
              })()}
            </div>
            
            {/* 最新提醒 */}
            {personaAlerts.length > 0 && (
              <div className="pt-3 border-t">
                <div className="flex items-start gap-2 text-sm">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {personaAlerts[0].name}：
                    </span>
                    {personaAlerts[0].message.length > 50 
                      ? personaAlerts[0].message.slice(0, 50) + '...' 
                      : personaAlerts[0].message}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 准备度入口卡片 */}
        {(() => {
          // 计算状态：分数 < 60 为红色，60-80 为琥珀色，>= 80 为绿色
          const score = readinessData?.score?.overall ?? 0;
          // ✅ 统一状态映射：blocker, must, should, optional, risks
          const blockers = readinessData?.summary?.blockers ?? 0;
          // ⚠️ 兼容旧字段：warnings → must, suggestions → should
          const must = readinessData?.summary?.must ?? readinessData?.summary?.warnings ?? 0;
          const should = readinessData?.summary?.should ?? readinessData?.summary?.suggestions ?? 0;
          const optional = readinessData?.summary?.optional ?? 0;
          const totalRisks = (readinessData?.summary?.highRisks ?? 0) + 
                            (readinessData?.summary?.mediumRisks ?? 0) + 
                            (readinessData?.summary?.lowRisks ?? 0);
          
          const isBlocked = blockers > 0 || score < 60;
          const hasWarnings = must > 0 || (score >= 60 && score < 80);
          
          return (
            <Card 
              className={cn(
                'cursor-pointer hover:shadow-md transition-all',
                isBlocked 
                  ? 'border-l-4 border-l-red-500'
                  : hasWarnings
                  ? 'border-l-4 border-l-amber-500'
                  : readinessData 
                  ? 'border-l-4 border-l-green-500'
                  : ''
              )}
              onClick={() => onOpenReadinessDrawer?.()}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className={cn(
                      'h-4 w-4',
                      isBlocked 
                        ? 'text-red-600'
                        : hasWarnings
                        ? 'text-amber-600'
                        : readinessData 
                        ? 'text-green-600'
                        : 'text-blue-600'
                    )} />
                    准备度检查
                  </CardTitle>
                  {/* 显示分数 */}
                  {readinessData && (
                    <div className={cn(
                      'text-lg font-bold',
                      score < 60 ? 'text-red-600' : score < 80 ? 'text-amber-600' : 'text-green-600'
                    )}>
                      {score}<span className="text-xs font-normal text-gray-400">/100</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingReadiness ? (
                  <div className="flex items-center justify-center py-4">
                    <Spinner className="h-4 w-4" />
                  </div>
                ) : readinessData ? (
                  <div className="space-y-3">
                    {/* 状态指示 */}
                    <div className={cn(
                      'text-sm px-3 py-2 rounded-md text-center font-medium',
                      isBlocked 
                        ? 'bg-red-50 text-red-700'
                        : hasWarnings
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-green-50 text-green-700'
                    )}>
                      {isBlocked 
                        ? '需要解决问题才能出发'
                        : hasWarnings
                        ? '有待处理的事项'
                        : '✓ 准备就绪'}
                    </div>
                    
                    {/* 数量统计 - ✅ 统一状态显示：阻塞、必须、建议、风险 */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* 阻塞项 */}
                      <div className={cn(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded',
                        blockers > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
                      )}>
                        <span className="font-medium">{blockers}</span>
                        <span>阻塞</span>
                      </div>
                      {/* 必须项 */}
                      <div className={cn(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded',
                        must > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'
                      )}>
                        <span className="font-medium">{must}</span>
                        <span>必须</span>
                      </div>
                      {/* 建议项 */}
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-gray-50 text-gray-600">
                        <span className="font-medium">{should}</span>
                        <span>建议</span>
                      </div>
                      {/* 风险项 */}
                      <div className={cn(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded',
                        totalRisks > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-600'
                      )}>
                        <span className="font-medium">{totalRisks}</span>
                        <span>风险</span>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReadinessDrawer?.();
                        }}
                      >
                        快速检查
                      </Button>
                      <Button 
                        variant="default" 
                        className="flex-1" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/dashboard/readiness?tripId=${tripId}`;
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        详细页面
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    暂无准备度数据
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* 冲突列表 - 仅在有冲突时显示 */}
        {conflicts.length > 0 && (
          <Card data-tour="schedule-conflicts">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                冲突列表
                <Badge variant="destructive" className="ml-auto">{conflicts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {conflicts.map((conflict) => {
                  // 获取受影响的行程项名称
                  const affectedItems: string[] = [];
                  conflict.affectedItemIds.forEach(itemId => {
                    // 在所有日期的行程项中查找
                    itineraryItemsMap.forEach((items) => {
                      const item = items.find(i => i.id === itemId);
                      if (item) {
                        const placeName = item.Place?.nameCN || item.Place?.nameEN || item.note || '未知地点';
                        if (!affectedItems.includes(placeName)) {
                          affectedItems.push(placeName);
                        }
                      }
                    });
                  });

                  // 格式化日期显示
                  const formattedDays = conflict.affectedDays.map((d: string) => {
                    const dayIndex = trip?.TripDay?.findIndex(day => day.date === d) ?? -1;
                    if (dayIndex >= 0) {
                      const dateStr = new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
                      return `第${dayIndex + 1}天 (${dateStr})`;
                    }
                    return d;
                  });

                  return (
                    <div
                      key={conflict.id}
                      className={cn(
                        'p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors',
                        conflict.severity === 'HIGH'
                          ? 'border-red-200 bg-red-50/50'
                          : conflict.severity === 'MEDIUM'
                          ? 'border-amber-200 bg-amber-50/50'
                          : 'border-blue-200 bg-blue-50/50'
                      )}
                      onClick={() => handleFixConflict(conflict.id, conflict.affectedDays[0] || '')}
                    >
                      {/* 标题和严重程度 */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1">
                          {conflict.type === 'SEASONAL_CONFLICT' && (
                            <Calendar className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          )}
                          <div className="text-sm font-semibold text-gray-900">{conflict.title}</div>
                        </div>
                        <Badge 
                          variant={conflict.severity === 'HIGH' ? 'destructive' : conflict.severity === 'MEDIUM' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {conflict.severity === 'HIGH' ? '严重' : conflict.severity === 'MEDIUM' ? '中等' : '轻微'}
                        </Badge>
                      </div>

                      {/* 描述 */}
                      {conflict.description && (
                        <div className="text-xs text-gray-600 mb-2 leading-relaxed">
                          {conflict.description}
                        </div>
                      )}

                      {/* 受影响的日期 */}
                      <div className="text-xs text-gray-500 mb-2">
                        <span className="font-medium">受影响日期：</span>
                        {formattedDays.join(', ')}
                      </div>

                      {/* 受影响的行程项 */}
                      {affectedItems.length > 0 && (
                        <div className="text-xs text-gray-500 mb-2">
                          <span className="font-medium">涉及活动：</span>
                          <span className="ml-1">{affectedItems.slice(0, 3).join('、')}</span>
                          {affectedItems.length > 3 && <span className="text-gray-400"> 等{affectedItems.length}项</span>}
                        </div>
                      )}

                      {/* 建议 */}
                      {conflict.suggestions && conflict.suggestions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs font-medium text-gray-700 mb-1">建议：</div>
                          <ul className="text-xs text-gray-600 space-y-0.5">
                            {conflict.suggestions.slice(0, 2).map((suggestion, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-gray-400">•</span>
                                <span>{suggestion.action}</span>
                              </li>
                            ))}
                            {conflict.suggestions.length > 2 && (
                              <li className="text-gray-400 text-xs">还有 {conflict.suggestions.length - 2} 条建议...</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA - 仅在有冲突时显示 */}
        {conflicts.length > 0 && (
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
        )}
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
          timezone={getTimezoneByCountry(trip?.destination || '')}
          tripDays={trip?.TripDay?.map(d => ({ id: d.id, date: d.date })) || []}
          currentTripDayId={editingItem?.tripDayId || (editingItem as any)?.TripDay?.id}
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
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem && `确定要删除「${deletingItem.placeName}」吗？此操作不可撤销。`}
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
              className={cn('hover:opacity-90 focus:ring-2', getGateStatusClasses('REJECT').split(' ').find(cls => cls.startsWith('bg-')) || 'bg-destructive')}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      
      {/* 审批对话框 */}
      {pendingApprovalId && (
        <ApprovalDialog
          approvalId={pendingApprovalId}
          open={approvalDialogOpen}
          onOpenChange={(open) => {
            setApprovalDialogOpen(open);
            if (!open) {
              setPendingApprovalId(null);
            }
          }}
          onDecision={handleApprovalComplete}
        />
      )}

      {/* 增强版添加行程项对话框（融合找点功能） */}
      {addItemDay && (
        <EnhancedAddItineraryItemDialog
          tripDay={addItemDay}
          tripId={tripId}
          countryCode={trip?.destination}
          open={addItemDialogOpen}
          onOpenChange={(open) => {
            setAddItemDialogOpen(open);
            if (!open) {
              setAddItemDay(null);
            }
          }}
          onSuccess={loadTrip}
        />
      )}

      {/* 搜索附近对话框 */}
      {searchNearbyDay && searchNearbyItem && (
        <EnhancedAddItineraryItemDialog
          tripDay={searchNearbyDay}
          tripId={tripId}
          countryCode={trip?.destination}
          open={searchNearbyDialogOpen}
          onOpenChange={(open) => {
            setSearchNearbyDialogOpen(open);
            if (!open) {
              setSearchNearbyItem(null);
              setSearchNearbyDay(null);
              setSearchNearbyCategory(undefined);
            }
          }}
          onSuccess={loadTrip}
          initialSearchMode="nearby"
          itemId={searchNearbyItem.id}
          initialLocation={(() => {
            const place = searchNearbyItem.Place;
            if (!place) return undefined;
            
            // 优先使用标准格式
            if (place.latitude !== undefined && place.longitude !== undefined) {
              return { lat: place.latitude, lng: place.longitude };
            }
            
            // 使用兼容格式
            if (place.lat !== undefined && place.lng !== undefined) {
              return { lat: place.lat, lng: place.lng };
            }
            
            return undefined;
          })()}
          initialCategory={searchNearbyCategory}
        />
      )}
    </>
  );
}

