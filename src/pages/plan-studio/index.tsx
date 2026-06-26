import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import IntentTab from './IntentTab';
import ScheduleTab from './ScheduleTab';
import CoverageMapTab from './CoverageMapTab';
import PlanGateDrawer from '@/components/plan-studio/PlanGateDrawer';
import BudgetTab from './BudgetTab';
import TasksTab from './TasksTab';
import TeamTab from './TeamTab';
// PersonaModeToggle 已移除 - 三人格现在是系统内部工具，不再允许用户切换视图
// PlanStudioSidebar 已移除 - 策略概览功能已整合到 AI 助手侧边栏
import { Compass } from '@/components/illustrations/SimpleIllustrations';
import { Button } from '@/components/ui/button';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
// Icons are now imported from pipeline-status.ts
import {
  getPipelineStatusIcon,
  getPipelineStatusLabel,
  getPipelineStatusClasses,
  getPipelineProgressColor,
  type PipelineStageStatus,
} from '@/lib/pipeline-status';
import { cn } from '@/lib/utils';
import { tripsApi } from '@/api/trips';
import { Spinner } from '@/components/ui/spinner';
import { LogoLoading } from '@/components/common/LogoLoading';
import type { PipelineStatus, PipelineStage, TripListItem, TripDetail } from '@/types/trip';
import { countriesApi } from '@/api/countries';
import type { Country } from '@/types/country';
import { Settings2, Zap, Footprints, Wallet } from 'lucide-react';
import {
  FeasibilityReportSheet,
  FeasibilityReportTrigger,
} from '@/components/feasibility-report';
import {
  ReadinessRepairLoopSheet,
  ReadinessRepairLoopTrigger,
} from '@/components/trip-loop';
import { isTripLoopReadinessEnabled } from '@/lib/trip-loop-feature';
import { resolveLoopValidationPresentation } from '@/lib/trip-loop-display';
import { notifyLoopReadinessChanged } from '@/lib/plan-studio-loop-events';
import { PrivateWishDialog } from '@/components/wishlist';
import { StructuredNegotiationDialog } from '@/components/domain-influence/StructuredNegotiationDialog';
import { DecisionProfilingHubDialog } from '@/components/decision-profiling';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';
import { SilentVoteHubDialog } from '@/components/silent-vote';
import { useTripWishSummary } from '@/hooks/useTripWishes';
import { useAuth } from '@/hooks/useAuth';
import {
  EmbeddedHikingStatusBar,
  HikingTrailSegmentsOverview,
} from '@/components/hiking';
import {
  isEmbeddedHikingTrip,
} from '@/lib/trip-hiking';
import { getTripHikingTrailSegments } from '@/lib/hiking-day-card';
import { isEmbeddedHikingEnabled } from '@/lib/embedded-hiking-feature';
import { useEmbeddedHikingTrip } from '@/hooks/useEmbeddedHikingTrip';
import { PlanStudioProvider, usePlanStudio } from '@/contexts/PlanStudioContext';
import { formatCurrency } from '@/utils/format';
import { WeatherCard } from '@/components/weather/WeatherCard';
import { EditTripDialog } from '@/components/trips/EditTripDialog';
import { ShareTripDialog } from '@/components/trips/ShareTripDialog';
import { CollaboratorsDialog } from '@/components/trips/CollaboratorsDialog';
import { TripGeneratingPlaceholder } from '@/components/trips/TripGeneratingPlaceholder';
import { shouldShowNlItemsGeneratingPlaceholder } from '@/lib/trip-planning-complete';
import { format } from 'date-fns';
import { PlanningBanner } from '@/components/planning/PlanningBanner';
import { NarrativeThemeSection } from '@/components/narrative/NarrativeThemeSection';
import { TripExperienceIntentPanel, shouldShowTripExperienceIntentPanel } from '@/components/experience-fulfillment';
import { WorldConstraintBanner } from '@/components/planning/WorldConstraintBanner';
import { DecisionCockpitPanel } from '@/components/agent/DecisionCockpitPanel';
import { hasDecisionCockpitUi } from '@/lib/decision-cockpit';
import { formatOptimizationMethodZh } from '@/lib/route-run-optimization-explain';
import { resetWorldModelGuardsStore } from '@/lib/world-model-guards';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';
import { isSelfDrivePlanningTrip } from '@/lib/trip-self-drive';
import {
  ACTIONABLE_READINESS_HORIZON_DAYS,
  getDaysUntilTripStart,
} from '@/lib/trip-readiness-phase.util';
import {
  dispatchPlanStudioSelectScheduleDay,
  type PlanStudioScheduleNavigateDetail,
  resolveScheduleDayIndex,
} from '@/lib/plan-studio-schedule-navigation';
import { resolveTravelItemIdsFromTrip } from '@/lib/feasibility-travel-timing';
import {
  getPlanStudioPipelineStageAction,
  pipelineStageActionLabel,
} from '@/lib/plan-studio-pipeline-navigation';
import { DecisionStrip } from '@/components/plan-studio/DecisionStrip';
import { useDecisionStripModel } from '@/hooks/useDecisionStripModel';
import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import { useDrawerOptional } from '@/components/layout/DashboardLayout';
import type { DecisionStripCtaType } from '@/lib/decision-strip-model';
import { trackDecisionStripEvidenceOpen } from '@/utils/plan-studio-decision-strip-analytics';

/** 工作台标题副文案：与侧栏行程列表展示逻辑对齐 */
function planStudioTripHeadingLabel(trip: TripDetail): string {
  const name = trip.name?.trim();
  if (name) return name;
  if (trip.destination && trip.startDate) {
    try {
      return `${trip.destination} ${format(new Date(trip.startDate), 'yyyy-MM-dd')}`;
    } catch {
      return trip.destination;
    }
  }
  return trip.destination || '行程';
}

/** 将 URL tab 参数规范为可展示的 Tab value */
function resolvePlanStudioTab(tabParam: string | null): string {
  const removedTabs = new Set(['optimize', 'what-if', 'decision-draft', 'bookings', 'workbench', 'feasibility']);
  const tab = tabParam || 'schedule';
  const normalized = removedTabs.has(tab) ? 'schedule' : tab;
  if (normalized === 'intent' || normalized === 'places') return 'schedule';
  return normalized;
}

