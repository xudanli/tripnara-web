import { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ScheduleTabSkeleton } from '@/components/plan-studio/ScheduleTabSkeleton';
import { EmptyStateCard } from '@/components/ui/empty-state-images';
import { AlertTriangle, MapPin, GripVertical, MoreVertical, Plus, Info, ClipboardCheck, Zap, Copy, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { tripsApi, itineraryItemsApi } from '@/api/trips';
import { itineraryOptimizationApi } from '@/api/itinerary-optimization';
import { tripPlannerApi } from '@/api/trip-planner';
import { IntentTravelMode, type TripDetail, type ScheduleResponse, type ScheduleItem, type ItineraryItemDetail, type ItineraryItem, type ReplaceItineraryItemResponse, type DayMetricsResponse, type PlanStudioConflict, type DayTravelInfoResponse, type UpdateItineraryItemRequest, type AssessmentTravelMode } from '@/types/trip';
import {
  analyzeInterDayTravelTiming,
  mergeCrossDayIntoDaySummary,
} from '@/lib/inter-day-travel';
import {
  analyzeDayOneArrival,
  analyzeDayOneDepartureTiming,
  isArrivalHubItem,
} from '@/lib/day-one-arrival';
import {
  resolveAffectedDayDates,
  resolveTravelRecalcDayIds,
} from '@/lib/schedule-itinerary-refresh';
import { filterPlanStudioConflicts } from '@/lib/plan-studio-conflict-filters';
import { analyzeDayAccommodationCoverage } from '@/lib/day-accommodation-coverage';
import { extractHmFromWindow } from '@/lib/itinerary-item-card-format';
import { sortItineraryItemsForDisplay, getOvernightStayDisplayItem, getFirstDayActivityItem, isOvernightStayDisplayItem, filterCheckoutDayTimelineItems, getOvernightItemsForPriorDayTimeline, getCheckoutMorningTravelPair, getCarRentalReturnItemsForDayTimeline } from '@/lib/itinerary-item-sort';
import {
  loadTripDayTravelInfoMap,
  findInterDayTravelSegment,
  findOvernightCheckinTravelSegment,
  adjustDayTravelSummaryExcludingOvernightCheckin,
  mergeDayTravelInfoMaps,
  recalculateTripDayTravelInfoMap,
  travelSegmentHasData,
} from '@/lib/itinerary-travel-info';
import type { OptimizeRouteRequest } from '@/types/itinerary-optimization';
import { INTENT_TRAVEL_MODE_MAP } from '@/constants/itinerary-optimization';
import type { PlaceCategory } from '@/types/places-routes';
import { format } from 'date-fns';
import { DateTime } from 'luxon';
import { DrawerContext } from '@/components/layout/DashboardLayout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditItineraryItemDialog } from '@/components/trips/EditItineraryItemDialog';
import { ReplaceItineraryItemDialog } from '@/components/trips/ReplaceItineraryItemDialog';
import CascadeConfirmDialog from '@/components/trips/CascadeConfirmDialog';
import {
  resolveItineraryRequiresConfirmation,
  type ItineraryRequiresConfirmation,
} from '@/lib/itinerary-cascade-confirm.util';
import { EnhancedAddItineraryItemDialog } from '@/components/trips/EnhancedAddItineraryItemDialog';
import { getTimezoneByCountry, resolveDestinationTimezone } from '@/utils/timezone';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { resolveScheduleDayIndex } from '@/lib/plan-studio-schedule-navigation';
import {
  getGateStatusClasses,
} from '@/lib/gate-status';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
// PersonaMode 已移除 - 三人格现在是系统内部工具
import { toast } from 'sonner';
import ItineraryItemRow from '@/components/plan-studio/ItineraryItemRow';
import { TravelSegmentIndicator, TravelSummary, CrossDayTravelLeadIn, DayOneArrivalLeadIn, CheckoutMorningLeadIn, OvernightCheckinTravelConnector } from '@/components/plan-studio/TravelSegmentIndicator';
import { DayAccommodationNotice } from '@/components/plan-studio/DayAccommodationNotice';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import { usePlaceImages } from '@/hooks/usePlaceImages';
import PlanStudioContext, { type PendingSuggestion } from '@/contexts/PlanStudioContext';
import { ItineraryAdjustScheduleDayPreview } from '@/components/plan-studio/ItineraryAdjustScheduleDayPreview';
import { scheduleDayMatchesItineraryAdjustDraftPreview } from '@/lib/itinerary-adjust-response';
import {
  canEditSlotTiming,
  canRunRouteRecalculation,
  getSegmentEditorDegradation,
  guardStructuralEditOrToast,
} from '@/lib/world-model-guards';
import { SegmentEditorDegradedShell } from '@/components/planning/SegmentEditorDegradedShell';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';
import { useEmbeddedHikingTrip } from '@/hooks/useEmbeddedHikingTrip';
import { isEmbeddedHikingEnabled } from '@/lib/embedded-hiking-feature';
import { isEmbeddedHikingTrip } from '@/lib/trip-hiking';
import { EmbeddedHikingStatusBar, EmbeddedHikingDayRail } from '@/components/hiking';
import { CertaintyBadge } from '@/components/experience-fulfillment';
import { PresentedItineraryItemInsight } from '@/components/experience-fulfillment/PresentedItineraryItemInsight';
import { extractItineraryPresentation } from '@/lib/trip-experience-metadata.util';
import {
  buildItineraryPresentationLookup,
  getPresentedItineraryDay,
  matchPresentedItineraryItem,
} from '@/lib/itinerary-presentation-match.util';
import { loadLevelClasses, loadLevelLabel } from '@/lib/experience-fulfillment-display.util';

import type { DayWishImpact } from '@/types/trip-wishes';
import { useDomainWorkbenchBreakdown } from '@/hooks/useTripDomainInfluence';
import { resolveDecisionAuthority } from '@/lib/domain-influence-mapping';
import { TripDomainBreakdownCard } from '@/components/domain-influence/TripDomainBreakdownCard';
import { DomainInfluenceClaimWorkbenchDialog } from '@/components/domain-influence/DomainInfluenceClaimWorkbenchDialog';

interface ScheduleTabProps {
  tripId: string;
  refreshKey?: number; // 用于触发刷新
  wishImpactByDay?: DayWishImpact[];
}

export default function ScheduleTab({ tripId, refreshKey, wishImpactByDay }: ScheduleTabProps) {
  const { t } = useTranslation();
  const { breakdown: domainBreakdown, loading: domainBreakdownLoading, reload: reloadDomainBreakdown } =
    useDomainWorkbenchBreakdown(tripId);
  const [domainClaimDialogOpen, setDomainClaimDialogOpen] = useState(false);
  const getItemDecisionAuthority = useCallback(
    (item: ItineraryItem) =>
      resolveDecisionAuthority(domainBreakdown, item.Place?.category || item.type),
    [domainBreakdown],
  );
  const worldModelGuards = useWorldModelGuardsStore((s) => s.worldModelGuards);
  const freezeRouteSelection = worldModelGuards?.freeze_route_selection === true;
  const segmentDegradation = useMemo(
    () => getSegmentEditorDegradation(worldModelGuards),
    [worldModelGuards]
  );
  const scheduleTimelineRef = useRef<HTMLDivElement>(null);

  const scrollToScheduleDay = useCallback((dayIndex: number) => {
    const el = scheduleTimelineRef.current?.querySelector(
      `[data-schedule-day-index="${dayIndex}"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // 左右联动上下文 - 使用 useContext 直接访问（可能为 null）
  const planStudioContext = useContext(PlanStudioContext);
  const itineraryAdjustDraftPreview = planStudioContext?.itineraryAdjustDraftPreview ?? null;
  
  // 🚀 使用 ref 存储 context，避免在依赖项中使用导致循环
  const planStudioContextRef = useRef(planStudioContext);
  useEffect(() => {
    planStudioContextRef.current = planStudioContext;
  }, [planStudioContext]);

  useEffect(() => {
    if (!itineraryAdjustDraftPreview) return;
    const t = window.setTimeout(() => {
      const el = scheduleTimelineRef.current?.querySelector(
        '[data-itinerary-adjust-draft-preview]'
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
    return () => window.clearTimeout(t);
  }, [itineraryAdjustDraftPreview]);
  
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
  const embeddedHiking = useEmbeddedHikingTrip(trip);
  const showEmbeddedUi =
    isEmbeddedHikingEnabled() && embeddedHiking.embedded && isEmbeddedHikingTrip(trip);
  const [schedules, setSchedules] = useState<Map<string, ScheduleResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  /** 首次加载完成后，refreshKey 触发的刷新不再切回全屏骨架屏 */
  const hasLoadedScheduleOnceRef = useRef(false);
  
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
  
  // 安全使用 DrawerContext（若不在 DashboardLayout 中则使用空函数，避免报错）
  const drawerContext = useContext(DrawerContext);
  const setDrawerOpen = drawerContext?.setDrawerOpen ?? (() => {});
  const setDrawerTab = drawerContext?.setDrawerTab ?? (() => {});
  const setHighlightItemId = drawerContext?.setHighlightItemId ?? (() => {});
  const setHighlightItineraryItemIds = drawerContext?.setHighlightItineraryItemIds ?? (() => {});
  const highlightItineraryItemIds = drawerContext?.highlightItineraryItemIds ?? [];

  useEffect(() => {
    const onScrollScheduleDay = (event: Event) => {
      const detail = (event as CustomEvent<import('@/lib/plan-studio-schedule-navigation').PlanStudioScheduleNavigateDetail>).detail;
      const dayIndex = resolveScheduleDayIndex(detail ?? {});
      if (typeof dayIndex === 'number' && dayIndex >= 0) {
        scrollToScheduleDay(dayIndex);
      }
      if (detail?.highlightItemIds?.length) {
        setHighlightItineraryItemIds(detail.highlightItemIds);
        setHighlightItemId(detail.highlightItemIds[detail.highlightItemIds.length - 1]);
        window.setTimeout(() => setHighlightItineraryItemIds([]), 5000);
      }
      if (detail?.focus === 'travel-timing' && typeof dayIndex === 'number' && dayIndex >= 0) {
        window.setTimeout(() => {
          const el = scheduleTimelineRef.current?.querySelector(
            `[data-schedule-day-index="${dayIndex}"] [data-travel-timing-lead-in]`,
          );
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
      }
    };
    window.addEventListener('plan-studio:scroll-schedule-day', onScrollScheduleDay);
    return () => window.removeEventListener('plan-studio:scroll-schedule-day', onScrollScheduleDay);
  }, [scrollToScheduleDay, setHighlightItineraryItemIds, setHighlightItemId]);

  const findDayIndexForScope = useCallback(
    (scope: 'trip' | 'day' | 'item' | 'segment', scopeId?: string): number | null => {
      if (!trip?.TripDay || !scopeId) return null;
      if (scope === 'day') {
        const idx = trip.TripDay.findIndex((d) => d.id === scopeId);
        return idx >= 0 ? idx : null;
      }
      if (scope === 'item' || scope === 'segment') {
        for (let idx = 0; idx < trip.TripDay.length; idx++) {
          const day = trip.TripDay[idx];
          const norm = day.date.includes('T') ? day.date.split('T')[0] : day.date;
          const items =
            itineraryItemsMap.get(day.date) ??
            itineraryItemsMap.get(norm) ??
            day.ItineraryItem ??
            [];
          if (items.some((item) => item.id === scopeId)) return idx;
        }
      }
      return null;
    },
    [trip, itineraryItemsMap],
  );

  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [replacingItem, setReplacingItem] = useState<{
    id: string;
    tripDayId: string;
    placeName?: string;
  } | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingItem, setMovingItem] = useState<{ id: string; currentDayId: string } | null>(null);
  const [moveDayId, setMoveDayId] = useState<string>('');
  const [moveStartTime, setMoveStartTime] = useState<string>('');
  const [moveEndTime, setMoveEndTime] = useState<string>('');
  const [moving, setMoving] = useState(false);
  const [cascadeConfirmOpen, setCascadeConfirmOpen] = useState(false);
  const [cascadeConfirmation, setCascadeConfirmation] = useState<ItineraryRequiresConfirmation | null>(
    null
  );
  const [cascadeConfirmLoading, setCascadeConfirmLoading] = useState(false);
  const [pendingItineraryUpdate, setPendingItineraryUpdate] = useState<{
    itemId: string;
    data: UpdateItineraryItemRequest;
    onSuccess: () => Promise<void>;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    id: string;
    tripDayId: string;
    placeName: string;
  } | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [addingBuffers, setAddingBuffers] = useState(false);

  // 添加行程项对话框状态
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [addItemDay, setAddItemDay] = useState<TripDetail['TripDay'][0] | null>(null);
  /** 插入用餐模式：预填用餐类型、时间和备注（午餐/晚餐） */
  const [addItemInsertMeal, setAddItemInsertMeal] = useState<{ itemType: 'MEAL_ANCHOR' | 'MEAL_FLOATING'; startTime: string; endTime: string; note?: string } | null>(null);
  const [addItemInitialCategory, setAddItemInitialCategory] = useState<PlaceCategory | 'all' | null>(null);

  // 搜索附近对话框状态
  const [searchNearbyDialogOpen, setSearchNearbyDialogOpen] = useState(false);
  const [searchNearbyItem, setSearchNearbyItem] = useState<ItineraryItem | null>(null);
  const [searchNearbyDay, setSearchNearbyDay] = useState<TripDetail['TripDay'][0] | null>(null);
  const [searchNearbyCategory, setSearchNearbyCategory] = useState<PlaceCategory | 'all' | undefined>(undefined);
  
  // 重复项冲突对话框状态
  const [duplicateConflictDialogOpen, setDuplicateConflictDialogOpen] = useState(false);
  const [duplicateConflict, setDuplicateConflict] = useState<{
    conflict: PlanStudioConflict;
    affectedItems: Array<{ id: string; placeName: string; dayDate: string; dayIndex: number }>;
  } | null>(null);
  const [removingDuplicate, setRemovingDuplicate] = useState(false);

  // 一键解决冲突对话框状态
  const [resolveConflictsDialogOpen, setResolveConflictsDialogOpen] = useState(false);
  const [resolveConflictsPreview, setResolveConflictsPreview] = useState<{
    autoResolvable: Array<{ conflictId: string; description: string; strategy: string }>;
    needManual: Array<{ conflictId: string; description: string; reason: string }>;
  } | null>(null);
  const [loadingResolvePreview, setLoadingResolvePreview] = useState(false);
  const [executingResolve, setExecutingResolve] = useState(false);

  // 行程合理性评估状态
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<import('@/types/trip').AssessTripResponse | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [assessmentTravelModeUsed, setAssessmentTravelModeUsed] = useState<AssessmentTravelMode | null>(
    null,
  );

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

  const scheduleTimezone = useMemo(
    () => resolveDestinationTimezone(trip?.destination),
    [trip?.destination],
  );

  const itineraryPresentationLookup = useMemo(
    () => buildItineraryPresentationLookup(extractItineraryPresentation(trip?.metadata)),
    [trip?.metadata],
  );

  const resolveItemPresentation = useCallback(
    (dayNumber: number, item: Pick<ItineraryItem, 'startTime' | 'placeId' | 'Place'>) => {
      const placeId = item.placeId ?? item.Place?.id;
      let localStartTime: string | undefined;
      if (item.startTime) {
        const dt = DateTime.fromISO(item.startTime, { zone: 'utc' }).setZone(scheduleTimezone);
        if (dt.isValid) localStartTime = dt.toFormat('HH:mm');
      }
      return matchPresentedItineraryItem(itineraryPresentationLookup, {
        dayNumber,
        placeId,
        localStartTime,
      });
    },
    [itineraryPresentationLookup, scheduleTimezone],
  );

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

  const loadTrip = useCallback(async (opts?: {
    silent?: boolean;
    recalculateTravelDayIds?: string[];
  }) => {
    const silent = opts?.silent ?? false;
    // 从 ItineraryItem 转换为 ScheduleItem（保留 id 在 metadata 中）
    const convertItineraryItemsToScheduleItems = (items: ItineraryItemDetail[]): ScheduleItem[] => {
      // 后端已经按 startTime 排序返回，前端也做一次排序以确保一致性
      return sortItineraryItemsForDisplay(items.filter((item) => item.startTime && item.endTime))
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
      if (!silent) {
        setLoading(true);
        setItineraryItemsMap(new Map());
      }
      
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
            
            // displaySortIndex 优先（0=退房置顶）；否则退房置顶 + 时间轴
            const sortedItems = sortItineraryItemsForDisplay(dayItems);
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
        await loadMetricsAndConflicts(data.id, data, opts?.recalculateTravelDayIds);
      }
    } catch (err) {
      console.error('Failed to load trip:', err);
      toast.error('加载行程失败，请稍后重试');
    } finally {
      if (!silent) setLoading(false);
      hasLoadedScheduleOnceRef.current = true;
    }
  }, [tripId]); // 🚀 移除 planStudioContext 依赖，避免无限循环

  const refreshAfterItineraryChange = useCallback(
    async (opts?: {
      primaryDayId?: string;
      editedItem?: ItineraryItemDetail | null;
      extraDayIds?: string[];
    }) => {
      const dayIds = new Set(
        resolveTravelRecalcDayIds(trip, opts?.primaryDayId, opts?.editedItem),
      );
      for (const id of opts?.extraDayIds ?? []) {
        if (id) dayIds.add(id);
      }
      const ids = [...dayIds];
      const dates = resolveAffectedDayDates(trip, ids);
      try {
        await itineraryItemsApi.batchValidate(
          tripId,
          dates.length > 0 ? { dates } : undefined,
        );
      } catch (err) {
        console.warn('[ScheduleTab] batchValidate after itinerary change failed:', err);
      }
      await loadTrip({
        silent: true,
        recalculateTravelDayIds: ids.length > 0 ? ids : undefined,
      });
    },
    [trip, tripId, loadTrip],
  );

  useEffect(() => {
    hasLoadedScheduleOnceRef.current = false;
    setLoading(true);
  }, [tripId]);

  // 在 loadTrip 定义后使用它
  useEffect(() => {
    const silent = hasLoadedScheduleOnceRef.current;
    void loadTrip({ silent });
  }, [tripId, refreshKey, loadTrip]); // refreshKey：静默刷新，避免整页骨架屏闪回

  const loadMetricsAndConflicts = async (
    tripId: string,
    tripData?: TripDetail,
    recalculateTravelDayIds?: string[],
  ) => {
    try {
      // 加载冲突列表
      const conflictsData = await tripsApi.getConflicts(tripId);
      setConflicts(conflictsData.conflicts);
      
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
        
        if (recalculateTravelDayIds?.length && currentTrip) {
          const patch = await recalculateTripDayTravelInfoMap(
            tripId,
            currentTrip,
            recalculateTravelDayIds,
          );
          const affectedDates = currentTrip.TripDay
            .filter((d) => recalculateTravelDayIds.includes(d.id))
            .map((d) => d.date);
          setDayTravelInfoMap((prev) => mergeDayTravelInfoMaps(prev, patch, affectedDates));
        } else {
          await loadDayTravelInfo(tripId, currentTrip);
        }
      }
    } catch (err) {
      console.error('Failed to load metrics and conflicts:', err);
      // 如果接口未实现，静默失败，不显示数据
    }
  };

  // 加载每天的交通信息
  const loadDayTravelInfo = async (tripId: string, tripData: TripDetail) => {
    try {
      const travelInfoMap = await loadTripDayTravelInfoMap(tripId, tripData);
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
          await refreshAfterItineraryChange({ primaryDayId: targetDay.id });
          return true;
        }
        return false;
      } catch (err: any) {
        console.error('应用建议失败:', err);
        toast.error(err.message || '添加失败，请重试');
        return false;
      }
    });
  }, [setOnApplySuggestion, trip, tripId, refreshAfterItineraryChange]);

  const handleFixConflict = (conflict: PlanStudioConflict | string | { type?: string; title?: string; description?: string; affectedItemIds?: string[]; affected_item_ids?: string[]; affectedDays?: string[] }, dayDate: string) => {
    // 交通时间相关冲突（交通时间不足、交通过长等）→ 打开时间编辑弹窗，而非证据抽屉
    const isTravelTimeConflict = (c: typeof conflict) => {
      if (typeof c === 'string') return c.includes('交通时间');
      const type = (c as { type?: string }).type;
      const title = (c as { title?: string }).title ?? '';
      const desc = (c as { description?: string }).description ?? '';
      return (
        type === 'TRANSPORT_TOO_LONG' ||
        type === 'INSUFFICIENT_TRAVEL_TIME' ||
        title.includes('交通时间') ||
        desc.includes('交通时间')
      );
    };
    // 兼容 camelCase 和 snake_case（后端可能返回 affected_item_ids）
    const getAffectedItemIds = (c: typeof conflict): string[] | undefined => {
      if (typeof c === 'string' || !c) return undefined;
      const obj = c as Record<string, unknown>;
      const ids = obj.affectedItemIds ?? obj.affected_item_ids;
      return Array.isArray(ids) ? ids : undefined;
    };
    const affectedItemIds = getAffectedItemIds(conflict);
    // 交通时间冲突：优先编辑「到达」项（数组最后一个），以延后开始时间
    const itemToEdit = affectedItemIds?.length ? affectedItemIds[affectedItemIds.length - 1] : null;
    if (!itemToEdit && isTravelTimeConflict(conflict) && trip && (conflict as { affectedDays?: string[] }).affectedDays?.length) {
      // 兜底：从 itineraryItemsMap 按受影响日期查找行程项（兼容多种日期格式）
      const affectedDayRaw = (conflict as { affectedDays?: string[] }).affectedDays![0];
      const affectedDayShort = affectedDayRaw.split('T')[0] || affectedDayRaw;
      for (const d of [affectedDayRaw, affectedDayShort]) {
        const items = itineraryItemsMap.get(d);
        if (items?.length) {
          handleEditItem(items[items.length - 1].id);
          return;
        }
      }
      for (const [key, items] of itineraryItemsMap) {
        if (items?.length && (key.startsWith(affectedDayShort) || (key.split('T')[0] || key) === affectedDayShort)) {
          handleEditItem(items[items.length - 1].id);
          return;
        }
      }
    }
    if (isTravelTimeConflict(conflict) && itemToEdit && tripId) {
      handleEditItem(itemToEdit);
      return;
    }

    // 午晚餐缺失：仅响应后端显式 type（后端已不再产出 LUNCH_MISSING/DINNER_MISSING 类时，此处自然不再触发）
    const isMissingMealConflict = (c: typeof conflict): 'lunch' | 'dinner' | null => {
      if (typeof c === 'string') return null;
      const type = (c as { type?: string }).type;
      if (type === 'MISSING_LUNCH' || type === 'LUNCH_MISSING') return 'lunch';
      if (type === 'MISSING_DINNER' || type === 'DINNER_MISSING') return 'dinner';
      return null;
    };
    const missingMeal = isMissingMealConflict(conflict);
    if (missingMeal && trip?.TripDay?.length) {
      const affectedDays = (conflict as { affectedDays?: string[] }).affectedDays;
      const resolvedDayDate = affectedDays?.[0] || dayDate;
      const normalizedDate = resolvedDayDate.includes('T') ? resolvedDayDate.split('T')[0] : resolvedDayDate;
      const targetDay = trip.TripDay.find(d => d.date === resolvedDayDate || d.date === normalizedDate || (d.date.split?.('T')[0]) === normalizedDate);
      if (targetDay) {
        const isDinner = missingMeal === 'dinner';
        if (!guardStructuralEditOrToast(worldModelGuards)) return;
        const items = itineraryItemsMap.get(resolvedDayDate) || itineraryItemsMap.get(normalizedDate);
        let startTime = isDinner ? '18:00' : '12:00';
        let endTime = isDinner ? '19:00' : '13:00';
        if (items?.length) {
          const sortedItems = sortItineraryItemsForDisplay(items);
          const prevItem = sortedItems[sortedItems.length - 1];
          if (prevItem?.endTime) {
            const end = new Date(prevItem.endTime);
            startTime = `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`;
            end.setUTCMinutes(end.getUTCMinutes() + (isDinner ? 90 : 60));
            endTime = `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`;
          }
        }
        setAddItemInsertMeal({ itemType: 'MEAL_ANCHOR', startTime, endTime, note: isDinner ? '晚餐' : '午餐' });
        setAddItemDay(targetDay);
        setAddItemDialogOpen(true);
        return;
      }
    }

    // 午餐时间窗过短 → 引导智能体
    const isLunchWindowConflict = (c: typeof conflict) => {
      if (typeof c === 'string') return c.includes('午餐');
      const type = (c as { type?: string }).type;
      const title = (c as { title?: string }).title ?? '';
      return type === 'LUNCH_WINDOW' || title.includes('午餐时间窗');
    };
    if (isLunchWindowConflict(conflict) && trip?.TripDay?.length) {
      const affectedDays = (conflict as { affectedDays?: string[] }).affectedDays;
      const resolvedDayDate = affectedDays?.[0] || dayDate;
      const normalizedDate = resolvedDayDate.includes('T') ? resolvedDayDate.split('T')[0] : resolvedDayDate;
      const targetDay = trip.TripDay.find(d => d.date === resolvedDayDate || d.date === normalizedDate || (d.date.split?.('T')[0]) === normalizedDate);
      if (targetDay) {
        if (!guardStructuralEditOrToast(worldModelGuards)) return;
        const items = itineraryItemsMap.get(resolvedDayDate) || itineraryItemsMap.get(normalizedDate);
        let startTime = '12:00';
        let endTime = '13:00';
        if (affectedItemIds?.length && items?.length) {
          const sortedItems = sortItineraryItemsForDisplay(items);
          const prevIdx = sortedItems.findIndex(i => i.id === affectedItemIds[0]);
          const prevItem = prevIdx >= 0 ? sortedItems[prevIdx] : null;
          if (prevItem?.endTime) {
            const end = new Date(prevItem.endTime);
            startTime = `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`;
            end.setUTCMinutes(end.getUTCMinutes() + 60);
            endTime = `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`;
          }
        }
        setAddItemInsertMeal({ itemType: 'MEAL_ANCHOR', startTime, endTime, note: '午餐' });
        setAddItemDay(targetDay);
        setAddItemDialogOpen(true);
        return;
      }
    }

    // 行程项重复 → 打开重复项处理对话框
    const isDuplicateItemConflict = (c: typeof conflict) => {
      if (typeof c === 'string') return c.includes('重复');
      const type = (c as { type?: string }).type;
      return type === 'DUPLICATE_ITEM';
    };
    if (isDuplicateItemConflict(conflict) && trip?.TripDay?.length) {
      const planConflict = conflict as PlanStudioConflict;
      const affectedItemIds = planConflict.affectedItemIds || [];
      
      // 收集受影响行程项的详细信息
      const affectedItems: Array<{ id: string; placeName: string; dayDate: string; dayIndex: number }> = [];
      affectedItemIds.forEach(itemId => {
        trip.TripDay.forEach((day, dayIndex) => {
          const normalizedDate = day.date.includes('T') ? day.date.split('T')[0] : day.date;
          const items = itineraryItemsMap.get(day.date) || itineraryItemsMap.get(normalizedDate) || [];
          const item = items.find(i => i.id === itemId);
          if (item) {
            affectedItems.push({
              id: item.id,
              placeName: item.Place?.nameCN || item.Place?.nameEN || item.note || '未知地点',
              dayDate: day.date,
              dayIndex: dayIndex + 1,
            });
          }
        });
      });
      
      if (affectedItems.length > 0) {
        setDuplicateConflict({ conflict: planConflict, affectedItems });
        setDuplicateConflictDialogOpen(true);
        return;
      }
    }

    setDrawerOpen(true);
    // 字符串为前端计算的冲突（无完整结构），走风险 tab
    if (typeof conflict === 'string') {
      setDrawerTab('risk');
      setHighlightItemId(`${conflict}-${dayDate}`);
      return;
    }
    const planConflict = conflict as PlanStudioConflict;
    // 交通时间冲突即使无法打开编辑弹窗，也优先显示风险 tab（与时间调整相关），而非证据 tab
    if (isTravelTimeConflict(conflict)) {
      setDrawerTab('risk');
      setHighlightItemId(`${planConflict.type}-${dayDate}`);
      return;
    }
    // 有 evidenceIds 时（如闭园风险）切换到证据 tab 并高亮对应证据
    if (planConflict.evidenceIds && planConflict.evidenceIds.length > 0) {
      setDrawerTab('evidence');
      setHighlightItemId(planConflict.evidenceIds[0]);
    } else {
      setDrawerTab('risk');
      setHighlightItemId(`${planConflict.type}-${dayDate}`);
    }
  };

  // 可自动解决的冲突类型
  const AUTO_RESOLVABLE_TYPES = ['TIME_CONFLICT', 'TRANSPORT_INSUFFICIENT', 'BUFFER_INSUFFICIENT', 'DUPLICATE_ITEM', 'CLOSURE_RISK'];

  const visibleConflicts = useMemo(
    () => filterPlanStudioConflicts(conflicts, itineraryItemsMap),
    [conflicts, itineraryItemsMap],
  );
  
  // 计算可自动解决的冲突数量
  const autoResolvableConflicts = useMemo(() => {
    return visibleConflicts.filter((c) => AUTO_RESOLVABLE_TYPES.includes(c.type));
  }, [visibleConflicts]);

  // 打开一键解决冲突预览
  const handleOpenResolveConflicts = async () => {
    if (autoResolvableConflicts.length === 0) {
      toast.info('当前没有可自动解决的冲突');
      return;
    }
    
    setLoadingResolvePreview(true);
    setResolveConflictsDialogOpen(true);
    
    try {
      // 调用预览接口
      const result = await tripsApi.resolveConflicts(tripId, { dryRun: true });
      
      const autoResolvable = result.results
        .filter(r => r.resolved)
        .map(r => ({
          conflictId: r.conflictId,
          description: r.description,
          strategy: r.strategy,
        }));
      
      const needManual = result.results
        .filter(r => !r.resolved)
        .map(r => ({
          conflictId: r.conflictId,
          description: r.description,
          reason: r.failureReason || '需要手动处理',
        }));
      
      setResolveConflictsPreview({ autoResolvable, needManual });
    } catch (err: any) {
      console.error('获取冲突解决预览失败:', err);
      toast.error(err.message || '获取预览失败');
      setResolveConflictsDialogOpen(false);
    } finally {
      setLoadingResolvePreview(false);
    }
  };

  // 执行一键解决冲突
  const handleExecuteResolveConflicts = async () => {
    setExecutingResolve(true);
    
    try {
      const result = await tripsApi.resolveConflicts(tripId, { dryRun: false });
      
      if (result.resolvedCount > 0) {
        toast.success(`已解决 ${result.resolvedCount} 个冲突`, {
          description: result.skippedCount > 0 ? `${result.skippedCount} 个冲突需要手动处理` : undefined,
        });
      } else if (result.skippedCount > 0) {
        toast.info(`${result.skippedCount} 个冲突需要手动处理`);
      }
      
      // 关闭对话框并刷新数据
      setResolveConflictsDialogOpen(false);
      setResolveConflictsPreview(null);
      await loadTrip({ silent: true });
    } catch (err: any) {
      console.error('一键解决冲突失败:', err);
      toast.error(err.message || '解决冲突失败');
    } finally {
      setExecutingResolve(false);
    }
  };

  const resolveAssessmentTravelMode = useCallback(async (): Promise<AssessmentTravelMode> => {
    try {
      const intent = await tripsApi.getIntent(tripId);
      const rawMode = intent.pacingConfig?.travelMode;
      if (rawMode && Object.values(IntentTravelMode).includes(rawMode)) {
        return rawMode;
      }
    } catch (err) {
      console.warn('[ScheduleTab] getIntent for assess failed, using trip fallback:', err);
    }

    const tripMode = trip?.pacingConfig?.travelMode;
    if (tripMode && Object.values(IntentTravelMode).includes(tripMode)) {
      return tripMode;
    }

    return IntentTravelMode.PUBLIC_TRANSIT;
  }, [trip, tripId]);

  // 触发行程合理性评估（出行方式从 intent 读取；不并行 Guardian）
  const handleAssessTrip = async () => {
    setLoadingAssessment(true);
    setAssessmentDialogOpen(true);

    try {
      const travelMode = await resolveAssessmentTravelMode();
      setAssessmentTravelModeUsed(travelMode);
      const result = await tripsApi.assessTrip(tripId, { travelMode });
      setAssessmentResult(result);
    } catch (err: any) {
      console.error('行程评估失败:', err);
      toast.error(err.message || '评估失败，请稍后重试');
      setAssessmentDialogOpen(false);
    } finally {
      setLoadingAssessment(false);
    }
  };

  // 获取评估等级的样式
  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'EXCELLENT':
        return { bg: 'bg-green-100', text: 'text-green-700', label: '优秀' };
      case 'GOOD':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: '良好' };
      case 'FAIR':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '合格' };
      case 'POOR':
        return { bg: 'bg-orange-100', text: 'text-orange-700', label: '待改进' };
      case 'BAD':
        return { bg: 'bg-red-100', text: 'text-red-700', label: '不合理' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: grade };
    }
  };

  // 获取评估状态的样式 (V2)
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'REASONABLE':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: '✅', label: '合理' };
      case 'NEEDS_ATTENTION':
        return { bg: 'bg-amber-100', text: 'text-amber-700', icon: '⚠️', label: '需关注' };
      case 'HAS_ISSUES':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: '❌', label: '有问题' };
      case 'UNPLANNED':
        return { bg: 'bg-gray-100', text: 'text-gray-500', icon: '📋', label: '待规划' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: '❓', label: status };
    }
  };

  // 获取日程类型的标签 (V2)
  const getDayTypeLabel = (dayType: string) => {
    switch (dayType) {
      case 'TOURING_DAY':
        return '游览日';
      case 'REST_DAY':
        return '休息日';
      case 'ARRIVAL_DAY':
        return '抵达日';
      case 'DEPARTURE_DAY':
        return '离开日';
      case 'UNPLANNED':
        return '待规划';
      default:
        return dayType;
    }
  };

  const handleDeleteItem = (itemId: string, tripDayId: string, placeName: string) => {
    if (!guardStructuralEditOrToast(worldModelGuards)) return;
    setDeletingItem({ id: itemId, tripDayId, placeName });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!deletingItem) return;
    if (!guardStructuralEditOrToast(worldModelGuards)) return;

    const itemToDelete = deletingItem;
    
    try {
      // 1. 删除行程项
      await itineraryItemsApi.delete(itemToDelete.id);
      
      // 2. 显示成功提示
      toast.success(t('planStudio.scheduleTab.deleteSuccess', { placeName: itemToDelete.placeName }));
      
      // 3. 关闭对话框并清理状态
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      
      // 4. 静默刷新并重算当天交通（走后端 calculate-travel）
      await refreshAfterItineraryChange({ primaryDayId: itemToDelete.tripDayId });
      
      // 注意：不再自动调用 Orchestrator
      // 原因：删除行程项是用户的确定性操作，不需要 AI 实时检查
      // AI 检查应该在用户主动触发时执行（如点击"检查行程"或"一键优化"）
    } catch (err: any) {
      console.error('Failed to delete itinerary item:', err);
      toast.error(err.message || t('planStudio.scheduleTab.deleteFailed'));
    }
  };

  const handleEditItem = async (itemId: string) => {
    if (!canEditSlotTiming(worldModelGuards)) {
      toast.error(worldModelGuards?.banner_message_zh ?? '当前阶段不可编辑行程时间');
      return;
    }
    try {
      const item = await itineraryItemsApi.getById(itemId);
      setEditingItem(item);
      setEditDialogOpen(true);
    } catch (err: any) {
      console.error('Failed to load item for editing:', err);
      toast.error(err.message || t('planStudio.scheduleTab.loadItemFailed'));
    }
  };

  const handleReplaceItem = (itemId: string, tripDayId: string, placeName: string) => {
    if (!guardStructuralEditOrToast(worldModelGuards)) return;
    setReplacingItem({ id: itemId, tripDayId, placeName });
    setReplaceDialogOpen(true);
  };

  const handleSearchNearby = (item: ItineraryItem, category?: PlaceCategory) => {
    if (!guardStructuralEditOrToast(worldModelGuards)) return;

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

  const handleOpenAddItem = (day: TripDetail['TripDay'][0]) => {
    if (!guardStructuralEditOrToast(worldModelGuards)) return;
    setAddItemInsertMeal(null);
    setAddItemInitialCategory(null);
    setAddItemDay(day);
    setAddItemDialogOpen(true);
  };

  const handleOpenAddAccommodation = (day: TripDetail['TripDay'][0]) => {
    if (!guardStructuralEditOrToast(worldModelGuards)) return;
    setAddItemInsertMeal(null);
    setAddItemInitialCategory('HOTEL');
    setAddItemDay(day);
    setAddItemDialogOpen(true);
  };

  const handleAdjustSlotTiming = useCallback(() => {
    scheduleTimelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const firstDay = trip?.TripDay?.[0];
    if (!firstDay) {
      toast.info('请先在日程中添加站点，再微调各站时间');
      return;
    }
    const normalized = firstDay.date.includes('T') ? firstDay.date.split('T')[0] : firstDay.date;
    const dayItems =
      itineraryItemsMap.get(firstDay.date) ||
      itineraryItemsMap.get(normalized) ||
      firstDay.ItineraryItem ||
      [];
    const first = dayItems[0];
    if (first?.id) {
      void handleEditItem(first.id);
    } else {
      toast.info('点击各行程项菜单中的「微调时间」即可调整开始/结束时间');
    }
  }, [trip, itineraryItemsMap]);

  const runItineraryUpdateWithCascadeConfirm = useCallback(
    async (
      itemId: string,
      data: UpdateItineraryItemRequest,
      onSuccess: () => Promise<void>,
      options?: { forceCreate?: boolean; cascadeMode?: 'auto' | 'none' }
    ) => {
      try {
        await itineraryItemsApi.update(itemId, {
          ...data,
          forceCreate: options?.forceCreate,
          cascadeMode: options?.cascadeMode,
        });
        await onSuccess();
      } catch (err) {
        const confirmation = resolveItineraryRequiresConfirmation(err);
        if (confirmation && !options?.forceCreate) {
          setPendingItineraryUpdate({ itemId, data, onSuccess });
          setCascadeConfirmation(confirmation);
          setCascadeConfirmOpen(true);
          return;
        }
        throw err;
      }
    },
    []
  );

  const handleCascadeConfirmAuto = async () => {
    if (!pendingItineraryUpdate) return;
    setCascadeConfirmLoading(true);
    try {
      await runItineraryUpdateWithCascadeConfirm(
        pendingItineraryUpdate.itemId,
        pendingItineraryUpdate.data,
        pendingItineraryUpdate.onSuccess,
        { forceCreate: true, cascadeMode: 'auto' }
      );
      setCascadeConfirmOpen(false);
      setPendingItineraryUpdate(null);
      setCascadeConfirmation(null);
    } catch (err: any) {
      toast.error(err.message || t('planStudio.scheduleTab.moveFailed'));
    } finally {
      setCascadeConfirmLoading(false);
    }
  };

  const handleCascadeConfirmNone = async () => {
    if (!pendingItineraryUpdate) return;
    setCascadeConfirmLoading(true);
    try {
      await runItineraryUpdateWithCascadeConfirm(
        pendingItineraryUpdate.itemId,
        pendingItineraryUpdate.data,
        pendingItineraryUpdate.onSuccess,
        { forceCreate: true, cascadeMode: 'none' }
      );
      setCascadeConfirmOpen(false);
      setPendingItineraryUpdate(null);
      setCascadeConfirmation(null);
    } catch (err: any) {
      toast.error(err.message || t('planStudio.scheduleTab.moveFailed'));
    } finally {
      setCascadeConfirmLoading(false);
    }
  };

  const handleReplaceSuccess = async (result: ReplaceItineraryItemResponse) => {
    if (!replacingItem) return;
    try {
      await runItineraryUpdateWithCascadeConfirm(
        replacingItem.id,
        {
          placeId: result.newItem.placeId,
          startTime: result.newItem.startTime,
          endTime: result.newItem.endTime,
          note: result.newItem.reason,
        },
        async () => {
          toast.success(t('planStudio.scheduleTab.replaceSuccess'));
          await refreshAfterItineraryChange({
            primaryDayId: replacingItem.tripDayId,
            editedItem: null,
          });
          setReplaceDialogOpen(false);
          setReplacingItem(null);
        }
      );
    } catch (err: any) {
      console.error('Failed to update item after replace:', err);
      toast.error(err.message || t('planStudio.scheduleTab.replaceFailed'));
    }
  };

  const handleMoveItem = async (itemId: string, currentDayId: string) => {
    if (!guardStructuralEditOrToast(worldModelGuards)) return;
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
    if (!guardStructuralEditOrToast(worldModelGuards)) return;

    try {
      setMoving(true);

      await runItineraryUpdateWithCascadeConfirm(
        movingItem.id,
        {
          tripDayId: moveDayId,
          startTime: new Date(moveStartTime).toISOString(),
          endTime: new Date(moveEndTime).toISOString(),
        },
        async () => {
          toast.success(t('planStudio.scheduleTab.moveSuccess'));
          await refreshAfterItineraryChange({
            primaryDayId: moveDayId,
            extraDayIds: [movingItem.currentDayId],
          });
          setMoveDialogOpen(false);
          setMovingItem(null);
          setMoveDayId('');
          setMoveStartTime('');
          setMoveEndTime('');
        }
      );
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

  const handleSkipItem = async (itemId: string, tripDayId: string, placeName: string) => {
    await handleDeleteItem(itemId, tripDayId, placeName);
  };

  const handleRunOptimize = async () => {
    if (!trip || !trip.TripDay || trip.TripDay.length === 0) {
      toast.error('暂无行程数据');
      return;
    }
    if (!canRunRouteRecalculation(worldModelGuards)) {
      toast.info(
        worldModelGuards?.banner_message_zh ?? '路线选择已冻结，请仅微调各站时间'
      );
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

      // 从行程设置推导优化配置（与行程设置联动）
      const travelers = trip.pacingConfig?.travelers ?? [];
      const hasChildren = travelers.some((t) => t.type === 'CHILD');
      const hasElderly = travelers.some((t) => t.type === 'ELDERLY');
      let defaultTravelMode: 'TRANSIT' | 'WALKING' | 'DRIVING' | undefined;
      try {
        const intent = await tripsApi.getIntent(tripId);
        const rawMode = intent.pacingConfig?.travelMode;
        defaultTravelMode = rawMode ? INTENT_TRAVEL_MODE_MAP[String(rawMode)] : undefined;
      } catch {
        defaultTravelMode = undefined;
      }
      const transportPreferences = hasElderly ? { lessWalking: true } : undefined;

      // 构建优化请求
      const request: OptimizeRouteRequest = {
        placeIds,
        config: {
          date: firstDay.date,
          startTime: new Date(startDate.setHours(9, 0, 0, 0)).toISOString(),
          endTime: new Date(endDate.setHours(18, 0, 0, 0)).toISOString(),
          pacingFactor: 1.0, // 标准节奏
          hasChildren,
          hasElderly,
          defaultTravelMode,
          transportPreferences,
        },
        tripId,
        dayId: firstDay.id,
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
          const skipped = applyResult.skipped;
          // 从行程数据构建 placeId -> 中文名 映射（优先中文）
          const placeIdToNameCN = new Map<number, string>();
          for (const day of trip.TripDay ?? []) {
            for (const it of day.ItineraryItem ?? []) {
              if (it.placeId && it.Place && (it.Place.nameCN || it.Place.nameEN)) {
                placeIdToNameCN.set(it.placeId, (it.Place.nameCN && it.Place.nameCN.trim()) ? it.Place.nameCN : (it.Place.nameEN || ''));
              }
            }
          }
          const placeNames = (optimizeResult.schedule ?? [])
            .map((item) => {
              const node = optimizeResult.nodes?.[item.nodeIndex];
              if (!node) return '';
              const fromTrip = placeIdToNameCN.get(node.id);
              return fromTrip || node.nameCN || node.nameEN || node.name;
            })
            .filter(Boolean);
          const orderSummary = placeNames.length > 0
            ? placeNames.slice(0, 5).join(' → ') + (placeNames.length > 5 ? ` 等${placeNames.length}处` : '')
            : '';
          const scoreStr = optimizeResult.happinessScore != null
            ? `快乐值 ${optimizeResult.happinessScore.toFixed(0)} 分`
            : '';
          const summary = optimizeResult.conflictSummary;
          const conflictStr = summary
            ? `冲突 ${summary.before} → ${summary.after}（解决 ${summary.resolved}${summary.hasNew ? '，有新冲突' : ''}）`
            : '';
          const descParts: string[] = [];
          if (orderSummary) descParts.push(`新顺序：${orderSummary}`);
          if (scoreStr) descParts.push(scoreStr);
          if (conflictStr) descParts.push(conflictStr);
          if (skipped && skipped.length > 0) {
            descParts.push(`以下地点因不营业等原因未加入：${skipped.map((s) => s.reason).join('；')}`);
          }
          toast.success(
            `优化完成！已按路线顺序重新排列 ${applyResult.appliedItems || 0} 个行程项`,
            {
              description: descParts.join(' · '),
              duration: 10000,
            }
          );
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
    return <ScheduleTabSkeleton dayCount={2} />;
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
      {showEmbeddedUi ? (
        <EmbeddedHikingStatusBar
          tripId={tripId}
          phase={embeddedHiking.phase}
          phaseHintZh={embeddedHiking.phaseHintZh}
          segmentCount={embeddedHiking.segments.length}
          plans={embeddedHiking.plans}
        />
      ) : null}
      <div className="grid grid-cols-12 gap-6">
        {/* 左（8/12）：Day Timeline */}
        <div
          ref={scheduleTimelineRef}
          className="col-span-12 lg:col-span-8 space-y-6"
          data-tour="schedule-timeline"
        >
        <SegmentEditorDegradedShell
          variant="toolbar"
          degradation={segmentDegradation}
          onAdjustSlotTiming={
            segmentDegradation.isTopologyLocked && segmentDegradation.timingEditable
              ? handleAdjustSlotTiming
              : undefined
          }
        >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <p className="text-sm font-medium text-foreground">日程时间轴</p>
          <div className="flex items-center gap-2">
            {planStudioContext?.openPlanGate ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() =>
                  planStudioContext.openPlanGate({
                    autoGenerate: planStudioContext.hasUnsavedScheduleChanges,
                  })
                }
              >
                方案预览
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => void handleAssessTrip()}
              disabled={loadingAssessment}
            >
              {loadingAssessment ? (
                <>
                  <Spinner className="w-3 h-3 mr-1" />
                  评估中...
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-3 h-3 mr-1" />
                  日程结构评估
                </>
              )}
            </Button>
          </div>
        </div>
        {trip && trip.TripDay && Array.isArray(trip.TripDay) ? trip.TripDay.map((day, idx) => {
          const schedule = schedules.get(day.date);
          const items = schedule?.schedule?.items || [];
          
          // 标准化日期格式（处理 ISO 和短格式的差异）
          const normalizedDate = day.date.includes('T') ? day.date.split('T')[0] : day.date;

          // 格式化日期显示（处理时区）
          const dayDate = new Date(day.date);
          const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
          const weekday = weekdays[dayDate.getUTCDay()];

          const showAdjustDraftPreview =
            itineraryAdjustDraftPreview != null &&
            scheduleDayMatchesItineraryAdjustDraftPreview(day.date, itineraryAdjustDraftPreview);

          const dayWishImpact = wishImpactByDay?.find((d) => d.dayIndex === idx + 1);
          const presentedDay = getPresentedItineraryDay(itineraryPresentationLookup, idx + 1);
          const dayNumber = idx + 1;
          const crossDaySegment =
            idx > 0 && trip
              ? findInterDayTravelSegment(trip, idx - 1, dayTravelInfoMap, itineraryItemsMap)
              : null;
          const prevDay =
            idx > 0 && trip.TripDay ? trip.TripDay[idx - 1] : undefined;
          const prevNorm = prevDay
            ? prevDay.date.includes('T')
              ? prevDay.date.split('T')[0]
              : prevDay.date
            : '';
          const prevDayItems = prevDay
            ? itineraryItemsMap.get(prevDay.date) ??
              itineraryItemsMap.get(prevNorm) ??
              []
            : [];
          const prevLastItem = prevDayItems[prevDayItems.length - 1];
          const dayItemsForLeadIn =
            itineraryItemsMap.get(normalizedDate) ?? itineraryItemsMap.get(day.date) ?? [];
          const nextDayRow =
            trip?.TripDay && idx < trip.TripDay.length - 1 ? trip.TripDay[idx + 1] : undefined;
          const nextNormForBridge = nextDayRow
            ? nextDayRow.date.includes('T')
              ? nextDayRow.date.split('T')[0]
              : nextDayRow.date
            : '';
          const nextDayItemsForBridge = nextDayRow
            ? itineraryItemsMap.get(nextDayRow.date) ??
              itineraryItemsMap.get(nextNormForBridge) ??
              []
            : [];
          const bridgedOvernightItems = getOvernightItemsForPriorDayTimeline(
            nextDayItemsForBridge,
            idx + 1,
          ).filter((item) => !dayItemsForLeadIn.some((d) => d.id === item.id));
          const baseTimelineItems = filterCheckoutDayTimelineItems(dayItemsForLeadIn, idx);
          const carRentalReturnItems =
            trip?.TripDay
              ? getCarRentalReturnItemsForDayTimeline(
                  trip.TripDay,
                  idx,
                  itineraryItemsMap,
                )
              : [];
          const timelineDisplayItems = sortItineraryItemsForDisplay([
            ...baseTimelineItems,
            ...carRentalReturnItems,
          ]);
          const overnightStayItem = getOvernightStayDisplayItem(dayItemsForLeadIn);
          const checkoutMorningPair = getCheckoutMorningTravelPair(dayItemsForLeadIn);
          const firstActivityItem = getFirstDayActivityItem(dayItemsForLeadIn);
          const firstDayItem =
            idx === 0
              ? timelineDisplayItems[0] ?? dayItemsForLeadIn[0]
              : dayItemsForLeadIn[0];
          const dayTravelInfoForDay =
            dayTravelInfoMap.get(normalizedDate) ?? dayTravelInfoMap.get(day.date);
          const interDayTiming =
            crossDaySegment && idx > 0 && firstActivityItem && !overnightStayItem
              ? analyzeInterDayTravelTiming(
                  crossDaySegment,
                  idx,
                  prevLastItem,
                  firstActivityItem,
                  scheduleTimezone,
                )
              : null;
          const checkoutToActivitySegment =
            checkoutMorningPair && dayTravelInfoForDay?.segments
              ? dayTravelInfoForDay.segments.find(
                  (s) => s.toItemId === checkoutMorningPair.nextActivityItem.id,
                )
              : null;
          const checkoutMorningTiming =
            checkoutMorningPair &&
            checkoutToActivitySegment &&
            travelSegmentHasData(checkoutToActivitySegment)
              ? analyzeDayOneDepartureTiming(
                  checkoutToActivitySegment,
                  checkoutMorningPair.overnightItem,
                  checkoutMorningPair.nextActivityItem,
                  scheduleTimezone,
                )
              : null;
          const adjustedDaySummary = adjustDayTravelSummaryExcludingOvernightCheckin(
            dayTravelInfoForDay,
            dayItemsForLeadIn,
          );
          const travelSummaryMerged = mergeCrossDayIntoDaySummary(
            adjustedDaySummary ??
              dayTravelInfoForDay?.summary,
            overnightStayItem ? null : crossDaySegment,
          );
          const overnightCheckinSegment =
            trip?.TripDay && idx < trip.TripDay.length - 1
              ? findOvernightCheckinTravelSegment(
                  trip,
                  idx,
                  dayTravelInfoMap,
                  itineraryItemsMap,
                )
              : null;
          const dayOneArrivalStatus =
            idx === 0 ? analyzeDayOneArrival(firstDayItem) : null;
          const secondDayItem =
            idx === 0 && timelineDisplayItems.length > 1
              ? timelineDisplayItems[1]
              : null;
          const dayOneTravelInfo = idx === 0 ? dayTravelInfoForDay : null;
          const dayOneToFirstActivitySegment =
            secondDayItem && dayOneTravelInfo?.segments
              ? dayOneTravelInfo.segments.find((s) => s.toItemId === secondDayItem.id)
              : null;
          const dayOneDepartureTiming =
            idx === 0 &&
            firstDayItem &&
            secondDayItem &&
            dayOneToFirstActivitySegment &&
            travelSegmentHasData(dayOneToFirstActivitySegment)
              ? analyzeDayOneDepartureTiming(
                  dayOneToFirstActivitySegment,
                  firstDayItem,
                  secondDayItem,
                  scheduleTimezone,
                )
              : null;
          const showDayOneDepartureInArrivalLeadIn =
            dayOneDepartureTiming != null &&
            firstDayItem != null &&
            (isArrivalHubItem(firstDayItem) || dayOneArrivalStatus?.isArrivalHub);
          const accommodationCoverage = trip
            ? analyzeDayAccommodationCoverage(idx, trip, itineraryItemsMap)
            : null;

          return (
            <Card
              key={day.id}
              data-schedule-day-index={idx}
              className={showAdjustDraftPreview ? 'ring-1 ring-amber-300/60' : undefined}
            >
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
                    {!day.theme && presentedDay?.theme && (
                      <p className="text-sm text-muted-foreground font-medium mt-1">
                        {presentedDay.theme}
                      </p>
                    )}
                    {presentedDay && (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <CertaintyBadge
                          level={presentedDay.certaintyLevel}
                          label={presentedDay.certaintyLabel}
                        />
                        {presentedDay.coreExperience ? (
                          <span className="text-xs text-muted-foreground">{presentedDay.coreExperience}</span>
                        ) : null}
                        <Badge variant="outline" className={cn('text-[10px]', loadLevelClasses(presentedDay.driveLoad))}>
                          驾驶 {loadLevelLabel(presentedDay.driveLoad)}
                        </Badge>
                        <Badge variant="outline" className={cn('text-[10px]', loadLevelClasses(presentedDay.walkLoad))}>
                          步行 {loadLevelLabel(presentedDay.walkLoad)}
                        </Badge>
                      </div>
                    )}
                    {dayWishImpact && dayWishImpact.impactCount > 0 ? (
                      <p className="text-xs text-amber-700/90 mt-1 flex items-center gap-1">
                        <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                        有 {dayWishImpact.impactCount} 条私密偏好影响本日
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {weekday}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {showAdjustDraftPreview && itineraryAdjustDraftPreview ? (
                    <ItineraryAdjustScheduleDayPreview
                      preview={itineraryAdjustDraftPreview}
                      dayDate={day.date}
                    />
                  ) : null}
                  {showAdjustDraftPreview && items.length > 0 ? (
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      当前正式行程（确认后将更新）
                    </p>
                  ) : null}
                  <div className={showAdjustDraftPreview ? 'opacity-50 pointer-events-none' : undefined}>
                  {showEmbeddedUi && trip ? (
                    <EmbeddedHikingDayRail
                      trip={trip}
                      tripDay={day}
                      dayDate={day.date}
                      dayIndex={idx}
                      segments={embeddedHiking.segments}
                      plans={embeddedHiking.plans}
                      resolvePlan={embeddedHiking.planForSegment}
                    />
                  ) : null}
                  {/* 交通信息摘要（含自上一日衔接段） */}
                  {travelSummaryMerged ? (
                    <TravelSummary
                      totalDuration={travelSummaryMerged.totalDuration}
                      totalDistance={travelSummaryMerged.totalDistance}
                      segmentCount={travelSummaryMerged.segmentCount}
                    />
                  ) : null}

                  {accommodationCoverage?.needsAccommodation &&
                  !accommodationCoverage.hasAccommodation ? (
                    <DayAccommodationNotice
                      message={accommodationCoverage.message}
                      onAddAccommodation={() => handleOpenAddAccommodation(day)}
                    />
                  ) : null}

                  {/* 时间轴卡片 - 使用新的 ItineraryItemRow 组件 */}
                  <div className="mt-4 space-y-0">
                    {dayOneArrivalStatus && (
                      <DayOneArrivalLeadIn
                        arrivalStatus={dayOneArrivalStatus}
                        departureTiming={
                          showDayOneDepartureInArrivalLeadIn ? dayOneDepartureTiming : null
                        }
                        onEditFirstItem={
                          firstDayItem
                            ? () => void handleEditItem(firstDayItem.id)
                            : undefined
                        }
                        onAdjustFirstActivity={
                          secondDayItem
                            ? () => void handleEditItem(secondDayItem.id)
                            : undefined
                        }
                      />
                    )}
                    {idx > 0 && checkoutMorningTiming && checkoutMorningPair && (
                      <CheckoutMorningLeadIn
                        timing={checkoutMorningTiming}
                        checkoutTimeLabel={
                          checkoutMorningPair.overnightItem.endTime
                            ? extractHmFromWindow(
                                checkoutMorningPair.overnightItem.endTime,
                                scheduleTimezone,
                              )
                            : undefined
                        }
                        overnightPlaceLabel={
                          checkoutMorningPair.overnightItem.Place?.nameCN ||
                          checkoutMorningPair.overnightItem.Place?.nameEN ||
                          undefined
                        }
                        onAdjustFirstActivity={() =>
                          void handleEditItem(checkoutMorningPair.nextActivityItem.id)
                        }
                      />
                    )}
                    {interDayTiming && (
                      <CrossDayTravelLeadIn
                        timing={interDayTiming}
                        onAdjustFirstActivity={
                          firstActivityItem
                            ? () => void handleEditItem(firstActivityItem.id)
                            : undefined
                        }
                      />
                    )}
                    {(() => {
                      // 优先使用 ItineraryItemDetail 数据（更完整）
                      const dayItems =
                        itineraryItemsMap.get(day.date) || itineraryItemsMap.get(normalizedDate) || [];
                      const travelInfo = dayTravelInfoMap.get(normalizedDate) || dayTravelInfoMap.get(day.date);
                      const visibleItems = timelineDisplayItems;

                      const renderItineraryRow = (
                        item: ItineraryItemDetail,
                        itemIdx: number,
                        rowKey?: string,
                      ) => {
                        const isBridgedOvernight = bridgedOvernightItems.some((b) => b.id === item.id);
                        const prevItem = isBridgedOvernight
                          ? visibleItems[visibleItems.length - 1] ?? null
                          : itemIdx > 0
                            ? visibleItems[itemIdx - 1]
                            : null;

                        const apiSegment = travelInfo?.segments?.find((s) => s.toItemId === item.id);

                        const dayOneInlineSegment =
                          idx === 0 &&
                          itemIdx === 1 &&
                          secondDayItem?.id === item.id &&
                          dayOneDepartureTiming?.segment &&
                          travelSegmentHasData(dayOneDepartureTiming.segment)
                            ? dayOneDepartureTiming.segment
                            : null;

                        const segment = travelSegmentHasData(apiSegment)
                          ? apiSegment!
                          : dayOneInlineSegment
                            ? dayOneInlineSegment
                            : (
                                item.travelFromPreviousDuration !== undefined &&
                                  item.travelFromPreviousDuration !== null ||
                                item.travelFromPreviousDistance !== undefined &&
                                  item.travelFromPreviousDistance !== null ||
                                item.travelMode !== undefined && item.travelMode !== null
                              )
                            ? {
                                fromItemId: prevItem?.id || '',
                                toItemId: item.id,
                                fromPlace:
                                  prevItem?.Place?.nameCN || prevItem?.Place?.nameEN || '',
                                toPlace: item.Place?.nameCN || item.Place?.nameEN || '',
                                duration: item.travelFromPreviousDuration ?? null,
                                distance: item.travelFromPreviousDistance ?? null,
                                travelMode: item.travelMode ?? null,
                              }
                            : null;

                        const showInlineTravelSegment =
                          !isBridgedOvernight &&
                          itemIdx > 0 &&
                          !(
                            checkoutMorningTiming &&
                            prevItem &&
                            checkoutMorningPair &&
                            prevItem.id === checkoutMorningPair.overnightItem.id
                          );

                        return (
                          <div key={rowKey ?? item.id}>
                            {showInlineTravelSegment && (
                              segment ? (
                                <TravelSegmentIndicator segment={segment} />
                              ) : (
                                <div className="flex items-center justify-center py-1">
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs text-slate-400 bg-slate-50 border-slate-200">
                                    <span className="opacity-50">缺少交通信息</span>
                                  </div>
                                </div>
                              )
                            )}

                            <ItineraryItemRow
                              item={item}
                              dayIndex={idx}
                              itemIndex={itemIdx}
                              personaMode="auto"
                              timezone={scheduleTimezone}
                              placeImages={
                                item.Place?.id ? placeImagesMap.get(item.Place.id) : undefined
                              }
                              defaultWeatherLocation={defaultWeatherLocation}
                              highlighted={highlightItineraryItemIds.includes(item.id)}
                              structureLocked={segmentDegradation.structureReadOnly}
                              editTimingOnly={
                                segmentDegradation.isTopologyLocked && segmentDegradation.timingEditable
                              }
                              decisionAuthority={getItemDecisionAuthority(item)}
                              presentation={resolveItemPresentation(dayNumber, item)}
                              onEdit={
                                segmentDegradation.timingEditable
                                  ? (rowItem) => handleEditItem(rowItem.id)
                                  : undefined
                              }
                              onDelete={
                                segmentDegradation.structureReadOnly
                                  ? undefined
                                  : (rowItem) =>
                                      handleDeleteItem(
                                        rowItem.id,
                                        day.id,
                                        rowItem.Place?.nameCN || rowItem.Place?.nameEN || '',
                                      )
                              }
                              onReplace={
                                segmentDegradation.structureReadOnly
                                  ? undefined
                                  : (rowItem) =>
                                      handleReplaceItem(
                                        rowItem.id,
                                        day.id,
                                        rowItem.Place?.nameCN || rowItem.Place?.nameEN || '',
                                      )
                              }
                              onSearchNearby={
                                segmentDegradation.structureReadOnly ? undefined : handleSearchNearby
                              }
                              onApplyPatch={(_item) => {
                                toast.info(t('planStudio.scheduleTab.applyPatchNotImplemented'));
                              }}
                              onAskNara={
                                planStudioActions
                                  ? (rowItem, question) => {
                                      const currentIndex = dayItems.findIndex(
                                        (i) => i.id === rowItem.id,
                                      );
                                      const ctxPrev =
                                        currentIndex > 0 ? dayItems[currentIndex - 1] : null;
                                      const ctxNext =
                                        currentIndex < dayItems.length - 1
                                          ? dayItems[currentIndex + 1]
                                          : null;
                                      const dayStats = {
                                        totalItems: dayItems.length,
                                        hasMeal: dayItems.some(
                                          (i) =>
                                            i.type === 'MEAL_ANCHOR' || i.type === 'MEAL_FLOATING',
                                        ),
                                        hasTransit: dayItems.some((i) => i.type === 'TRANSIT'),
                                      };
                                      const context = {
                                        dayIndex: idx + 1,
                                        date: day.date,
                                        itemId: rowItem.id,
                                        placeName:
                                          rowItem.Place?.nameCN || rowItem.Place?.nameEN || '',
                                        itemType: rowItem.type,
                                        itemTime: {
                                          start: rowItem.startTime,
                                          end: rowItem.endTime,
                                        },
                                        prevItem: ctxPrev
                                          ? {
                                              name: ctxPrev.Place?.nameCN || '',
                                              endTime: ctxPrev.endTime,
                                            }
                                          : undefined,
                                        nextItem: ctxNext
                                          ? {
                                              name: ctxNext.Place?.nameCN || '',
                                              startTime: ctxNext.startTime,
                                            }
                                          : undefined,
                                        dayStats,
                                      };
                                      planStudioActions.selectDay(idx + 1, day.date, dayStats);
                                      planStudioActions.selectItem(
                                        rowItem.id,
                                        context.placeName,
                                        rowItem.type,
                                        {
                                          itemTime: context.itemTime,
                                          prevItem: context.prevItem,
                                          nextItem: context.nextItem,
                                          dayStats,
                                        },
                                      );
                                      planStudioActions.askAssistantAbout(question, context);
                                    }
                                  : undefined
                              }
                            />
                          </div>
                        );
                      };

                      if (visibleItems.length > 0 || bridgedOvernightItems.length > 0) {
                        return (
                          <>
                            {visibleItems.map((item, itemIdx) =>
                              renderItineraryRow(item, itemIdx),
                            )}
                            {overnightCheckinSegment &&
                              travelSegmentHasData(overnightCheckinSegment) && (
                                <OvernightCheckinTravelConnector segment={overnightCheckinSegment} />
                              )}
                            {bridgedOvernightItems.map((item, bridgeIdx) =>
                              renderItineraryRow(
                                item,
                                visibleItems.length + bridgeIdx,
                                `overnight-bridge-${item.id}`,
                              ),
                            )}
                          </>
                        );
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
                                  highlighted={highlightItineraryItemIds.includes(fullItem.id)}
                                  structureLocked={segmentDegradation.structureReadOnly}
                                  editTimingOnly={
                                    segmentDegradation.isTopologyLocked && segmentDegradation.timingEditable
                                  }
                                  decisionAuthority={getItemDecisionAuthority(fullItem)}
                                  presentation={resolveItemPresentation(dayNumber, fullItem)}
                                  onEdit={
                                    segmentDegradation.timingEditable
                                      ? (item) => handleEditItem(item.id)
                                      : undefined
                                  }
                                  onDelete={
                                    segmentDegradation.structureReadOnly
                                      ? undefined
                                      : (item) =>
                                          handleDeleteItem(
                                            item.id,
                                            day.id,
                                            item.Place?.nameCN || item.Place?.nameEN || ''
                                          )
                                  }
                                  onReplace={
                                    segmentDegradation.structureReadOnly
                                      ? undefined
                                      : (item) =>
                                          handleReplaceItem(
                                            item.id,
                                            day.id,
                                            item.Place?.nameCN || item.Place?.nameEN || ''
                                          )
                                  }
                                  onSearchNearby={
                                    segmentDegradation.structureReadOnly ? undefined : handleSearchNearby
                                  }
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
                          const fallbackPresentation = resolveItemPresentation(dayNumber, {
                            placeId: item.placeId,
                            startTime: item.startTime,
                            Place: undefined,
                          });
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
                                {fallbackPresentation ? (
                                  <PresentedItineraryItemInsight presentation={fallbackPresentation} />
                                ) : null}
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
                                        handleReplaceItem(item.metadata!.itemId, day.id, item.placeName);
                                      }}
                                    >
                                      {t('planStudio.scheduleTab.actions.replace')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSkipItem(item.metadata!.itemId, day.id, item.placeName);
                                      }}
                                    >
                                      {t('planStudio.scheduleTab.actions.skip')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteItem(item.metadata!.itemId, day.id, item.placeName);
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
                        <div className="py-4">
                          <EmptyStateCard
                            type="no-arrangements"
                            title="该日暂无安排"
                            description={
                              segmentDegradation.structureReadOnly
                                ? '可通过右侧智能体添加景点、美食或活动'
                                : '点击下方「添加行程项」，或通过右侧智能体添加'
                            }
                            imageWidth={100}
                            imageHeight={100}
                            className="py-4"
                          />
                        </div>
                      );
                    })()}

                    {!segmentDegradation.structureReadOnly && (
                      <Button
                        variant="outline"
                        className="w-full mt-4 border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
                        onClick={() => handleOpenAddItem(day)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        添加行程项
                      </Button>
                    )}
                  </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }) : null}
        </SegmentEditorDegradedShell>
      </div>

      {/* 右（4/12）：领域分解 + 快捷操作 */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <TripDomainBreakdownCard
          tripId={tripId}
          breakdown={domainBreakdown}
          loading={domainBreakdownLoading}
          onClaimDomain={() => setDomainClaimDialogOpen(true)}
        />
        {autoResolvableConflicts.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">时间轴冲突</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {autoResolvableConflicts.length} 项可自动解决；更多待办请查看「规划待办」Tab。
              </p>
              <Button
                className="w-full"
                size="sm"
                onClick={() => void handleOpenResolveConflicts()}
                disabled={loadingResolvePreview}
              >
                {loadingResolvePreview ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    加载预览…
                  </>
                ) : (
                  '一键解决可自动冲突'
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('plan-studio:switch-tab', { detail: { tab: 'conflicts' } }),
                  );
                }}
              >
                打开规划待办
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* 行程路线优化入口 - 双入口：智能优化(规划Tab) + 经典配置 */}
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-4 space-y-2">
            <Link to={`/dashboard/trips/${tripId}?tab=planning`} className="block">
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">智能优化</span>
                  <span className="text-muted-foreground text-xs">AI 驱动的全方位优化</span>
                </div>
                <Badge variant="secondary" className="text-xs">推荐</Badge>
              </div>
            </Link>
            <Link to={`/dashboard/trips/optimize?tripId=${tripId}`} className="block">
              <div className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">经典配置</span>
                <span className="text-muted-foreground text-xs">手动选择地点、交通方式</span>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* CTA - 仅在有冲突时显示 */}
        {visibleConflicts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              根据距离、交通时间与节奏重新排列当日行程顺序，减少往返、降低疲劳
            </p>
            <Button 
              className="w-full" 
              data-tour="schedule-optimize" 
              onClick={handleRunOptimize}
              disabled={optimizing || !canRunRouteRecalculation(worldModelGuards)}
              title={
                freezeRouteSelection
                  ? worldModelGuards?.banner_message_zh ?? '路线已锁定，仅可微调时间'
                  : undefined
              }
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
            <Link to={`/dashboard/trips/${tripId}?tab=planning`}>
              <Button variant="ghost" className="w-full text-sm" size="sm">
                智能优化（高级选项）
              </Button>
            </Link>
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
          onSuccess={async () => {
            const dayId =
              editingItem?.tripDayId || (editingItem as ItineraryItemDetail)?.TripDay?.id;
            await refreshAfterItineraryChange({
              primaryDayId: dayId,
              editedItem: editingItem,
            });
          }}
          timezone={getTimezoneByCountry(trip?.destination || '')}
          tripDays={trip?.TripDay?.map(d => ({ id: d.id, date: d.date })) || []}
          currentTripDayId={editingItem?.tripDayId || (editingItem as any)?.TripDay?.id}
        />
      )}

      <CascadeConfirmDialog
        open={cascadeConfirmOpen}
        onOpenChange={setCascadeConfirmOpen}
        confirmation={cascadeConfirmation}
        loading={cascadeConfirmLoading}
        onConfirmAuto={handleCascadeConfirmAuto}
        onConfirmNone={handleCascadeConfirmNone}
      />

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
          tripDays={trip?.TripDay ?? []}
          countryCode={trip?.destination}
          open={addItemDialogOpen}
          onOpenChange={(open) => {
            setAddItemDialogOpen(open);
            if (!open) {
              setAddItemDay(null);
              setAddItemInsertMeal(null);
              setAddItemInitialCategory(null);
            }
          }}
          onSuccess={async () => {
            const dayId = addItemDay?.id;
            setAddItemInsertMeal(null);
            setAddItemInitialCategory(null);
            await refreshAfterItineraryChange({ primaryDayId: dayId });
          }}
          initialInsertMeal={addItemInsertMeal ?? undefined}
          initialCategory={addItemInitialCategory ?? undefined}
        />
      )}

      {/* 搜索附近对话框 */}
      {searchNearbyDay && searchNearbyItem && (
        <EnhancedAddItineraryItemDialog
          tripDay={searchNearbyDay}
          tripId={tripId}
          tripDays={trip?.TripDay ?? []}
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
          onSuccess={async () => {
            const dayId = searchNearbyDay?.id;
            await refreshAfterItineraryChange({ primaryDayId: dayId });
          }}
          initialSearchMode="nearby"
          itemId={searchNearbyItem.id}
          initialLocation={(() => {
            const place = searchNearbyItem.Place;
            if (!place) return undefined;

            if (place.latitude !== undefined && place.longitude !== undefined) {
              return { lat: place.latitude, lng: place.longitude };
            }

            if (place.lat !== undefined && place.lng !== undefined) {
              return { lat: place.lat, lng: place.lng };
            }

            return undefined;
          })()}
          initialCategory={searchNearbyCategory}
        />
      )}

      {/* 重复项冲突处理对话框 */}
      <Dialog open={duplicateConflictDialogOpen} onOpenChange={(open) => {
        setDuplicateConflictDialogOpen(open);
        if (!open) {
          setDuplicateConflict(null);
          setRemovingDuplicate(false);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-amber-500" />
              处理重复行程项
            </DialogTitle>
            <DialogDescription>
              {duplicateConflict?.conflict.description || '发现重复的行程项，请选择处理方式'}
            </DialogDescription>
          </DialogHeader>
          
          {duplicateConflict && (
            <div className="space-y-4 py-4">
              {/* 受影响的行程项列表 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">重复的行程项：</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {duplicateConflict.affectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          第 {item.dayIndex} 天
                        </Badge>
                        <span className="text-sm font-medium">{item.placeName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={removingDuplicate}
                        onClick={async () => {
                          setRemovingDuplicate(true);
                          try {
                            await itineraryItemsApi.delete(item.id);
                            toast.success(`已删除「${item.placeName}」（第 ${item.dayIndex} 天）`);
                            setDuplicateConflictDialogOpen(false);
                            setDuplicateConflict(null);
                            const dayId = trip?.TripDay?.find(
                              (d) =>
                                d.date === item.dayDate ||
                                d.date.startsWith(item.dayDate) ||
                                item.dayDate.startsWith(d.date.split('T')[0]),
                            )?.id;
                            await loadTrip({
                              silent: true,
                              recalculateTravelDayIds: dayId ? [dayId] : undefined,
                            });
                          } catch (err: any) {
                            toast.error(err.message || '删除失败');
                          } finally {
                            setRemovingDuplicate(false);
                          }
                        }}
                      >
                        {removingDuplicate ? <Spinner className="w-3 h-3" /> : '移除'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 提示信息 */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>提示：</strong>点击「移除」可删除对应天的行程项。如果您希望保留所有行程项，可以直接关闭此对话框。
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDuplicateConflictDialogOpen(false);
                setDuplicateConflict(null);
              }}
              disabled={removingDuplicate}
            >
              保留全部
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 一键解决冲突预览对话框 */}
      <Dialog open={resolveConflictsDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setResolveConflictsDialogOpen(false);
          setResolveConflictsPreview(null);
        }
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              一键解决冲突
            </DialogTitle>
            <DialogDescription>
              预览将要执行的操作，确认后将自动解决可处理的冲突
            </DialogDescription>
          </DialogHeader>

          {loadingResolvePreview ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Spinner className="w-6 h-6" />
              <span className="text-sm text-muted-foreground">正在分析冲突...</span>
            </div>
          ) : resolveConflictsPreview ? (
            <div className="space-y-4 py-2">
              {/* 可自动解决的冲突 */}
              {resolveConflictsPreview.autoResolvable.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                    <ClipboardCheck className="h-4 w-4" />
                    将自动解决 {resolveConflictsPreview.autoResolvable.length} 个冲突：
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {resolveConflictsPreview.autoResolvable.map((item) => (
                      <div
                        key={item.conflictId}
                        className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded text-xs"
                      >
                        <span className="text-green-600 mt-0.5">✓</span>
                        <div className="flex-1">
                          <div className="text-gray-800">{item.description}</div>
                          <div className="text-gray-500 mt-0.5">策略：{item.strategy}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 需手动处理的冲突 */}
              {resolveConflictsPreview.needManual.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    以下 {resolveConflictsPreview.needManual.length} 个冲突需要手动处理：
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {resolveConflictsPreview.needManual.map((item) => (
                      <div
                        key={item.conflictId}
                        className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs"
                      >
                        <span className="text-amber-600 mt-0.5">⚠</span>
                        <div className="flex-1">
                          <div className="text-gray-800">{item.description}</div>
                          <div className="text-gray-500 mt-0.5">{item.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 无可解决冲突 */}
              {resolveConflictsPreview.autoResolvable.length === 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">当前所有冲突都需要手动处理</p>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResolveConflictsDialogOpen(false);
                setResolveConflictsPreview(null);
              }}
              disabled={executingResolve}
            >
              取消
            </Button>
            <Button
              onClick={handleExecuteResolveConflicts}
              disabled={executingResolve || loadingResolvePreview || !resolveConflictsPreview?.autoResolvable.length}
            >
              {executingResolve ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  执行中...
                </>
              ) : (
                <>
                  确认执行
                  {resolveConflictsPreview?.autoResolvable.length ? (
                    <Badge variant="secondary" className="ml-1.5">
                      {resolveConflictsPreview.autoResolvable.length}
                    </Badge>
                  ) : null}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 行程合理性评估对话框 V2 */}
      <DomainInfluenceClaimWorkbenchDialog
        tripId={tripId}
        open={domainClaimDialogOpen}
        onOpenChange={(open) => {
          setDomainClaimDialogOpen(open);
          if (!open) void reloadDomainBreakdown();
        }}
      />
      <AssessmentDialog 
        open={assessmentDialogOpen}
        onOpenChange={(open) => {
          if (!loadingAssessment) {
            setAssessmentDialogOpen(open);
            if (!open) {
              setAssessmentResult(null);
              setAssessmentTravelModeUsed(null);
            }
          }
        }}
        loading={loadingAssessment}
        result={assessmentResult}
        getGradeStyle={getGradeStyle}
        getStatusStyle={getStatusStyle}
        getDayTypeLabel={getDayTypeLabel}
        travelModeLabel={
          assessmentTravelModeUsed ? formatAssessmentTravelModeLabel(assessmentTravelModeUsed) : null
        }
        onReassess={handleAssessTrip}
      />
    </>
  );
}

// 行程评估对话框组件 V2
const ASSESSMENT_TRAVEL_MODE_LABELS: Record<AssessmentTravelMode, string> = {
  [IntentTravelMode.PUBLIC_TRANSIT]: '🚇 公共交通',
  [IntentTravelMode.DRIVING]: '🚗 自驾',
  [IntentTravelMode.MIXED]: '🔄 混合',
};

function formatAssessmentTravelModeLabel(mode: AssessmentTravelMode): string {
  return ASSESSMENT_TRAVEL_MODE_LABELS[mode] ?? mode;
}

function AssessmentDialog({
  open,
  onOpenChange,
  loading,
  result,
  getGradeStyle,
  getStatusStyle,
  getDayTypeLabel,
  travelModeLabel,
  onReassess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  result: import('@/types/trip').AssessTripResponse | null;
  getGradeStyle: (grade: string) => { bg: string; text: string; label: string };
  getStatusStyle: (status: string) => { bg: string; text: string; icon: string; label: string };
  getDayTypeLabel: (dayType: string) => string;
  travelModeLabel: string | null;
  onReassess: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-500" />
            行程合理性评估
          </DialogTitle>
          <DialogDescription>
            基于七大维度评估每日行程的合理性；出行方式读取自行程意图，请在「意图与约束」中修改。
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Spinner className="w-8 h-8" />
              <p className="text-sm text-muted-foreground">正在评估行程...</p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg text-sm">
                <span className="text-muted-foreground">
                  按当前出行方式评估：
                  <span className="text-foreground font-medium ml-1">
                    {travelModeLabel ?? '—'}
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={onReassess}
                  disabled={loading}
                >
                  重新评估
                </Button>
              </div>

              {/* 整体评估摘要 */}
              <div className="p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">整体合理率</span>
                    {result.overallGrade && (
                      <Badge className={cn(
                        "text-xs",
                        getGradeStyle(result.overallGrade).bg,
                        getGradeStyle(result.overallGrade).text
                      )}>
                        {getGradeStyle(result.overallGrade).label}
                      </Badge>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {result.overallReasonableRate}%
                  </span>
                </div>
                
                {/* 进度条 */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      result.overallReasonableRate >= 75 ? 'bg-green-500' :
                      result.overallReasonableRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${result.overallReasonableRate}%` }}
                  />
                </div>
                
                {/* 四态统计 V2 */}
                <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                  <div className="flex items-center gap-1 text-green-700">
                    <span>✅</span>
                    <span>{result.reasonableDays} 合理</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-700">
                    <span>⚠️</span>
                    <span>{result.needsAttentionDays ?? 0} 需关注</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-700">
                    <span>❌</span>
                    <span>{result.hasIssuesDays ?? 0} 有问题</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <span>📋</span>
                    <span>{result.unplannedDays ?? 0} 待规划</span>
                  </div>
                </div>
              </div>

              {/* 整体建议 */}
              {result.topSuggestions && result.topSuggestions.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-800">主要建议</p>
                      <ul className="text-xs text-amber-700 space-y-1">
                        {result.topSuggestions.slice(0, 3).map((suggestion, idx) => (
                          <li key={idx}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 每日详情 V2 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">每日评估</h4>
                {result.days.map((day) => {
                  const statusStyle = getStatusStyle(day.status);
                  const isUnplanned = day.status === 'UNPLANNED';
                  
                  return (
                    <Collapsible key={day.date} disabled={isUnplanned}>
                      <CollapsibleTrigger className="w-full" disabled={isUnplanned}>
                        <div className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors",
                          isUnplanned ? 'border-dashed border-gray-300 bg-gray-50' :
                          day.status === 'REASONABLE' ? 'border-gray-200 hover:bg-gray-50' :
                          day.status === 'NEEDS_ATTENTION' ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50' :
                          'border-red-200 bg-red-50/50 hover:bg-red-50'
                        )}>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{day.date}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                  {getDayTypeLabel(day.dayType)}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {isUnplanned ? '暂无活动安排' : `${day.activityCount} 个活动 · ${day.activeDurationHours.toFixed(1)}h`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isUnplanned ? (
                              <Badge variant="outline" className="text-xs text-gray-500">
                                {statusStyle.icon} {statusStyle.label}
                              </Badge>
                            ) : (
                              <>
                                <Badge className={cn("text-xs", statusStyle.bg, statusStyle.text)}>
                                  {day.overallScore}分
                                </Badge>
                                <span className="text-base">{statusStyle.icon}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      {!isUnplanned && day.dimensions && (
                        <CollapsibleContent>
                          <div className="mt-2 ml-2 p-3 bg-gray-50 rounded-lg space-y-3">
                            {/* 维度评分 */}
                            <div className="grid grid-cols-2 gap-2">
                              {day.dimensions.map((dim) => (
                                <div 
                                  key={dim.dimension}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded text-xs",
                                    dim.passed ? 'bg-white' : 'bg-red-50'
                                  )}
                                >
                                  <span className="text-gray-600">{dim.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                      "font-medium",
                                      dim.passed ? 'text-gray-900' : 'text-red-600'
                                    )}>{dim.score}</span>
                                    {dim.passed ? (
                                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <XCircle className="w-3 h-3 text-red-500" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* 问题和建议 */}
                            {day.topSuggestion && (
                              <div className="flex items-start gap-2 p-2 bg-amber-50 rounded text-xs">
                                <Lightbulb className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                                <span className="text-amber-800">{day.topSuggestion}</span>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
