import { useEffect, useState, useContext, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DrawerContext } from '@/components/layout/DashboardLayout';
import { toast } from 'sonner';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import { tripDetailApi } from '@/api/trip-detail';
import type { Health } from '@/api/trip-detail';
import type { 
  TripDetail, 
  ItineraryItem, 
  TripRecapReport,
  DayMetricsResponse,
  TripMetricsResponse,
  ConflictsResponse
} from '@/types/trip';
import type { Suggestion } from '@/types/suggestion';
import { AdjustTimeDialog } from '@/components/trips/AdjustTimeDialog';
import { SuggestionPreviewDialog } from '@/components/trips/SuggestionPreviewDialog';
import type { Country } from '@/types/country';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TripFeedbackDialog } from '@/components/fitness';
import {
  getTripHikingSegments,
  isEmbeddedHikingTrip,
} from '@/lib/trip-hiking';
import { isEmbeddedHikingEnabled } from '@/lib/embedded-hiking-feature';
import { mergeTripMetadata } from '@/lib/hiking-segments';
import { useEmbeddedHikingTrip } from '@/hooks/useEmbeddedHikingTrip';
import { AddHikingSegmentDialog } from '@/components/hiking';
import type { HikingSegment } from '@/types/hiking-embedded';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { LogoLoading } from '@/components/common/LogoLoading';
import { TripDetailSkeleton } from '@/components/trips/TripDetailSkeleton';
import { TripGeneratingPlaceholder } from '@/components/trips/TripGeneratingPlaceholder';
import { TripSkeletonOnlyEmptyState } from '@/components/trips/TripSkeletonOnlyEmptyState';
import { TRIP_DATA_UPDATED_EVENT, type TripDataUpdatedDetail } from '@/lib/agent-trip-sync';
import { shouldShowNlItemsGeneratingPlaceholder, shouldShowTripSkeletonOnlyEmptyState } from '@/lib/trip-planning-complete';
import { useTravelStatus } from '@/hooks/useTravelStatus';
import { buildTripAutomationAuthorizationPath } from '@/lib/travel-status-navigation.util';
import { normalizeSuggestionForDisplay } from '@/lib/persona-alert-display';
import { Tabs, TabsContent } from '@/components/ui/tabs';
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
import { InTripHandoffChecklist, InTripPostTripSummaryPanel } from '@/components/in-trip';
import { useInTripHandoff } from '@/hooks/useInTripHandoff';
import { useInTripPostTripSummary } from '@/hooks/useInTripExperience';
import { useTripDetailTabBff } from '@/hooks/useTripDetailTabBff';
import { buildEnterTravelingPayload } from '@/lib/in-trip-execution';
import { MapPin, Trash2, TrendingUp, RefreshCw, Play, Compass, BarChart3, AlertTriangle } from 'lucide-react';
import TripDetailBudgetTab from '@/components/trips/detail/tabs/TripDetailBudgetTab';
import { MetricExplanationDialog } from '@/components/trips/MetricExplanationDialog';
import { AutoOptimizeDialog } from '@/components/trips/AutoOptimizeDialog';
import { cn } from '@/lib/utils';
import { EditTripDialog } from '@/components/trips/EditTripDialog';
import { DeleteTripDialog } from '@/components/trips/DeleteTripDialog';
import { ShareTripDialog } from '@/components/trips/ShareTripDialog';
import { CollaboratorsDialog } from '@/components/trips/CollaboratorsDialog';
import { EditItineraryItemDialog } from '@/components/trips/EditItineraryItemDialog';
import { CreateItineraryItemDialog } from '@/components/trips/CreateItineraryItemDialog';
import { ReplaceItineraryItemDialog } from '@/components/trips/ReplaceItineraryItemDialog';
import { itineraryItemsApi } from '@/api/trips';
import type { ReplaceItineraryItemResponse } from '@/types/trip';
import { getTripStatusLabel } from '@/lib/trip-status';
import { formatCurrency } from '@/utils/format';
import { WeatherAlertBanner } from '@/components/weather/WeatherCard';
// V2 优化组件
import { FeedbackForm } from '@/components/optimization';
import { useSubmitFeedback } from '@/hooks/useOptimizationV2';
import { DEFAULT_WEIGHTS } from '@/types/optimization-v2';
// 决策引擎组件
import { DecisionFeedbackForm } from '@/components/decision';
import { useAuth } from '@/hooks/useAuth';
import { isSelfEvolutionEnabled } from '@/lib/self-evolution-feature';
import { TripSelfEvolutionSection } from '@/features/self-evolution';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageSquare } from 'lucide-react';
import { buildCollabCenterPlanStudioUrl } from '@/lib/collab-center-navigation';
import {
  buildTripDetailTimelineItemPath,
  buildTripExecutePath,
  parseTripDetailHighlightItemId,
  tripDetailExecuteTabRedirectAllowed,
} from '@/lib/trip-detail-navigation.util';
import { navigateToPlanStudioSchedule } from '@/lib/plan-studio-schedule-navigation';
import {
  trackTripDetailEvidenceFilesLink,
  trackTripDetailPlanStudioDeeplink,
  trackTripDetailTabView,
} from '@/utils/trip-detail-analytics';
import TripDetailHeader from '@/components/trips/detail/TripDetailHeader';
import TripDetailTabNav, {
  tripDetailLegacyTabRedirect,
  tripDetailTabScrollAreaClass,
  type TripDetailTabValue,
  type TripOverviewSection,
} from '@/components/trips/detail/TripDetailTabNav';
import TripDetailTravelOverviewTab from '@/components/trips/detail/tabs/TripDetailTravelOverviewTab';
import TripDetailTimelineTab from '@/components/trips/detail/tabs/TripDetailTimelineTab';
import TripBookingsProtectionTab from '@/components/trips/detail/tabs/TripBookingsProtectionTab';
import TripDetailTodayTab from '@/components/trips/detail/tabs/TripDetailTodayTab';
import TripDetailMapTab from '@/components/trips/detail/tabs/TripDetailMapTab';
import TripDetailMembersTab from '@/components/trips/detail/tabs/TripDetailMembersTab';
import TripDetailAccommodationTab from '@/components/trips/detail/tabs/TripDetailAccommodationTab';
import TripDetailActivitiesTab from '@/components/trips/detail/tabs/TripDetailActivitiesTab';
import TripDetailFilesTab from '@/components/trips/detail/tabs/TripDetailFilesTab';
import TripDetailDecisionLogTab from '@/components/trips/detail/tabs/TripDetailDecisionLogTab';
import { TripDetailSuggestionsSheet } from '@/components/trips/detail/TripDetailSuggestionsSheet';

// const getStatusColor = (status: string) => {
//   switch (status) {
//     case 'PLANNING':
//       return 'bg-muted/15 text-muted-foreground border-border';
//     case 'IN_PROGRESS':
//       return 'bg-gate-allow text-gate-allow-foreground border-gate-allow-border';
//     case 'COMPLETED':
//       return 'bg-gray-100 text-gray-800 border-gray-200';
//     case 'CANCELLED':
//       return 'bg-gate-reject text-gate-reject-foreground border-gate-reject-border';
//     default:
//       return 'bg-gray-100 text-gray-800 border-gray-200';
//   }
// };

