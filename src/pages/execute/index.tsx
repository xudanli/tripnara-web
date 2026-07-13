import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { executionApi } from '@/api/execution';
import { placesApi } from '@/api/places';
import type { TripDetail, TripState, ScheduleResponse } from '@/types/trip';
import type { Reminder, FallbackPlan } from '@/api/execution';
import {
  mapNeptuneChangeToFallbackPlan,
  resolveExecutionNeptunePlan,
} from '@/lib/execution-neptune-map';
import type { PlaceEvidenceResponse } from '@/api/places';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { LogoLoading } from '@/components/common/LogoLoading';
import {
  Clock,
  AlertCircle,
  SkipForward,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Bell,
  CalendarDays,
  Headphones,
  Pencil,
} from 'lucide-react';
import { EmptyExecuteIllustration } from '@/components/illustrations';
import { format, isValid } from 'date-fns';
import { formatScheduleTime } from '@/lib/itinerary-item-card-format';
import { toast } from 'sonner';
import { handleWriteChainBlockedError, notifyDirectWriteBlocked } from '@/lib/write-chain-blocked-ui.util';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import SpotlightTour from '@/components/onboarding/SpotlightTour';
import type { TourStep } from '@/components/onboarding/SpotlightTour';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import { cn } from '@/lib/utils';
import { FallbackSolutionPreviewDialog } from '@/components/execute/FallbackSolutionPreviewDialog';
import { ReorderScheduleDialog } from '@/components/execute/ReorderScheduleDialog';
import { ExecuteLiveDashboard, type ExecuteQuickActionItem, ExecuteMemberStatusSheet, ExecuteTeamChatSheet } from '@/components/execute/live';
import {
  formatExecuteStatusSubline,
  formatExecuteTripTitle,
} from '@/components/execute/live/ExecuteLiveHeader';
import { buildExecuteMapData } from '@/components/execute/live/execute-live-data.util';
import { EditTripDialog } from '@/components/trips/EditTripDialog';
import { ShareTripDialog } from '@/components/trips/ShareTripDialog';
import { CollaboratorsDialog } from '@/components/trips/CollaboratorsDialog';
import { RealtimeStatusBanner, FieldReportForm } from '@/components/optimization';
import { useRealtimeState, useSubmitFieldReport, usePredictedState } from '@/hooks/useOptimizationV2';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import ReadinessDrawer from '@/components/readiness/ReadinessDrawer';
import ReadinessSummaryCard from '@/components/readiness/ReadinessSummaryCard';
import { InTripAnchorBar, InTripTodayPanel, InTripEnvironmentAlertsPanel, InTripEnvironmentEventSheet, InTripCausalInsightCard, InTripMoneyDashboardPanel, InTripMoneyRecordDialog, InTripMoneyRebalancePanel, InTripMoodCheckDialog, InTripPulseInterventionsPanel, InTripTeamThermometerPanel, InTripSplitPanel, InTripSplitSessionSheet, InTripExperiencePulsePanel, InTripExperiencePulseDialog, InTripExperienceWeightPanel, InTripPostTripSummaryPanel, InTripPendingInbox, IN_TRIP_PENDING_ICONS, InTripTodayReadinessSheet } from '@/components/in-trip';
import { ExecutionAdvisorySheet } from '@/components/execution-advisory';
import {
  InTripRecoveryLoopBanner,
  InTripRecoveryLoopSheet,
} from '@/components/trip-loop';
import { isTripLoopInTripEnabled } from '@/lib/trip-loop-feature';
import type { MoneyRecordMember } from '@/components/in-trip';
import { StructuredNegotiationPanel } from '@/components/domain-influence';
import { getInTripModuleVisibility } from '@/lib/in-trip-page-config';
import { resolveInTripExecutionBadge } from '@/lib/in-trip-execution-status';
import { isTripInTravelPhase, sumPendingCards } from '@/lib/in-trip-execution';
import { getTripReadinessPhaseFromTrip } from '@/lib/trip-readiness-phase.util';
import { useInTripToday } from '@/hooks/useInTripToday';
import { useInTripTodayReadinessDetail } from '@/hooks/useInTripTodayReadiness';
import { useTripExecutionAdvisory } from '@/hooks/useTripExecutionAdvisory';
import {
  isExecutionRecommendationExpiredError,
  tripConstraintSolverApi,
  TripConstraintSolverApiError,
} from '@/api/trip-constraint-solver';
import { useInTripHandoff } from '@/hooks/useInTripHandoff';
import { useInTripEnvironmentEvents } from '@/hooks/useInTripEnvironmentEvents';
import { useInTripMoneyDashboard } from '@/hooks/useInTripMoneyDashboard';
import { useInTripMoneyRebalance } from '@/hooks/useInTripMoneyRebalance';
import { useInTripPulseThermometer, useInTripPulseInterventions, useInTripPulseMyState } from '@/hooks/useInTripPulse';
import { useInTripSplitSessions, useInTripSplitSession } from '@/hooks/useInTripSplit';
import {
  useInTripExperiencePending,
  useInTripExperienceWeights,
  useInTripPostTripSummary,
} from '@/hooks/useInTripExperience';
import { useAuth } from '@/hooks/useAuth';
import { tripBudgetApi } from '@/api/trip-budget';
import { buildExecuteTodayStatusSnapshot, resolveExecuteTodayLocationLabel } from '@/lib/execute-today-status.util';
import {
  buildExecuteMemberStatusItems,
  buildExecuteResourceItems,
  buildExecuteTransportSnapshot,
} from '@/lib/execute-status-sidebar.util';
import {
  resolveExecuteTimelineRail,
  resolveWindWarningLabel,
} from '@/lib/execute-center.util';
import { buildExecuteCenterDetailModel } from '@/lib/execute-center-detail.util';
import {
  buildGoogleMapsDirectionsUrl,
  resolveNextStopCoordinates,
} from '@/lib/execute-navigation.util';
import { useWeather } from '@/hooks/useWeather';
import { useExecutionTep } from '@/hooks/useExecutionTep';
import { useExecutionOverview } from '@/hooks/useExecutionOverview';
import { useExecutionSlip } from '@/hooks/useExecutionSlip';
import { useConstraintsSummary } from '@/hooks/useConstraintsSummary';
import { ExecutionTepHubSheet, type ExecutionTepHubTab } from '@/components/execute/tep';
import {
  DepartureSlipDialog,
  ExecutionOverviewPanel,
  ExecutionScheduleDecisionSheet,
} from '@/components/execute/p3';
import { hasExecutionTepContent, resolveQueueItemIdForDecisionProblem, shouldShowExecutionTepHub } from '@/lib/mobile-execution.util';
import { shouldShowSelfDriveExecutability } from '@/lib/trip-executability.util';

import { resolveExecuteGuidePhone } from '@/lib/execute-decision-sidebar.util';

const EXECUTE_CONFIG = {
  POLLING_INTERVAL: {
    VISIBLE: 30000,    // 页面可见时：30秒
    HIDDEN: 60000,     // 页面隐藏时：60秒
  },
  REMINDER_ADVANCE_HOURS: 24,
  BUFFER_MINUTES: 15,
  WEATHER_REFRESH_INTERVAL: 5 * 60 * 1000, // 5分钟
} as const;

function formatDisplayDate(value: string, pattern: string): string {
  const d = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  return isValid(d) ? format(d, pattern) : value;
}

function formatDisplayDateTime(value: string, pattern: string): string {
  const d = new Date(value);
  return isValid(d) ? format(d, pattern) : value;
}