function buildFeasibilityPagePath(tripId: string, issueId?: string | null) {
  const params = new URLSearchParams({ tripId });
  if (issueId) params.set('issueId', issueId);
  return `/dashboard/feasibility?${params.toString()}`;
}

function PlanStudioPageContent() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tripId = searchParams.get('tripId');
  const [activeTab, setActiveTab] = useState(() =>
    resolvePlanStudioTab(searchParams.get('tab')),
  );
  const planStudio = usePlanStudio();
  const decisionStrip = useDecisionStripModel(tripId);
  const { openAssistant, sendAssistantMessage } = useAssistantSidebar();
  const drawer = useDrawerOptional();
  const planGateUrlHandledRef = useRef(false);
  const { user } = useAuth();
  const { summary: wishSummary, reload: reloadWishSummary } = useTripWishSummary(tripId);
  
  // 意图与约束弹窗
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  // personaMode 已移除 - 三人格由系统自动调用，不再需要用户切换视图
  
  const [loading, setLoading] = useState(true);
  const [hasTrips, setHasTrips] = useState(false);
  const [tripExists, setTripExists] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // 用于触发子组件刷新
  const [structuredNegotiationOpen, setStructuredNegotiationOpen] = useState(false);
  const [feasibilitySheetOpen, setFeasibilitySheetOpen] = useState(false);
  const [feasibilityInitialIssueId, setFeasibilityInitialIssueId] = useState<string | null>(null);
  const [decisionProfilingHubOpen, setDecisionProfilingHubOpen] = useState(false);
  const [decisionProfilingQuizRequest, setDecisionProfilingQuizRequest] =
    useState<DecisionProfilingStep | null>(null);
  
  // 行程状态相关
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  
  // 行程相关（用于检查是否有行程和显示欢迎页面）
  const [_allTrips, setAllTrips] = useState<TripListItem[]>([]);
  const [countryMap, setCountryMap] = useState<Map<string, Country>>(new Map());
  
  // 当前行程详情（用于摘要条显示）
  const [currentTrip, setCurrentTrip] = useState<TripDetail | null>(null);
  const embeddedHiking = useEmbeddedHikingTrip(currentTrip);
  const showEmbeddedPlanStudio =
    Boolean(tripId) &&
    isEmbeddedHikingEnabled() &&
    embeddedHiking.embedded &&
    isEmbeddedHikingTrip(currentTrip);

  // 对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collaboratorsDialogOpen, setCollaboratorsDialogOpen] = useState(false);

  const worldModelGuards = useWorldModelGuardsStore((s) => s.worldModelGuards);
  const explainOptimization = useWorldModelGuardsStore((s) => s.explainOptimization);
  const decisionCockpit = useWorldModelGuardsStore((s) => s.decisionCockpit);
  const showDecisionCockpitDeepLink = searchParams.get('decisionCockpit') === '1';
  const decisionCockpitRef = useRef<HTMLDivElement>(null);
  const optimizationMethodLabel = formatOptimizationMethodZh(
    useWorldModelGuardsStore((s) => s.optimizationMethod)
  );

  useEffect(() => {
    resetWorldModelGuardsStore();
  }, [tripId]);

  // 根据国家代码获取国家名称
  const getCountryName = (countryCode: string): string => {
    const country = countryMap.get(countryCode);
    if (country) {
      return country.nameCN;
    }
    // 如果找不到，返回代码本身
    return countryCode;
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', value);
    if (value !== 'team') {
      newParams.delete('roundId');
      newParams.delete('roundDomain');
    }
    setSearchParams(newParams);

    // 不再需要切换 personaMode，三人格由系统自动调用
  };

  // 监听「加入行程」等操作，刷新 ScheduleTab（右侧助手添加住宿/火车后）
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener('plan-studio:schedule-refresh', handler);
    return () => window.removeEventListener('plan-studio:schedule-refresh', handler);
  }, []);

  useEffect(() => {
    const onSwitchTab = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: string }>).detail?.tab;
      if (!tab) return;
      if (tab === 'feasibility') {
        if (tripId) navigate(buildFeasibilityPagePath(tripId));
        return;
      }
      setActiveTab(tab);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', tab);
      if (tab !== 'team') {
        newParams.delete('roundId');
        newParams.delete('roundDomain');
      }
      setSearchParams(newParams);
    };
    window.addEventListener('plan-studio:switch-tab', onSwitchTab);
    return () => window.removeEventListener('plan-studio:switch-tab', onSwitchTab);
  }, [searchParams, setSearchParams, navigate, tripId]);

  // URL ?tab= 变化时同步 Tab（例如时间轴卡片「查看报告」仅改 query）
  useEffect(() => {
    const tabFromUrl = resolvePlanStudioTab(searchParams.get('tab'));
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const handleNavigateToScheduleFromFeasibility = (detail: PlanStudioScheduleNavigateDetail) => {
    let highlightItemIds = detail.highlightItemIds;
    if (
      !highlightItemIds?.length &&
      currentTrip &&
      detail.fromPlaceLabel &&
      detail.toPlaceLabel
    ) {
      highlightItemIds = resolveTravelItemIdsFromTrip(
        currentTrip,
        detail.fromPlaceLabel,
        detail.toPlaceLabel,
        detail.dayNumber,
      );
    }
    dispatchPlanStudioSelectScheduleDay({
      ...detail,
      highlightItemIds,
    });
  };

  const handleDecisionStripPrimaryCta = (type: DecisionStripCtaType) => {
    switch (type) {
      case 'open_plan_gate':
        planStudio.openPlanGate();
        break;
      case 'adjust_schedule':
        handleTabChange('schedule');
        break;
      case 'open_feasibility':
        if (tripId) navigate(buildFeasibilityPagePath(tripId));
        break;
      case 'optimize':
        sendAssistantMessage(decisionStrip.optimizeMessage ?? '请帮我优化当前行程方案');
        break;
      case 'open_assistant':
      default:
        openAssistant();
        break;
    }
  };

  const handleDecisionStripOpenEvidence = () => {
    if (!drawer || !tripId) return;
    trackDecisionStripEvidenceOpen({ tripId, source: 'drawer' });
    drawer.setDrawerTab('decision');
    drawer.setDrawerOpen(true);
  };

  useEffect(() => {
    const onSelectScheduleDay = (event: Event) => {
      const detail = (event as CustomEvent<PlanStudioScheduleNavigateDetail>).detail ?? {};
      setActiveTab('schedule');
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', 'schedule');
      setSearchParams(newParams, { replace: true });

      const dayIndex = resolveScheduleDayIndex(detail);
      if (typeof dayIndex === 'number' && dayIndex >= 0) {
        window.setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('plan-studio:scroll-schedule-day', {
              detail,
            }),
          );
        }, 150);
      }
    };
    window.addEventListener('plan-studio:select-schedule-day', onSelectScheduleDay);
    return () => window.removeEventListener('plan-studio:select-schedule-day', onSelectScheduleDay);
  }, [searchParams, setSearchParams]);

  // URL ?tab=feasibility 深链 → 可执行证明全页
  useEffect(() => {
    if (!tripId || searchParams.get('tab') !== 'feasibility') return;
    navigate(buildFeasibilityPagePath(tripId), { replace: true });
  }, [tripId, searchParams, navigate]);

  useEffect(() => {
    const onOpenFeasibility = (event: Event) => {
      if (!tripId) return;
      const issueId = (event as CustomEvent<{ issueId?: string }>).detail?.issueId;
      navigate(buildFeasibilityPagePath(tripId, issueId ?? null));
    };
    window.addEventListener('plan-studio:open-feasibility', onOpenFeasibility);
    return () => window.removeEventListener('plan-studio:open-feasibility', onOpenFeasibility);
  }, []);

  const roundIdParam = searchParams.get('roundId');
  useEffect(() => {
    if (!tripId || !roundIdParam) return;
    setStructuredNegotiationOpen(true);
  }, [tripId, roundIdParam]);

  useEffect(() => {
    const onOpenStructuredNegotiation = (event: Event) => {
      const detail = (event as CustomEvent<{ tripId?: string }>).detail;
      if (!tripId || detail?.tripId !== tripId) return;
      setStructuredNegotiationOpen(true);
    };
    window.addEventListener('plan-studio:open-structured-negotiation', onOpenStructuredNegotiation);
    return () =>
      window.removeEventListener('plan-studio:open-structured-negotiation', onOpenStructuredNegotiation);
  }, [tripId]);

  const handleStructuredNegotiationOpenChange = (open: boolean) => {
    setStructuredNegotiationOpen(open);
    if (!open) {
      const next = new URLSearchParams(searchParams);
      next.delete('roundId');
      next.delete('roundDomain');
      setSearchParams(next, { replace: true });
    }
  };

  const decisionProfilingStepParam = searchParams.get('decisionProfilingStep');
  const openDecisionProfilingParam = searchParams.get('openDecisionProfiling') === '1';
  const decisionProfilingActionParam = searchParams.get('decisionProfilingAction');
  const decisionProfilingForceReuse = decisionProfilingActionParam === 'reuse';

  useEffect(() => {
    if (
      !tripId ||
      (!openDecisionProfilingParam && !decisionProfilingStepParam && !decisionProfilingForceReuse)
    ) {
      return;
    }
    setDecisionProfilingHubOpen(true);
  }, [tripId, openDecisionProfilingParam, decisionProfilingStepParam, decisionProfilingForceReuse]);

  useEffect(() => {
    const onOpenDecisionProfiling = (event: Event) => {
      const detail = (event as CustomEvent<{ tripId?: string; step?: DecisionProfilingStep }>).detail;
      if (!tripId || detail?.tripId !== tripId) return;
      setDecisionProfilingHubOpen(true);
      setDecisionProfilingQuizRequest(detail?.step ?? 'travel_style');
    };
    window.addEventListener('plan-studio:open-decision-profiling', onOpenDecisionProfiling);
    return () =>
      window.removeEventListener('plan-studio:open-decision-profiling', onOpenDecisionProfiling);
  }, [tripId]);

  const handleDecisionProfilingHubOpenChange = (open: boolean) => {
    setDecisionProfilingHubOpen(open);
    if (!open) {
      setDecisionProfilingQuizRequest(null);
      const next = new URLSearchParams(searchParams);
      next.delete('openDecisionProfiling');
      next.delete('decisionProfilingStep');
      next.delete('decisionProfilingAction');
      next.delete('decisionProfilingPrefill');
      setSearchParams(next, { replace: true });
    }
  };

  const decisionProfilingInitialStep =
    decisionProfilingQuizRequest ??
    (decisionProfilingStepParam === 'money_dna' || decisionProfilingStepParam === 'travel_style'
      ? decisionProfilingStepParam
      : null);
  const decisionProfilingForceQuiz =
    (openDecisionProfilingParam || decisionProfilingQuizRequest !== null) && !decisionProfilingForceReuse;

  useEffect(() => {
    planGateUrlHandledRef.current = false;
  }, [tripId]);

  // tab=workbench / planGate=1 深链 → 时间轴 + 方案抽屉
  useEffect(() => {
    if (!tripId || !tripExists || planGateUrlHandledRef.current) return;
    const tab = searchParams.get('tab');
    const planGate = searchParams.get('planGate');
    if (tab !== 'workbench' && planGate !== '1') return;

    planGateUrlHandledRef.current = true;
    const autoGenerate = searchParams.get('generate') === '1';
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'schedule');
    next.delete('planGate');
    next.delete('generate');
    setSearchParams(next, { replace: true });
    setActiveTab('schedule');
    planStudio.openPlanGate({ autoGenerate });
  }, [tripId, tripExists, searchParams, setSearchParams, planStudio]);

  useEffect(() => {
    if (!showDecisionCockpitDeepLink || !decisionCockpit || !decisionCockpitRef.current) return;
    decisionCockpitRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const next = new URLSearchParams(searchParams);
    next.delete('decisionCockpit');
    setSearchParams(next, { replace: true });
  }, [showDecisionCockpitDeepLink, decisionCockpit, searchParams, setSearchParams]);

  // 加载国家信息
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await countriesApi.getAll();
        const countries = response.countries || [];
        const map = new Map<string, Country>();
        countries.forEach((country) => {
          map.set(country.isoCode, country);
        });
        setCountryMap(map);
      } catch (err: any) {
        console.error('Failed to load countries:', err);
      }
    };
    loadCountries();
  }, []);

  // 处理从其他页面传递过来的状态（如侧边栏的操作）
  useEffect(() => {
    const state = location.state as {
      openEditDialog?: boolean;
      openShareDialog?: boolean;
      openCollaboratorsDialog?: boolean;
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
      
      // 清除 state，避免刷新页面时重复打开
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, location.search]);

  // 检查行程数据和验证tripId是否有效
  useEffect(() => {
    const checkTripsAndTripId = async () => {
      try {
        setLoading(true);
        
        // 1. 检查是否有任何行程（只显示规划中的行程）
        const allTripsData = await tripsApi.getAll();
        const allTripsList = Array.isArray(allTripsData) ? allTripsData : [];
        // ✅ 只显示规划中状态的行程
        const planningTrips = allTripsList.filter(trip => trip.status === 'PLANNING');
        setAllTrips(planningTrips);
        setHasTrips(planningTrips.length > 0);
        
        // 2. 如果有tripId，验证行程是否存在且为规划中状态
        if (tripId) {
          try {
            const trip = await tripsApi.getById(tripId);
            // ✅ 检查行程状态是否为规划中
            if (trip.status === 'PLANNING') {
              setTripExists(true);
              setCurrentTrip(trip); // 保存当前行程详情
            } else {
              // 行程不是规划中状态，清除tripId参数
              console.warn('Trip is not in PLANNING status:', tripId, trip.status);
              setTripExists(false);
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('tripId');
              setSearchParams(newParams);
            }
          } catch (err: any) {
            // 行程不存在（可能已被删除）
            console.warn('Trip not found or deleted:', tripId);
            setTripExists(false);
            // 清除无效的tripId参数
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('tripId');
            setSearchParams(newParams);
          }
        } else {
          setTripExists(false);
        }
        
        // 3. 如果没有行程数据，显示引导状态
        if (allTripsList.length === 0) {
          setShowWelcomeModal(true);
        }
      } catch (err) {
        console.error('Failed to check trips:', err);
        setHasTrips(false);
        setTripExists(false);
        // 出错时也显示引导状态
        setShowWelcomeModal(true);
      } finally {
        setLoading(false);
      }
    };
    
    checkTripsAndTripId();
  }, [tripId, searchParams, setSearchParams]);

  // 获取行程 Pipeline 状态
  const loadPipelineStatus = async () => {
    if (!tripId) return;
    
    try {
      setLoadingStatus(true);
      setStatusError(null);
      const status = await tripsApi.getPipelineStatus(tripId);
      setPipelineStatus(status);
    } catch (err: any) {
      console.error('[PlanStudio] Failed to load pipeline status:', err);
      setStatusError(err.message || '获取状态失败');
      // 如果获取失败，尝试从 trip 详情中获取
      try {
        const trip = await tripsApi.getById(tripId);
        if (trip.pipelineStatus) {
          setPipelineStatus(trip.pipelineStatus);
        }
      } catch (tripErr) {
        // 忽略错误，保持 statusError
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  // 当 tripId 变化时，加载 Pipeline 状态
  useEffect(() => {
    if (tripId && tripExists) {
      loadPipelineStatus();
    } else {
      setPipelineStatus(null);
      setStatusError(null);
    }
  }, [tripId, tripExists]);

  // 定期刷新状态（每30秒）
  useEffect(() => {
    if (!tripId || !tripExists) return;

    const interval = setInterval(() => {
      loadPipelineStatus();
    }, 30000); // 30秒

    return () => clearInterval(interval);
  }, [tripId, tripExists]);

  // 方案提交 / 时间轴变更后刷新 Pipeline 进度
  useEffect(() => {
    if (!tripId || !tripExists) return;
    const handler = () => void loadPipelineStatus();
    window.addEventListener('plan-studio:schedule-refresh', handler);
    return () => window.removeEventListener('plan-studio:schedule-refresh', handler);
  }, [tripId, tripExists]);

  // 加载行程数据
  const loadTrip = async () => {
    if (!tripId) return;
    try {
      const trip = await tripsApi.getById(tripId);
      if (trip.status === 'PLANNING') {
        setCurrentTrip(trip);
        setTripExists(true);
      }
    } catch (err: any) {
      console.error('Failed to load trip:', err);
    }
  };

  const executePipelineStageAction = (stage: PipelineStage) => {
    if (!tripId) return;
    const action = getPlanStudioPipelineStageAction(stage, tripId);
    if (!action) return;
    setShowStatusDialog(false);

    switch (action.type) {
      case 'tab':
        handleTabChange(action.tab);
        break;
      case 'intent':
        setShowIntentDialog(true);
        break;
      case 'external':
        navigate(action.path);
        break;
    }
  };

  // ⚠️ 重要：所有 useMemo 必须在早期返回之前调用
  // 常见国家首都/主要城市坐标（用于没有行程项时的天气查询）
  const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; name: string }> = {
    'IS': { lat: 64.1466, lng: -21.9426, name: '冰岛·雷克雅未克' },
    'JP': { lat: 35.6762, lng: 139.6503, name: '日本·东京' },
    'TH': { lat: 13.7563, lng: 100.5018, name: '泰国·曼谷' },
    'KR': { lat: 37.5665, lng: 126.9780, name: '韩国·首尔' },
    'US': { lat: 40.7128, lng: -74.0060, name: '美国·纽约' },
    'GB': { lat: 51.5074, lng: -0.1278, name: '英国·伦敦' },
    'FR': { lat: 48.8566, lng: 2.3522, name: '法国·巴黎' },
    'DE': { lat: 52.5200, lng: 13.4050, name: '德国·柏林' },
    'IT': { lat: 41.9028, lng: 12.4964, name: '意大利·罗马' },
    'ES': { lat: 40.4168, lng: -3.7038, name: '西班牙·马德里' },
    'AU': { lat: -33.8688, lng: 151.2093, name: '澳大利亚·悉尼' },
    'NZ': { lat: -36.8485, lng: 174.7633, name: '新西兰·奥克兰' },
    'SG': { lat: 1.3521, lng: 103.8198, name: '新加坡' },
    'MY': { lat: 3.1390, lng: 101.6869, name: '马来西亚·吉隆坡' },
    'VN': { lat: 21.0285, lng: 105.8542, name: '越南·河内' },
    'ID': { lat: -6.2088, lng: 106.8456, name: '印度尼西亚·雅加达' },
    'CN': { lat: 39.9042, lng: 116.4074, name: '中国·北京' },
    'HK': { lat: 22.3193, lng: 114.1694, name: '香港' },
    'TW': { lat: 25.0330, lng: 121.5654, name: '台湾·台北' },
    'AE': { lat: 25.2048, lng: 55.2708, name: '阿联酋·迪拜' },
    'EG': { lat: 30.0444, lng: 31.2357, name: '埃及·开罗' },
    'GR': { lat: 37.9838, lng: 23.7275, name: '希腊·雅典' },
    'TR': { lat: 41.0082, lng: 28.9784, name: '土耳其·伊斯坦布尔' },
    'PT': { lat: 38.7223, lng: -9.1393, name: '葡萄牙·里斯本' },
    'NL': { lat: 52.3676, lng: 4.9041, name: '荷兰·阿姆斯特丹' },
    'CH': { lat: 46.9480, lng: 7.4474, name: '瑞士·伯尔尼' },
    'AT': { lat: 48.2082, lng: 16.3738, name: '奥地利·维也纳' },
    'CZ': { lat: 50.0755, lng: 14.4378, name: '捷克·布拉格' },
    'NO': { lat: 59.9139, lng: 10.7522, name: '挪威·奥斯陆' },
    'SE': { lat: 59.3293, lng: 18.0686, name: '瑞典·斯德哥尔摩' },
    'FI': { lat: 60.1699, lng: 24.9384, name: '芬兰·赫尔辛基' },
    'DK': { lat: 55.6761, lng: 12.5683, name: '丹麦·哥本哈根' },
    'CA': { lat: 45.4215, lng: -75.6972, name: '加拿大·渥太华' },
    'MX': { lat: 19.4326, lng: -99.1332, name: '墨西哥·墨西哥城' },
    'BR': { lat: -23.5505, lng: -46.6333, name: '巴西·圣保罗' },
    'AR': { lat: -34.6037, lng: -58.3816, name: '阿根廷·布宜诺斯艾利斯' },
    'CL': { lat: -33.4489, lng: -70.6693, name: '智利·圣地亚哥' },
    'PE': { lat: -12.0464, lng: -77.0428, name: '秘鲁·利马' },
    'IN': { lat: 28.6139, lng: 77.2090, name: '印度·新德里' },
    'RU': { lat: 55.7558, lng: 37.6173, name: '俄罗斯·莫斯科' },
    'ZA': { lat: -33.9249, lng: 18.4241, name: '南非·开普敦' },
    'MA': { lat: 33.9716, lng: -6.8498, name: '摩洛哥·拉巴特' },
    'PH': { lat: 14.5995, lng: 120.9842, name: '菲律宾·马尼拉' },
    'HR': { lat: 45.8150, lng: 15.9819, name: '克罗地亚·萨格勒布' },
    'PL': { lat: 52.2297, lng: 21.0122, name: '波兰·华沙' },
    'HU': { lat: 47.4979, lng: 19.0402, name: '匈牙利·布达佩斯' },
    'IE': { lat: 53.3498, lng: -6.2603, name: '爱尔兰·都柏林' },
  };

  // 获取天气位置：优先使用行程项坐标，否则使用目的地国家默认坐标
  const weatherLocation = useMemo(() => {
    if (!currentTrip) {
      return null;
    }

    // 1. 尝试从行程项中获取坐标
    const places: Array<{ lat: number; lng: number }> = [];
    if (currentTrip.TripDay && currentTrip.TripDay.length > 0) {
      for (const day of currentTrip.TripDay) {
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
        name: currentTrip.destination || '目的地' 
      };
    }

    // 2. 如果没有行程项坐标，使用目的地国家的默认坐标
    if (currentTrip.destination) {
      const countryCode = currentTrip.destination.split(',')[0]?.trim().toUpperCase();
      const countryCoord = COUNTRY_COORDINATES[countryCode];
      if (countryCoord) {
        return {
          location: { lat: countryCoord.lat, lng: countryCoord.lng },
          name: countryCoord.name
        };
      }
    }

    return null;
  }, [currentTrip]);

  // 判断是否是冰岛（用于显示详细风速信息）
  const showSelfDriveCoverageTab = useMemo(
    () => isSelfDrivePlanningTrip(currentTrip),
    [currentTrip],
  );

  const isIceland = useMemo(() => {
    if (!currentTrip?.destination) return false;
    const countryCode = currentTrip.destination.split(',')[0]?.trim().toUpperCase();
    return countryCode === 'IS';
  }, [currentTrip?.destination]);

  /** 远期规划不展示实时天气（与准备度「出发前 14 天内再查」一致） */
  const showPlanStudioLiveWeather = useMemo(() => {
    if (!currentTrip?.startDate) return false;
    const daysUntilStart = getDaysUntilTripStart(currentTrip.startDate);
    return daysUntilStart >= 0 && daysUntilStart <= ACTIONABLE_READINESS_HORIZON_DAYS;
  }, [currentTrip?.startDate]);

  useEffect(() => {
    if (activeTab === 'coverage' && !showSelfDriveCoverageTab) {
      setActiveTab('schedule');
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'schedule');
      setSearchParams(next, { replace: true });
    }
  }, [activeTab, showSelfDriveCoverageTab, searchParams, setSearchParams]);

  const handleWelcomeComplete = (experienceType: 'steady' | 'balanced' | 'exploratory') => {
    setShowWelcomeModal(false);
    navigate('/dashboard/trips/new?experience=' + experienceType);
  };

  // 加载中状态（使用 Logo 加载动画，符合 TripNARA 品牌与决策感）
  if (loading) {
    return (
      <LogoLoading size={56} fullScreen />
    );
  }

  // 没有行程数据或tripId无效时，显示引导状态
  if (!hasTrips || (tripId && !tripExists) || !tripId) {
    return (
      <>
        <WelcomeModal
          open={showWelcomeModal}
          onClose={() => {
            // 如果用户关闭模态框但还没有行程，引导到行程列表
            if (!hasTrips) {
              navigate('/dashboard/trips');
            } else {
              setShowWelcomeModal(false);
            }
          }}
          onComplete={handleWelcomeComplete}
        />
        
        {/* 如果用户已经完成了欢迎流程但还没有行程，显示空状态 */}
        {!showWelcomeModal && (
          <div className="p-6">
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-4 opacity-50">
                    <Compass size={120} color="#9CA3AF" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">{t('planStudio.noTrip')}</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {hasTrips ? t('planStudio.selectTripToStart') : t('planStudio.createFirstTrip')}
                  </p>
                  <Button onClick={() => navigate('/dashboard/trips')}>
                    {hasTrips ? t('planStudio.goToTrips') : t('planStudio.createTrip')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  }

  // 行程项未生成完成时，展示生成中占位页
  if (tripId && tripExists && currentTrip && shouldShowNlItemsGeneratingPlaceholder(currentTrip)) {
    return (
      <TripGeneratingPlaceholder
        tripId={tripId}
        onReady={loadTrip}
        compact
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部：标题 + 行程切换 + 状态 */}
      <div className="border-b bg-white px-4 sm:px-6 py-3 sm:py-4">
        {/* 第一行：标题和主要操作 */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              {tripId && currentTrip
                ? `${t('planStudio.title')} - ${planStudioTripHeadingLabel(currentTrip)}`
                : t('planStudio.title')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">
              {t('planStudio.subtitle')}
            </p>
          </div>
          
          {/* 右侧操作区：顶栏工具 + Pipeline 状态 */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {tripId && tripExists && (
              <DecisionProfilingHubDialog
                tripId={tripId}
                open={decisionProfilingHubOpen}
                onOpenChange={handleDecisionProfilingHubOpenChange}
                initialStep={decisionProfilingInitialStep}
                forceOpenQuiz={decisionProfilingForceQuiz}
                forceReuseProfile={decisionProfilingForceReuse}
              />
            )}
            {tripId && tripExists && (
              <StructuredNegotiationDialog
                tripId={tripId}
                open={structuredNegotiationOpen}
                onOpenChange={handleStructuredNegotiationOpenChange}
                initialRoundId={searchParams.get('roundId')}
                initialRoundDomain={searchParams.get('roundDomain')}
                showTrigger
              />
            )}
            {tripId && tripExists && (
              <SilentVoteHubDialog tripId={tripId} />
            )}
            {tripId && tripExists && (
              <PrivateWishDialog
                tripId={tripId}
                destinationLabel={currentTrip?.destination?.trim() || '冰岛'}
                userDisplayName={user?.displayName ?? user?.email ?? '我'}
                onOpenChange={(open) => {
                  if (!open) void reloadWishSummary();
                }}
              />
            )}
            {tripId && tripExists && (
              isTripLoopReadinessEnabled() ? (
                <ReadinessRepairLoopTrigger
                  tripId={tripId}
                  loopPhaseLabel={
                    decisionStrip.loopUi
                      ? resolveLoopValidationPresentation(decisionStrip.loopUi).phaseLabel
                      : null
                  }
                  onClick={() => setFeasibilitySheetOpen(true)}
                />
              ) : (
                <FeasibilityReportTrigger
                  tripId={tripId}
                  onClick={() => setFeasibilitySheetOpen(true)}
                />
              )
            )}

            {/* Pipeline 状态指示器 */}
            {tripId && tripExists && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {loadingStatus ? (
                  <Spinner className="w-3 h-3 sm:w-4 sm:h-4" />
                ) : pipelineStatus ? (
                  <button
                    type="button"
                    onClick={() => setShowStatusDialog(true)}
                    className="hover:opacity-80 transition-opacity"
                    title="点击查看各阶段详情"
                  >
                    <PipelineStatusIndicator status={pipelineStatus} />
                  </button>
                ) : statusError ? (
                  <div className="text-xs text-muted-foreground">
                    状态加载失败
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* 出发前 14 天内才显示目的地实时天气 */}
        {tripId && tripExists && weatherLocation && showPlanStudioLiveWeather && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0">
            <div className="flex-shrink-0">
              <WeatherCard
                location={weatherLocation.location}
                includeWindDetails={isIceland}
                compact={true}
                refreshInterval={10 * 60 * 1000} // 10分钟刷新一次
                locationName={weatherLocation.name}
              />
            </div>
          </div>
        )}
      </div>

      {/* 摘要条 - 显示当前行程核心设置 */}
      {tripId && tripExists && currentTrip && (
        <TripSummaryBar 
          trip={currentTrip} 
          countryName={getCountryName(currentTrip.destination)}
          onOpenSettings={() => setShowIntentDialog(true)}
        />
      )}

      {tripId && tripExists && (
        <NarrativeThemeSection
          tripId={tripId}
          promptOnCreate={(location.state as { from?: string } | null)?.from === 'create'}
        />
      )}

      {tripId && tripExists && (
        <div className="px-6 space-y-3 pb-2">
          <DecisionStrip
            tripId={tripId}
            model={decisionStrip}
            hasGuards={Boolean(worldModelGuards)}
            onPrimaryCta={handleDecisionStripPrimaryCta}
            onOpenEvidence={drawer ? handleDecisionStripOpenEvidence : undefined}
          />
          {!decisionStrip.hidePlanningBanner ? (
            <PlanningBanner guards={worldModelGuards} />
          ) : null}
          <WorldConstraintBanner
            materialization={explainOptimization?.world_constraint_materialization}
            className="-mt-2 mb-3"
          />
          {optimizationMethodLabel ? (
            <p className="text-xs text-muted-foreground -mt-2 mb-4 px-1">
              优化方式：{optimizationMethodLabel}
            </p>
          ) : null}
          {hasDecisionCockpitUi(decisionCockpit) ? (
            <div ref={decisionCockpitRef} className="mb-4">
              <DecisionCockpitPanel
                cockpit={decisionCockpit}
                defaultOpen={showDecisionCockpitDeepLink}
              />
            </div>
          ) : null}
        </div>
      )}

      {tripId && tripExists && currentTrip && shouldShowTripExperienceIntentPanel(currentTrip.metadata) && (
        <div className="px-6 pb-2">
          <TripExperienceIntentPanel metadata={currentTrip.metadata} defaultOpen />
        </div>
      )}

      {showEmbeddedPlanStudio && tripId ? (
        <div className="px-6 pb-2">
          <EmbeddedHikingStatusBar
            tripId={tripId}
            phase={embeddedHiking.phase}
            phaseHintZh={embeddedHiking.phaseHintZh}
            segmentCount={embeddedHiking.segments.length}
            plans={embeddedHiking.plans}
            onAddSegment={() => navigate(`/dashboard/trips/${tripId}`)}
          />
          {currentTrip && getTripHikingTrailSegments(currentTrip).length > 0 ? (
            <div className="mt-3 rounded-lg border bg-muted/20 p-4">
              <HikingTrailSegmentsOverview segments={getTripHikingTrailSegments(currentTrip)} />
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground mt-2 px-1">
            混合出行请在行程详情登记徒步片段；本页继续编辑自驾/日程，不会对整单触发硬核 Trail 生成。
          </p>
        </div>
      ) : null}

      {/* 主内容区：Tab导航 + 内容 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 主内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
            <div className="border-b bg-white px-6">
              <TabsList className="justify-start">
                <TabsTrigger value="schedule">{t('planStudio.tabs.schedule')}</TabsTrigger>
                {showSelfDriveCoverageTab ? (
                  <TabsTrigger value="coverage">{t('planStudio.tabs.coverage')}</TabsTrigger>
                ) : null}
                <TabsTrigger value="budget">预算管理</TabsTrigger>
                <TabsTrigger value="tasks">行前准备</TabsTrigger>
                <TabsTrigger value="team">团队</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div
                className={cn(
                  'mx-auto',
                  activeTab === 'coverage' ? 'max-w-6xl' : 'max-w-5xl',
                )}
              >
                <TabsContent value="schedule" className="mt-0">
                  {tripId && activeTab === 'schedule' ? (
                    <ScheduleTab
                      tripId={tripId}
                      refreshKey={refreshKey}
                      wishImpactByDay={wishSummary?.impactByDay}
                    />
                  ) : tripId ? (
                    <div className="flex items-center justify-center p-8 min-h-[200px]">
                      <p className="text-sm text-muted-foreground">切换到「时间轴」查看日程与领域分解</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">请先选择行程</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
                {showSelfDriveCoverageTab && tripId ? (
                  <TabsContent value="coverage" className="mt-0">
                    <CoverageMapTab tripId={tripId} refreshKey={refreshKey} />
                  </TabsContent>
                ) : null}
                <TabsContent value="budget" className="mt-0">
                  <BudgetTab tripId={tripId!} />
                </TabsContent>
                <TabsContent value="tasks" className="mt-0">
                  {tripId ? (
                    <TasksTab
                      tripId={tripId}
                      initialSubTab={
                        searchParams.get('subtab') === 'packing' ? 'packing' : 'tasks'
                      }
                    />
                  ) : null}
                </TabsContent>
                <TabsContent value="team" className="mt-0">
                  {tripId && activeTab === 'team' ? (
                    <TeamTab
                      tripId={tripId}
                      trip={currentTrip}
                      onTripRefetch={loadTrip}
                      onGoToSchedule={() => handleTabChange('schedule')}
                    />
                  ) : null}
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>

      <PlanGateDrawer tripId={tripId} />

      {/* Pipeline 状态详情对话框 */}
      {pipelineStatus && (
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>行程规划状态</DialogTitle>
              <DialogDescription>
                查看行程规划的各个阶段完成情况
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {pipelineStatus.stages.map((stage) => (
                <PipelineStageCard
                  key={stage.id}
                  stage={stage}
                  onAction={tripId ? executePipelineStageAction : undefined}
                />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 意图与约束弹窗 */}
      <Dialog open={showIntentDialog} onOpenChange={setShowIntentDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-4 gap-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              调整约束
            </DialogTitle>
            <DialogDescription>
              设置行程的意图、偏好和约束条件
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <IntentTab tripId={tripId} compact />
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      {currentTrip && (
        <EditTripDialog
          trip={currentTrip}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            // 重新加载行程数据
            if (tripId) {
              tripsApi.getById(tripId).then(setCurrentTrip).catch(console.error);
            }
          }}
        />
      )}

      {/* 分享对话框 */}
      {tripId && (
        <ShareTripDialog
          tripId={tripId}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}

      {/* 协作者对话框 */}
      {tripId && (
        <CollaboratorsDialog
          tripId={tripId}
          open={collaboratorsDialogOpen}
          onOpenChange={setCollaboratorsDialogOpen}
        />
      )}

      {tripId && tripExists && (
        isTripLoopReadinessEnabled() ? (
          <ReadinessRepairLoopSheet
            tripId={tripId}
            open={feasibilitySheetOpen}
            onOpenChange={(open) => {
              setFeasibilitySheetOpen(open);
              if (!open) setFeasibilityInitialIssueId(null);
            }}
            initialIssueId={feasibilityInitialIssueId}
            onNavigateToSchedule={handleNavigateToScheduleFromFeasibility}
            onApplied={() => {
              setRefreshKey((k) => k + 1);
              if (tripId) {
                tripsApi.getById(tripId).then(setCurrentTrip).catch(console.error);
                notifyLoopReadinessChanged(tripId);
                void decisionStrip.reloadLoopValidation();
              }
            }}
          />
        ) : (
          <FeasibilityReportSheet
            tripId={tripId}
            open={feasibilitySheetOpen}
            onOpenChange={(open) => {
              setFeasibilitySheetOpen(open);
              if (!open) setFeasibilityInitialIssueId(null);
            }}
            initialIssueId={feasibilityInitialIssueId}
            onNavigateToSchedule={handleNavigateToScheduleFromFeasibility}
          />
        )
      )}
    </div>
  );
}

// 行程摘要条组件
function TripSummaryBar({ 
  trip, 
  countryName,
  onOpenSettings 
}: { 
  trip: TripDetail; 
  countryName: string;
  onOpenSettings: () => void;
}) {
  // 从 pacingConfig 获取节奏信息
  const getPaceLabel = () => {
    const level = trip.pacingConfig?.level;
    const maxActivities = trip.pacingConfig?.maxDailyActivities;
    
    if (level === 'relaxed' || (maxActivities && maxActivities <= 3)) {
      return { label: '悠闲', emoji: '🌿', desc: '每天2-3个点' };
    } else if (level === 'tight' || (maxActivities && maxActivities > 5)) {
      return { label: '紧凑', emoji: '🚀', desc: '每天6+个点' };
    }
    return { label: '标准', emoji: '⚖️', desc: '每天4-5个点' };
  };

  const pace = getPaceLabel();
  const budget = trip.totalBudget || trip.budgetConfig?.totalBudget;
  const currency = trip.budgetConfig?.currency || 'CNY';
  const days = trip.TripDay?.length || 0;
  const startDate = trip.startDate ? new Date(trip.startDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '';
  const endDate = trip.endDate ? new Date(trip.endDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '';

  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b px-6 py-3">
      <div className="flex items-center justify-between">
        {/* 左侧：核心信息 */}
        <div className="flex items-center gap-6 text-sm">
          {/* 目的地和日期 */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{countryName}</span>
            {startDate && endDate && (
              <span className="text-slate-500">
                {startDate} - {endDate} ({days}天)
              </span>
            )}
          </div>
          
          {/* 分隔线 */}
          <div className="h-4 w-px bg-slate-300" />
          
          {/* 节奏 */}
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-slate-600">{pace.emoji} {pace.label}</span>
          </div>
          
          {/* 预算 */}
          {budget && budget > 0 && (
            <>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-600">{formatCurrency(budget, currency)}</span>
              </div>
            </>
          )}
          
          {/* 旅行者数量 */}
          {trip.pacingConfig?.travelers && trip.pacingConfig.travelers.length > 0 && (
            <>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Footprints className="w-4 h-4 text-blue-500" />
                <span className="text-slate-600">{trip.pacingConfig.travelers.length}人</span>
              </div>
            </>
          )}
        </div>
        
        {/* 右侧：调整按钮 */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onOpenSettings}
          className="text-slate-600 hover:text-slate-800"
        >
          <Settings2 className="w-4 h-4 mr-1.5" />
          调整约束
        </Button>
      </div>
    </div>
  );
}

// Pipeline 状态指示器组件
function PipelineStatusIndicator({ status }: { status: PipelineStatus }) {
  const totalStages = status.stages.length;
  const completedStages = status.stages.filter(s => s.status === 'completed').length;
  const riskStages = status.stages.filter(s => s.status === 'risk').length;
  const inProgressStages = status.stages.filter(s => s.status === 'in-progress').length;

  const progressPercentage = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

  const progressColorClass = riskStages > 0
    ? getPipelineProgressColor('risk')
    : inProgressStages > 0
      ? getPipelineProgressColor('in-progress')
      : getPipelineProgressColor('completed');
  
  return (
    <div className="flex items-center gap-3 text-xs">
      {/* 进度摘要（不展示当前阶段名称，避免与顶栏功能入口重复） */}
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all', progressColorClass)}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-muted-foreground min-w-[3rem] tabular-nums">
          {completedStages}/{totalStages}
        </span>
      </div>

      {/* 风险提示 */}
      {riskStages > 0 && (
        <div className={cn('flex items-center gap-1', getPipelineStatusClasses('risk'))}>
          <span>⚠️</span>
          <span>{riskStages} 个风险项</span>
        </div>
      )}
    </div>
  );
}

// Pipeline 阶段卡片组件
function PipelineStageCard({
  stage,
  onAction,
}: {
  stage: PipelineStage;
  onAction?: (stage: PipelineStage) => void;
}) {
  const stageStatus = stage.status as PipelineStageStatus;
  const StatusIcon = getPipelineStatusIcon(stageStatus);
  const statusClasses = getPipelineStatusClasses(stageStatus);
  const actionable = Boolean(onAction);
  
  // 对于 in-progress 状态，添加动画
  const iconClasses = cn(
    'w-5 h-5',
    statusClasses.split(' ').find(cls => cls.startsWith('text-')) || 'text-muted-foreground',
    stageStatus === 'in-progress' && 'animate-spin'
  );

  return (
    <div
      role={actionable ? 'button' : undefined}
      tabIndex={actionable ? 0 : undefined}
      onClick={actionable ? () => onAction?.(stage) : undefined}
      onKeyDown={
        actionable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAction?.(stage);
              }
            }
          : undefined
      }
      className={cn(
        'flex items-start gap-4 p-4 border rounded-lg transition-colors',
        actionable && 'cursor-pointer hover:bg-muted/40 hover:border-muted-foreground/20',
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        <StatusIcon className={iconClasses} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-sm">{stage.name}</h4>
          <Badge 
            variant="outline" 
            className={cn('border', statusClasses)}
          >
            {getPipelineStatusLabel(stageStatus)}
          </Badge>
        </div>
        {stage.summary && (
          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">
            {stage.summary}
          </p>
        )}
        {stage.completedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            完成时间: {new Date(stage.completedAt).toLocaleString('zh-CN')}
          </p>
        )}
      </div>
    </div>
  );
}

// 导出包裹了 Provider 的页面组件
export default function PlanStudioPage() {
  return (
    <PlanStudioProvider>
      <PlanStudioPageContent />
    </PlanStudioProvider>
  );
}