// 使用统一的工具函数
// 使用统一的工具函数 getTripStatusLabel，此函数已移除

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t: _t } = useTranslation();
  const { user } = useAuth();
  const submitFeedbackMutation = useSubmitFeedback();
  
  console.log('[TripDetail] 组件渲染:', { id, hasId: !!id, pathname: location.pathname });

  // 提取国家代码的辅助函数
  const extractCountryCodes = (destination: string | undefined): string[] => {
    if (!destination) return [];
    const parts = destination.split(',');
    const countryCode = parts[0]?.trim().toUpperCase();
    return countryCode ? [countryCode] : [];
  };
  // 安全地使用 DrawerContext，如果不在 DashboardLayout 中则使用空函数
  const drawerContext = useContext(DrawerContext);
  const setDrawerOpen = drawerContext?.setDrawerOpen || (() => {});
  const setDrawerTab = drawerContext?.setDrawerTab || (() => {});
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collaboratorsDialogOpen, setCollaboratorsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [replacingItem, setReplacingItem] = useState<ItineraryItem | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [recapReport, setRecapReport] = useState<TripRecapReport | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | null>(null);
  const [statusConfirmText, setStatusConfirmText] = useState(''); // ✅ 状态修改确认输入
  const [statusConfirmCode, setStatusConfirmCode] = useState<string>(''); // ✅ 随机验证码
  const {
    verify: handoffVerify,
    verifyLoading: handoffVerifyLoading,
    verifyError: handoffVerifyError,
    reloadVerify: reloadHandoffVerify,
  } = useInTripHandoff(id, { autoVerify: false, autoSnapshot: false });
  const isTripCompleted = trip?.status === 'COMPLETED';
  const {
    data: postTripSummary,
    loading: postTripSummaryLoading,
    error: postTripSummaryError,
  } = useInTripPostTripSummary(id, isTripCompleted);

  useEffect(() => {
    if (!statusChangeDialogOpen || pendingStatus !== 'IN_PROGRESS' || trip?.status !== 'PLANNING') {
      return;
    }
    reloadHandoffVerify();
  }, [statusChangeDialogOpen, pendingStatus, trip?.status, reloadHandoffVerify]);

  const [_country, setCountry] = useState<Country | null>(null);
  const [adjustTimeDialogOpen, setAdjustTimeDialogOpen] = useState(false);
  const [adjustingSuggestion, setAdjustingSuggestion] = useState<Suggestion | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewSuggestion, setPreviewSuggestion] = useState<Suggestion | null>(null);
  const [previewActionId, setPreviewActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [outcomeAutoPrompt, setOutcomeAutoPrompt] = useState(false);
  const [metricExplanationDialogOpen, setMetricExplanationDialogOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'schedule' | 'budget' | 'pace' | 'feasibility' | null>(null);
  const [autoOptimizeDialogOpen, setAutoOptimizeDialogOpen] = useState(false);
  // 体能反馈弹窗状态
  const [fitnessFeedbackDialogOpen, setFitnessFeedbackDialogOpen] = useState(false);
  const [fitnessFeedbackShown, setFitnessFeedbackShown] = useState(false);
  const [optimizationFeedbackDialogOpen, setOptimizationFeedbackDialogOpen] = useState(false);
  
  // 新增：风险、指标相关状态
  const [personaAlertsLoading, setPersonaAlertsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsHydrated, setSuggestionsHydrated] = useState(false);
  const [suggestionsPanelOpen, setSuggestionsPanelOpen] = useState(false);
  const [dayMetricsMap, setDayMetricsMap] = useState<Map<string, DayMetricsResponse>>(new Map());
  const [tripMetrics, setTripMetrics] = useState<TripMetricsResponse | null>(null);
  const [conflicts, setConflicts] = useState<ConflictsResponse | null>(null);

  // ✅ 批量 seen：避免用户每次进来都还是 new（仅对“已展示过的 new suggestions”触发一次）
  const markedSuggestionIdsRef = useRef<Set<string>>(new Set());
  const markSeenInFlightRef = useRef(false);
  const suggestionsLoadPromiseRef = useRef<Promise<void> | null>(null);
  
  // 新增：决策日志相关状态
  // 新增：行程详情页 Agent 相关状态
  const [tripHealth, setTripHealth] = useState<Health | null>(null);
  const [addSegmentOpen, setAddSegmentOpen] = useState(false);

  const embeddedHiking = useEmbeddedHikingTrip(trip);
  const showEmbeddedUi =
    isEmbeddedHikingEnabled() && embeddedHiking.embedded && isEmbeddedHikingTrip(trip);
  const tabBff = useTripDetailTabBff(id);
  useTravelStatus({
    tripId: id ?? '',
    enabled: Boolean(id),
  });
  const highlightItineraryItemId = useMemo(
    () => parseTripDetailHighlightItemId(searchParams),
    [searchParams],
  );

  const redirectToExecute = useCallback(() => {
    if (!id || !tripDetailExecuteTabRedirectAllowed(trip?.status)) return false;
    navigate(buildTripExecutePath(id), { replace: true });
    return true;
  }, [id, trip?.status, navigate]);

  /** Match Square 骨架行程：仅当 travel-status BFF 不可用时才整页降级为 legacy 空态 */
  const isSkeletonOnlyTrip = useMemo(
    () => Boolean(trip && shouldShowTripSkeletonOnlyEmptyState(trip)),
    [trip],
  );
  const skeletonTravelStatus = useTravelStatus({
    tripId: id ?? '',
    enabled: Boolean(id) && !loading && isSkeletonOnlyTrip,
  });

  useEffect(() => {
    setSuggestionsHydrated(false);
    setSuggestions([]);
    setSuggestionsPanelOpen(false);
    markedSuggestionIdsRef.current = new Set();
    suggestionsLoadPromiseRef.current = null;
  }, [id]);

  const newSuggestionCount = tabBff.timeline?.stats.newSuggestionCount ?? 0;

  // 🆕 货币状态：用于格式化费用显示
  const [currency, setCurrency] = useState<string>('CNY');

  // ⚠️ 重要：所有 hooks（包括 useMemo）必须在任何条件返回之前调用
  // 获取天气位置：优先使用行程项坐标，否则使用目的地国家默认坐标
  const weatherLocation = useMemo(() => {
    if (!trip) {
      return null;
    }

    // 常见国家首都坐标
    const COORDS: Record<string, { lat: number; lng: number; name: string }> = {
      'IS': { lat: 64.1466, lng: -21.9426, name: '冰岛·雷克雅未克' },
      'JP': { lat: 35.6762, lng: 139.6503, name: '日本·东京' },
      'TH': { lat: 13.7563, lng: 100.5018, name: '泰国·曼谷' },
      'KR': { lat: 37.5665, lng: 126.9780, name: '韩国·首尔' },
      'US': { lat: 40.7128, lng: -74.0060, name: '美国·纽约' },
      'GB': { lat: 51.5074, lng: -0.1278, name: '英国·伦敦' },
      'FR': { lat: 48.8566, lng: 2.3522, name: '法国·巴黎' },
      'CN': { lat: 39.9042, lng: 116.4074, name: '中国·北京' },
      'SG': { lat: 1.3521, lng: 103.8198, name: '新加坡' },
      'AU': { lat: -33.8688, lng: 151.2093, name: '澳大利亚·悉尼' },
    };

    // 1. 尝试从行程项中获取坐标
    const places: Array<{ lat: number; lng: number }> = [];
    if (trip.TripDay && trip.TripDay.length > 0) {
      for (const day of trip.TripDay) {
        for (const item of day.ItineraryItem || []) {
          if (item.Place) {
            const place = item.Place as any;
            const lat = place.latitude || place.metadata?.location?.lat || place.lat;
            const lng = place.longitude || place.metadata?.location?.lng || place.lng;
            if (lat && lng && typeof lat === 'number' && typeof lng === 'number') {
              places.push({ lat, lng });
            }
          }
        }
      }
    }

    if (places.length > 0) {
      const avgLat = places.reduce((sum, p) => sum + p.lat, 0) / places.length;
      const avgLng = places.reduce((sum, p) => sum + p.lng, 0) / places.length;
      return { 
        location: { lat: avgLat, lng: avgLng }, 
        name: trip.destination || '目的地' 
      };
    }

    // 2. 如果没有行程项坐标，使用目的地国家的默认坐标
    if (trip.destination) {
      const code = extractCountryCodes(trip.destination)[0];
      if (code && COORDS[code]) {
        return { location: { lat: COORDS[code].lat, lng: COORDS[code].lng }, name: COORDS[code].name };
      }
    }

    return null;
  }, [trip]);

  // 无效的行程 ID（保留路径或路由占位符）→ 重定向到行程列表
  const RESERVED_TRIP_PATHS = ['optimize', 'new', 'generate', 'decision', 'what-if', 'collected', 'featured'];
  const isInvalidTripId = !id || RESERVED_TRIP_PATHS.includes(id) || id.startsWith(':');

  useEffect(() => {
    if (isInvalidTripId) {
      navigate('/dashboard/trips', { replace: true });
      return;
    }
  }, [id, isInvalidTripId, navigate]);

  useEffect(() => {
    console.log('[TripDetail] useEffect 执行:', { id, hasId: !!id, idType: typeof id });
    if (id && !isInvalidTripId) {
      console.log('[TripDetail] useEffect: id存在，准备调用loadTrip');
      loadTrip();
    } else {
      console.warn('[TripDetail] useEffect: id为空或无效，不调用loadTrip');
    }
  }, [id, isInvalidTripId]);

  useEffect(() => {
    if (!id || isInvalidTripId) return;
    const onTripDataUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent<TripDataUpdatedDetail>).detail;
      if (detail?.tripId && detail.tripId !== id) return;
      loadTrip();
    };
    window.addEventListener(TRIP_DATA_UPDATED_EVENT, onTripDataUpdated);
    return () => window.removeEventListener(TRIP_DATA_UPDATED_EVENT, onTripDataUpdated);
  }, [id, isInvalidTripId]);

  // 处理从其他页面传递过来的状态（如侧边栏的操作）
  useEffect(() => {
    const state = location.state as {
      openEditDialog?: boolean;
      openShareDialog?: boolean;
      openCollaboratorsDialog?: boolean;
      changeStatus?: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    } | null;

    if (state) {
      if (state.openEditDialog) {
        setEditDialogOpen(true);
      }
      if (state.openShareDialog) {
        setShareDialogOpen(true);
      }
      if (state.openCollaboratorsDialog) {
        setCollaboratorsDialogOpen(true);
      }
      if (state.changeStatus) {
        setPendingStatus(state.changeStatus);
        setStatusChangeDialogOpen(true);
      }
      
      // 清除 state，避免刷新页面时重复打开
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // ✅ 当行程状态变化时，自动调整 Tab（仅在状态变化时，不覆盖用户手动选择）
  useEffect(() => {
    if (!trip) return;

    if (activeTab === 'insights' && trip?.status !== 'COMPLETED') {
      setActiveTab('timeline');
    }
  }, [trip?.status, activeTab]);

  // ✅ 当行程状态变为已完成时，延迟显示体能反馈弹窗
  useEffect(() => {
    if (!trip || !id) return;
    
    // 如果行程已完成且尚未显示过反馈弹窗，则显示
    if (trip?.status === 'COMPLETED' && !fitnessFeedbackShown) {
      // 检查是否已提交过该行程的反馈（使用 localStorage 缓存）
      const feedbackKey = `fitness_feedback_submitted_${id}`;
      const alreadySubmitted = localStorage.getItem(feedbackKey);
      
      if (!alreadySubmitted) {
        // 延迟3秒后显示反馈弹窗，给用户时间查看复盘结果
        const timer = setTimeout(() => {
          setFitnessFeedbackDialogOpen(true);
          setFitnessFeedbackShown(true);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [trip?.status, id, fitnessFeedbackShown]);

  const loadTrip = async () => {
    console.log('[TripDetail] loadTrip 开始执行:', { id, hasId: !!id });
    if (!id) {
      console.warn('[TripDetail] loadTrip: id为空，提前返回');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      console.log('[TripDetail] 开始调用 tripsApi.getById:', { id });
      let data;
      try {
        data = await tripsApi.getById(id);
        console.log('[TripDetail] tripsApi.getById 成功:', { tripId: data?.id, hasData: !!data, dataType: typeof data });
      } catch (apiErr: any) {
        console.error('[TripDetail] tripsApi.getById 抛出异常:', {
          error: apiErr,
          message: apiErr.message,
          stack: apiErr.stack,
        });
        throw apiErr; // 重新抛出，让外层catch处理
      }
      
      // 🔍 详细检查行程数据中的POI信息
      console.log('📋 [TripDetailPage] 加载的行程数据:', {
        tripId: data.id,
        destination: data.destination,
        totalDays: data.TripDay?.length || 0,
        daysWithItems: data.TripDay?.filter((day: any) => day.ItineraryItem && day.ItineraryItem.length > 0).length || 0,
        totalItems: data.TripDay?.reduce((sum: number, day: any) => sum + (day.ItineraryItem?.length || 0), 0) || 0,
        days: data.TripDay?.map((day: any) => ({
          day: day.date,
          theme: day.theme,
          itemsCount: day.ItineraryItem?.length || 0,
          items: day.ItineraryItem?.map((item: any) => ({
            id: item.id,
            type: item.type,
            placeId: item.placeId,
            placeName: item.Place?.nameCN || item.Place?.nameEN || '未知地点',
            hasPlace: !!item.Place,
            isRequired: item.isRequired,
            note: item.note,
          })) || [],
        })) || [],
      });
      
      // ⚠️ 检查是否有行程项缺少Place信息
      const itemsWithoutPlace = data.TripDay?.flatMap((day: any) => 
        (day.ItineraryItem || [])
          .filter((item: any) => item.placeId && !item.Place)
          .map((item: any) => ({
            day: day.date,
            itemId: item.id,
            placeId: item.placeId,
            note: item.note,
          }))
      ) || [];
      
      if (itemsWithoutPlace.length > 0) {
        console.warn('⚠️ [TripDetailPage] 发现缺少Place信息的行程项:', {
          count: itemsWithoutPlace.length,
          items: itemsWithoutPlace,
        });
      }
      
      if (data) {
        // 确保所有数值字段都有默认值
        setTrip({
          ...data,
          totalBudget: data.totalBudget ?? 0,
          statistics: data.statistics ? {
            ...data.statistics,
            budgetUsed: data.statistics.budgetUsed ?? 0,
            budgetRemaining: data.statistics.budgetRemaining ?? 0,
            totalDays: data.statistics.totalDays ?? 0,
            totalItems: data.statistics.totalItems ?? 0,
            totalActivities: data.statistics.totalActivities ?? 0,
            totalMeals: data.statistics.totalMeals ?? 0,
            totalRest: data.statistics.totalRest ?? 0,
            totalTransit: data.statistics.totalTransit ?? 0,
          } : {
            totalDays: 0,
            totalItems: 0,
            totalActivities: 0,
            totalMeals: 0,
            totalRest: 0,
            totalTransit: 0,
            progress: 'PLANNING',
            budgetUsed: 0,
            budgetRemaining: 0,
          },
        });
        
        // 根据目的地加载国家信息以获取货币代码
        if (data.destination) {
          loadCountryInfo(data.destination);
        }
        
        // 🆕 加载货币信息：优先使用预算约束中的货币，其次使用目的地货币
        await loadCurrency(data.destination);
        
        // 在 trip 设置后加载依赖 trip 的数据
        // 🆕 直接传入id，不依赖trip state
        console.log('[TripDetail] 准备调用 loadTripMetrics:', { id, hasId: !!id });
        // 🆕 不await，让它在后台执行，避免阻塞其他数据加载
        loadTripMetrics(id).catch(err => {
          console.error('[TripDetail] loadTripMetrics 调用失败:', err);
        });
        
        // 检查收藏和点赞状态
        // 注意：如果后端在 GET /trips/:id 响应中包含 isCollected、isLiked、likeCount 字段，
        // 可以直接从 data 中获取，无需单独调用接口
        // 加载相关数据（先加载不依赖 trip 的数据）
        await Promise.all([
          loadConflicts(),
          loadTripHealth(),
        ]);
      } else {
        setError('行程数据为空');
      }
    } catch (err: any) {
      console.error('❌ [TripDetail] 加载行程失败:', {
        tripId: id,
        error: err,
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        response: err.response?.data,
        stack: err.stack,
      });
      
      // 提取更详细的错误信息
      let errorMessage = err.message || '加载行程详情失败';
      
      // 如果是权限错误
      if (err.code === 'UNAUTHORIZED' || err.response?.status === 401) {
        errorMessage = `行程 ID ${id} 不存在或您没有权限访问`;
      }
      // 如果是资源不存在
      else if (err.code === 'NOT_FOUND' || err.response?.status === 404) {
        errorMessage = `行程 ID ${id} 不存在或已被删除`;
      }
      // 如果是服务器错误
      else if (err.response?.status >= 500) {
        errorMessage = '服务器错误，请稍后重试';
      }
      // 如果是业务错误（从响应体中获取）
      else if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadCountryInfo = async (countryCode: string) => {
    try {
      const response = await countriesApi.getAll();
      const countries = response.countries || [];
      const found = countries.find((c) => c.isoCode === countryCode);
      if (found) {
        setCountry(found);
      }
    } catch (err: any) {
      console.error('Failed to load country info:', err);
      // 加载失败不影响主流程
    }
  };
  
  // URL tab 参数：overview/travel → 概览；plan → 时间轴（旧链接兼容）
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const legacyRedirect = tripDetailLegacyTabRedirect(tabParam, searchParams.get('statusSection'));
    if (legacyRedirect) {
      setActiveTab(legacyRedirect.tab);
      const next = new URLSearchParams(searchParams);
      if (trip?.status === 'PLANNING' && legacyRedirect.tab === 'overview') {
        next.delete('tab');
      } else {
        next.set('tab', legacyRedirect.tab);
      }
      if (legacyRedirect.statusSection) {
        next.set('statusSection', legacyRedirect.statusSection);
      } else {
        next.delete('statusSection');
      }
      setSearchParams(next, { replace: true });
      return;
    }

    const knownTabs: TripDetailTabValue[] = [
      'overview',
      'timeline',
      'map',
      'bookings',
      'budget',
      'members',
      'accommodation',
      'activities',
      'files',
      'decision-log',
    ];

    if (tabParam === 'budget') {
      setActiveTab('budget');
    } else if (tabParam === 'team') {
      setActiveTab('members');
    } else if (tabParam === 'overview' || tabParam === 'travel') {
      setActiveTab('overview');
    } else if (tabParam === 'plan') {
      setActiveTab('timeline');
    } else if (tabParam === 'today') {
      setActiveTab('today');
    } else if (tabParam === 'execute') {
      if (!trip) return;
      if (trip.status === 'IN_PROGRESS') {
        setActiveTab('today');
      } else if (tripDetailExecuteTabRedirectAllowed(trip.status)) {
        redirectToExecute();
      } else {
        setActiveTab('timeline');
      }
    } else if (tabParam && knownTabs.includes(tabParam as TripDetailTabValue)) {
      setActiveTab(tabParam);
    } else if (tabParam === 'insights' || tabParam === 'recap') {
      setActiveTab(tabParam);
    } else if (!tabParam && trip) {
      if (trip.status === 'PLANNING') setActiveTab('overview');
      else if (trip.status === 'IN_PROGRESS') setActiveTab('today');
      else setActiveTab('timeline');
    }
  }, [searchParams, trip?.status, trip, redirectToExecute]);

  useEffect(() => {
    const highlightItem = parseTripDetailHighlightItemId(searchParams);
    if (highlightItem && activeTab !== 'timeline') {
      setActiveTab('timeline');
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (id && activeTab) {
      trackTripDetailTabView({ tripId: id, tab: activeTab });
    }
  }, [id, activeTab]);

  const handleTabChange = useCallback(
    (tab: string) => {
      if (tab === 'execute') {
        if (trip?.status === 'IN_PROGRESS') {
          tab = 'today';
        } else {
          redirectToExecute();
          return;
        }
      }

      setActiveTab(tab);
      const next = new URLSearchParams(searchParams);
      if (tab !== 'timeline') {
        next.delete('highlightItem');
      }
      const isDefault =
        (trip?.status === 'PLANNING' && tab === 'overview') ||
        (trip?.status === 'IN_PROGRESS' && tab === 'today') ||
        (trip?.status !== 'PLANNING' &&
          trip?.status !== 'IN_PROGRESS' &&
          tab === 'timeline');
      if (isDefault) {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, trip?.status, redirectToExecute],
  );

  const statusSectionParam = searchParams.get('statusSection');
  const overviewScrollTarget: TripOverviewSection | null =
    activeTab === 'overview' &&
    (statusSectionParam === 'decisions' ||
      statusSectionParam === 'verify' ||
      statusSectionParam === 'monitor')
      ? statusSectionParam
      : null;

  const clearStatusBarScrollTarget = useCallback(() => {
    if (!searchParams.get('statusSection')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('statusSection');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const openOverviewSection = useCallback(
    (section: TripOverviewSection) => {
      setActiveTab('overview');
      const next = new URLSearchParams(searchParams);
      if (trip?.status === 'PLANNING') {
        next.delete('tab');
      } else {
        next.set('tab', 'overview');
      }
      next.set('statusSection', section);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, trip?.status],
  );

  const openDecisionCenter = useCallback(
    (statusSection?: 'verify') => {
      openOverviewSection(statusSection === 'verify' ? 'verify' : 'decisions');
    },
    [openOverviewSection],
  );

  const openMonitoringCenter = useCallback(() => {
    openOverviewSection('monitor');
  }, [openOverviewSection]);

  // 🆕 加载货币信息：优先使用预算约束中的货币，其次使用目的地货币，最后默认CNY
  const loadCurrency = async (destination?: string) => {
    if (!id) return;
    try {
      // 优先从预算约束获取货币
      const constraint = await tripsApi.getBudgetConstraint(id);
      if (constraint.budgetConstraint.currency) {
        setCurrency(constraint.budgetConstraint.currency);
        return;
      }
    } catch {
      // 如果获取预算约束失败，尝试从目的地获取
    }
    
    // 其次从目的地获取货币策略
    if (destination) {
      try {
        const currencyStrategy = await countriesApi.getCurrencyStrategy(destination);
        if (currencyStrategy?.currencyCode) {
          setCurrency(currencyStrategy.currencyCode);
          return;
        }
      } catch {
        // 如果获取失败，保持默认值 CNY
      }
    }
    
    // 默认使用 CNY
    setCurrency('CNY');
  };

  // const handleCollect = async () => {
  //   if (!id || actionLoading) return;
  //   try {
  //     setActionLoading('collect');
  //     if (isCollected) {
  //       await tripsApi.uncollect(id);
  //       setIsCollected(false);
  //     } else {
  //       await tripsApi.collect(id);
  //       setIsCollected(true);
  //     }
  //   } catch (err: any) {
  //     console.error('Failed to toggle collection:', err);
  //     // 可以在这里添加错误提示
  //   } finally {
  //     setActionLoading(null);
  //   }
  // };

  // const handleLike = async () => {
  //   if (!id || actionLoading) return;
  //   try {
  //     setActionLoading('like');
  //     if (isLiked) {
  //       await tripsApi.unlike(id);
  //       setIsLiked(false);
  //       // setLikeCount((prev) => Math.max(0, prev - 1));
  //     } else {
  //       await tripsApi.like(id);
  //       setIsLiked(true);
  //       // setLikeCount((prev) => prev + 1);
  //     }
  //   } catch (err: any) {
  //     console.error('Failed to toggle like:', err);
  //     // 可以在这里添加错误提示
  //   } finally {
  //     setActionLoading(null);
  //   }
  // };

  // 检查是否是"未发现问题"类型的建议
  const isNoIssueSuggestion = (suggestion: Suggestion): boolean => {
    const summary = suggestion.summary || '';
    const title = suggestion.title || '';
    const description = suggestion.description || '';
    const text = `${title} ${summary} ${description}`.toLowerCase();
    
    // 检查是否包含"未发现"、"未检测到"、"无"、"通过"等关键词
    const noIssuePatterns = [
      '未发现',
      '未检测到',
      '未发现.*问题',
      '无.*问题',
      '均通过',
      '允许继续',
      '检查通过',
      '没有问题',
      '一切正常',
    ];
    
    return noIssuePatterns.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(text);
    });
  };

  // 修正建议的人格归属（根据内容判断）
  const correctSuggestionPersona = (suggestion: Suggestion): Suggestion => {
    const title = suggestion.title || '';
    const summary = suggestion.summary || '';
    const text = `${title} ${summary}`.toLowerCase();
    
    // 时间冲突应该归属到 Dr.Dre（节奏）
    if (text.includes('时间冲突') || text.includes('时间重叠') || text.includes('time conflict')) {
      return {
        ...suggestion,
        persona: 'drdre',
      };
    }
    
    // 安全相关的冲突应该归属到 Abu（风险）
    if (text.includes('安全') || text.includes('风险') || text.includes('危险') || 
        text.includes('封路') || text.includes('道路封闭') || text.includes('road closure')) {
      return {
        ...suggestion,
        persona: 'abu',
      };
    }
    
    return suggestion;
  };

  // 加载建议列表（lazy：打开建议面板 / 优化弹窗时再拉）
  const loadSuggestions = useCallback(async () => {
    if (!id) return;
    try {
      setPersonaAlertsLoading(true);
      const [newRes, seenRes] = await Promise.all([
        tripsApi.getSuggestions(id, { status: 'new', limit: 100, offset: 0 }),
        tripsApi.getSuggestions(id, { status: 'seen', limit: 100, offset: 0 }),
      ]);

      const result = {
        items: [...(newRes.items || []), ...(seenRes.items || [])],
        total: (newRes.total || 0) + (seenRes.total || 0),
        filters: newRes.filters ?? seenRes.filters,
      };

      const uniqueSuggestions = result.items.reduce((acc, suggestion) => {
        const existingIndex = acc.findIndex((s) => s.id === suggestion.id);
        if (existingIndex === -1) {
          acc.push(suggestion);
        } else {
          const existing = acc[existingIndex];
          if (
            suggestion.updatedAt &&
            existing.updatedAt &&
            new Date(suggestion.updatedAt) > new Date(existing.updatedAt)
          ) {
            acc[existingIndex] = suggestion;
          }
        }
        return acc;
      }, [] as typeof result.items);

      const correctedSuggestions = uniqueSuggestions.map(correctSuggestionPersona);
      const filteredSuggestions = correctedSuggestions.filter(
        (suggestion) => !isNoIssueSuggestion(suggestion),
      );

      setSuggestions(filteredSuggestions.map(normalizeSuggestionForDisplay));
      setSuggestionsHydrated(true);
    } catch (err: unknown) {
      console.error('Failed to load suggestions:', err);
      setSuggestions([]);
    } finally {
      setPersonaAlertsLoading(false);
    }
  }, [id]);

  const loadPersonaAlerts = useCallback(async () => {
    if (!id) return;
    try {
      setPersonaAlertsLoading(true);
      await tripsApi.getPersonaAlerts(id);
    } catch (err: unknown) {
      console.error('Failed to load persona alerts:', err);
    } finally {
      setPersonaAlertsLoading(false);
    }
  }, [id]);

  const refreshSuggestionsAndTabStats = useCallback(async () => {
    await Promise.all([loadSuggestions(), tabBff.reload()]);
  }, [loadSuggestions, tabBff]);

  const ensureSuggestionsLoaded = useCallback(async () => {
    if (suggestionsHydrated) return;
    if (suggestionsLoadPromiseRef.current) {
      await suggestionsLoadPromiseRef.current;
      return;
    }
    const task = (async () => {
      await loadSuggestions();
      await loadPersonaAlerts();
    })();
    suggestionsLoadPromiseRef.current = task;
    try {
      await task;
    } finally {
      suggestionsLoadPromiseRef.current = null;
    }
  }, [suggestionsHydrated, loadSuggestions, loadPersonaAlerts]);

  const openSuggestionsPanel = useCallback(async () => {
    await ensureSuggestionsLoaded();
    void tabBff.loadTimelineWithSuggestions();
    setSuggestionsPanelOpen(true);
  }, [ensureSuggestionsLoaded, tabBff]);

  // 建议列表渲染后批量标记 seen
  useEffect(() => {
    if (!id || !suggestionsHydrated) return;
    if (suggestions.length === 0) return;
    if (markSeenInFlightRef.current) return;

    const idsToMark = suggestions
      .filter((s) => s.status === 'new')
      .map((s) => s.id)
      .filter((sid): sid is string => Boolean(sid))
      .filter((sid) => !markedSuggestionIdsRef.current.has(sid));

    if (idsToMark.length === 0) return;

    markSeenInFlightRef.current = true;

    (async () => {
      try {
        await tripsApi.markSuggestionsSeen(id, { suggestionIds: idsToMark });
        idsToMark.forEach((sid) => markedSuggestionIdsRef.current.add(sid));
        await refreshSuggestionsAndTabStats();
      } catch (err: unknown) {
        console.warn('[TripDetail] markSuggestionsSeen failed:', err);
      } finally {
        markSeenInFlightRef.current = false;
      }
    })();
  }, [id, suggestions, suggestionsHydrated, refreshSuggestionsAndTabStats]);

  const assistantCenterProps = useMemo(
    () => ({
      suggestions,
      loading: personaAlertsLoading,
      trip,
      onActionClick: (suggestion: Suggestion, actionId: string) => {
        if (actionId === 'preview' || actionId.includes('preview')) {
          setPreviewSuggestion(suggestion);
          setPreviewActionId(actionId);
          setPreviewDialogOpen(true);
        }
      },
    }),
    [suggestions, personaAlertsLoading, trip],
  );

  // 新增：加载行程健康度
  const loadTripHealth = async () => {
    if (!id) return;
    try {
      const health = await tripDetailApi.getHealth(id);
      console.log('[Trip Detail Page] 健康度数据加载完成:', {
        overall: health.overall,
        overallScore: health.overallScore,
        dimensions: health.dimensions ? Object.keys(health.dimensions) : [],
        // 🆕 检查每个维度是否包含 weight
        scheduleWeight: (health.dimensions as any)?.schedule?.weight,
        budgetWeight: (health.dimensions as any)?.budget?.weight,
        paceWeight: (health.dimensions as any)?.pace?.weight,
        feasibilityWeight: (health.dimensions as any)?.feasibility?.weight,
      });
      setTripHealth(health);
    } catch (err: any) {
      console.error('Failed to load trip health:', err);
      // 静默处理错误，不影响主流程
      setTripHealth(null);
    }
  };

  // 加载行程指标（用于健康度计算）
  const loadTripMetrics = async (tripId?: string) => {
    // 🆕 支持传入tripId参数，避免依赖trip state
    console.log('[TripDetail] loadTripMetrics 被调用:', { tripId, id, hasTripId: !!tripId, hasId: !!id });
    const targetTripId = tripId || id;
    console.log('[TripDetail] loadTripMetrics targetTripId:', { targetTripId, hasTargetTripId: !!targetTripId });
    if (!targetTripId) {
      console.warn('[TripDetail] loadTripMetrics: tripId为空，跳过加载');
      return;
    }
    try {
      console.log('[TripDetail] 开始加载行程指标:', { tripId: targetTripId });
      const data = await tripsApi.getMetrics(targetTripId);
      console.log('[TripDetail] 行程指标加载成功:', {
        tripId: targetTripId,
        hasDays: !!data.days,
        daysCount: data.days?.length || 0,
        summary: data.summary,
        totalFatigue: data.summary?.totalFatigue,
        totalBuffer: data.summary?.totalBuffer,
        totalWalk: data.summary?.totalWalk,
        totalDrive: data.summary?.totalDrive,
        // 🐛 调试：记录完整的数据对象引用，用于检查是否变化
        dataRef: data,
        loadTime: new Date().toISOString(),
      });
      // 兼容后端字段可能为可选：前端统一归一化为强类型结构，避免下游渲染/计算报错
      const normalized: TripMetricsResponse = {
        tripId: data.tripId || targetTripId,
        summary: data.summary
          ? { ...data.summary }
          : {
              totalWalk: 0,
              totalDrive: 0,
              totalBuffer: 0,
              totalFatigue: 0,
              totalCost: 0,
              averageWalkPerDay: 0,
              averageDrivePerDay: 0,
            },
        days: Array.isArray(data.days)
          ? data.days.map((day) => ({
              ...day,
              metrics: day.metrics
                ? { ...day.metrics }
                : { walk: 0, drive: 0, buffer: 0, fatigue: 0, ascent: 0, cost: 0 },
              conflicts: Array.isArray(day.conflicts) ? day.conflicts : [],
            }))
          : [],
      };

      setTripMetrics(normalized);
      
      // 建立每日指标映射
      if (normalized.days.length > 0) {
        const metricsMap = new Map<string, DayMetricsResponse>();
        for (const day of normalized.days) {
          metricsMap.set(day.date, day);
        }
        setDayMetricsMap(metricsMap);
      }
    } catch (err: any) {
      console.error('[TripDetail] 加载行程指标失败:', {
        tripId: targetTripId,
        error: err,
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        responseData: err.response?.data,
        url: err.config?.url,
      });
      // 设置错误状态，让组件显示错误提示
      setTripMetrics(null);
    }
  };

  // 加载冲突列表
  const loadConflicts = async () => {
    if (!id) return;
    try {
      const data = await tripsApi.getConflicts(id);
      console.log('[TripDetail] loadConflicts 完成:', {
        conflictsCount: data?.conflicts?.length || 0,
        tripId: id,
      });
      setConflicts(data);
    } catch (err: any) {
      console.error('Failed to load conflicts:', err);
      // 静默处理错误，不影响主流程
    }
  };

  const handleReplaceSuccess = async (result: ReplaceItineraryItemResponse) => {
    // 替换成功后，更新行程项
    try {
      await itineraryItemsApi.update(replacingItem!.id, {
        placeId: result.newItem.placeId,
        startTime: result.newItem.startTime,
        endTime: result.newItem.endTime,
        note: result.newItem.reason,
      });
      await loadTrip();
      toast.success('行程项已替换');
      setReplaceDialogOpen(false);
      setReplacingItem(null);
    } catch (err: any) {
      console.error('Failed to update item:', err);
      toast.error(err.message || '更新行程项失败');
    }
  };

  const handleCreateItemSuccess = () => {
    loadTrip(); // 重新加载行程
    setCreateItemDialogOpen(false);
    setSelectedDayId(null);
  };

  // ✅ 处理状态修改（先显示确认对话框）
  // ✅ 生成随机验证码（4位数字）
  const generateConfirmCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleStatusChange = (newStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
    setPendingStatus(newStatus);
    // ✅ 生成随机验证码
    const code = generateConfirmCode();
    setStatusConfirmCode(code);
    setStatusChangeDialogOpen(true);
  };

  // ✅ 验证状态转换是否合法（根据API文档规则）
  const validateStatusTransition = (
    currentStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    newStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ): { valid: boolean; message?: string } => {
    // 1. 已取消的行程不能改回其他状态
    if (currentStatus === 'CANCELLED') {
      return {
        valid: false,
        message: '已取消的行程不能修改状态'
      };
    }

    // 2. 已完成的行程不能改回规划中或进行中
    if (currentStatus === 'COMPLETED' && 
        (newStatus === 'PLANNING' || newStatus === 'IN_PROGRESS')) {
      return {
        valid: false,
        message: '已完成的行程不能改回规划中或进行中状态'
      };
    }

    // 3. 规划中不能直接跳到已完成（必须先经过进行中）
    if (currentStatus === 'PLANNING' && newStatus === 'COMPLETED') {
      return {
        valid: false,
        message: '规划中的行程不能直接标记为已完成，请先改为"进行中"'
      };
    }

    // 4. ✅ 规划中改为进行中：必须至少有一个行程项
    if (currentStatus === 'PLANNING' && newStatus === 'IN_PROGRESS') {
      // 检查是否有任何一天有行程项
      const hasAnyItineraryItem = trip?.TripDay?.some(
        day => day.ItineraryItem && day.ItineraryItem.length > 0
      ) || false;

      if (!hasAnyItineraryItem) {
        return {
          valid: false,
          message: '无法开始执行行程：行程中没有任何行程项。请先添加至少一个行程项后再开始执行。'
        };
      }
    }

    // 5. 其他状态转换都是允许的
    return { valid: true };
  };

  // ✅ 获取状态转换对应的操作说明
  // ✅ 获取状态转换需要的确认词（支持多种确认方式）
  const getStatusConfirmWord = (
    currentStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    newStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ): { word: string | null; alternatives: string[] } => {
    // 只有不可逆操作需要确认词
    if (newStatus === 'CANCELLED') {
      return {
        word: '取消',
        alternatives: [trip?.destination || '行程名称'] // 可以输入"取消"或行程名称
      };
    }
    if (currentStatus === 'PLANNING' && newStatus === 'IN_PROGRESS') {
      return {
        word: '开始',
        alternatives: [trip?.destination || '行程名称'] // 可以输入"开始"或行程名称
      };
    }
    if (currentStatus === 'IN_PROGRESS' && newStatus === 'COMPLETED') {
      return {
        word: '完成',
        alternatives: [trip?.destination || '行程名称'] // 可以输入"完成"或行程名称
      };
    }
    // 其他可逆操作不需要确认词
    return { word: null, alternatives: [] };
  };

  // ✅ 验证确认输入是否有效（支持确认词、验证码或行程名称）
  const validateConfirmInput = (
    input: string,
    confirmWord: string | null,
    confirmCode: string,
    alternatives: string[]
  ): boolean => {
    if (!input.trim()) return false;
    
    const trimmedInput = input.trim();
    
    // 1. 检查是否匹配确认词
    if (confirmWord && trimmedInput === confirmWord) {
      return true;
    }
    
    // 2. 检查是否匹配随机验证码
    if (confirmCode && trimmedInput === confirmCode) {
      return true;
    }
    
    // 3. 检查是否匹配行程名称（不区分大小写）
    if (alternatives.length > 0) {
      const tripName = alternatives[0];
      if (tripName && trimmedInput.toLowerCase() === tripName.toLowerCase()) {
        return true;
      }
    }
    
    return false;
  };

  // ✅ 获取状态转换的标题和说明
  const getStatusTransitionTitle = (
    currentStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    newStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ): { title: string; description: string } => {
    if (currentStatus === 'PLANNING' && newStatus === 'CANCELLED') {
      return {
        title: '确认取消该行程？',
        description: `当前行程状态将从 "${getTripStatusLabel(currentStatus as any)}" 修改为 "${getTripStatusLabel(newStatus as any)}"。`
      };
    }
    if (currentStatus === 'PLANNING' && newStatus === 'IN_PROGRESS') {
      return {
        title: '确认开始执行行程？',
        description: `当前行程状态将从 "${getTripStatusLabel(currentStatus as any)}" 修改为 "${getTripStatusLabel(newStatus as any)}"，进入执行阶段。`
      };
    }
    if (currentStatus === 'IN_PROGRESS' && newStatus === 'COMPLETED') {
      return {
        title: '确认完成行程？',
        description: `当前行程状态将从 "${getTripStatusLabel(currentStatus as any)}" 修改为 "${getTripStatusLabel(newStatus as any)}"。`
      };
    }
    // 默认标题
    return {
      title: '确认修改行程状态？',
      description: `您即将将行程状态从 "${getTripStatusLabel(currentStatus as any)}" 修改为 "${getTripStatusLabel(newStatus as any)}"。`
    };
  };

  const getStatusTransitionAction = (
    currentStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    newStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ): { action: string; description: string; consequences: string[] } => {
    const transitions: Record<string, { action: string; description: string; consequences: string[] }> = {
      'PLANNING->IN_PROGRESS': {
        action: '开始执行行程',
        description: '将行程状态改为"进行中"，开始实际执行阶段',
        consequences: [
          '将开启"执行"标签页，可查看实时行程状态',
          '可记录行程中实际的变更与调整',
          '此操作不可撤销，无法返回"规划中"状态'
        ]
      },
      'PLANNING->CANCELLED': {
        action: '取消行程',
        description: '将行程标记为"已取消"',
        consequences: [
          '行程将被永久标记为"已取消"',
          '已取消的行程将无法恢复或修改',
          '可在记录中保留以供参考'
        ]
      },
      'IN_PROGRESS->COMPLETED': {
        action: '完成行程',
        description: '将进行中的行程标记为"已完成"',
        consequences: [
          '将开启"复盘"标签页，可查看行程复盘报告',
          '行程将无法再编辑或执行',
          '此操作不可撤销，无法返回"进行中"状态'
        ]
      },
      'IN_PROGRESS->CANCELLED': {
        action: '取消进行中的行程',
        description: '将正在进行的行程标记为"已取消"',
        consequences: [
          '行程将被永久标记为"已取消"',
          '已取消的行程将无法恢复或修改',
          '可在记录中保留以供参考'
        ]
      },
      'IN_PROGRESS->PLANNING': {
        action: '重新规划行程',
        description: '将进行中的行程改回"规划中"状态，允许重新规划',
        consequences: [
          '可以重新编辑和调整行程安排',
          '将隐藏"执行"标签页',
          '此操作可逆，可以再次改为"进行中"'
        ]
      },
      'COMPLETED->CANCELLED': {
        action: '标记已完成行程为已取消',
        description: '将已完成的行程标记为"已取消"',
        consequences: [
          '行程将被永久标记为"已取消"',
          '已取消的行程将无法恢复或修改',
          '可在记录中保留以供参考'
        ]
      }
    };

    const key = `${currentStatus}->${newStatus}`;
    return transitions[key] || {
      action: `修改状态为"${getTripStatusLabel(newStatus as any)}"`,
      description: `将行程状态从"${getTripStatusLabel(currentStatus as any)}"改为"${getTripStatusLabel(newStatus as any)}"`,
      consequences: ['此操作可能不可逆，请谨慎操作']
    };
  };

  // ✅ 确认状态修改（不可逆操作）
  const confirmStatusChange = async () => {
    if (!id || !trip || !pendingStatus) return;
    
    // 前端验证状态转换合法性
    const validation = validateStatusTransition(trip.status, pendingStatus);
    if (!validation.valid) {
      toast.error(validation.message || '不允许的状态转换');
      setStatusChangeDialogOpen(false);
      setPendingStatus(null);
      setStatusConfirmText('');
      return;
    }

    // ✅ 验证确认输入（支持确认词、验证码或行程名称）
    const confirmInfo = getStatusConfirmWord(trip.status, pendingStatus);
    if (confirmInfo.word) {
      const isValid = validateConfirmInput(
        statusConfirmText,
        confirmInfo.word,
        statusConfirmCode,
        confirmInfo.alternatives
      );
      if (!isValid) {
        toast.error(`请输入"${confirmInfo.word}"、验证码"${statusConfirmCode}"或行程名称"${confirmInfo.alternatives[0]}"以确认操作`);
        return;
      }
    }
    
    try {
      if (pendingStatus === 'IN_PROGRESS') {
        const travelingPayload = buildEnterTravelingPayload(
          trip.metadata as Record<string, unknown> | undefined,
        );
        await tripsApi.update(id, travelingPayload);
      } else {
        await tripsApi.update(id, { status: pendingStatus });
      }
      toast.success(`行程状态已更新为：${getTripStatusLabel(pendingStatus as any)}`);
      setStatusChangeDialogOpen(false);
      setPendingStatus(null);
      setStatusConfirmText('');
      
      // ✅ 进入行中：跳转独立执行页（非详情 Tab）
      if (pendingStatus === 'IN_PROGRESS') {
        navigate(`/dashboard/execute?tripId=${id}`);
      } else if (pendingStatus === 'COMPLETED') {
        // 进行中 → 已完成：切换到"复盘"tab
        setActiveTab('insights');
        if (isSelfEvolutionEnabled()) {
          setOutcomeAutoPrompt(true);
        }
      } else if (pendingStatus === 'PLANNING') {
        setActiveTab('overview');
      }
      // 已取消状态保持当前tab不变
      
      loadTrip(); // 重新加载行程
    } catch (err: any) {
      console.error('Failed to update trip status:', err);
      // 显示后端返回的具体错误信息
      const errorMessage = err.message || '更新行程状态失败';
      toast.error(errorMessage, {
        description: err.response?.data?.error?.message || '请检查网络连接或稍后重试'
      });
    }
  };

  const loadRecapReport = async () => {
    if (!id) return;
    try {
      setRecapLoading(true);
      const report = await tripsApi.getRecap(id);
      setRecapReport(report);
    } catch (err: any) {
      console.error('Failed to load recap report:', err);
    } finally {
      setRecapLoading(false);
    }
  };

  const handleDelete = async (confirmText: string) => {
    if (!id || !trip) return;

    try {
      setDeleting(true);
      await tripsApi.delete(id, confirmText);
      toast.success('行程已删除');
      navigate('/dashboard/trips');
    } catch (err: unknown) {
      console.error('Failed to delete trip:', err);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined;
      toast.error(message || (err instanceof Error ? err.message : '删除行程失败'));
      setDeleting(false);
    }
  };

  // ⚠️ 以下是早期返回，所有 hooks 必须在这之前调用
  if (loading) {
    return <TripDetailSkeleton />;
  }

  // NL 建行程：generatingItems === true 时展示生成中占位（不再用 items.length 推断）
  if (trip && id && shouldShowNlItemsGeneratingPlaceholder(trip)) {
    return (
      <TripGeneratingPlaceholder
        tripId={id}
        onReady={() => loadTrip()}
      />
    );
  }

  if (trip && id && isSkeletonOnlyTrip) {
    if (skeletonTravelStatus.isLoading) {
      return <TripDetailSkeleton />;
    }
    if (!skeletonTravelStatus.status && skeletonTravelStatus.isUnavailable) {
      return (
        <div className="min-h-full">
          <TripSkeletonOnlyEmptyState trip={trip} tripId={id} />
        </div>
      );
    }
  }

  if (error || !trip) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-gate-reject-border bg-gate-reject p-4">
          <p className="text-gate-reject-foreground font-semibold mb-2">{error || '行程不存在'}</p>
          {id && (
            <p className="text-sm text-gate-reject-foreground mb-4">
              行程ID: <code className="bg-gate-reject px-2 py-1 rounded">{id}</code>
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={() => navigate('/dashboard/trips')} variant="outline">
              返回列表
            </Button>
            {id && (
              <Button 
                onClick={async () => {
                  // 重试加载
                  try {
                    setLoading(true);
                    setError(null);
                    const data = await tripsApi.getById(id);
                    if (data) {
                      setTrip(data);
                      setLoading(false);
                    }
                  } catch (retryErr: any) {
                    console.error('重试加载失败:', retryErr);
                    setError(retryErr.message || '加载失败');
                    setLoading(false);
                  }
                }}
                variant="outline"
              >
                重试加载
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 计算健康度指标（优先使用 tripHealth API 数据）
  const healthMetrics = (() => {
    // ✅ 如果行程项为空，返回空值（不显示健康度）
    const hasTripItems = trip?.TripDay?.some(day => day.ItineraryItem && day.ItineraryItem.length > 0) || false;
    if (!hasTripItems) {
      return {
        executable: 0,
        buffer: 0,
        risk: 0,
        cost: 0,
      };
    }

    // ✅ 优先使用 tripHealth API 数据
    if (tripHealth && tripHealth.dimensions) {
      return {
        executable: tripHealth.dimensions.schedule?.score || 0,
        buffer: tripHealth.dimensions.budget?.score || 0,
        risk: 100 - (tripHealth.dimensions.pace?.score || 0), // 风险是节奏的反向（风险越低越好）
        cost: tripHealth.dimensions.feasibility?.score || 0,
      };
    }

    // 默认值（仅在数据加载中时使用）
    const defaultMetrics = {
      executable: 85,
      buffer: 70,
      risk: 25,
      cost: 80,
    };

    if (!tripMetrics) return defaultMetrics;

    // Fallback：基于行程指标计算健康度（如果 API 数据不可用）
    const summary = tripMetrics.summary;
    const totalDays = trip?.statistics?.totalDays || trip?.TripDay?.length || 1;
    
    // 可执行度：基于缓冲时间和疲劳指数
    // 缓冲时间充足且疲劳指数低 = 高可执行度
    const avgBufferPerDay = summary.totalBuffer / totalDays;
    const avgFatigue = summary.totalFatigue / totalDays;
    const executable = Math.min(100, Math.max(0, 
      (avgBufferPerDay / 60) * 20 + // 缓冲时间（小时）* 20，最多20分
      (100 - avgFatigue) * 0.65 // 疲劳指数越低越好，最多65分
    ));

    // 缓冲：基于总缓冲时间
    const buffer = Math.min(100, Math.max(0, (summary.totalBuffer / (totalDays * 120)) * 100)); // 假设每天理想缓冲2小时

    // 风险：基于冲突数量和高风险冲突
    const highRiskConflicts = conflicts?.conflicts?.filter(c => c.severity === 'HIGH').length || 0;
    const totalConflicts = conflicts?.total || 0;
    const risk = Math.min(100, Math.max(0, 
      (highRiskConflicts * 30) + // 高风险冲突每个30分
      (totalConflicts * 5) // 总冲突每个5分
    ));

    // 成本控制：基于预算使用情况
    const budgetUsed = trip?.statistics?.budgetUsed || 0;
    const totalBudget = trip?.totalBudget || 1;
    const budgetRatio = budgetUsed / totalBudget;
    const cost = Math.min(100, Math.max(0, (1 - budgetRatio) * 100)); // 预算使用越少越好

    return {
      executable: Math.round(executable),
      buffer: Math.round(buffer),
      risk: Math.round(risk),
      cost: Math.round(cost),
    };
  })();

  // 根据状态确定主 CTA
  const getMainCTA = () => {
    if (trip.status === 'PLANNING') {
      return {
        label: '进入规划工作台',
        action: () => navigate(`/dashboard/plan-studio?tripId=${id}`),
        icon: Compass,
      };
    } else if (trip.status === 'IN_PROGRESS') {
      return {
        label: '继续执行',
        action: () => navigate(`/dashboard/execute?tripId=${id}`),
        icon: Play,
      };
    } else if (trip.status === 'COMPLETED') {
      // 已完成状态不显示主CTA按钮
      return null;
    } else {
      // CANCELLED 或其他状态
      return null;
    }
  };

  const mainCTA = getMainCTA();
  const CTAIcon = mainCTA?.icon;

  const tripDetailMoreMenuItems =
    trip?.status !== 'CANCELLED' ? (
      <>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <RefreshCw className="w-4 h-4 mr-2" />
            修改状态
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {(() => {
              const currentStatus = trip.status;
              const allowedTransitions: Array<{
                status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
                label: string;
                icon: string;
                description?: string;
              }> = [];

              if (currentStatus === 'PLANNING') {
                allowedTransitions.push(
                  { status: 'IN_PROGRESS', label: '进行中', icon: '🚀', description: '开始执行行程' },
                  { status: 'CANCELLED', label: '已取消', icon: '❌', description: '取消行程' },
                );
              } else if (currentStatus === 'IN_PROGRESS') {
                allowedTransitions.push(
                  { status: 'COMPLETED', label: '已完成', icon: '✅', description: '完成行程' },
                  { status: 'CANCELLED', label: '已取消', icon: '❌', description: '取消行程' },
                );
              } else if (currentStatus === 'COMPLETED') {
                allowedTransitions.push(
                  { status: 'CANCELLED', label: '已取消', icon: '❌', description: '标记为已取消' },
                );
              }

              if (allowedTransitions.length === 0) return null;

              return allowedTransitions.map((transition) => {
                const validation = validateStatusTransition(currentStatus, transition.status);
                return (
                  <DropdownMenuItem
                    key={transition.status}
                    onClick={() => handleStatusChange(transition.status)}
                    disabled={!validation.valid}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="mr-2">{transition.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm">{transition.label}</div>
                        {transition.description ? (
                          <div className="text-xs text-muted-foreground">{transition.description}</div>
                        ) : null}
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              });
            })()}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => setOptimizationFeedbackDialogOpen(true)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          行程反馈
        </DropdownMenuItem>
      </>
    ) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TripDetailHeader
        trip={trip}
        onShare={() => setShareDialogOpen(true)}
        onExportPdf={() => toast.info('导出 PDF 功能开发中')}
        onEdit={trip?.status !== 'CANCELLED' ? () => setEditDialogOpen(true) : undefined}
        onCollaborators={
          trip?.status !== 'CANCELLED' ? () => setCollaboratorsDialogOpen(true) : undefined
        }
        onOpenMembers={
          trip?.status !== 'CANCELLED' ? () => handleTabChange('members') : undefined
        }
        onOpenAutomation={
          id && trip?.status !== 'CANCELLED'
            ? () => navigate(buildTripAutomationAuthorizationPath(id))
            : undefined
        }
        moreMenuItems={
          <>
            {tripDetailMoreMenuItems}
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </DropdownMenuItem>
          </>
        }
        mainCTA={
          mainCTA && CTAIcon
            ? { label: mainCTA.label, action: mainCTA.action, icon: CTAIcon }
            : null
        }
      />

      {/* ✅ 状态修改确认对话框 - 根据状态转换显示对应操作说明 */}
      <AlertDialog 
        open={statusChangeDialogOpen} 
        onOpenChange={(open) => {
          setStatusChangeDialogOpen(open);
          if (!open) {
            setPendingStatus(null);
            setStatusConfirmText('');
            setStatusConfirmCode('');
          }
        }}
      >
        <AlertDialogContent className="max-w-2xl max-h-[min(85vh,720px)] flex flex-col gap-0 overflow-hidden p-0">
          {pendingStatus && (() => {
            const transitionInfo = getStatusTransitionAction(trip.status, pendingStatus);
            const isIrreversible = pendingStatus === 'COMPLETED' || pendingStatus === 'CANCELLED' || 
                                   (trip.status === 'COMPLETED' && (pendingStatus === 'PLANNING' || pendingStatus === 'IN_PROGRESS'));
            const confirmInfo = getStatusConfirmWord(trip.status, pendingStatus);
            const titleInfo = getStatusTransitionTitle(trip.status, pendingStatus);
            const validation = validateStatusTransition(trip.status, pendingStatus);
            const isConfirmValid = !confirmInfo.word || validateConfirmInput(
              statusConfirmText,
              confirmInfo.word,
              statusConfirmCode,
              confirmInfo.alternatives
            );
            const needsHandoffGate =
              trip.status === 'PLANNING' && pendingStatus === 'IN_PROGRESS';
            const handoffBlocksConfirm =
              needsHandoffGate &&
              (handoffVerifyLoading || handoffVerifyError != null || handoffVerify?.ready === false);
            const isButtonDisabled = !validation.valid || !isConfirmValid || handoffBlocksConfirm;

            return (
              <>
                <AlertDialogHeader className="px-6 pt-6 pb-3 shrink-0">
                  <AlertDialogTitle>{titleInfo.title}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {titleInfo.description}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-4">
                  {/* 影响说明 */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-medium text-amber-900">
                          {isIrreversible ? '⚠️ 此操作不可撤销：' : '📌 修改后的影响：'}
                        </p>
                        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                          {transitionInfo.consequences.map((consequence, index) => (
                            <li key={index}>{consequence}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* 错误提示（如果转换不合法） */}
                  {!validation.valid && (
                    <div className="rounded-lg border border-gate-reject-border bg-gate-reject p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-gate-reject-foreground mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gate-reject-foreground">❌ 不允许的状态转换</p>
                          <p className="text-xs text-gate-reject-foreground">{validation.message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {needsHandoffGate && validation.valid && (
                    <InTripHandoffChecklist
                      tripId={trip.id}
                      verify={handoffVerify}
                      loading={handoffVerifyLoading}
                      error={handoffVerifyError}
                      onRefresh={reloadHandoffVerify}
                    />
                  )}

                  {/* 二次确认输入（仅不可逆操作） */}
                  {confirmInfo.word && validation.valid && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="status-confirm-text" className="text-sm font-medium">
                        为确认{transitionInfo.action}，请输入以下任一内容：
                      </Label>
                      <div className="text-xs text-muted-foreground mb-2 space-y-1">
                        <p>• 确认词：<strong>"{confirmInfo.word}"</strong></p>
                        <p>• 验证码：<strong>"{statusConfirmCode}"</strong></p>
                        {confirmInfo.alternatives[0] && (
                          <p>• 行程名称：<strong>"{confirmInfo.alternatives[0]}"</strong></p>
                        )}
                      </div>
                      <Input
                        id="status-confirm-text"
                        type="text"
                        value={statusConfirmText}
                        onChange={(e) => setStatusConfirmText(e.target.value)}
                        placeholder={`请输入"${confirmInfo.word}"、验证码"${statusConfirmCode}"或行程名称`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && isConfirmValid && !isButtonDisabled) {
                            e.preventDefault();
                            confirmStatusChange();
                          }
                        }}
                        autoFocus
                      />
                      {statusConfirmText && !isConfirmValid && (
                        <p className="text-sm text-destructive">
                          请输入确认词"{confirmInfo.word}"、验证码"{statusConfirmCode}"或行程名称"{confirmInfo.alternatives[0]}"以继续
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <AlertDialogFooter className="shrink-0 border-t px-6 py-4 bg-background">
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmStatusChange}
                    disabled={isButtonDisabled}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    确认修改
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      <DeleteTripDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        destination={trip.destination}
        tripLabel={trip.name || trip.destination}
        impact={{
          totalDays: trip.statistics?.totalDays || trip.TripDay?.length || 0,
          totalItems: trip.statistics?.totalItems || 0,
          hikePlanCount: showEmbeddedUi ? embeddedHiking.plans.length : 0,
        }}
        deleting={deleting}
        onConfirm={handleDelete}
      />

      {weatherLocation && trip.startDate ? (
        <WeatherAlertBanner
          location={weatherLocation.location}
          locationName={weatherLocation.name}
          startDate={trip.startDate}
          className="mx-4 sm:mx-6 border-x-0 border-t-0 rounded-none shrink-0"
        />
      ) : null}

      {/* 主体分区（顶部 Tab） */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          <TripDetailTabNav
            activeTab={activeTab}
            extraTabs={[
              ...(trip?.status === 'IN_PROGRESS'
                ? [{ value: 'today', label: '今日' }]
                : []),
              ...(trip?.status === 'COMPLETED'
                ? [{ value: 'insights', label: '复盘' }]
                : []),
            ]}
          />

        <div className={tripDetailTabScrollAreaClass(activeTab)}>
          <TabsContent value="overview" className="mt-0">
            {id ? (
              <TripDetailTravelOverviewTab
                tripId={id}
                trip={trip}
                onOpenTimeline={() => handleTabChange('timeline')}
                onOpenDecisions={() => openDecisionCenter()}
                onOpenMonitoring={openMonitoringCenter}
                scrollToSection={overviewScrollTarget}
                onScrollToSectionHandled={clearStatusBarScrollTarget}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="timeline" className="mt-0">
            <TripDetailTimelineTab
              trip={trip}
              timelineOverview={tabBff.timeline}
              timelineOverviewLoading={tabBff.shellLoading && !tabBff.timeline}
              timelinePhase2Loading={tabBff.phase2Loading}
              newSuggestionCount={newSuggestionCount}
              onOpenSuggestions={() => void openSuggestionsPanel()}
              onOpenPlanStudio={(detail) => {
                if (!id) return;
                if (!detail) {
                  trackTripDetailPlanStudioDeeplink({ tripId: id, fromTab: 'timeline' });
                }
                navigateToPlanStudioSchedule(navigate, id, detail);
              }}
              companionOverviewTab
              onOpenOverview={() => handleTabChange('overview')}
              onOpenFilesTab={() => handleTabChange('files')}
              onOpenDecisions={() => openDecisionCenter()}
              onOpenAccommodation={() => handleTabChange('accommodation')}
              onOpenActivities={() => handleTabChange('activities')}
              highlightItineraryItemId={highlightItineraryItemId}
            />
          </TabsContent>

          <TabsContent value="today" className="mt-0">
            {id && trip ? (
              <TripDetailTodayTab
                tripId={id}
                trip={trip}
                onOpenDecisions={() => openDecisionCenter()}
                onOpenMonitoring={openMonitoringCenter}
                onOpenBudget={() => handleTabChange('budget')}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="bookings" className="mt-0">
            {id && trip ? (
              <TripBookingsProtectionTab
                tripId={id}
                trip={trip}
                onOpenDecisions={() => openDecisionCenter()}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="map" className="mt-0 flex min-h-0 flex-1 flex-col">
            {id ? (
              <TripDetailMapTab
                tripId={id}
                onOpenFullMap={() => navigate(`/dashboard/journey-map?tripId=${id}`)}
                onOpenMonitoring={openMonitoringCenter}
              />
            ) : null}
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="mt-0">
            {id && trip ? (
              <TripDetailBudgetTab
                tripId={id}
                trip={trip}
                onOpenPlanStudio={() => navigate(`/dashboard/plan-studio?tripId=${id}&tab=budget`)}
                onEditBudget={() => navigate(`/dashboard/plan-studio?tripId=${id}&tab=budget`)}
              />
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <p>无法加载预算信息</p>
              </div>
            )}
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="members" className="mt-0">
            {id && trip ? (
              <TripDetailMembersTab
                tripId={id}
                trip={trip}
                collabOverview={tabBff.collab}
                collabOverviewLoading={tabBff.shellLoading && !tabBff.collab}
                onInviteMembers={() => setCollaboratorsDialogOpen(true)}
                onOpenCollabCenter={() =>
                  navigate(buildCollabCenterPlanStudioUrl(id, { collabTab: 'members' }))
                }
              />
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <p>无法加载成员信息</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="accommodation" className="mt-0">
            <TripDetailAccommodationTab
              tripId={id!}
              trip={trip}
              onOpenPlanStudio={() => id && navigate(`/dashboard/plan-studio?tripId=${id}`)}
            />
          </TabsContent>

          <TabsContent value="activities" className="mt-0">
            <TripDetailActivitiesTab
              tripId={id!}
              trip={trip}
              onOpenPlanStudio={() => id && navigate(`/dashboard/plan-studio?tripId=${id}`)}
            />
          </TabsContent>

          <TabsContent value="files" className="mt-0">
            {id ? (
              <TripDetailFilesTab
                tripId={id}
                onOpenDecisionLog={() => handleTabChange('decision-log')}
                onOpenTimelineItem={(itemId) => {
                  if (!id) return;
                  trackTripDetailEvidenceFilesLink({
                    tripId: id,
                    fromTab: 'files',
                    direction: 'to_timeline',
                    itineraryItemId: itemId,
                  });
                  navigate(buildTripDetailTimelineItemPath(id, itemId));
                }}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <div className="p-6 space-y-6">
            {id && (
              <InTripPostTripSummaryPanel
                data={postTripSummary}
                loading={postTripSummaryLoading}
                error={postTripSummaryError}
              />
            )}
            <Card>
              <CardHeader>
                  <CardTitle>复盘报告</CardTitle>
                  <CardDescription>查看路线报告和保存为模板</CardDescription>
              </CardHeader>
                <CardContent className="space-y-4">
                  {recapReport ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">稳健度</div>
                          <div className="text-2xl font-bold">{(recapReport as any)?.robustness || 8.5}/10</div>
                </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">节奏</div>
                          <div className="text-2xl font-bold">标准</div>
                </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/dashboard/insights?tripId=${id}`)}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        查看完整报告
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>行程完成后可查看复盘报告</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={loadRecapReport}
                        disabled={recapLoading}
                      >
                        {recapLoading ? '加载中...' : '生成报告'}
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // TODO: 保存为模板
                      toast.info('保存为模板功能开发中');
                    }}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    保存为模板
                  </Button>
              </CardContent>
            </Card>

            {isSelfEvolutionEnabled() && trip && user?.id && (
              <TripSelfEvolutionSection
                trip={trip}
                userId={user.id}
                autoPrompt={outcomeAutoPrompt}
              />
            )}

            {/* 决策反馈 - 帮助系统学习用户偏好 */}
            {id && (
              <DecisionFeedbackForm
                decisionId={id}
                onSuccess={() => {
                  toast.success('感谢您的反馈，这将帮助我们提供更好的推荐');
                }}
              />
            )}
          </div>
        </TabsContent>

        {/* 决策历史 */}
        <TabsContent value="decision-log" className="mt-0">
          {id ? (
            <TripDetailDecisionLogTab
              tripId={id}
              onOpenFilesTab={() => handleTabChange('files')}
            />
          ) : null}
        </TabsContent>

        </div>
        </Tabs>
      </div>

      {/* 旧的 Tab 内容（保留作为备用，可通过 URL 参数访问） */}
      {false && (
        <>
        <TabsContent value="recap" className="space-y-4">
          {recapLoading ? (
            <div className="flex items-center justify-center py-12">
              <LogoLoading size={40} />
            </div>
          ) : recapReport ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">行程复盘报告</h2>
                  <p className="text-muted-foreground mt-1">
                    {recapReport?.destination} • {recapReport?.totalDays} 天
                  </p>
                </div>
                <Button onClick={loadRecapReport} variant="outline">
                  刷新报告
                </Button>
              </div>

              {/* 统计概览 */}
              <Card>
                <CardHeader>
                  <CardTitle>统计概览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">访问地点</div>
                      <div className="text-2xl font-bold">{recapReport?.statistics?.totalPlaces ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">徒步路线</div>
                      <div className="text-2xl font-bold">{recapReport?.statistics?.totalTrails ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">总里程 (km)</div>
                      <div className="text-2xl font-bold">
                        {recapReport?.statistics?.totalTrailDistanceKm?.toFixed(1) ?? '0.0'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">累计爬升 (m)</div>
                      <div className="text-2xl font-bold">
                        {recapReport?.statistics?.totalElevationGainM?.toFixed(0) ?? '0'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 时间线 */}
              <Card>
                <CardHeader>
                  <CardTitle>行程时间线</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recapReport?.timeline?.map((dayTimeline, index) => (
                      <div key={index} className="border-l-2 border-border pl-4">
                        <div className="font-medium mb-2">
                          {format(new Date(dayTimeline.date), 'yyyy年MM月dd日')}
                        </div>
                        <div className="space-y-2">
                          {dayTimeline.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="text-sm">
                              <span className="text-muted-foreground">
                                {format(new Date(item.time), 'HH:mm')}
                              </span>{' '}
                              <span className="font-medium">{item.name}</span>
                              {item.duration && (
                                <span className="text-muted-foreground ml-2">
                                  ({item.duration} 分钟)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 访问地点列表 */}
              {(() => {
                // 在这个块内，recapReport 已经在外层条件中检查过了（第1505行），所以是非 null 的
                const report = recapReport!;
                if (!report.places || report.places.length === 0) {
                  return null;
                }
                const places = report.places;
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle>访问地点 ({places.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {places.map((place) => (
                          <div key={place.id} className="border rounded-lg p-3">
                            <div className="font-medium">{place.nameCN}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {format(new Date(place.visitDate), 'yyyy-MM-dd')} {place.visitTime}
                            </div>
                            {place.category && (
                              <Badge variant="outline" className="mt-2">
                                {place.category}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">尚未生成复盘报告</p>
                <Button onClick={loadRecapReport}>生成复盘报告</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        </>
      )}

      {/* 编辑对话框 */}
      {trip && (
        <EditTripDialog
          trip={trip}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={loadTrip}
        />
      )}

      {/* 分享对话框 */}
      {id && (
        <ShareTripDialog
          tripId={id}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}

      {/* 协作者对话框 */}
      {id && (
        <CollaboratorsDialog
          tripId={id}
          open={collaboratorsDialogOpen}
          onOpenChange={setCollaboratorsDialogOpen}
        />
      )}

      {/* 行程反馈对话框 (V2 优化) */}
      {id && (
        <Dialog open={optimizationFeedbackDialogOpen} onOpenChange={setOptimizationFeedbackDialogOpen}>
          <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>行程反馈</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 overflow-y-auto flex-1 -mx-6 px-6">
            {user?.id ? (
              <FeedbackForm
                userId={user.id}
                tripId={id}
                totalDays={trip?.TripDay?.length ?? 7}
                onSubmit={async (req) => {
                  await submitFeedbackMutation.mutateAsync(req);
                  setOptimizationFeedbackDialogOpen(false);
                }}
                onCancel={() => setOptimizationFeedbackDialogOpen(false)}
                isSubmitting={submitFeedbackMutation.isPending}
                outcomeCapture={{
                  utilityWeights: DEFAULT_WEIGHTS,
                  contextSnapshot: {
                    schema: 'trip.optimizationFeedback/v1',
                    tripId: id,
                  },
                }}
              />
            ) : (
              <p className="text-muted-foreground py-6 text-center">请先登录后再提交反馈</p>
            )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 创建行程项对话框 */}
      {selectedDayId && (
        <CreateItineraryItemDialog
          tripDayId={selectedDayId}
          trip={trip}
          open={createItemDialogOpen}
          onOpenChange={(open) => {
            setCreateItemDialogOpen(open);
            if (!open) {
              setSelectedDayId(null);
            }
          }}
          onSuccess={handleCreateItemSuccess}
        />
      )}

      {/* 编辑行程项对话框 */}
      {editingItem && (
        <EditItineraryItemDialog
          item={editingItem}
          open={editItemDialogOpen}
          onOpenChange={(open) => {
            setEditItemDialogOpen(open);
            if (!open) {
              setEditingItem(null);
            }
          }}
          onSuccess={loadTrip}
          tripDays={trip?.TripDay?.map(d => ({ id: d.id, date: d.date })) || []}
          currentTripDayId={editingItem?.tripDayId}
        />
      )}

      {/* 替换行程项对话框 */}
      {replacingItem && id && (
        <ReplaceItineraryItemDialog
          tripId={id}
          itemId={replacingItem.id}
          placeName={replacingItem.Place?.nameCN}
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

      {/* 调整时间对话框 */}
      {id && adjustingSuggestion && (
        <AdjustTimeDialog
          tripId={id}
          suggestion={adjustingSuggestion}
          open={adjustTimeDialogOpen}
          onOpenChange={async (open) => {
            if (open) await ensureSuggestionsLoaded();
            setAdjustTimeDialogOpen(open);
            if (!open) {
              setAdjustingSuggestion(null);
            }
          }}
          onSuccess={async () => {
            await Promise.all([
              refreshSuggestionsAndTabStats(),
              loadTrip(),
              loadTripMetrics(),
              loadPersonaAlerts(),
              loadTripHealth(),
              loadConflicts(),
            ]);
          }}
        />
      )}

      {/* 预览对话框 */}
      {id && previewSuggestion && (
        <SuggestionPreviewDialog
          tripId={id}
          suggestion={previewSuggestion}
          open={previewDialogOpen}
          actionId={previewActionId}
          onOpenChange={(open) => {
            setPreviewDialogOpen(open);
            if (!open) {
              setPreviewSuggestion(null);
              setPreviewActionId(null);
            }
          }}
          onConfirm={async () => {
            await Promise.all([
              refreshSuggestionsAndTabStats(),
              loadTrip(),
              loadTripMetrics(),
              loadPersonaAlerts(),
              loadTripHealth(),
              loadConflicts(),
            ]);
          }}
        />
      )}

      <TripDetailSuggestionsSheet
        open={suggestionsPanelOpen}
        onOpenChange={setSuggestionsPanelOpen}
        assistantCenterProps={assistantCenterProps}
      />

      {/* 指标详细说明弹窗 */}
      {id && (
        <MetricExplanationDialog
          tripId={id}
          metricName={selectedMetric}
          open={metricExplanationDialogOpen}
          onOpenChange={(open) => {
            setMetricExplanationDialogOpen(open);
            if (!open) {
              setSelectedMetric(null);
            }
          }}
        />
      )}

      {/* Auto 综合优化弹窗 */}
      {id && (() => {
        // 过滤出高优先级建议（severity === 'blocker'）
        const blockerSuggestions = suggestions.filter(s => s.severity === 'blocker');
        
        return (
          <AutoOptimizeDialog
            tripId={id}
            suggestions={blockerSuggestions}
            open={autoOptimizeDialogOpen}
            onOpenChange={async (open) => {
              if (open) await ensureSuggestionsLoaded();
              setAutoOptimizeDialogOpen(open);
            }}
            onSuccess={async (result) => {
              await Promise.all([
                loadTrip(),
                refreshSuggestionsAndTabStats(),
                loadTripMetrics(),
                loadPersonaAlerts(),
                loadTripHealth(),
                loadConflicts(),
              ]);
              
              // 显示成功提示
              if (result.success && result.appliedCount > 0) {
                toast.success(`成功应用 ${result.appliedCount} 条高优先级建议`);
                
                // 如果有影响数据，显示影响信息
                if (result.impact?.metrics) {
                  const metrics = result.impact.metrics;
                  const impactMessages: string[] = [];
                  
                  if (metrics.fatigue !== undefined && metrics.fatigue !== 0) {
                    impactMessages.push(`疲劳指数${metrics.fatigue > 0 ? '+' : ''}${metrics.fatigue}`);
                  }
                  if (metrics.buffer !== undefined && metrics.buffer !== 0) {
                    impactMessages.push(`缓冲时间${metrics.buffer > 0 ? '+' : ''}${metrics.buffer}分钟`);
                  }
                  if (metrics.cost !== undefined && metrics.cost !== 0) {
                    // 🐛 修复：使用 formatCurrency 而不是硬编码 ¥ 符号
                    const costFormatted = formatCurrency(Math.abs(metrics.cost), currency);
                    impactMessages.push(`费用${metrics.cost > 0 ? '+' : '-'}${costFormatted}`);
                  }
                  
                  if (impactMessages.length > 0) {
                    toast.info(`优化影响：${impactMessages.join('，')}`);
                  }
                }
              } else {
                toast.warning('没有成功应用任何建议');
              }
            }}
          />
        );
      })()}

      {showEmbeddedUi && id && trip ? (
        <AddHikingSegmentDialog
          open={addSegmentOpen}
          onOpenChange={setAddSegmentOpen}
          tripId={id}
          tripStart={trip.startDate}
          tripEnd={trip.endDate}
          segmentCount={embeddedHiking.segments.length}
          onCreated={async (segment: HikingSegment) => {
            try {
              const fresh = await tripsApi.getById(id);
              const metaSegs = getTripHikingSegments(fresh);
              if (!metaSegs.some((s) => s.segmentId === segment.segmentId)) {
                await tripsApi.update(id, {
                  metadata: mergeTripMetadata(fresh.metadata, {
                    hikingProfile: 'embedded',
                    hikingSegments: [...metaSegs, segment],
                  }),
                });
              }
              await loadTrip();
              await embeddedHiking.refreshPlans();
              toast.success('已添加徒步片段');
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      ) : null}

      {/* 体能反馈弹窗 - 行程完成后显示 */}
      {id && trip && (
        <TripFeedbackDialog
          tripId={id}
          tripName={trip.name || trip.destination}
          open={fitnessFeedbackDialogOpen}
          onOpenChange={setFitnessFeedbackDialogOpen}
          onComplete={() => {
            // 标记该行程已提交反馈
            localStorage.setItem(`fitness_feedback_submitted_${id}`, 'true');
            setFitnessFeedbackDialogOpen(false);
            toast.success('感谢您的反馈！您的体能画像将根据反馈进行优化');
          }}
        />
      )}
    </div>
  );
}