export default function ExecutePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tripId = searchParams.get('tripId');
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [tripState, setTripState] = useState<TripState | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRepairSheet, setShowRepairSheet] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  
  // 对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collaboratorsDialogOpen, setCollaboratorsDialogOpen] = useState(false);
  const [fieldReportDialogOpen, setFieldReportDialogOpen] = useState(false);
  
  // 执行阶段相关状态
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  // 位置相关状态
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // ⚠️ 新增：关键证据状态
  const [placeEvidence, setPlaceEvidence] = useState<PlaceEvidenceResponse | null>(null);
  const [placeEvidenceEmpty, setPlaceEvidenceEmpty] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  
  // ⚠️ 新增：修复方案状态
  const [fallbackPlan, setFallbackPlan] = useState<FallbackPlan | null>(null);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const [previewSolutionId, setPreviewSolutionId] = useState<string | null>(null);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const { state: onboardingState, completeTour, completeStep } = useOnboarding();
  const [showExecuteTour, setShowExecuteTour] = useState(false);
  const [realtimeCollapsibleOpen, setRealtimeCollapsibleOpen] = useState(false);
  const [lowPriorityRemindersOpen, setLowPriorityRemindersOpen] = useState(false);
  const [readinessDrawerOpen, setReadinessDrawerOpen] = useState(false);
  const [selectedEnvEventId, setSelectedEnvEventId] = useState<string | null>(null);
  const [envEventSheetOpen, setEnvEventSheetOpen] = useState(false);
  const [moneyRecordOpen, setMoneyRecordOpen] = useState(false);
  const [moneyMembers, setMoneyMembers] = useState<MoneyRecordMember[]>([]);
  const [rebalanceExpanded, setRebalanceExpanded] = useState(false);
  const [moodCheckOpen, setMoodCheckOpen] = useState(false);
  const [selectedSplitSessionId, setSelectedSplitSessionId] = useState<string | null>(null);
  const [splitSheetOpen, setSplitSheetOpen] = useState(false);
  const [interventionsExpanded, setInterventionsExpanded] = useState(false);
  const [experienceExpanded, setExperienceExpanded] = useState(false);
  const [experiencePulseOpen, setExperiencePulseOpen] = useState(false);
  const [selectedExperienceTrigger, setSelectedExperienceTrigger] = useState<
    ExperiencePulseTrigger | null
  >(null);
  const [weightsExpanded, setWeightsExpanded] = useState(false);
  const [negotiationSheetOpen, setNegotiationSheetOpen] = useState(false);
  const [teamChatSheetOpen, setTeamChatSheetOpen] = useState(false);
  const [memberStatusSheetOpen, setMemberStatusSheetOpen] = useState(false);
  const [highlightMemberUserId, setHighlightMemberUserId] = useState<string | null>(null);
  const [secondaryModulesOpen, setSecondaryModulesOpen] = useState(false);
  const [todayReadinessSheetOpen, setTodayReadinessSheetOpen] = useState(false);
  const [executionAdvisorySheetOpen, setExecutionAdvisorySheetOpen] = useState(false);
  const [inTripRecoverySheetOpen, setInTripRecoverySheetOpen] = useState(false);
  const [executionTepHubOpen, setExecutionTepHubOpen] = useState(false);
  const [executionTepHubTab, setExecutionTepHubTab] = useState<ExecutionTepHubTab>('alerts');
  const [executionTepHighlightId, setExecutionTepHighlightId] = useState<string | null>(null);
  const [departureSlipOpen, setDepartureSlipOpen] = useState(false);

  const { user } = useAuth();

  const isTripCompleted = trip?.status === 'COMPLETED';

  const { data: realtimeState, refetch: refetchRealtime, isFetching: realtimeFetching } = useRealtimeState(tripId ?? undefined);
  const { data: predictedState } = usePredictedState(tripId ?? undefined, 24);
  const submitFieldReportMutation = useSubmitFieldReport();
  const { width: assistantSidebarWidth, sendAssistantMessage } = useAssistantSidebar();

  const inTravelPhase = isTripInTravelPhase(trip?.status);
  const constraintsSummary = useConstraintsSummary(tripId, trip);
  const tepExecutionEnabled =
    inTravelPhase &&
    shouldShowSelfDriveExecutability(trip?.destination, constraintsSummary.summary);
  const {
    alerts: executionTepAlerts,
    queue: executionTepQueue,
    reload: reloadExecutionTep,
  } = useExecutionTep(tripId, { enabled: tepExecutionEnabled });
  const hasTepExecutionData = hasExecutionTepContent(executionTepAlerts, executionTepQueue);
  const legacyExecutionAdvisoryEnabled = inTravelPhase && !tepExecutionEnabled;
  const suppressLegacyExecutionAlerts = tepExecutionEnabled && hasTepExecutionData;

  const executionOverview = useExecutionOverview(tripId, { enabled: tepExecutionEnabled });
  const executionSlip = useExecutionSlip(tripId, {
    enabled: tepExecutionEnabled,
    tripDayDate: trip?.TripDay?.find((day) => day.id === tripState?.currentDayId)?.date ?? null,
  });

  const openExecutionTepHub = (
    tab: ExecutionTepHubTab = 'alerts',
    decisionProblemId?: string | null,
  ) => {
    const highlightItemId = resolveQueueItemIdForDecisionProblem(
      executionTepQueue,
      decisionProblemId,
    );
    setExecutionTepHubTab(tab);
    setExecutionTepHighlightId(highlightItemId);
    setExecutionTepHubOpen(true);
    void reloadExecutionTep();
  };
  const {
    data: inTripToday,
    loading: inTripTodayLoading,
    error: inTripTodayError,
    disabled: inTripDisabled,
    reload: reloadInTripToday,
  } = useInTripToday(tripId, inTravelPhase);

  const readinessPhase = getTripReadinessPhaseFromTrip(trip);
  const showInTripTodayReadiness = inTravelPhase || readinessPhase === 'in_trip';

  const {
    data: todayReadinessDetail,
    loading: todayReadinessDetailLoading,
    error: todayReadinessDetailError,
    notFound: todayReadinessNotFound,
    reload: reloadTodayReadinessDetail,
  } = useInTripTodayReadinessDetail(tripId, showInTripTodayReadiness && todayReadinessSheetOpen);

  const {
    data: executionAdvisory,
    loading: executionAdvisoryLoading,
    reload: reloadExecutionAdvisory,
    setAdvisory: setExecutionAdvisory,
  } = useTripExecutionAdvisory(tripId, {
    enabled: legacyExecutionAdvisoryEnabled,
    tripState,
    pollIntervalMs: EXECUTE_CONFIG.POLLING_INTERVAL.VISIBLE,
  });
  const {
    snapshot: anchorSnapshot,
    snapshotLoading: anchorLoading,
  } = useInTripHandoff(tripId, { autoVerify: false, autoSnapshot: inTravelPhase });
  const {
    events: environmentEvents,
    loading: environmentEventsLoading,
    error: environmentEventsError,
    reload: reloadEnvironmentEvents,
  } = useInTripEnvironmentEvents(tripId, inTravelPhase);
  const {
    data: moneyDashboard,
    loading: moneyDashboardLoading,
    error: moneyDashboardError,
    disabled: moneyDisabled,
    reload: reloadMoneyDashboard,
  } = useInTripMoneyDashboard(tripId, inTravelPhase);
  const {
    suggestions: rebalanceSuggestions,
    loading: rebalanceLoading,
    error: rebalanceError,
    respondingId: rebalanceRespondingId,
    reload: reloadRebalance,
    respond: respondRebalance,
  } = useInTripMoneyRebalance(tripId, inTravelPhase);
  const {
    data: teamThermometer,
    loading: thermometerLoading,
    reload: reloadThermometer,
  } = useInTripPulseThermometer(tripId, inTravelPhase);
  const {
    state: myPulseState,
    reload: reloadMyState,
  } = useInTripPulseMyState(tripId, inTravelPhase);
  const {
    interventions: pulseInterventions,
    loading: interventionsLoading,
    error: interventionsError,
    ackingId: interventionAckingId,
    reload: reloadInterventions,
    ack: ackIntervention,
  } = useInTripPulseInterventions(tripId, inTravelPhase);
  const {
    sessions: splitSessions,
    activeSession: activeSplitSession,
    proposedSessions: proposedSplitSessions,
    loading: splitLoading,
    proposing: splitProposing,
    executingId: splitExecutingId,
    reload: reloadSplitSessions,
    propose: proposeSplit,
    execute: executeSplit,
  } = useInTripSplitSessions(tripId, inTravelPhase);
  const { detail: activeSplitSessionDetail } = useInTripSplitSession(
    tripId,
    activeSplitSession?.id ?? null,
  );
  const {
    triggers: experienceTriggers,
    loading: experiencePendingLoading,
    error: experiencePendingError,
    disabled: experienceDisabled,
    reload: reloadExperiencePending,
    submit: submitExperiencePulse,
  } = useInTripExperiencePending(tripId, inTravelPhase);
  const {
    data: experienceWeights,
    loading: experienceWeightsLoading,
    error: experienceWeightsError,
    unreadCount: experienceWeightsUnread,
    markingRead: experienceWeightsMarkingRead,
    reload: reloadExperienceWeights,
    markRead: markExperienceWeightsRead,
  } = useInTripExperienceWeights(tripId, inTravelPhase);
  const {
    data: postTripSummary,
    loading: postTripSummaryLoading,
    error: postTripSummaryError,
  } = useInTripPostTripSummary(tripId, isTripCompleted);

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    moneyMembers.forEach((m) => {
      map[m.userId] = m.displayName;
    });
    return map;
  }, [moneyMembers]);

  const moduleVisibility = useMemo(() => getInTripModuleVisibility(trip), [trip]);

  const pendingTotal = useMemo(() => {
    if (!inTripToday?.pendingCards) return 0;
    return sumPendingCards(inTripToday.pendingCards);
  }, [inTripToday?.pendingCards]);

  const executionBadge = useMemo(
    () =>
      resolveInTripExecutionBadge(tripState, {
        vulnerabilitySeverity: inTripToday?.vulnerability?.severity,
        pendingTotal,
      }),
    [tripState, inTripToday?.vulnerability?.severity, pendingTotal],
  );

  const handleAskAi = () => {
    const dayHint = inTripToday ? `第 ${inTripToday.dayNumber} 天` : '今天';
    const destination = trip?.destination || '当前行程';
    sendAssistantMessage(
      `我正在行中执行「${destination}」${dayHint}，请根据当前行程和下一步安排给我建议。`,
    );
  };

  const openEnvironmentEvent = (eventId: string) => {
    if (isTripLoopInTripEnabled() && inTravelPhase) {
      setSelectedEnvEventId(eventId);
      setInTripRecoverySheetOpen(true);
      return;
    }
    setSelectedEnvEventId(eventId);
    setEnvEventSheetOpen(true);
  };

  const handleEnvironmentResolved = () => {
    reloadEnvironmentEvents();
    void reloadInTripToday();
    setCausalInsightRefreshKey((k) => k + 1);
  };

  const handleMoneyRecorded = () => {
    void reloadMoneyDashboard();
    void reloadInTripToday();
    if (rebalanceExpanded) void reloadRebalance();
    else setRebalanceExpanded(true);
  };

  const openMoneyRecord = () => setMoneyRecordOpen(true);

  const handlePulseUpdated = () => {
    void reloadInTripToday();
    void reloadThermometer();
    void reloadMyState();
    void reloadInterventions();
  };

  const handleExperienceUpdated = () => {
    void reloadInTripToday();
    void reloadExperiencePending();
    void reloadExperienceWeights();
  };

  const openExperiencePulse = (trigger: ExperiencePulseTrigger) => {
    setSelectedExperienceTrigger(trigger);
    setExperiencePulseOpen(true);
  };

  const openFirstExperiencePulse = () => {
    setExperienceExpanded(true);
    const first = [...experienceTriggers].sort((a, b) => a.priority - b.priority)[0];
    if (first) openExperiencePulse(first);
  };

  const openSplitSession = (sessionId: string) => {
    setSelectedSplitSessionId(sessionId);
    setSplitSheetOpen(true);
  };

  const handleSplitExecute = async (sessionId: string) => {
    try {
      await executeSplit(sessionId);
      toast.success('分组探索已开始');
      openSplitSession(sessionId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '启动失败');
    }
  };

  const applyNeptuneUiOutput = (uiOutput?: {
    fallbackPlan?: FallbackPlan;
    changeResult?: import('@/api/execution').ChangeResult;
  }) => {
    const plan = resolveExecutionNeptunePlan(uiOutput);
    if (plan) setFallbackPlan(plan);
    return plan;
  };

  const applyUpdatedScheduleFromChange = (
    updatedSchedule?: {
      date: string;
      schedule: { items: Array<{
        placeId: number | string;
        placeName: string;
        startTime: string;
        endTime: string;
      }> };
    },
  ) => {
    if (!updatedSchedule) return;
    setTodaySchedule({
      date: updatedSchedule.date,
      schedule: {
        items: updatedSchedule.schedule.items.map((item) => ({
          placeId: Number(item.placeId),
          placeName: item.placeName,
          startTime: item.startTime,
          endTime: item.endTime,
          type: 'ACTIVITY' as const,
        })),
      },
      persisted: false,
    });
  };

  useEffect(() => {
    if ((moneyDashboard?.pendingRebalanceCount ?? 0) > 0) {
      setRebalanceExpanded(true);
    }
  }, [moneyDashboard?.pendingRebalanceCount]);

  useEffect(() => {
    if ((inTripToday?.pendingCards.interventions ?? 0) > 0) {
      setInterventionsExpanded(true);
    }
  }, [inTripToday?.pendingCards.interventions]);

  useEffect(() => {
    if ((inTripToday?.pendingCards.experiencePulses ?? 0) > 0) {
      setExperienceExpanded(true);
    }
  }, [inTripToday?.pendingCards.experiencePulses]);

  useEffect(() => {
    if (experienceWeightsUnread > 0) {
      setWeightsExpanded(true);
    }
  }, [experienceWeightsUnread]);

  useEffect(() => {
    if (pendingTotal > 0) {
      setSecondaryModulesOpen(true);
    }
  }, [pendingTotal]);

  useEffect(() => {
    if (!tripId || !inTravelPhase) {
      setMoneyMembers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await tripBudgetApi.getProfile(tripId);
        const walletMembers = profile.wallet?.members ?? [];
        if (walletMembers.length > 0) {
          if (!cancelled) {
            setMoneyMembers(
              walletMembers.map((m) => ({
                userId: m.userId,
                displayName: m.displayName || m.userId,
              })),
            );
          }
          return;
        }
        const collaborators = await tripsApi.getCollaborators(tripId);
        if (!cancelled) {
          setMoneyMembers(
            collaborators.map((c) => ({
              userId: c.userId,
              displayName: c.displayName || c.email || c.userId,
            })),
          );
        }
      } catch {
        if (!cancelled && user?.id) {
          setMoneyMembers([{ userId: user.id, displayName: user.displayName || '我' }]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId, inTravelPhase, user?.id, user?.displayName]);

  // ⚠️ 重要：所有 useMemo 必须在任何条件返回之前调用
  // 获取天气位置：优先使用用户当前位置，其次使用行程项坐标，最后使用目的地国家默认坐标
  const weatherLocation = useMemo(() => {
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

    // 1. 优先使用用户当前位置（GPS）
    if (userLocation) {
      return { location: userLocation, name: '当前位置' };
    }

    // 2. 如果没有 trip 数据，返回 null
    if (!trip) {
      return null;
    }

    // 3. 使用目的地平均位置（计算所有行程项的平均坐标）
    if (trip.TripDay) {
      const places: Array<{ lat: number; lng: number }> = [];
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
      if (places.length > 0) {
        const avgLat = places.reduce((sum, p) => sum + p.lat, 0) / places.length;
        const avgLng = places.reduce((sum, p) => sum + p.lng, 0) / places.length;
        return { 
          location: { lat: avgLat, lng: avgLng }, 
          name: trip.destination || '目的地' 
        };
      }
    }

    // 4. 如果没有行程项坐标，使用目的地国家的默认坐标
    if (trip.destination) {
      const code = trip.destination.split(',')[0]?.trim().toUpperCase();
      if (code && COORDS[code]) {
        return { location: { lat: COORDS[code].lat, lng: COORDS[code].lng }, name: COORDS[code].name };
      }
    }

    return null;
  }, [userLocation, trip]);

  // 判断是否是冰岛（用于显示详细风速信息）
  const isIceland = useMemo(() => {
    if (!trip?.destination) return false;
    const countryCode = trip.destination.split(',')[0]?.trim().toUpperCase();
    return countryCode === 'IS';
  }, [trip?.destination]);

  const weatherQueryParams = useMemo(
    () =>
      weatherLocation
        ? {
            lat: weatherLocation.location.lat,
            lng: weatherLocation.location.lng,
            includeWindDetails: isIceland,
          }
        : null,
    [weatherLocation, isIceland],
  );
  const { data: currentWeather } = useWeather(weatherQueryParams, {
    refreshInterval: EXECUTE_CONFIG.WEATHER_REFRESH_INTERVAL,
    enabled: inTravelPhase && weatherQueryParams != null,
  });

  const todayStatus = useMemo(
    () =>
      buildExecuteTodayStatusSnapshot({
        destination: trip?.destination,
        locationLabel: resolveExecuteTodayLocationLabel(trip, tripState?.nextStop),
        weather: currentWeather,
        inTripWeatherSummary: inTripToday?.weather.summary,
        inTripTemp: inTripToday?.weather.tempMax ?? inTripToday?.weather.tempMin,
        executionAdvisory: suppressLegacyExecutionAlerts ? null : executionAdvisory,
        environmentEvents,
      }),
    [
      trip,
      tripState?.nextStop,
      currentWeather,
      inTripToday?.weather.summary,
      inTripToday?.weather.tempMax,
      inTripToday?.weather.tempMin,
      executionAdvisory,
      environmentEvents,
      suppressLegacyExecutionAlerts,
    ],
  );

  const itemIdMap = useMemo(() => {
    const map = new Map<number, string>();
    if (!trip?.TripDay || !tripState?.currentDayId) {
      return map;
    }
    const currentDay = trip.TripDay.find(day => day.id === tripState.currentDayId);
    if (currentDay?.ItineraryItem) {
      currentDay.ItineraryItem.forEach(item => {
        if (item.placeId) {
          map.set(item.placeId, item.id);
        }
      });
    }
    return map;
  }, [trip, tripState?.currentDayId]);

  const executeQuickActions = useMemo<ExecuteQuickActionItem[]>(
    () => {
      if (!tripId) return [];
      const guidePhone = resolveExecuteGuidePhone(trip);
      const actions: ExecuteQuickActionItem[] = [];

      if (tepExecutionEnabled) {
        actions.push({
          id: 'log-event',
          label: '我晚了',
          icon: Clock,
          onClick: () => setDepartureSlipOpen(true),
        });
        actions.push({
          id: 'adjust-itinerary',
          label: '待调整项',
          icon: CalendarDays,
          onClick: () => openExecutionTepHub('queue'),
        });
      } else {
        actions.push({
          id: 'adjust',
          label: '调整行程',
          icon: CalendarDays,
          onClick: () => navigate(`/dashboard/plan-studio?tripId=${tripId}&tab=schedule`),
        });
      }

      if (guidePhone) {
        actions.push({
          id: 'guide',
          label: '联系导游',
          icon: Headphones,
          onClick: () => window.open(`tel:${guidePhone.replace(/\s/g, '')}`),
        });
      }
      actions.push(
        {
          id: 'notify',
          label: '发送通知',
          icon: Bell,
          onClick: () => setShowRepairSheet(true),
        },
      );
      if (!tepExecutionEnabled) {
        actions.push({
          id: 'record',
          label: '记录事件',
          icon: Pencil,
          onClick: () => {
            const envEvent = environmentEvents[0];
            if (envEvent) {
              openEnvironmentEvent(envEvent.id);
              return;
            }
            setMoneyRecordOpen(true);
          },
        });
      }
      return actions;
    },
    [tripId, trip, navigate, environmentEvents, tepExecutionEnabled, openExecutionTepHub],
  );

  useEffect(() => {
    if (tripId) {
      loadData();
      loadReminders();
      
      // ⚠️ 开发环境：检查后端接口可用性
      if (import.meta.env.DEV) {
        // 延迟检查，避免影响正常加载
        setTimeout(() => {
          fetch('/api/execution/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tripId, action: 'get_status' }),
          })
            .then(res => {
              if (res.status === 404) {
                console.warn('[Execute Page] ⚠️ 后端接口 /api/execution/execute 返回404，可能未实现');
              } else if (!res.ok) {
                console.warn('[Execute Page] ⚠️ 后端接口 /api/execution/execute 返回错误:', res.status);
              }
            })
            .catch(() => {
              console.warn('[Execute Page] ⚠️ 无法连接到后端服务，请确认后端是否运行');
            });
        }, 2000);
      }
      
      // ⚠️ 改进：优化轮询机制 - 根据页面可见性调整轮询频率
      let interval: NodeJS.Timeout | null = null;
      
      const startPolling = () => {
        // 如果页面不可见，使用更长的轮询间隔
        // 如果页面可见，使用正常轮询间隔
        const pollInterval = document.hidden 
          ? EXECUTE_CONFIG.POLLING_INTERVAL.HIDDEN 
          : EXECUTE_CONFIG.POLLING_INTERVAL.VISIBLE;
        
        if (interval) {
          clearInterval(interval);
        }
        
        interval = setInterval(() => {
          if (tripId && !document.hidden) {
            loadTripState();
            loadReminders();
          }
        }, pollInterval);
      };
      
      // 初始启动轮询
      startPolling();
      
      // 监听页面可见性变化
      const handleVisibilityChange = () => {
        if (tripId) {
          if (!document.hidden) {
            // 页面变为可见时，立即更新一次数据
            loadTripState();
            loadReminders();
          }
          // 重新启动轮询（使用新的间隔）
          startPolling();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // 首次进入 Execute，显示引导
      if (!onboardingState.toursCompleted.execute) {
        setTimeout(() => {
          setShowExecuteTour(true);
        }, 1000);
      }
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [tripId, onboardingState.toursCompleted.execute]);

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

  // 获取用户当前位置
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('获取位置失败:', error);
          // 如果获取位置失败，不设置 userLocation，将使用行程位置
        }
      );
    }
  }, []);

  const loadData = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const [tripData, state] = await Promise.all([
        tripsApi.getById(tripId),
        tripsApi.getState(tripId),
      ]);
      setTrip(tripData);
      setTripState(state);
      
      // ⚠️ 调试：记录数据加载情况
      console.log('[Execute Page] 数据加载完成:', {
        tripId,
        hasTrip: !!tripData,
        hasTripState: !!state,
        currentDayId: state.currentDayId,
        currentItemId: state.currentItemId,
        nextStop: state.nextStop,
        tripDaysCount: tripData.TripDay?.length,
        tripDays: tripData.TripDay?.map(d => ({ id: d.id, date: d.date, itemsCount: d.ItineraryItem?.length || 0 })),
      });

      // ⚠️ 改进：加载今天的 Schedule
      // 优先使用 state.currentDayId，如果没有则使用今天的日期
      if (state.currentDayId) {
        // 从 currentDayId 对应的 TripDay 中获取日期
        const currentDay = tripData.TripDay?.find(d => d.id === state.currentDayId);
        const scheduleDate = currentDay?.date || new Date().toISOString().split('T')[0];
        
        console.log('[Execute Page] 加载 Schedule:', {
          currentDayId: state.currentDayId,
          currentDay: currentDay ? { id: currentDay.id, date: currentDay.date } : null,
          scheduleDate,
        });
        
        try {
          const schedule = await tripsApi.getSchedule(tripId, scheduleDate);
          console.log('[Execute Page] Schedule 加载成功:', {
            date: schedule.date,
            itemsCount: schedule.schedule?.items?.length || 0,
            persisted: schedule.persisted,
          });
          setTodaySchedule(schedule);
        } catch (err: any) {
          console.error('[Execute Page] Failed to load today schedule:', {
            error: err,
            currentDayId: state.currentDayId,
            scheduleDate,
            errorMessage: err?.message,
          });
          // Schedule加载失败不影响主流程，只记录错误
          // 但设置 todaySchedule 为 null，避免显示错误数据
          setTodaySchedule(null);
        }
      } else {
        // 如果没有 currentDayId，尝试加载今天的 Schedule
        const today = new Date().toISOString().split('T')[0];
        console.log('[Execute Page] 没有 currentDayId，加载今天的 Schedule:', { today });
        try {
          const schedule = await tripsApi.getSchedule(tripId, today);
          console.log('[Execute Page] Schedule 加载成功:', {
            date: schedule.date,
            itemsCount: schedule.schedule?.items?.length || 0,
            persisted: schedule.persisted,
          });
          setTodaySchedule(schedule);
        } catch (err: any) {
          console.error('[Execute Page] Failed to load today schedule:', {
            error: err,
            today,
            errorMessage: err?.message,
          });
          setTodaySchedule(null);
        }
      }
    } catch (err: any) {
      console.error('[Execute Page] Failed to load data:', err);
      
      // ⚠️ 改进：区分不同类型的错误，提供不同的处理策略
      const status = err?.response?.status;
      const is500 = status === 500;
      const is404 = status === 404;
      const isNetworkError = err?.code === 'ERR_NETWORK' || err?.code === 'ECONNREFUSED';
      
      if (is500) {
        // 500错误：后端服务器错误
        console.error('[Execute Page] ⚠️ 后端服务器错误（500），可能是后端服务异常');
        toast.error('后端服务异常', {
          description: '服务器暂时无法处理请求，请稍后重试或联系技术支持',
          duration: 5000,
        });
      } else if (is404) {
        // 404错误：接口未找到
        console.error('[Execute Page] ⚠️ 接口未找到（404），可能是接口路径错误或未实现');
        toast.error('接口未找到', {
          description: '请确认后端接口是否已实现',
          duration: 5000,
        });
      } else if (isNetworkError) {
        // 网络错误：无法连接到后端
        toast.error('无法连接到后端服务', {
          description: '请检查网络连接或确认后端服务是否运行',
          duration: 5000,
        });
      } else {
        // 其他错误
        const errorMessage = err?.response?.data?.error?.message || err?.message || '加载行程数据失败';
        toast.error(errorMessage, {
          description: '请刷新页面重试，或检查网络连接',
          duration: 5000,
        });
      }
      
      // 设置空状态，避免显示错误数据
      setTrip(null);
      setTripState(null);
      setTodaySchedule(null);
    } finally {
      setLoading(false);
    }
    void loadExecutionState();
  };

  const loadExecutionState = async () => {
    if (!tripId) return;
    try {
      const result = await executionApi.execute({ tripId, action: 'get_status' });
      const pending = result.executionState?.pendingChanges ?? [];
      if (pending.length > 0) {
        const plan = mapNeptuneChangeToFallbackPlan(pending[0]);
        if (plan) setFallbackPlan(plan);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[Execute Page] get_status failed:', err);
      }
    }
  };

  const loadTripState = async () => {
    if (!tripId) return;
    try {
      const state = await tripsApi.getState(tripId);
      setTripState(state);
    } catch (err: any) {
      const status = err?.response?.status;
      const is500 = status === 500;
      
      if (is500) {
        // 500错误：后端服务器错误
        console.error('[Execute Page] ⚠️ 获取行程状态失败（500错误）:', {
          error: err,
          message: err?.message,
          response: err?.response?.data,
        });
      } else {
        console.error('[Execute Page] Failed to load trip state:', err);
      }
      
      // ⚠️ 改进：轮询时失败不显示错误提示，避免打扰用户
      // 只在控制台记录错误
    }
  };

  useEffect(() => {
    const handler = () => {
      if (tripId) void loadData();
    };
    window.addEventListener('plan-studio:schedule-refresh', handler);
    return () => window.removeEventListener('plan-studio:schedule-refresh', handler);
  }, [tripId]);

  const loadReminders = async () => {
    if (!tripId) return;
    try {
      const result = await executionApi.execute({
        tripId,
        action: 'remind',
        remindParams: {
          reminderTypes: ['departure', 'transport', 'weather', 'check_in', 'check_out'],
          advanceHours: EXECUTE_CONFIG.REMINDER_ADVANCE_HOURS,
        },
      });
      setReminders(Array.isArray(result?.uiOutput?.reminders) ? result.uiOutput.reminders : []);
    } catch (err: any) {
      console.error('[Execute Page] Failed to load reminders:', err);
      
      // ⚠️ 改进：区分不同类型的错误
      const status = err?.response?.status;
      const is500 = status === 500;
      const is404 = status === 404;
      
      if (is500) {
        // 500错误：后端服务器错误，静默处理（避免打扰用户）
        if (import.meta.env.DEV) {
          console.warn('[Execute Page] ⚠️ 后端接口 /api/execution/execute 返回500错误（后端服务异常）');
        }
      } else if (is404) {
        // 404错误：接口未实现，静默处理
        if (import.meta.env.DEV) {
          console.warn('[Execute Page] ⚠️ 后端接口 /api/execution/execute 可能未实现（404错误）');
        }
      }
      
      // 提醒加载失败时设置为空数组，不显示错误提示（避免打扰用户）
      setReminders([]);
    }
  };

  const handleAction = async (action: string) => {
    if (!tripId) {
      toast.error('操作失败', {
        description: '缺少行程ID，请刷新页面重试',
        duration: 3000,
      });
      return;
    }
    
    // 检查是否有下一步信息（对于需要nextStop的操作）
    if ((action === 'delay-15m' || action === 'delay-30m' || action === 'skip' || action === 'replace') && !tripState?.nextStop?.itemId) {
      toast.error('操作失败', {
        description: '当前没有可操作的行程项，请等待行程数据加载完成',
        duration: 3000,
      });
      return;
    }
    
    // 防止重复点击
    if (actionLoading) {
      return;
    }
    
    setActionLoading(true);
    
    try {
      if (action === 'delay-15m' || action === 'delay-30m') {
        // 处理延迟变更
        const delayMinutes = action === 'delay-15m' ? 15 : 30;
        const result = await executionApi.execute({
          tripId,
          action: 'handle_change',
          changeParams: {
            changeType: 'schedule_change',
            changeDetails: {
              reason: `用户请求延迟 ${delayMinutes} 分钟`,
              delayMinutes, // ⚠️ 新增：传递延迟分钟数
              itemId: tripState?.nextStop?.itemId,
            },
          },
        });
        applyUpdatedScheduleFromChange(result.uiOutput?.changeResult?.updatedSchedule);
        applyNeptuneUiOutput(result.uiOutput);
        // 重新加载数据
        await loadData();
        await loadReminders();
        setShowRepairSheet(true);
      } else if (action === 'skip') {
        // 处理跳过变更
        const result = await executionApi.execute({
          tripId,
          action: 'handle_change',
          changeParams: {
            changeType: 'activity_cancelled',
            changeDetails: {
              reason: '用户请求跳过当前活动',
              itemId: tripState?.nextStop?.itemId,
            },
          },
        });
        applyUpdatedScheduleFromChange(result.uiOutput?.changeResult?.updatedSchedule);
        applyNeptuneUiOutput(result.uiOutput);
        await loadData();
        await loadReminders();
      } else if (action === 'replace') {
        // 触发修复（Neptune 会提供替换方案）
        const result = await executionApi.execute({
          tripId,
          action: 'fallback',
          fallbackParams: {
            triggerReason: '用户请求替换当前活动',
            itemId: tripState?.nextStop?.itemId,
            originalPlan: tripState,
          },
        });
        applyNeptuneUiOutput(result.uiOutput);
        setShowRepairSheet(true);
      } else if (action === 'reorder') {
        // ⚠️ 新增：重新排序功能
        if (!tripState?.currentDayId) {
          toast.error('无法获取当前日期信息');
          return;
        }
        if (!todaySchedule?.schedule?.items || todaySchedule.schedule.items.length === 0) {
          toast.error('当前没有可排序的行程项');
          return;
        }
        setShowReorderDialog(true);
      } else if (action.startsWith('agent:')) {
        // 调用 Agent API
        console.log('Calling Agent:', action);
      } else {
        console.log('Action:', action);
      }
      
      // 完成 execute 步骤
      completeStep('execute');
    } catch (err: any) {
      console.error('[Execute Page] Failed to handle action:', err);
      
      // ⚠️ 改进：区分不同类型的错误
      const is404 = err?.response?.status === 404 || err?.code === 'ERR_BAD_REQUEST';
      const is500 = err?.response?.status === 500;
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout') || err?.message?.includes('超时');
      const isNetworkError = err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error');
      
      if (isTimeout) {
        // ⚠️ 超时错误：提供明确的提示
        const timeoutSeconds = err?.config?.timeout ? Math.round(err.config.timeout / 1000) : 60;
        toast.error('请求超时', {
          description: `操作已等待 ${timeoutSeconds} 秒仍未完成。后端服务可能响应较慢或未运行，请稍后重试或联系技术支持。`,
          duration: 8000,
        });
        console.warn('[Execute Page] ⚠️ API 请求超时:', {
          action,
          timeout: err?.config?.timeout,
          url: err?.config?.url,
          message: err?.message,
        });
      } else if (is404) {
        if (import.meta.env.DEV) {
          console.warn('[Execute Page] ⚠️ 后端接口 /api/execution/execute 可能未实现（404错误）');
          toast.error('后端接口未实现', {
            description: '请确认后端已实现 /api/execution/execute 接口',
            duration: 5000,
          });
        } else {
          // 生产环境显示用户友好的错误提示
          toast.error('功能暂不可用', {
            description: '请稍后重试或联系技术支持',
            duration: 3000,
          });
        }
      } else if (is500) {
        toast.error('服务器错误', {
          description: '后端服务异常，请稍后重试',
          duration: 5000,
        });
      } else if (isNetworkError) {
        toast.error('网络错误', {
          description: '无法连接到服务器，请检查网络连接',
          duration: 5000,
        });
      } else {
        // 其他错误显示原始错误消息
        const errorMessage = err?.response?.data?.error?.message || err?.message || '操作失败，请重试';
        toast.error('操作失败', {
          description: errorMessage,
          duration: 5000,
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 打开下一步导航（Google Maps）— SSOT: GET /trips/:id/state · nextStop.Place
  const handleOpenNavigation = () => {
    if (!nextStop) {
      toast.error('暂无下一步目的地');
      return;
    }

    const coords = resolveNextStopCoordinates(tripState?.nextStop);
    if (coords) {
      window.open(buildGoogleMapsDirectionsUrl(coords));
      return;
    }

    toast.error('无法获取目的地坐标', {
      description: '请确认 GET /trips/:id/state 返回 nextStop.Place.latitude/longitude',
      duration: 5000,
    });
  };

  // 加载下一步关键证据（T-05）
  const loadPlaceEvidence = async (placeId?: number, date?: string) => {
    const targetPlaceId = placeId ?? tripState?.nextStop?.placeId;
    if (!targetPlaceId) return;

    try {
      setEvidenceLoading(true);
      setPlaceEvidenceEmpty(null);
      const scheduleDate =
        date ??
        trip?.TripDay?.find((d) => d.id === tripState?.currentDayId)?.date ??
        format(new Date(), 'yyyy-MM-dd');
      const evidence = await placesApi.getEvidence(targetPlaceId, {
        date: scheduleDate,
        includeWeather: true,
        includeTraffic: true,
      });
      setPlaceEvidence(evidence);
    } catch (err: unknown) {
      console.error('Failed to load place evidence:', err);
      setPlaceEvidence(null);
      const apiCode = (err as { response?: { data?: { error?: { code?: string } } } })?.response
        ?.data?.error?.code;
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (apiCode === 'NOT_FOUND' || status === 404) {
        setPlaceEvidenceEmpty('暂无该地点的关键证据');
        toast.info('暂无该地点的关键证据', { description: '营业时间、路况等信息尚未收录' });
        return;
      }
      const message = err instanceof Error ? err.message : '加载关键证据失败';
      setPlaceEvidenceEmpty(message);
      toast.error('加载关键证据失败', { description: message });
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleApplyAdvisoryPlan = async (planId: string) => {
    if (!tripId) return;

    const recommendation = executionAdvisory?.recommendations.find((rec) => rec.id === planId);
    if (recommendation?.actionType === 'keep') {
      toast.info('当前方案为保持原计划，无需应用');
      return;
    }

    if (notifyDirectWriteBlocked({ tripId, navigate })) return;

    try {
      const result = await tripConstraintSolverApi.applyExecutionRecommendation(tripId, planId, {
        confirm: true,
        clientTimestamp: new Date().toISOString(),
      });

      setExecutionAdvisory(result.executionAdvisory);

      if (result.updatedSchedule?.date) {
        setTodaySchedule({
          date: result.updatedSchedule.date,
          schedule: {
            items: result.updatedSchedule.schedule.items.map((item) => ({
              placeId: item.placeId,
              placeName: item.placeName,
              startTime: item.startTime,
              endTime: item.endTime,
              type: 'ACTIVITY' as const,
              status: item.status,
            })),
          },
          persisted: true,
        });
      }

      await loadData();
      toast.success('方案已应用，行程已更新');
    } catch (err: unknown) {
      console.error('Failed to apply advisory plan:', err);
      if (handleWriteChainBlockedError(err, { tripId, navigate })) return;

      if (isExecutionRecommendationExpiredError(err)) {
        toast.warning('建议已过期，正在刷新…');
        await reloadExecutionAdvisory();
        return;
      }

      if (err instanceof TripConstraintSolverApiError && err.code === 'RECOMMENDATION_NOT_FOUND') {
        toast.error('方案不存在', { description: '请刷新后重试' });
        await reloadExecutionAdvisory();
        return;
      }

      const message = err instanceof Error ? err.message : '应用失败，请重试';
      toast.error(message);
    }
  };

  useEffect(() => {
    if (!inTravelPhase || !tripState?.nextStop?.placeId) return;
    void loadPlaceEvidence(tripState.nextStop.placeId);
  }, [inTravelPhase, tripState?.nextStop?.placeId, tripState?.currentDayId]);

  // ⚠️ 新增：预览修复方案
  const handlePreviewSolution = (solutionId: string) => {
    setPreviewSolutionId(solutionId);
  };

  // ⚠️ 新增：应用修复方案
  const handleApplySolution = async (solutionId: string) => {
    if (!tripId) return;

    const selectedSolution = fallbackPlan?.solutions.find((s) => s.id === solutionId);
    
    try {
      const isNeptuneAlt =
        solutionId.includes('::alt::') || solutionId.endsWith('::adjusted');

      if (isNeptuneAlt && fallbackPlan?.changeId) {
        const result = await executionApi.execute({
          tripId,
          action: 'handle_change',
          changeParams: {
            changeType: (fallbackPlan.changeType as import('@/api/execution').ChangeType) ?? 'schedule_change',
            changeDetails: {
              reason: `用户确认方案：${selectedSolution?.title ?? solutionId}`,
              itemId: fallbackPlan.originalPlan?.itemId ?? fallbackPlan.changeId,
            },
          },
        });
        applyUpdatedScheduleFromChange(result.uiOutput?.changeResult?.updatedSchedule);
        if (result.uiOutput?.changeResult?.success) {
          await loadData();
          await loadReminders();
          setShowRepairSheet(false);
          setFallbackPlan(null);
          toast.success(result.uiOutput.changeResult.message ?? '变更已应用');
          return;
        }
      }

      if (notifyDirectWriteBlocked({ tripId, navigate })) return;

      const result = await executionApi.applyFallback({
        tripId,
        solutionId,
        confirm: true,
      });
      
      if (result.success) {
        // 更新今日时间线
        setTodaySchedule({
          date: result.updatedSchedule.date,
          schedule: {
            items: result.updatedSchedule.schedule.items.map(item => ({
              placeId: item.placeId,
              placeName: item.placeName,
              startTime: item.startTime,
              endTime: item.endTime,
              type: 'ACTIVITY' as const, // 默认类型
            })),
          },
          persisted: false,
        });
        // 重新加载数据
        await loadData();
        await loadReminders();
        setShowRepairSheet(false);
        setFallbackPlan(null);
        toast.success('修复方案已应用');
      }
    } catch (err: unknown) {
      console.error('Failed to apply solution:', err);
      if (handleWriteChainBlockedError(err, { tripId, navigate })) return;
      const message = err instanceof Error ? err.message : '应用失败，请重试';
      toast.error(message);
    }
  };

  // Execute 页面引导步骤
  const executeTourSteps: TourStep[] = [
    {
      id: 'next-step',
      target: '[data-tour="next-step"]',
      title: 'Next Step',
      description: 'This is your only focus in the field. 这是您在实地执行时的唯一焦点。',
      position: 'bottom',
    },
    {
      id: 'quick-actions',
      target: '[data-tour="quick-actions"]',
      title: 'Quick Actions',
      description: "Reality changes. These actions keep the plan executable. 现实会变化，这些操作让计划保持可执行。",
      position: 'top',
    },
    {
      id: 'repair-sheet',
      target: '[data-tour="repair-sheet"]',
      title: 'Neptune Repair Sheet',
      description: 'Neptune proposes minimal-change repairs you can preview. Neptune 提供可预览的最小改动修复方案。',
      position: 'top',
      action: () => {
        // 模拟触发修复
        setShowRepairSheet(true);
      },
    },
  ];

  if (loading) {
    return <LogoLoading size={48} fullScreen />;
  }

  if (!tripId || !trip) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-4 opacity-50">
                <EmptyExecuteIllustration size={160} />
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-1">请先选择一个正在执行的行程</p>
              <p className="text-xs text-muted-foreground mb-4">选择一个行程进入执行模式</p>
              <Button onClick={() => navigate('/dashboard/trips')}>
                前往行程库
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 从 tripState 获取下一步信息
  const nextStop = tripState?.nextStop;
  const currentDay = trip?.TripDay?.find(d => d.id === tripState?.currentDayId);

  const pendingInboxItems = inTravelPhase && inTripToday
    ? [
        moduleVisibility.environment && inTripToday.pendingCards.environmentAlerts > 0
          ? {
              id: 'environment',
              label: '环境预警',
              count: inTripToday.pendingCards.environmentAlerts,
              icon: IN_TRIP_PENDING_ICONS.environment,
              onClick: () => {
                setSecondaryModulesOpen(true);
                const first = environmentEvents[0];
                if (first) openEnvironmentEvent(first.id);
              },
            }
          : null,
        moduleVisibility.pulse && inTripToday.pendingCards.interventions > 0
          ? {
              id: 'interventions',
              label: '团队干预',
              count: inTripToday.pendingCards.interventions,
              icon: IN_TRIP_PENDING_ICONS.interventions,
              onClick: () => {
                setSecondaryModulesOpen(true);
                setInterventionsExpanded(true);
              },
            }
          : null,
        moduleVisibility.experience && inTripToday.pendingCards.experiencePulses > 0
          ? {
              id: 'experience',
              label: '体验脉冲',
              count: inTripToday.pendingCards.experiencePulses,
              icon: IN_TRIP_PENDING_ICONS.experience,
              onClick: openFirstExperiencePulse,
            }
          : null,
        moduleVisibility.money && inTripToday.pendingCards.rebalanceSuggestions > 0
          ? {
              id: 'rebalance',
              label: '预算再平衡',
              count: inTripToday.pendingCards.rebalanceSuggestions,
              icon: IN_TRIP_PENDING_ICONS.rebalance,
              onClick: () => {
                setSecondaryModulesOpen(true);
                setRebalanceExpanded(true);
              },
            }
          : null,
        moduleVisibility.split && proposedSplitSessions.length > 0
          ? {
              id: 'split',
              label: '分组探索',
              count: proposedSplitSessions.length,
              icon: IN_TRIP_PENDING_ICONS.split,
              onClick: () => {
                setSecondaryModulesOpen(true);
                const first = proposedSplitSessions[0];
                if (first) openSplitSession(first.id);
              },
            }
          : null,
      ].filter((item): item is NonNullable<typeof item> => item != null)
    : [];

  // 辅助函数：格式化地点名称（中英文）
  const formatPlaceName = (placeName: string, place?: { nameCN?: string; nameEN?: string | null }): string => {
    if (place?.nameCN && place?.nameEN) {
      return `${place.nameCN} / ${place.nameEN}`;
    } else if (place?.nameCN) {
      return place.nameCN;
    } else if (place?.nameEN) {
      return place.nameEN;
    }
    return placeName; // 如果没有 Place 对象，使用原始的 placeName
  };

  // 辅助函数：从 trip 数据中查找 Place 对象
  const findPlaceById = (placeId: number): { nameCN?: string; nameEN?: string | null } | undefined => {
    if (!trip?.TripDay) return undefined;
    const allItems = trip.TripDay.flatMap(day => day.ItineraryItem || []);
    const matchingItem = allItems.find(item => item.Place?.id === placeId);
    return matchingItem?.Place || undefined;
  };

  const totalDays = trip.TripDay?.length ?? anchorSnapshot?.metadata.totalDays ?? 1;
  const dayNumber = inTripToday?.dayNumber
    ?? (currentDay && trip.TripDay
      ? trip.TripDay.findIndex((d) => d.id === currentDay.id) + 1
      : 1);

  const { mapPoints, routeCoordinates } = buildExecuteMapData(
    trip,
    tripState,
    todaySchedule,
    userLocation,
  );

  const executionScore = inTripToday?.vulnerability?.stabilityScore != null
    ? Math.round(inTripToday.vulnerability.stabilityScore)
    : tepExecutionEnabled && executionOverview.overview?.executionScore != null
      ? executionOverview.overview.executionScore
      : suppressLegacyExecutionAlerts || tepExecutionEnabled
        ? null
        : executionAdvisory?.verdict.status === 'ON_TRACK'
          ? 84
          : executionAdvisory?.verdict.status === 'AT_RISK'
            ? 72
            : null;

  const urgentReminderCount = reminders.filter(
    (r) => r.priority === 'urgent' || r.priority === 'high',
  ).length;
  const notificationCount =
    pendingTotal +
    urgentReminderCount +
    (fallbackPlan ? 1 : 0) +
    (hasTepExecutionData ? (executionTepQueue?.pendingCount ?? 0) : 0);

  const alertBanner = (() => {
    if (hasTepExecutionData && executionTepAlerts) {
      const banner = executionTepAlerts.banner;
      const primary = executionTepAlerts.primaryRisk;
      const title =
        banner?.title ??
        primary?.userNarrative?.whatHappened ??
        primary?.title ??
        '行中风险提醒';
      const description =
        banner?.detail ??
        primary?.userNarrative?.impactOnTrip ??
        primary?.reason ??
        executionTepAlerts.aiRecommendation?.detail ??
        '请查看待调整项并完成确认。';
      return {
        title,
        description,
        onAction: () => {
          openExecutionTepHub(
            shouldShowExecutionTepHub(executionTepAlerts.requiredAction) ? 'queue' : 'alerts',
            primary?.decisionProblemIds?.[0],
          );
        },
      };
    }

    const windBadge = todayStatus?.weatherRisks?.badges.find((b) => b.label.includes('风'));

    if (windBadge && !suppressLegacyExecutionAlerts && !tepExecutionEnabled) {
      return {
        title: `强风预警 · Day ${dayNumber} 活动需调整`,
        description:
          executionAdvisory?.realtimeRisks.weather
          ?? environmentEvents[0]?.description
          ?? '当前区域存在强风风险，建议查看替代方案并调整今日安排。',
        onAction: () => {
          if (executionAdvisory) {
            setExecutionAdvisorySheetOpen(true);
            void reloadExecutionAdvisory();
            return;
          }
          const envEvent = environmentEvents[0];
          if (envEvent) openEnvironmentEvent(envEvent.id);
        },
      };
    }

    if (
      !suppressLegacyExecutionAlerts &&
      !tepExecutionEnabled &&
      executionAdvisory &&
      ['AT_RISK', 'REPLAN_REQUIRED', 'STOP'].includes(executionAdvisory.verdict.status)
    ) {
      return {
        title: executionAdvisory.verdict.headline,
        description: executionAdvisory.realtimeRisks.weather
          ?? executionAdvisory.deviations[0]?.message
          ?? '建议查看替代方案并调整今日安排。',
        onAction: () => {
          setExecutionAdvisorySheetOpen(true);
          void reloadExecutionAdvisory();
        },
      };
    }
    const envEvent = environmentEvents[0];
    if (envEvent && inTravelPhase && !suppressLegacyExecutionAlerts && !tepExecutionEnabled) {
      return {
        title: '环境预警 · 今日活动可能需要调整',
        description: envEvent.description,
        onAction: () => openEnvironmentEvent(envEvent.id),
      };
    }
    const urgent = reminders.find((r) => r.priority === 'urgent' || r.priority === 'high');
    if (urgent) {
      return {
        title: urgent.title,
        description: urgent.message,
        onAction: () => setShowRepairSheet(true),
      };
    }
    return null;
  })();

  const currentLegEta = nextStop?.estimatedArrivalTime
    ? formatScheduleTime(nextStop.estimatedArrivalTime)
    : nextStop?.startTime
      ? formatScheduleTime(nextStop.startTime)
      : undefined;

  const nextStopPlaceLabel = nextStop
    ? formatPlaceName(nextStop.placeName, nextStop.Place ?? findPlaceById(nextStop.placeId))
    : undefined;

  const nextStopRefCoords = resolveNextStopCoordinates(nextStop);

  const rallyMinutesUntil = (() => {
    const raw = nextStop?.estimatedArrivalTime ?? nextStop?.startTime;
    if (!raw) return undefined;
    return Math.max(0, Math.round((new Date(raw).getTime() - Date.now()) / 60_000));
  })();

  const intercomContextNote = (() => {
    const alertText = `${alertBanner?.title ?? ''} ${alertBanner?.description ?? ''}`;
    if (/风|天气|雪|storm|wind/i.test(alertText)) return '因天气变化，已提前返程';
    const summary = suppressLegacyExecutionAlerts ? undefined : executionAdvisory?.verdict?.headline;
    if (summary && /提前|调整|返程/i.test(summary)) return summary;
    return undefined;
  })();

  const executeSidebarMembers = buildExecuteMemberStatusItems({
    thermometer: teamThermometer,
    fallbackMembers: moneyMembers,
  });

  const executeSidebarTransport = buildExecuteTransportSnapshot({
    trip,
    tripState,
    executionAdvisory: suppressLegacyExecutionAlerts ? null : executionAdvisory,
    nextStopPlaceName: nextStopPlaceLabel,
    arrivalTimeLabel: currentLegEta,
  });

  const executeSidebarResources = buildExecuteResourceItems({
    todaySchedule,
    trip,
    nextStopPlaceId: nextStop?.placeId,
  });

  const windWarningLabel = resolveWindWarningLabel({
    alertTitle: alertBanner?.title,
    todayStatus,
  });
  const vehicleTimeLabel = todayStatus?.currentTime ?? format(new Date(), 'HH:mm');

  const timelineRail = resolveExecuteTimelineRail({
    trip,
    tripState,
    todaySchedule,
    inTripToday: inTripToday ?? undefined,
    arrivalEta: currentLegEta,
    resources: executeSidebarResources,
    transport: executeSidebarTransport,
  });

  const centerDetail = buildExecuteCenterDetailModel({
    trip,
    tripState,
    todaySchedule,
    timelineRail,
    resources: executeSidebarResources,
    activeSplitSession,
    splitSessionDetail: activeSplitSessionDetail,
    memberNameById,
    advisory: suppressLegacyExecutionAlerts ? null : executionAdvisory ?? null,
    windDescription: alertBanner?.description,
    hasWindWarning: Boolean(alertBanner),
    formatPlaceName: (name, placeId) =>
      placeId != null ? formatPlaceName(name, findPlaceById(placeId)) : name,
  });

  const tripTitle = formatExecuteTripTitle({
    name: trip.name,
    destination: trip.destination,
    totalDays,
  });
  const revisionLabel = trip.revisionLabel ?? (trip.revision != null ? `A${trip.revision}` : undefined);
  const statusSubline = formatExecuteStatusSubline({
    tripStatus: trip.status,
    dayNumber,
    currentDate: currentDay?.date,
    fallbackLabel: executionBadge.label,
  });
  const headerCollaborators = moneyMembers.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
  }));

  return (
    <div className="h-full flex flex-col">
      {tripId && tepExecutionEnabled ? (
        <div className="shrink-0 px-2 pt-2 sm:px-3">
          <ExecutionOverviewPanel
            overview={executionOverview.overview}
            loading={executionOverview.loading}
            partial={executionOverview.partial}
            canReportSlip={executionSlip.canReportSlip}
            onStatusRowClick={(rowId) => {
              if (rowId === 'risk') {
                openExecutionTepHub('alerts');
                return;
              }
              if (rowId === 'adjust') {
                openExecutionTepHub('queue');
                return;
              }
              document
                .querySelector('[data-section="execute-itinerary-panel"]')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            onQuickAction={(actionId) => {
              if (actionId === 'adjust-itinerary') {
                openExecutionTepHub('queue');
              }
            }}
            onReportSlip={() => setDepartureSlipOpen(true)}
          />
        </div>
      ) : null}
      <ExecuteLiveDashboard
        tripTitle={tripTitle}
        revisionLabel={revisionLabel}
        statusSubline={statusSubline}
        dayNumber={dayNumber}
        totalDays={totalDays}
        executionScore={executionScore}
        notificationCount={notificationCount}
        collaborators={headerCollaborators}
        weather={currentWeather ?? null}
        windGust={todayStatus?.weatherRisks?.windGust ?? currentWeather?.metadata?.windGust}
        alertBanner={alertBanner}
        currentDate={currentDay?.date}
        statusSidebar={{
          todayStatus,
          members: executeSidebarMembers,
          membersOnlineCount: anchorSnapshot?.team.memberCount ?? executeSidebarMembers.length,
          transport: executeSidebarTransport,
          resources: executeSidebarResources,
          onViewMembersDetail: () => {
            setHighlightMemberUserId(null);
            setMemberStatusSheetOpen(true);
          },
          onMemberClick: (member) => {
            setHighlightMemberUserId(member.userId);
            setMemberStatusSheetOpen(true);
          },
          onViewTransportMap: () => {
            document
              .querySelector('[data-section="execute-route-map"]')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          },
          onManageBookings: () => navigate(`/dashboard/trips/${tripId}?tab=bookings`),
          onGroupIntercom: () => setTeamChatSheetOpen(true),
          onTeamNegotiation: () => setNegotiationSheetOpen(true),
          quickActions: executeQuickActions,
        }}
        mapPoints={mapPoints}
        routeCoordinates={routeCoordinates}
        timelineRail={timelineRail}
        centerDetail={centerDetail}
        onViewAlertDetail={alertBanner?.onAction}
        windWarningLabel={windWarningLabel}
        vehicleTimeLabel={vehicleTimeLabel}
        onNavigate={handleOpenNavigation}
        onNotificationsClick={() => setShowRepairSheet(true)}
        onCollaboratorsClick={() => setCollaboratorsDialogOpen(true)}
        onTripTitleClick={() => navigate(`/dashboard/trips/${tripId}`)}
        decisionSidebar={{
          tripId,
          trip,
          advisory: suppressLegacyExecutionAlerts ? null : executionAdvisory ?? null,
          fallbackPlan,
          loading: legacyExecutionAdvisoryEnabled && executionAdvisoryLoading,
          onOpenDetail: () => {
            if (suppressLegacyExecutionAlerts || tepExecutionEnabled) {
              openExecutionTepHub('queue');
              return;
            }
            setExecutionAdvisorySheetOpen(true);
            void reloadExecutionAdvisory();
          },
          onApplyPlan: (planId) => {
            const fallbackMatch = fallbackPlan?.solutions.find((solution) => solution.id === planId);
            if (fallbackMatch) {
              void handleApplySolution(planId);
              return;
            }
            const advisoryRec = executionAdvisory?.recommendations.find((rec) => rec.id === planId);
            if (advisoryRec) {
              void handleApplyAdvisoryPlan(planId);
              return;
            }
            toast.error('未找到可应用的方案');
          },
          onViewEvidence: () => {
            setExecutionAdvisorySheetOpen(true);
            void reloadExecutionAdvisory();
            void loadPlaceEvidence();
          },
          onSos: () => {
            window.open('tel:112');
          },
        }}
      />

      {/* E. Neptune Repair Sheet（触发后从底部弹出） */}
      <Sheet open={showRepairSheet} onOpenChange={setShowRepairSheet}>
        <SheetContent side="bottom" className="h-[80vh]" data-tour="repair-sheet">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Neptune 修复方案
            </SheetTitle>
            <SheetDescription>
              系统检测到问题，以下是推荐的修复方案
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {/* 原计划 vs 调整方案 */}
            {fallbackPlan?.originalPlan && fallbackPlan?.adjustedPlan && (
              <Card className="border-slate-200">
                <CardContent className="pt-6 space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">原计划：</span>
                    <p className="mt-1">{fallbackPlan.originalPlan.description}</p>
                    {fallbackPlan.originalPlan.scheduledStart && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fallbackPlan.originalPlan.scheduledStart} – {fallbackPlan.originalPlan.scheduledEnd}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">调整后：</span>
                    <p className="mt-1">{fallbackPlan.adjustedPlan.description}</p>
                    {fallbackPlan.adjustedPlan.newStart && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fallbackPlan.adjustedPlan.newStart} – {fallbackPlan.adjustedPlan.newEnd}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 影响评估 */}
            {fallbackPlan?.impactDetail && (
              <Card className="border-border bg-muted/15">
                <CardContent className="pt-6 space-y-2 text-sm">
                  <div className="font-medium text-muted-foreground mb-2">影响评估</div>
                  {fallbackPlan.impactDetail.schedule && (
                    <p><span className="font-medium">行程：</span>{fallbackPlan.impactDetail.schedule}</p>
                  )}
                  {fallbackPlan.impactDetail.budget && (
                    <p><span className="font-medium">预算：</span>{fallbackPlan.impactDetail.budget}</p>
                  )}
                  {fallbackPlan.impactDetail.experience && (
                    <p><span className="font-medium">体验：</span>{fallbackPlan.impactDetail.experience}</p>
                  )}
                  {fallbackPlan.impactDetail.risk && (
                    <p><span className="font-medium">风险：</span>{fallbackPlan.impactDetail.risk}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 问题描述 */}
            {fallbackPlan?.triggerReason && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="font-medium text-yellow-800 mb-2">检测到的问题</div>
                  <div className="text-sm text-yellow-700">
                    {fallbackPlan.triggerReason}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 修复方案列表 */}
            {fallbackPlan?.solutions && fallbackPlan.solutions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {fallbackPlan.solutions.map((solution) => (
                  <Card 
                    key={solution.id}
                    className={cn(
                      'cursor-pointer hover:shadow-md transition-shadow',
                      solution.recommended && 'border-primary'
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{solution.title}</CardTitle>
                        {solution.recommended && (
                          <Badge className="bg-primary">推荐</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        {solution.description}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-medium">到达时间：</span>
                          {solution.impact.arrivalTime}
                        </div>
                        <div>
                          <span className="font-medium">缺失点：</span>
                          {solution.impact.missingPlaces === 0 ? '无' : `${solution.impact.missingPlaces}个`}
                        </div>
                        <div>
                          <span className="font-medium">风险变化：</span>
                          {solution.impact.riskChange === 'low' ? '低' : 
                           solution.impact.riskChange === 'medium' ? '中' : '高'}
                        </div>
                      </div>
                      <Button 
                        variant={solution.recommended ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => handlePreviewSolution(solution.id)}
                      >
                        预览
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>暂无修复方案，请稍后重试或联系技术支持</p>
              </div>
            )}

            {fallbackPlan?.recommendations && fallbackPlan.recommendations.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="font-medium mb-2">Neptune 建议</div>
                  <ul className="text-sm space-y-1.5 text-muted-foreground list-disc pl-4">
                    {fallbackPlan.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Apply 按钮 */}
            {fallbackPlan?.solutions && fallbackPlan.solutions.length > 0 && (
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowRepairSheet(false);
                  setFallbackPlan(null);
                  setSelectedSolutionId(null);
                }}>
                  取消
                </Button>
                {selectedSolutionId ? (
                  <Button onClick={() => handleApplySolution(selectedSolutionId)}>
                    应用变更
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      const recommendedSolution = fallbackPlan.solutions.find(s => s.recommended);
                      const defaultSolution = fallbackPlan.solutions[0];
                      const solutionToApply = recommendedSolution || defaultSolution;
                      if (solutionToApply) {
                        setSelectedSolutionId(solutionToApply.id);
                        handleApplySolution(solutionToApply.id);
                      }
                    }}
                  >
                    应用推荐方案
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 预览修复方案对话框 */}
      <FallbackSolutionPreviewDialog
        solutionId={previewSolutionId}
        open={!!previewSolutionId}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewSolutionId(null);
          }
        }}
        onApply={handleApplySolution}
      />

      {/* 重新排序对话框 */}
      {tripState?.currentDayId && todaySchedule?.schedule?.items && trip && (
        <ReorderScheduleDialog
          tripId={tripId!}
          dayId={tripState.currentDayId}
          items={todaySchedule.schedule.items}
          itemIdMap={itemIdMap}
          open={showReorderDialog}
          onOpenChange={setShowReorderDialog}
          onSuccess={async (result) => {
            // 更新今日时间线
            setTodaySchedule({
              date: result.updatedSchedule.date,
              schedule: {
                items: result.updatedSchedule.schedule.items.map(item => ({
                  placeId: item.placeId,
                  placeName: item.placeName,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  type: 'ACTIVITY' as const,
                })),
              },
              persisted: false,
            });
            // 重新加载数据
            await loadData();
            await loadReminders();
          }}
        />
      )}

      {/* 编辑对话框 */}
      {trip && (
        <EditTripDialog
          trip={trip}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            // 重新加载行程数据
            if (tripId) {
              loadData();
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

      {/* 实地报告对话框 */}
      <Dialog open={fieldReportDialogOpen} onOpenChange={setFieldReportDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>实地报告</DialogTitle>
          </DialogHeader>
          <FieldReportForm
            defaultLocation={userLocation ?? undefined}
            onSubmit={async (req) => {
              await submitFieldReportMutation.mutateAsync(req);
              setFieldReportDialogOpen(false);
              toast.success('感谢您的反馈！');
            }}
            onCancel={() => setFieldReportDialogOpen(false)}
            isSubmitting={submitFieldReportMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <ReadinessDrawer
        open={readinessDrawerOpen}
        onClose={() => setReadinessDrawerOpen(false)}
        tripId={tripId}
        onOpenTasksTab={() => {
          setReadinessDrawerOpen(false);
          if (tripId) {
            navigate(`/dashboard/plan-studio?tripId=${tripId}&tab=tasks`);
          }
        }}
      />

      {tripId && tepExecutionEnabled && (
        <ExecutionTepHubSheet
          tripId={tripId}
          open={executionTepHubOpen}
          onOpenChange={setExecutionTepHubOpen}
          initialTab={executionTepHubTab}
          highlightItemId={executionTepHighlightId}
          enabled={tepExecutionEnabled}
          onOpenScheduleDecision={(problemId) => {
            setExecutionTepHubOpen(false);
            executionSlip.openDecision(problemId);
          }}
        />
      )}

      {tripId && tepExecutionEnabled && (
        <>
          <DepartureSlipDialog
            open={departureSlipOpen}
            onOpenChange={setDepartureSlipOpen}
            submitting={executionSlip.submittingSlip}
            onSubmit={async (input) => {
              await executionSlip.submitDepartureSlip(input);
              setDepartureSlipOpen(false);
            }}
          />
          <ExecutionScheduleDecisionSheet
            open={Boolean(executionSlip.decisionProblemId)}
            onOpenChange={(open) => {
              if (!open) executionSlip.closeDecision();
            }}
            decision={executionSlip.decision}
            loading={executionSlip.decisionLoading}
            applying={executionSlip.applyingDecision}
            onAccept={async (input) => {
              await executionSlip.acceptScheduleDecision(input);
              void executionOverview.reload();
              void reloadExecutionTep();
            }}
          />
        </>
      )}

      {tripId && executionAdvisory && legacyExecutionAdvisoryEnabled && !suppressLegacyExecutionAlerts && (
        <ExecutionAdvisorySheet
          open={executionAdvisorySheetOpen}
          onOpenChange={setExecutionAdvisorySheetOpen}
          tripId={tripId}
          advisory={executionAdvisory}
          onApplyRecommendation={(id) => {
            toast.info(`将应用方案：${id}`);
            setExecutionAdvisorySheetOpen(false);
          }}
          onKeepPlan={() => {
            toast.success('已选择保持原计划');
            setExecutionAdvisorySheetOpen(false);
          }}
        />
      )}

      {tripId && (
        <InTripTodayReadinessSheet
          open={todayReadinessSheetOpen}
          onOpenChange={setTodayReadinessSheetOpen}
          data={todayReadinessDetail}
          loading={todayReadinessDetailLoading}
          error={todayReadinessDetailError}
          notFound={todayReadinessNotFound}
          onOpenFullReadiness={() => {
            setTodayReadinessSheetOpen(false);
            navigate(`/dashboard/readiness?tripId=${tripId}`);
          }}
        />
      )}

      {tripId && (
        <ExecuteMemberStatusSheet
          open={memberStatusSheetOpen}
          onOpenChange={setMemberStatusSheetOpen}
          members={executeSidebarMembers}
          onlineCount={anchorSnapshot?.team.memberCount ?? executeSidebarMembers.length}
          highlightUserId={highlightMemberUserId}
          onOpenTeamChat={() => setTeamChatSheetOpen(true)}
        />
      )}

      {tripId && (
        <ExecuteTeamChatSheet
          tripId={tripId}
          open={teamChatSheetOpen}
          onOpenChange={setTeamChatSheetOpen}
          tripTitle={trip?.name ?? trip?.destination}
          nextStopPlaceName={nextStopPlaceLabel}
          meetingTimeLabel={currentLegEta}
          minutesUntil={rallyMinutesUntil}
          contextNote={intercomContextNote}
          members={moneyMembers}
          memberStatuses={executeSidebarMembers}
          currentUserId={user?.id}
          currentUserName={user?.displayName ?? user?.email ?? '我'}
          onlineCount={anchorSnapshot?.team.memberCount ?? executeSidebarMembers.length}
          refLat={nextStopRefCoords?.lat}
          refLng={nextStopRefCoords?.lng}
        />
      )}

      {tripId && (
        <Sheet open={negotiationSheetOpen} onOpenChange={setNegotiationSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>团队轻量协商</SheetTitle>
              <SheetDescription>
                在行中处理团队摩擦与偏好分歧，无需跳转规划工作台
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <StructuredNegotiationPanel tripId={tripId} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {tripId && (
        <InTripMoneyRecordDialog
          tripId={tripId}
          open={moneyRecordOpen}
          onOpenChange={setMoneyRecordOpen}
          members={moneyMembers}
          currentUserId={user?.id}
          defaultCurrency={moneyDashboard?.currency ?? trip?.budgetConfig?.currency ?? 'CNY'}
          onRecorded={handleMoneyRecorded}
        />
      )}

      {tripId && isTripLoopInTripEnabled() && (
        <InTripRecoveryLoopSheet
          tripId={tripId}
          open={inTripRecoverySheetOpen}
          onOpenChange={(open) => {
            setInTripRecoverySheetOpen(open);
            if (!open) setSelectedEnvEventId(null);
          }}
          environmentEventId={selectedEnvEventId}
          onApplied={() => {
            handleEnvironmentResolved();
            void reloadExecutionAdvisory();
          }}
        />
      )}

      {tripId && (
        <InTripEnvironmentEventSheet
          tripId={tripId}
          eventId={selectedEnvEventId}
          open={envEventSheetOpen}
          onOpenChange={(open) => {
            setEnvEventSheetOpen(open);
            if (!open) setSelectedEnvEventId(null);
          }}
          onResolved={handleEnvironmentResolved}
        />
      )}

      {tripId && (
        <InTripMoodCheckDialog
          tripId={tripId}
          open={moodCheckOpen}
          onOpenChange={setMoodCheckOpen}
          onSubmitted={handlePulseUpdated}
        />
      )}

      {tripId && (
        <InTripExperiencePulseDialog
          tripId={tripId}
          trigger={selectedExperienceTrigger}
          open={experiencePulseOpen}
          onOpenChange={setExperiencePulseOpen}
          onSubmit={async (body) => {
            await submitExperiencePulse(body);
            handleExperienceUpdated();
          }}
        />
      )}

      {tripId && (
        <InTripSplitSessionSheet
          tripId={tripId}
          sessionId={selectedSplitSessionId}
          open={splitSheetOpen}
          onOpenChange={(open) => {
            setSplitSheetOpen(open);
            if (!open) setSelectedSplitSessionId(null);
          }}
          currentUserId={user?.id}
          memberNameById={memberNameById}
          onUpdated={() => {
            void reloadSplitSessions();
            void reloadInTripToday();
          }}
        />
      )}
    </div>
  );
}
