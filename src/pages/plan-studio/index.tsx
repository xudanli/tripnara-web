import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeDecisionCheckerResponse } from '@/types/decision-checker';
import {
  isSplitPlanSnapshotStale,
  resolveWorkbenchSplitPlanContext,
  shouldShowSplitPlanBanner,
} from '@/lib/split-plan-workbench.util';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import IntentTab from './IntentTab';
import PlanGateDrawer from '@/components/plan-studio/PlanGateDrawer';
import BudgetTab from './BudgetTab';
import TasksTab from './TasksTab';
// PersonaModeToggle 已移除 - 三人格现在是系统内部工具，不再允许用户切换视图
// PlanStudioSidebar 已移除 - 策略概览功能已整合到 AI 助手侧边栏
import { Compass } from '@/components/illustrations/SimpleIllustrations';
import { Button, buttonVariants } from '@/components/ui/button';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogStackContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
// Icons are now imported from pipeline-status.ts
import {
  getPipelineStatusIcon,
  getPipelineStatusLabel,
  getPipelineStatusClasses,
  type PipelineStageStatus,
} from '@/lib/pipeline-status';
import { cn } from '@/lib/utils';
import { applySplitPlan } from '@/api/split-plans';
import { tripsApi } from '@/api/trips';
import { LogoLoading } from '@/components/common/LogoLoading';
import type { PipelineStatus, PipelineStage, TripListItem, TripDetail } from '@/types/trip';
import { countriesApi } from '@/api/countries';
import type { Country } from '@/types/country';
import { Settings2 } from 'lucide-react';
import {
  FeasibilityReportSheet,
} from '@/components/feasibility-report';
import { DecisionRecordDrawer } from '@/components/decision-problems';
import { useDecisionProblemsList, useDecisionCenterOverview, useDecisionProblemSpaceContent } from '@/hooks/useDecisionProblemFlow';
import { useDecisionSpaceTier2 } from '@/hooks/useDecisionSpaceTier2';
import { resolvePlanDiffFallbackFromPack } from '@/lib/decision-space-plan-diff-view.util';
import { prefetchDecisionProblemDetail } from '@/hooks/decision-problems-query.util';
import { deferUntilIdle } from '@/lib/idle-defer.util';
import { prefetchPlanProposal } from '@/components/plan-studio/workbench/arrange-itinerary/usePlanProposal';
import {
  readDecisionRecordIdFromSearchParams,
  readDecisionProblemIdFromSearchParams,
} from '@/lib/plan-studio-decision-navigation.util';
import { buildTripTravelStatusPath } from '@/lib/travel-status-navigation.util';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';
import { useTripWishSummary } from '@/hooks/useTripWishes';
import { useAuth } from '@/hooks/useAuth';
import { PlanStudioProvider, usePlanStudio } from '@/contexts/PlanStudioContext';
import { TripTravelContextProvider } from '@/features/trip-context';
import { EditTripDialog } from '@/components/trips/EditTripDialog';
import { ShareTripDialog } from '@/components/trips/ShareTripDialog';
import { CollaboratorsDialog } from '@/components/trips/CollaboratorsDialog';
import { TripGeneratingPlaceholder } from '@/components/trips/TripGeneratingPlaceholder';
import { shouldShowNlItemsGeneratingPlaceholder } from '@/lib/trip-planning-complete';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PlanningBanner } from '@/components/planning/PlanningBanner';
import { hasDecisionCockpitUi } from '@/lib/decision-cockpit';
import {
  shouldHideDecisionCockpitCounterfactuals,
  shouldShowPlanStudioDecisionCockpit,
} from '@/lib/plan-studio-cockpit-visibility';
import { shouldShowPlanStudioRelaxationBar } from '@/lib/plan-studio-relaxation-visibility';
import { resetWorldModelGuardsStore, guardRouteRecalculationOrToast } from '@/lib/world-model-guards';
import { usePlanningTaskStore } from '@/store/planningTaskStore';
import { clearRouteRunConfirmationFromStore } from '@/lib/route-run-confirmation';
import { clearRouteRunNegotiationFromStore } from '@/lib/route-run-negotiation';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import NegotiationDialog from '@/components/agent/NegotiationDialog';
import { StructuredNegotiationDialog } from '@/components/domain-influence/StructuredNegotiationDialog';
import { DecisionSpaceDomainClaimDialog } from '@/components/plan-studio/workbench/DecisionSpaceDomainClaimDialog';
import { SilentVoteCreateDialog } from '@/components/silent-vote/SilentVoteCreateDialog';
import { SilentVoteDialog } from '@/components/silent-vote/SilentVoteDialog';
import {
  decisionProblemNegotiationsApi,
  parseDomainRoundConflictDetails,
} from '@/api/decision-problem-negotiations';
import { DecisionSemanticsApiError } from '@/api/decision-problems';
import { canStartDecisionSpaceCollaboration } from '@/lib/decision-space-collaboration.util';
import { isDecisionProblemNegotiationEligible } from '@/lib/decision-negotiation-eligibility.util';
import type {
  GatewayDecisionPreviewResult,
  GatewayDecisionProblemDetailResult,
} from '@/lib/unified-gateway-response.util';
import {
  buildDecisionSpaceVoteCreateDraft,
  type SilentVoteCreateDraft,
} from '@/lib/decision-space-vote.util';
import type { StartDecisionProblemNegotiationResponse } from '@/types/decision-problem-negotiation';
import type { TripDomain } from '@/types/trip-domain-influence';
import { trackCollabNegotiationStart, trackCollabVoteStart } from '@/utils/collab-center-analytics';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';
import { isSelfDrivePlanningTrip } from '@/lib/trip-self-drive';
import {
  dispatchPlanStudioSelectScheduleDay,
  type PlanStudioScheduleNavigateDetail,
  resolveScheduleDayIndex,
  consumePendingScheduleNavigation,
} from '@/lib/plan-studio-schedule-navigation';
import { resolveTravelItemIdsFromTrip } from '@/lib/feasibility-travel-timing';
import {
  getPlanStudioPipelineStageAction,
} from '@/lib/plan-studio-pipeline-navigation';
import {
  PlanningWorkbenchLayout,
  PlanningWorkbenchHeader,
  PlanningWorkbenchConstraintsPanel,
  PlanningWorkbenchItineraryPanel,
  PlanningWorkbenchDecisionChecker,
  PlanningWorkbenchDecisionSpace,
  PlanningWorkbenchAttractionExplore,
  PlanningWorkbenchArrangeItinerary,
  WorkbenchDecisionQueuePanel,
  ConstraintConsoleDrawer,
  type ConstraintConsoleWorkbenchHandle,
  WorkbenchModeIndicatorBar,
  WorkbenchScheduleSheet,
  ConstraintEditSessionBar,
  WorkbenchConclusionStrip,
  WorkbenchMobileColumnNav,
  useWorkbenchDesktopLayout,
  buildWorkbenchAffectedDayLabel,
  type WorkbenchMobileColumn,
} from '@/components/plan-studio/workbench';
import { useWorkbenchConflictDismiss } from '@/hooks/useWorkbenchConflictDismiss';
import {
  resolvePlanningConflictGateStatus,
  resolveTopPlanningConflictBanner,
} from '@/lib/planning-conflicts.util';
import {
  trackWorkbenchConclusionStripView,
  trackWorkbenchMobileColumnChange,
  trackWorkbenchScheduleImpression,
} from '@/utils/plan-studio-workbench-analytics';
import {
  buildWorkbenchModeBarViewModel,
  clearAttractionExploreSearchParams,
  clearArrangeItinerarySearchParams,
  clearDecisionSpaceSearchParams,
  clearItineraryDiagnosisSearchParams,
  resolveConstraintUiLabel,
  resolveWorkbenchMode,
  type WorkbenchMode,
} from '@/lib/workbench-mode-context.util';
import { resolveConstraintSidebarFocusMode } from '@/lib/constraint-sidebar-focus.util';
import { WorkbenchDecisionFocusProvider } from '@/contexts/WorkbenchDecisionFocusContext';
import { usePlanningWorkbenchSnapshot } from '@/components/plan-studio/workbench/arrange-itinerary/usePlanningWorkbenchSnapshot';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import {
  clearAttractionExploreSuggestSearchParams,
  markAttractionExploreSuggestSeen,
  readTripAttractionExploreSuggest,
  shouldShowAttractionExploreSuggest,
} from '@/lib/attraction-explore-trip.util';
import { isUnifiedDecisionGatewayEnabled, prefetchDecisionRuntimeCapabilities } from '@/lib/decision-gateway.util';
import {
  trackConstraintDrawerClose,
  trackConstraintDrawerOpen,
  trackConstraintDrawerSave,
  trackConstraintDrawerUnsavedPrompt,
  trackPlanGateConstraintMutex,
  trackWorkbenchModeBackClick,
  trackWorkbenchModeEnter,
  trackWorkbenchModeExit,
} from '@/utils/plan-studio-workbench-mode-analytics';
import { ConstraintMutationHost } from '@/components/constraints';
import { useConstraintMutations } from '@/hooks/useConstraintMutations';
import {
  apiConstraintIdToUi,
  readMaxSegmentDistanceKmFromConstraint,
} from '@/lib/trip-constraints.adapter';
import { TRAVEL_GOALS_SECTION_ID } from '@/lib/travel-goals.util';
import { selectionIdToSectionKey } from '@/lib/trip-constraints-contract.util';
import { PlanStudioPlanningHeader } from '@/components/plan-studio/PlanStudioPlanningHeader';
import { SelfDriveExecutabilityPanel } from '@/components/plan-studio/tep';
import { canConfirmTripWithExecutability } from '@/lib/trip-executability.util';
import { PlanningBudgetConstraintsDialog } from '@/components/plan-studio/PlanningBudgetConstraintsDialog';
import { PlanningTimeRangeConstraintsDialog } from '@/components/plan-studio/PlanningTimeRangeConstraintsDialog';
import { PlanningTravelersConstraintsDialog } from '@/components/plan-studio/PlanningTravelersConstraintsDialog';
import { PlanningTransportConstraintsDialog } from '@/components/plan-studio/PlanningTransportConstraintsDialog';
import { useDecisionStripModel } from '@/hooks/useDecisionStripModel';
import { useSolutionMatrixModel } from '@/hooks/useSolutionMatrixModel';
import { useRelaxationSuggestionsModel } from '@/hooks/useRelaxationSuggestionsModel';
import { useRelaxationSuggestionSubmit } from '@/hooks/useRelaxationSuggestionSubmit';
import type { CompareStripSelection } from '@/lib/decision-strip-compare-cta';
import { useDecisionStripPlanningReadiness } from '@/hooks/useDecisionStripPlanningReadiness';
import { usePlanningConflicts } from '@/hooks/usePlanningConflicts';
import { useConstraintsSummary } from '@/hooks/useConstraintsSummary';
import { useTripExecutability } from '@/hooks/useTripExecutability';
import { useWorkbenchFeasibilityScore } from '@/hooks/useWorkbenchFeasibilityScore';
import { useDecisionChecker } from '@/hooks/useDecisionChecker';
import { useCollabPendingCount } from '@/hooks/useCollabPendingCount';
import {
  invalidateWorkbenchAfterConstraintChange,
  useWorkbenchBudgetProfile,
  useWorkbenchCollaborators,
  useWorkbenchScheduleRefresh,
  useWorkbenchTripConstraints,
} from '@/pages/plan-studio/hooks/useWorkbenchData';
import { resolveCollabCenterTab, type CollabCenterTab } from '@/lib/collab-center-tabs';
import { clearCollabDeepLinkKeys, isCollabCenterOpenParam, mergeCollabDeepLink, type CollabDeepLinkPatch } from '@/lib/collab-center-navigation';
import { TeamCollaborationCenterPage } from '@/components/team-collaboration';
import { trackCollabCenterOpen } from '@/utils/collab-center-analytics';
import { buildDecisionCheckerPlanningInterim } from '@/lib/decision-checker-interim.util';
import {
  buildDecisionCheckerPlanningInterimForFocus,
  resolveWorkbenchFocusForScheduleDay,
} from '@/lib/decision-checker-focus.util';
import { countOpenDecisionProblems } from '@/lib/decision-center.util';
import { resolveDecisionProblemTaskBinding, resolveDecisionResolutionCtaPhase } from '@/lib/decision-resolution.util';
import {
  resolveActiveDecisionProblem,
  resolveConflictForDecisionProblem,
  resolveDecisionProblemForConflict,
} from '@/lib/planning-conflicts-decision.util';
import {
  resolvePlanningActionCtaLabel,
  resolvePlanningActionTarget,
} from '@/lib/plan-studio-planning-action.util';
import { resolveDestinationTimezone } from '@/utils/timezone';
import { parseConstraintDeepLink, resolveTravelerCount } from '@/lib/planning-constraints.util';
import { consumeAssistantPendingMessage } from '@/lib/assistant-pending-message';
import {
  PLAN_STUDIO_OPEN_CONSTRAINT_EDITOR,
  type PlanStudioOpenConstraintEditorDetail,
} from '@/lib/plan-studio-constraints-events';
import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import { useDrawerOptional } from '@/components/layout/DashboardLayout';
import type { DecisionStripCtaType } from '@/lib/decision-strip-model';
import type { ConstraintPendingItem, ConstraintPendingKey } from '@/types/planning-constraints';
import { trackDecisionStripEvidenceOpen, trackDecisionStripDeepLink } from '@/utils/plan-studio-decision-strip-analytics';
import { loadCausalRuntimeSession } from '@/lib/causal-runtime-session';

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
  const removedTabs = new Set(['optimize', 'what-if', 'decision-draft', 'bookings', 'workbench', 'feasibility', 'conflicts', 'coverage', 'team']);
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
  const { openAssistant, sendAssistantMessage, expanded: assistantExpanded } = useAssistantSidebar();
  const drawer = useDrawerOptional();
  const planGateUrlHandledRef = useRef(false);
  const constraintViewUrlHandledRef = useRef(false);
  /** 已通过首屏行程校验的 tripId；避免 URL 仅改 view/tab 时再次整页 LogoLoading */
  const tripGateCheckedIdRef = useRef<string | null | undefined>(undefined);
  const assistantUrlHandledRef = useRef(false);
  const resumePlanGateAfterConstraintsRef = useRef(false);
  const { user } = useAuth();
  
  // 意图与约束弹窗
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  const [constraintConsoleOpen, setConstraintConsoleOpen] = useState(false);
  const constraintConsoleOpenRef = useRef(constraintConsoleOpen);
  const [constraintDrawerDirty, setConstraintDrawerDirty] = useState(false);
  const [constraintPendingSaveCount, setConstraintPendingSaveCount] = useState(0);
  const [constraintSessionCommitting, setConstraintSessionCommitting] = useState(false);
  const constraintWorkbenchRef = useRef<ConstraintConsoleWorkbenchHandle | null>(null);
  const [discardConstraintDraftOpen, setDiscardConstraintDraftOpen] = useState(false);
  const [constraintEvalCloseConfirmOpen, setConstraintEvalCloseConfirmOpen] = useState(false);
  const constraintEvalPendingRef = useRef(false);
  const constraintDrawerOpenedAtRef = useRef<number | null>(null);
  const constraintDrawerHadSaveRef = useRef(false);
  const pendingPlanGateOptionsRef = useRef<{ autoGenerate?: boolean } | null>(null);
  const workbenchModeEnteredAtRef = useRef<{
    mode: Exclude<WorkbenchMode, 'browse'>;
    at: number;
  } | null>(null);
  const prevWorkbenchModeRef = useRef<WorkbenchMode>('browse');
  const [selectedConstraintId, setSelectedConstraintId] = useState<string | null>(null);
  const [constraintSidebarForceAttention, setConstraintSidebarForceAttention] = useState(false);
  const [openEditorForConstraintId, setOpenEditorForConstraintId] = useState<string | null>(null);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [scheduleSheetFocusDayIndex, setScheduleSheetFocusDayIndex] = useState<number | undefined>();
  const queryClient = useQueryClient();
  const [activeConstraintDialog, setActiveConstraintDialog] = useState<ConstraintPendingKey | null>(
    null,
  );
  // personaMode 已移除 - 三人格由系统自动调用，不再需要用户切换视图
  
  const [loading, setLoading] = useState(true);
  const [hasTrips, setHasTrips] = useState(false);
  const [tripExists, setTripExists] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // 用于触发子组件刷新

  useEffect(() => {
    if (isUnifiedDecisionGatewayEnabled()) {
      void prefetchDecisionRuntimeCapabilities();
    }
  }, []);
  const [feasibilitySheetOpen, setFeasibilitySheetOpen] = useState(false);
  const [feasibilityInitialIssueId, setFeasibilityInitialIssueId] = useState<string | null>(null);
  const [activeDecisionProblemId, setActiveDecisionProblemId] = useState<string | null>(() =>
    readDecisionProblemIdFromSearchParams(searchParams),
  );
  const [decisionRecordSheetOpen, setDecisionRecordSheetOpen] = useState(false);
  const [activeDecisionRecordId, setActiveDecisionRecordId] = useState<string | null>(() =>
    readDecisionRecordIdFromSearchParams(searchParams),
  );
  const [decisionSpaceOpen, setDecisionSpaceOpen] = useState(
    () => searchParams.get('decisionSpace') === '1',
  );
  const [attractionExploreOpen, setAttractionExploreOpen] = useState(
    () => searchParams.get('attractionExplore') === '1',
  );
  const [arrangeItineraryOpen, setArrangeItineraryOpen] = useState(
    () => searchParams.get('arrangeItinerary') === '1',
  );
  const [itineraryDiagnosisOpen, setItineraryDiagnosisOpen] = useState(
    () => searchParams.get('itineraryDiagnosis') === '1',
  );
  const [decisionSpaceConflictId, setDecisionSpaceConflictId] = useState<string | null>(
    () => searchParams.get('conflictId'),
  );
  /** 中栏行程天选中（0-based），驱动决策检查器按天联动 */
  const [selectedScheduleDayIndex, setSelectedScheduleDayIndex] = useState(0);
  const [workbenchMobileColumn, setWorkbenchMobileColumn] =
    useState<WorkbenchMobileColumn>('summary');
  const isWorkbenchDesktop = useWorkbenchDesktopLayout();
  const [scheduleDayExtraTokens, setScheduleDayExtraTokens] = useState<string[]>([]);
  const [scheduleDayTimelinePois, setScheduleDayTimelinePois] = useState<string[]>([]);
  const [selectedTimelineEntryId, setSelectedTimelineEntryId] = useState<string | null>(null);
  const [workbenchExplicitFocusConflict, setWorkbenchExplicitFocusConflict] =
    useState<PlanningConflictItem | null>(null);
  const [decisionSpaceActionPreview, setDecisionSpaceActionPreview] =
    useState<GatewayDecisionPreviewResult | null>(null);
  const [decisionSpaceActionPreviewLoading, setDecisionSpaceActionPreviewLoading] =
    useState(false);
  const [decisionSpaceSelectedOptionId, setDecisionSpaceSelectedOptionId] = useState<string | null>(
    null,
  );
  const [decisionSpaceSelectedOptionLetter, setDecisionSpaceSelectedOptionLetter] = useState('A');
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

  /** 首屏校验通过后再拉取子模块数据，避免 LogoLoading 期间并发打满 API */
  const readyTripId = !loading && tripExists && tripId ? tripId : null;

  const constraintsQuery = useWorkbenchTripConstraints(readyTripId);
  const constraintsApiList = constraintsQuery.data ?? null;
  const budgetProfileQuery = useWorkbenchBudgetProfile(readyTripId);
  const collaboratorsQuery = useWorkbenchCollaborators(readyTripId);
  useWorkbenchScheduleRefresh(readyTripId);
  const { summary: wishSummary, reload: reloadWishSummary } = useTripWishSummary(readyTripId);
  const [collabBadgeEnabled, setCollabBadgeEnabled] = useState(false);
  const [decisionOverviewDeferred, setDecisionOverviewDeferred] = useState(false);
  useEffect(() => {
    if (!readyTripId) {
      setCollabBadgeEnabled(false);
      setDecisionOverviewDeferred(false);
      return;
    }
    const enable = () => {
      setCollabBadgeEnabled(true);
      setDecisionOverviewDeferred(true);
    };
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(enable, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const timer = window.setTimeout(enable, 1500);
    return () => window.clearTimeout(timer);
  }, [readyTripId]);
  const collabPendingCount = useCollabPendingCount(readyTripId, wishSummary, collabBadgeEnabled);

  const constraintsVersion = constraintsApiList?.meta?.constraintsVersion ?? null;

  const maxSegmentDistanceKm = useMemo(() => {
    const constraint = constraintsApiList?.items.find(
      (item) => item.id === 'c_max_segment_distance',
    );
    return readMaxSegmentDistanceKmFromConstraint(constraint);
  }, [constraintsApiList?.items]);

  const decisionCheckerFocusConflictId = decisionSpaceOpen
    ? decisionSpaceConflictId
    : null;

  const constraintSidebarFocusMode = useMemo(
    () =>
      resolveConstraintSidebarFocusMode({
        fromTravel: searchParams.get('from') === 'travel',
        problemId: activeDecisionProblemId ?? searchParams.get('problemId'),
        conflictId: decisionSpaceConflictId ?? searchParams.get('conflictId'),
        decisionSpaceOpen,
        forceAttention:
          constraintSidebarForceAttention || Boolean(workbenchExplicitFocusConflict),
      }),
    [
      searchParams,
      activeDecisionProblemId,
      decisionSpaceConflictId,
      decisionSpaceOpen,
      constraintSidebarForceAttention,
      workbenchExplicitFocusConflict,
    ],
  );

  const handleConstraintSidebarFocusAttention = useCallback(() => {
    setConstraintSidebarForceAttention(true);
  }, []);

  const planningConflicts = usePlanningConflicts(readyTripId, {
    includeDecisionChecker: true,
    /** 日程按天联动由客户端 scheduleDayFocus 裁剪；仅决策空间向 BFF 传 focus */
    focusConflictId: decisionCheckerFocusConflictId,
    constraintsVersion,
    maxSegmentDistanceKm,
  });
  const workbenchConflictDismiss = useWorkbenchConflictDismiss(
    readyTripId ?? undefined,
    planningConflicts.items,
  );
  const workbenchVisibleConflicts = useMemo(
    () => ({
      ...planningConflicts,
      items: workbenchConflictDismiss.visibleItems,
    }),
    [planningConflicts, workbenchConflictDismiss.visibleItems],
  );
  const decisionProblemsInbox = useDecisionProblemsList({
    tripId: readyTripId ?? '',
    enabled: Boolean(readyTripId),
  });
  const decisionCenterOverview = useDecisionCenterOverview({
    tripId: readyTripId ?? '',
    enabled: Boolean(readyTripId) && (activeTab === 'schedule' || activeTab === 'tasks'),
    includeUnifiedGateway: activeTab === 'tasks',
  });
  const useDecisionProblemsBff = !decisionProblemsInbox.useLegacy;
  const useDecisionProblemWritePath =
    useDecisionProblemsBff || isUnifiedDecisionGatewayEnabled();
  const openDecisionProblemCount = useMemo(
    () => {
      if (!useDecisionProblemsBff) return 0;
      if (decisionCenterOverview.overview?.recentDecisions) {
        return countOpenDecisionProblems(
          decisionProblemsInbox.items ?? [],
          decisionCenterOverview.overview.recentDecisions,
        );
      }
      const fromMeta = decisionProblemsInbox.listMeta?.openCount;
      if (typeof fromMeta === 'number') return fromMeta;
      return countOpenDecisionProblems(decisionProblemsInbox.items ?? [], null);
    },
    [
      useDecisionProblemsBff,
      decisionProblemsInbox.items,
      decisionProblemsInbox.listMeta?.openCount,
      decisionCenterOverview.overview?.recentDecisions,
    ],
  );
  const workbenchFeasibility = useWorkbenchFeasibilityScore(
    planningConflicts.bundle,
    planningConflicts.loading,
    decisionProblemsInbox.useLegacy ? null : decisionProblemsInbox.items,
  );
  const constraintsSummary = useConstraintsSummary(
    readyTripId,
    currentTrip,
    {
      embeddedSummary: planningConflicts.constraintsSummary,
      planningConflictsLoading: planningConflicts.loading,
    },
  );
  const tepConstraintsSummaryDto = planningConflicts.constraintsSummary;
  const tripExecutability = useTripExecutability(readyTripId, {
    enabled: activeTab === 'schedule',
    destination: currentTrip?.destination,
    constraintsSummary: tepConstraintsSummaryDto,
  });
  const decisionCheckerModel = useDecisionChecker(readyTripId, {
    enabled: activeTab === 'schedule',
    embeddedMode: activeTab === 'schedule',
    embeddedSnapshot:
      planningConflicts.decisionChecker ??
      planningConflicts.bundle?.decisionChecker ??
      null,
    embeddedLoading: planningConflicts.loading && !planningConflicts.usingFallback,
    awaitingDeferred:
      planningConflicts.decisionCheckerLoading && !planningConflicts.decisionChecker,
    deferredError: planningConflicts.decisionCheckerError,
    focusConflictId: decisionCheckerFocusConflictId,
    constraintsVersion: constraintsSummary.summary?.constraintsVersion ?? null,
  });

  const workbenchSnapshotEnabled =
    activeTab === 'schedule' && Boolean(readyTripId) && !attractionExploreOpen;
  const showArrangeHome =
    activeTab === 'schedule' &&
    !attractionExploreOpen &&
    !decisionSpaceOpen &&
    !itineraryDiagnosisOpen;

  const workbenchPlanningSnapshot = usePlanningWorkbenchSnapshot(
    readyTripId ?? '',
    workbenchSnapshotEnabled,
  );
  const workbenchPendingProposalCount =
    workbenchPlanningSnapshot.data?.pendingProposalCount ?? 0;
  const workbenchPendingProposalTitle = useMemo(() => {
    const suggestions = workbenchPlanningSnapshot.data?.copilotSuggestions ?? [];
    const pending = suggestions.find((suggestion) => suggestion.kind === 'pending_proposal');
    return pending?.title?.trim() || '有待确认的行程草案';
  }, [workbenchPlanningSnapshot.data?.copilotSuggestions]);
  const workbenchActiveProposalId =
    workbenchPlanningSnapshot.data?.orchestrationState?.activeProposalId ?? null;

  const prefetchedProposalIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeTab !== 'schedule' || !readyTripId || !workbenchActiveProposalId) return;
    if (!useDecisionProblemWritePath) return;
    if (prefetchedProposalIdRef.current === workbenchActiveProposalId) return;
    prefetchedProposalIdRef.current = workbenchActiveProposalId;

    return deferUntilIdle(() => {
      void prefetchPlanProposal(queryClient, readyTripId, workbenchActiveProposalId);
    });
  }, [
    activeTab,
    readyTripId,
    workbenchActiveProposalId,
    useDecisionProblemWritePath,
    queryClient,
  ]);

  const workbenchDisplayTimezone = useMemo(
    () => resolveDestinationTimezone(currentTrip?.destination),
    [currentTrip?.destination],
  );
  const embeddedDecisionChecker = planningConflicts.bundle?.decisionChecker;
  const workbenchSplitContext = useMemo(
    () => {
      const dcSource = decisionCheckerModel.data ?? embeddedDecisionChecker;
      const normalizedDc =
        readyTripId && dcSource
          ? normalizeDecisionCheckerResponse(dcSource, readyTripId)
          : undefined;
      return resolveWorkbenchSplitPlanContext({
        trip: currentTrip,
        conflictItems: planningConflicts.items,
        rawSplitPlan: normalizedDc?.splitPlan,
        planningConflictsDaySplits: planningConflicts.bundle?.daySplits,
        decisionCheckerDaySplits: normalizedDc?.daySplits,
      });
    },
    [
      currentTrip,
      planningConflicts.items,
      planningConflicts.bundle?.daySplits,
      embeddedDecisionChecker,
      decisionCheckerModel.data,
      readyTripId,
    ],
  );
  const workbenchSplitPlan = workbenchSplitContext.splitPlan;
  const workbenchDaySplits = workbenchSplitContext.daySplits;
  const splitPlanSnapshotStale = useMemo(
    () =>
      isSplitPlanSnapshotStale(
        workbenchSplitPlan,
        decisionCheckerModel.data?.snapshotVersion,
      ),
    [workbenchSplitPlan, decisionCheckerModel.data?.snapshotVersion],
  );
  const workbenchSplitBanner = useMemo(
    () =>
      shouldShowSplitPlanBanner(workbenchSplitPlan, workbenchDaySplits)
        ? workbenchSplitPlan!.banner
        : null,
    [workbenchSplitPlan, workbenchDaySplits],
  );
  const planningReadiness = useDecisionStripPlanningReadiness(
    readyTripId,
    currentTrip,
    planningConflicts,
    {
      deferConstraintTopicsToCard: true,
      budgetProfile: budgetProfileQuery.data ?? null,
      useDecisionProblemsBff,
      openDecisionProblemCount,
    },
  );
  const workbenchPlanningActionTarget = useMemo(
    () =>
      resolvePlanningActionTarget({
        useDecisionProblemsBff,
        openDecisionProblemCount,
        context: 'workbench',
      }),
    [useDecisionProblemsBff, openDecisionProblemCount],
  );
  const workbenchPlanningActionLabel = useMemo(
    () =>
      resolvePlanningActionCtaLabel({
        target: workbenchPlanningActionTarget,
        context: 'workbench',
        specificLabel: planningReadiness?.primaryCta.label,
      }),
    [workbenchPlanningActionTarget, planningReadiness?.primaryCta.label],
  );
  const decisionSpaceActiveConflict = useMemo(() => {
    if (decisionSpaceConflictId) {
      const byId = planningConflicts.items.find((item) => item.id === decisionSpaceConflictId);
      if (byId) return byId;
    }
    if (activeDecisionProblemId && !decisionProblemsInbox.useLegacy) {
      const problem = decisionProblemsInbox.items?.find((item) => item.id === activeDecisionProblemId);
      if (problem) {
        return resolveConflictForDecisionProblem(problem, planningConflicts.items) ?? null;
      }
    }
    if (!decisionSpaceOpen) return null;
    return (
      planningConflicts.items.find((item) => item.priority === 'must_handle') ??
      planningConflicts.items[0] ??
      null
    );
  }, [
    planningConflicts.items,
    decisionSpaceConflictId,
    activeDecisionProblemId,
    decisionProblemsInbox.useLegacy,
    decisionProblemsInbox.items,
    decisionSpaceOpen,
  ]);
  const decisionSpaceActiveProblem = useMemo(
    () =>
      decisionProblemsInbox.useLegacy
        ? undefined
        : resolveActiveDecisionProblem(
            activeDecisionProblemId,
            decisionSpaceActiveConflict,
            decisionProblemsInbox.items ?? [],
          ),
    [
      decisionProblemsInbox.useLegacy,
      decisionProblemsInbox.items,
      activeDecisionProblemId,
      decisionSpaceActiveConflict,
    ],
  );
  const activeDecisionProblemSummary = useMemo(
    () =>
      activeDecisionProblemId
        ? decisionProblemsInbox.items?.find((item) => item.id === activeDecisionProblemId) ?? null
        : null,
    [activeDecisionProblemId, decisionProblemsInbox.items],
  );
  const decisionSpaceSelectedProblemId = decisionSpaceOpen
    ? decisionSpaceActiveProblem?.id ?? activeDecisionProblemId
    : null;

  /** Tier-2：bundle（Phase 1）或 detail ∥ inspector 回退 */
  const decisionSpaceTier2 = useDecisionSpaceTier2({
    tripId: readyTripId ?? '',
    problemId: decisionSpaceSelectedProblemId,
    proposalId: workbenchActiveProposalId,
    focusConflictId: decisionCheckerFocusConflictId,
    optionId: decisionSpaceSelectedOptionId,
    enabled:
      decisionSpaceOpen &&
      useDecisionProblemWritePath &&
      Boolean(decisionSpaceSelectedProblemId),
  });
  const decisionSpaceBffContent = decisionSpaceTier2.bffContent;
  const decisionSpaceSharedInspector = decisionSpaceOpen ? decisionSpaceTier2.sharedInspector : undefined;
  const decisionSpacePlanDiffFallback = useMemo(
    () =>
      decisionSpaceOpen
        ? resolvePlanDiffFallbackFromPack(
            decisionSpaceTier2.bundle?.pack?.options,
            decisionSpaceSelectedOptionId,
          )
        : undefined,
    [
      decisionSpaceOpen,
      decisionSpaceTier2.bundle?.pack?.options,
      decisionSpaceSelectedOptionId,
    ],
  );
  const workbenchScheduleFocus = useMemo(() => {
    if (decisionSpaceOpen) return null;
    return resolveWorkbenchFocusForScheduleDay({
      dayIndex: selectedScheduleDayIndex,
      conflicts: workbenchConflictDismiss.visibleItems,
      decisionProblems: decisionProblemsInbox.useLegacy
        ? undefined
        : decisionProblemsInbox.items,
    });
  }, [
    decisionSpaceOpen,
    selectedScheduleDayIndex,
    workbenchConflictDismiss.visibleItems,
    decisionProblemsInbox.useLegacy,
    decisionProblemsInbox.items,
  ]);
  const workbenchCheckerFocusConflict = decisionSpaceOpen
    ? decisionSpaceActiveConflict
    : workbenchExplicitFocusConflict ?? workbenchScheduleFocus?.conflict ?? null;
  const workbenchCheckerFocusProblem = decisionSpaceOpen
    ? decisionSpaceActiveProblem
    : workbenchExplicitFocusConflict
      ? resolveDecisionProblemForConflict(
          workbenchExplicitFocusConflict,
          decisionProblemsInbox.useLegacy ? [] : (decisionProblemsInbox.items ?? []),
        ) ?? workbenchScheduleFocus?.problem ?? null
      : workbenchScheduleFocus?.problem ?? null;
  const workbenchFocusProblemContent = useDecisionProblemSpaceContent({
    tripId: readyTripId ?? '',
    problemId: workbenchCheckerFocusProblem?.id,
    focusConflictId: workbenchCheckerFocusConflict?.id ?? undefined,
    enabled:
      !decisionSpaceOpen &&
      useDecisionProblemWritePath &&
      Boolean(readyTripId && workbenchCheckerFocusProblem?.id),
  });
  const hasWorkbenchCheckerFocus = Boolean(
    workbenchCheckerFocusConflict || workbenchCheckerFocusProblem,
  );
  const scheduleDaySubtitle = useMemo(() => {
    if (decisionSpaceOpen) return undefined;
    const day = selectedScheduleDayIndex + 1;
    const problems = workbenchScheduleFocus?.dayProblems.length ?? 0;
    const conflicts = workbenchScheduleFocus?.dayConflicts.length ?? 0;
    const count = Math.max(problems, conflicts);
    if (count > 0) {
      return `第 ${day} 天 · ${count} 项冲突 / 决策问题`;
    }
    return `第 ${day} 天 · 冲突与依据`;
  }, [
    decisionSpaceOpen,
    selectedScheduleDayIndex,
    workbenchScheduleFocus?.dayProblems.length,
    workbenchScheduleFocus?.dayConflicts.length,
  ]);
  const decisionCheckerPlanningInterim = useMemo(
    () => {
      const useFocusBuilder = decisionSpaceOpen || hasWorkbenchCheckerFocus;
      const builder = useFocusBuilder
        ? buildDecisionCheckerPlanningInterimForFocus
        : buildDecisionCheckerPlanningInterim;
      return builder({
        summary: planningConflicts.summary,
        items: planningConflicts.items,
        verdictHeadline: planningConflicts.verdictHeadline,
        planningLoading:
          planningConflicts.loading && planningConflicts.items.length === 0,
        ...(useFocusBuilder
          ? {
              focusConflict: workbenchCheckerFocusConflict,
              focusProblem: workbenchCheckerFocusProblem,
              focusProblemDetail: decisionSpaceOpen
                ? decisionSpaceBffContent.detail
                : undefined,
              scheduleDayConflicts: decisionSpaceOpen
                ? undefined
                : workbenchScheduleFocus?.dayConflicts,
            }
          : {}),
      });
    },
    [
      decisionSpaceOpen,
      hasWorkbenchCheckerFocus,
      planningConflicts.summary,
      planningConflicts.items,
      planningConflicts.verdictHeadline,
      planningConflicts.loading,
      workbenchCheckerFocusConflict,
      workbenchCheckerFocusProblem,
      decisionSpaceBffContent.detail,
      workbenchScheduleFocus?.dayConflicts,
    ],
  );
  const decisionStrip = useDecisionStripModel(readyTripId, {
    planningReadiness,
    planningInboxCount: planningConflicts.inbox.inboxCount,
    deferRemoteFetch: true,
  });
  const solutionMatrix = useSolutionMatrixModel(readyTripId);
  const relaxationModel = useRelaxationSuggestionsModel(readyTripId);
  const relaxationSubmit = useRelaxationSuggestionSubmit(readyTripId);

  const compareSelection = useMemo((): CompareStripSelection | null => {
    if (!decisionStrip.compareSummary || !solutionMatrix.selectedOptionId) return null;
    const column = solutionMatrix.model.columns.find(
      (col) => col.optionId === solutionMatrix.selectedOptionId,
    );
    if (!column) return null;
    return {
      optionId: column.optionId,
      label: column.label,
      isRecommended: column.isRecommended,
    };
  }, [
    decisionStrip.compareSummary,
    solutionMatrix.selectedOptionId,
    solutionMatrix.model.columns,
  ]);

  // 对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collaboratorsDialogOpen, setCollaboratorsDialogOpen] = useState(false);

  const worldModelGuards = useWorldModelGuardsStore((s) => s.worldModelGuards);
  const explainOptimization = useWorldModelGuardsStore((s) => s.explainOptimization);
  const decisionCockpit = useWorldModelGuardsStore((s) => s.decisionCockpit);
  const cascadeUiHints = useWorldModelGuardsStore((s) => s.cascadeUiHints);
  const cascadeAffectedItems = useWorldModelGuardsStore((s) => s.cascadeAffectedItems);
  const lastRouteRunRequestId = useWorldModelGuardsStore((s) => s.lastRequestId);
  const routeRunConfirmation = useWorldModelGuardsStore((s) => s.routeRunConfirmation);
  const routeRunNegotiation = useWorldModelGuardsStore((s) => s.routeRunNegotiation);
  const showDecisionCockpitDeepLink = searchParams.get('decisionCockpit') === '1';
  const decisionCockpitRef = useRef<HTMLDivElement>(null);
  const [decisionCheckerTab, setDecisionCheckerTab] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [negotiationDialogOpen, setNegotiationDialogOpen] = useState(false);
  const [structuredNegotiationOpen, setStructuredNegotiationOpen] = useState(false);
  const [structuredNegotiationRoundId, setStructuredNegotiationRoundId] = useState<string | null>(
    null,
  );
  const [structuredNegotiationRoundDomain, setStructuredNegotiationRoundDomain] = useState<
    string | null
  >(null);
  const [negotiationCreateOpen, setNegotiationCreateOpen] = useState(false);
  const [negotiationClaimDomain, setNegotiationClaimDomain] = useState<TripDomain | null>(null);
  const [negotiationSubmitting, setNegotiationSubmitting] = useState(false);
  const [pendingNegotiationRetry, setPendingNegotiationRetry] = useState<{
    selectedOptionId?: string | null;
  } | null>(null);
  const [silentVoteCreateOpen, setSilentVoteCreateOpen] = useState(false);
  const [silentVoteCreateDraft, setSilentVoteCreateDraft] = useState<SilentVoteCreateDraft | null>(
    null,
  );
  const [silentVoteDetailOpen, setSilentVoteDetailOpen] = useState(false);
  const [silentVoteDetailId, setSilentVoteDetailId] = useState<string | null>(null);

  const showPlanStudioDecisionCockpit = useMemo(
    () =>
      shouldShowPlanStudioDecisionCockpit({
        hasCockpitUi: hasDecisionCockpitUi(decisionCockpit),
        showDecisionCockpitDeepLink,
        hasSolutionMatrix: solutionMatrix.model.visible,
        hasCompareSummary: Boolean(decisionStrip.compareSummary),
        hasRelaxationBar: relaxationModel.visible && Boolean(relaxationModel.bundle),
      }),
    [
      decisionCockpit,
      showDecisionCockpitDeepLink,
      solutionMatrix.model.visible,
      decisionStrip.compareSummary,
      relaxationModel.visible,
      relaxationModel.bundle,
    ],
  );

  const selectedDecisionOptionLetter = useMemo(() => {
    const optionId = solutionMatrix.selectedOptionId;
    if (!optionId) return 'A';
    const scenarios = decisionCheckerModel.data?.counterfactual?.scenarios ?? [];
    const fromScenario = scenarios.find((s) => s.id === optionId);
    if (fromScenario?.letter) return fromScenario.letter;
    const colIndex = solutionMatrix.model.columns.findIndex((c) => c.optionId === optionId);
    if (colIndex >= 0) return String.fromCharCode(65 + colIndex);
    return 'A';
  }, [
    solutionMatrix.selectedOptionId,
    solutionMatrix.model.columns,
    decisionCheckerModel.data?.counterfactual?.scenarios,
  ]);

  const hideDecisionCockpitCounterfactuals = useMemo(
    () =>
      shouldHideDecisionCockpitCounterfactuals({
        hasSolutionMatrix: solutionMatrix.model.visible,
        hasCompareSummary: Boolean(decisionStrip.compareSummary),
      }),
    [solutionMatrix.model.visible, decisionStrip.compareSummary],
  );

  const showPlanStudioRelaxationBar = useMemo(
    () =>
      shouldShowPlanStudioRelaxationBar(
        relaxationModel.visible && Boolean(relaxationModel.bundle),
        assistantExpanded,
      ),
    [relaxationModel.visible, relaxationModel.bundle, assistantExpanded],
  );

  const causalRuntimeSession = useMemo(
    () => (tripId ? loadCausalRuntimeSession(tripId) : null),
    [tripId, lastRouteRunRequestId, planStudio.planGateSession],
  );
  const causalProjection = causalRuntimeSession?.echo?.causalPersonaProjection;
  const causalCounterfactual = causalRuntimeSession?.lastCounterfactualReport;

  useEffect(() => {
    resetWorldModelGuardsStore();
  }, [tripId]);

  /** 切换行程时清掉上一趟的异步规划任务，避免 Decision Strip 一直显示「方案生成/验证中」 */
  useEffect(() => {
    usePlanningTaskStore.getState().reset();
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

  const workbenchTitle = currentTrip ? planStudioTripHeadingLabel(currentTrip) : t('planStudio.title');
  const workbenchSubtitle = useMemo(() => {
    if (!currentTrip) return undefined;
    const days = currentTrip.TripDay?.length;
    const dest = currentTrip.destination
      ? getCountryName(currentTrip.destination.split(',')[0]?.trim() || currentTrip.destination)
      : undefined;
    if (dest && days) return `${dest} · ${days}天行程`;
    if (days) return `${days}天行程`;
    return dest;
  }, [currentTrip, countryMap]);
  const workbenchDisplayTitle = workbenchSubtitle ?? workbenchTitle;
  const workbenchPlanBadge = currentTrip?.revisionLabel?.trim() || null;

  const isCollabCenterOpen = useMemo(
    () => isCollabCenterOpenParam(searchParams),
    [searchParams],
  );

  const closeCollabCenter = useCallback(() => {
    const next = clearCollabDeepLinkKeys(searchParams);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', value);
    clearCollabDeepLinkKeys(newParams);
    newParams.delete('roundId');
    newParams.delete('roundDomain');
    if (value !== 'schedule') {
      clearDecisionSpaceSearchParams(newParams);
      setDecisionSpaceOpen(false);
      setActiveDecisionProblemId(null);
      setDecisionSpaceActionPreview(null);
      setDecisionSpaceActionPreviewLoading(false);
    }
    setSearchParams(newParams);

    // 不再需要切换 personaMode，三人格由系统自动调用
  };

  const navigateToCollabTab = useCallback(
    (collabTab: CollabCenterTab, options?: { replace?: boolean } & CollabDeepLinkPatch) => {
      const { replace, ...patch } = options ?? {};
      const next = mergeCollabDeepLink(searchParams, { collabTab, ...patch });
      setSearchParams(next, { replace: replace ?? false });
    },
    [searchParams, setSearchParams],
  );

  const handleOpenCollaborationCenter = useCallback(() => {
    if (tripId && currentTrip) {
      trackCollabCenterOpen({
        tripId,
        fromTab: activeTab,
        memberCount: resolveTravelerCount(currentTrip),
      });
    }
    navigateToCollabTab(resolveCollabCenterTab(searchParams.get('collabTab')));
  }, [navigateToCollabTab, searchParams, tripId, currentTrip, activeTab]);

  const openDecisionSpaceCollaborationContext = useMemo(
    () => ({
      conflict: decisionSpaceActiveConflict,
      problem: decisionSpaceActiveProblem ?? activeDecisionProblemSummary,
    }),
    [
      decisionSpaceActiveConflict,
      decisionSpaceActiveProblem,
      activeDecisionProblemSummary,
    ],
  );

  const openStructuredNegotiationDiscussion = useCallback(
    (link: { roundDomain: string | null; roundId: string | null }) => {
      setStructuredNegotiationRoundId(link.roundId);
      setStructuredNegotiationRoundDomain(link.roundDomain);
      setStructuredNegotiationOpen(true);
    },
    [],
  );

  const handleNegotiationStartResult = useCallback(
    (
      result: StartDecisionProblemNegotiationResponse,
      retryPayload?: { selectedOptionId?: string | null },
    ) => {
      if (!tripId) return;
      const nav = result.clientNavigation;
      trackCollabNegotiationStart({
        tripId,
        domain: nav.roundDomain ?? result.roundDomain ?? undefined,
      });

      if (result.action === 'claim_required') {
        const domainRaw = result.claimRequired?.domain ?? nav.roundDomain ?? result.roundDomain;
        if (typeof domainRaw === 'string' && domainRaw) {
          setNegotiationClaimDomain(domainRaw as TripDomain);
          setPendingNegotiationRetry(retryPayload ?? null);
          setNegotiationCreateOpen(true);
          return;
        }
        toast.error('需要先认领规划领域');
        return;
      }

      openStructuredNegotiationDiscussion({
        roundId: nav.roundId ?? result.roundId ?? null,
        roundDomain: nav.roundDomain ?? result.roundDomain ?? null,
      });
    },
    [tripId, openStructuredNegotiationDiscussion],
  );

  const submitDecisionProblemNegotiation = useCallback(
    async (
      payload?: { selectedOptionId?: string | null },
      options?: { autoClaimDomain?: boolean },
    ) => {
      if (!tripId) return;
      const problemId = decisionSpaceActiveProblem?.id ?? activeDecisionProblemId;
      if (!problemId) {
        toast.error('请先选择决策问题');
        return;
      }

      setNegotiationSubmitting(true);
      try {
        const detail = decisionSpaceBffContent.detail as GatewayDecisionProblemDetailResult | null;
        const taskBinding = resolveDecisionProblemTaskBinding(problemId, detail);
        const result = await decisionProblemNegotiationsApi.start(tripId, problemId, {
          focusConflictId: decisionCheckerFocusConflictId ?? undefined,
          selectedOptionId: payload?.selectedOptionId ?? undefined,
          autoClaimDomain: options?.autoClaimDomain ?? true,
          resolutionId: taskBinding.resolutionId,
          actionPlanId: taskBinding.actionPlanId,
        });
        handleNegotiationStartResult(result, payload);
        void queryClient.invalidateQueries({
          queryKey: ['trips', tripId, 'collaborative-tasks', 'negotiation'],
        });
        decisionSpaceBffContent.reload();
      } catch (error) {
        if (error instanceof DecisionSemanticsApiError) {
          if (error.code === 'DOMAIN_ROUND_CONFLICT') {
            const details = parseDomainRoundConflictDetails(error.details);
            toast.error(error.message || '该领域已有其他议题的协商进行中');
            if (details?.existingRoundId) {
              openStructuredNegotiationDiscussion({
                roundId: details.existingRoundId,
                roundDomain: details.roundDomain ?? null,
              });
            }
            return;
          }
          toast.error(error.message);
          if (
            error.code === 'INSUFFICIENT_MEMBERS' ||
            error.code === 'SOLO_TRIP_NOT_SUPPORTED'
          ) {
            setCollaboratorsDialogOpen(true);
          }
          return;
        }
        toast.error((error as Error).message ?? '发起协商失败');
      } finally {
        setNegotiationSubmitting(false);
      }
    },
    [
      tripId,
      decisionSpaceActiveProblem?.id,
      activeDecisionProblemId,
      decisionCheckerFocusConflictId,
      handleNegotiationStartResult,
      queryClient,
      decisionSpaceBffContent,
      openStructuredNegotiationDiscussion,
    ],
  );

  const openDecisionSpaceNegotiation = useCallback(
    (payload?: { selectedOptionId?: string | null }) => {
      if (!tripId) return;
      if (decisionProblemsInbox.useLegacy) {
        toast.error('当前行程未启用决策问题 BFF，暂无法发起协商');
        return;
      }

      const detail = decisionSpaceBffContent.detail as GatewayDecisionProblemDetailResult | null;
      const negotiation = detail?.negotiation;
      const suggestedDomain = detail?.suggestedNegotiationDomain ?? null;

      if (negotiation?.buttonLabel === '进入协商') {
        trackCollabNegotiationStart({
          tripId,
          domain: suggestedDomain ?? undefined,
        });
        openStructuredNegotiationDiscussion({
          roundId: negotiation.roundId ?? null,
          roundDomain: suggestedDomain,
        });
        return;
      }

      if (negotiation?.buttonLabel !== '发起协商') {
        if (decisionSpaceBffContent.detailLoading) {
          toast.message('正在加载协商状态…');
        } else {
          toast.error('此类问题暂不支持结构化协商，请直接确认方案或发起投票');
        }
        return;
      }

      void submitDecisionProblemNegotiation(payload);
    },
    [
      tripId,
      decisionProblemsInbox.useLegacy,
      decisionSpaceBffContent.detail,
      decisionSpaceBffContent.detailLoading,
      submitDecisionProblemNegotiation,
      openStructuredNegotiationDiscussion,
    ],
  );

  const openDecisionSpaceVote = useCallback(() => {
    if (!tripId) return;

    const travelerCount = constraintsSummary.summary?.travelers.count ?? 1;
    const collaboratorCount = collaboratorsQuery.data?.length ?? 0;
    if (!canStartDecisionSpaceCollaboration({ travelerCount, collaboratorCount })) {
      toast.error('请先添加至少 1 名成员后再发起投票', {
        description: '团队投票需要成员共同参与。',
      });
      setCollaboratorsDialogOpen(true);
      return;
    }

    if (
      (decisionSpaceBffContent.detail as GatewayDecisionProblemDetailResult | null)?.negotiation
        ?.visible === false ||
      !isDecisionProblemNegotiationEligible({
        problem: decisionSpaceActiveProblem,
        conflict: decisionSpaceActiveConflict,
        detail: decisionSpaceBffContent.detail as GatewayDecisionProblemDetailResult | null,
      })
    ) {
      toast.message('预约类问题请直接选择可执行方案', {
        description: '执行型任务无需团队投票或结构化协商。',
      });
      return;
    }

    setSilentVoteCreateDraft(
      buildDecisionSpaceVoteCreateDraft(
        openDecisionSpaceCollaborationContext,
        decisionSpaceBffContent.options ?? [],
      ),
    );
    setSilentVoteCreateOpen(true);
  }, [
    tripId,
    constraintsSummary.summary?.travelers.count,
    collaboratorsQuery.data,
    openDecisionSpaceCollaborationContext,
    decisionSpaceBffContent.options,
    decisionSpaceActiveProblem,
    decisionSpaceActiveConflict,
    decisionSpaceBffContent.detail,
  ]);

  const openFeasibilitySheet = useCallback((issueId?: string | null) => {
    if (issueId) setFeasibilityInitialIssueId(issueId);
    setFeasibilitySheetOpen(true);
  }, []);

  const openPlanningInbox = useCallback(() => {
    setActiveTab('tasks');
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'tasks');
    next.set('planningInbox', '1');
    clearCollabDeepLinkKeys(next);
    next.delete('roundId');
    next.delete('roundDomain');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const openDecisionRecord = useCallback(
    (decisionId: string) => {
      setActiveDecisionRecordId(decisionId);
      setDecisionRecordSheetOpen(true);
      const next = new URLSearchParams(searchParams);
      next.set('decisionId', decisionId);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const selectDecisionProblemInSpace = useCallback(
    (problemId: string) => {
      setActiveDecisionProblemId(problemId);
      const problem = decisionProblemsInbox.items?.find((item) => item.id === problemId);
      const conflict = problem
        ? resolveConflictForDecisionProblem(problem, planningConflicts.items)
        : undefined;
      if (conflict) {
        setDecisionSpaceConflictId(conflict.id);
      } else {
        setDecisionSpaceConflictId(null);
      }
      const next = new URLSearchParams(searchParams);
      next.set('problemId', problemId);
      if (conflict) next.set('conflictId', conflict.id);
      else next.delete('conflictId');
      setSearchParams(next, { replace: true });
    },
    [
      decisionProblemsInbox.items,
      planningConflicts.items,
      searchParams,
      setSearchParams,
    ],
  );

  useEffect(() => {
    const decisionId = readDecisionRecordIdFromSearchParams(searchParams);
    if (!decisionId || !tripExists) return;
    setActiveDecisionRecordId(decisionId);
    setDecisionRecordSheetOpen(true);
  }, [searchParams, tripExists]);

  useEffect(() => {
    const problemId = readDecisionProblemIdFromSearchParams(searchParams);
    if (!problemId || !tripExists) return;
    setActiveDecisionProblemId(problemId);
    const problem = decisionProblemsInbox.items?.find((item) => item.id === problemId);
    const conflict = problem
      ? resolveConflictForDecisionProblem(problem, planningConflicts.items)
      : undefined;
    if (conflict) setDecisionSpaceConflictId(conflict.id);
    if (searchParams.get('decisionSpace') !== '1') {
      const next = new URLSearchParams(searchParams);
      next.set('decisionSpace', '1');
      if (conflict) next.set('conflictId', conflict.id);
      else next.delete('conflictId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, tripExists, decisionProblemsInbox.items, planningConflicts.items, setSearchParams]);

  const handleDecisionProblemExecuted = useCallback(async () => {
    setRefreshKey((k) => k + 1);
    if (tripId) {
      try {
        const trip = await tripsApi.getById(tripId);
        setCurrentTrip(trip);
      } catch {
        /* ignore refresh errors */
      }
    }
    window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
    await planningConflicts.revalidateAndReload({});
    void decisionProblemsInbox.reload();
    void decisionCenterOverview.reload();
  }, [tripId, planningConflicts, decisionProblemsInbox, decisionCenterOverview]);

  const openDecisionSpace = useCallback(
    (context?: { conflictId?: string; dayIndex?: number; problemId?: string }) => {
      if (
        context?.problemId &&
        readyTripId &&
        useDecisionProblemWritePath &&
        !decisionProblemsInbox.useLegacy
      ) {
        void prefetchDecisionProblemDetail(
          queryClient,
          readyTripId,
          context.problemId,
          context.conflictId ?? decisionCheckerFocusConflictId,
        );
      }
      setActiveTab('schedule');
      setAttractionExploreOpen(false);
      let conflictId = context?.conflictId ?? null;
      if (context?.problemId) {
        setActiveDecisionProblemId(context.problemId);
        const problem = decisionProblemsInbox.items?.find((item) => item.id === context.problemId);
        const conflict = problem
          ? resolveConflictForDecisionProblem(problem, planningConflicts.items)
          : undefined;
        if (conflict) conflictId = conflict.id;
      }
      if (!conflictId) {
        conflictId =
          planningConflicts.items.find((item) => item.priority === 'must_handle')?.id ??
          planningConflicts.items[0]?.id ??
          null;
      }
      setDecisionSpaceConflictId(conflictId);
      setDecisionSpaceOpen(true);
      setArrangeItineraryOpen(false);
      setItineraryDiagnosisOpen(false);
      setDecisionCheckerTab('overview');
      solutionMatrix.setExpanded(true);
      if (typeof context?.dayIndex === 'number') {
        dispatchPlanStudioSelectScheduleDay({ dayIndex: context.dayIndex });
      }
      decisionCockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'schedule');
      clearAttractionExploreSearchParams(next);
      clearArrangeItinerarySearchParams(next);
      clearItineraryDiagnosisSearchParams(next);
      next.set('decisionSpace', '1');
      if (context?.problemId) next.set('problemId', context.problemId);
      if (conflictId) next.set('conflictId', conflictId);
      else next.delete('conflictId');
      setSearchParams(next, { replace: true });
    },
    [planningConflicts.items, decisionProblemsInbox.items, decisionProblemsInbox.useLegacy, queryClient, readyTripId, useDecisionProblemWritePath, decisionCheckerFocusConflictId, solutionMatrix, searchParams, setSearchParams],
  );

  const openDecisionProblem = useCallback(
    (problemId: string) => {
      openDecisionSpace({ problemId });
    },
    [openDecisionSpace],
  );

  const handleTepPrimaryCta = useCallback(
    (deepLink: string) => {
      const params = new URLSearchParams(deepLink.includes('=') ? deepLink : `tab=${deepLink}`);
      const tab = params.get('tab');
      if (tab === 'decisions') {
        openDecisionSpace();
      }
    },
    [openDecisionSpace],
  );

  const prefetchDecisionProblemInSpace = useCallback(
    (problemId: string) => {
      if (!readyTripId || !useDecisionProblemWritePath || decisionProblemsInbox.useLegacy) return;
      void prefetchDecisionProblemDetail(
        queryClient,
        readyTripId,
        problemId,
        decisionCheckerFocusConflictId,
      );
    },
    [
      queryClient,
      readyTripId,
      useDecisionProblemWritePath,
      decisionProblemsInbox.useLegacy,
      decisionCheckerFocusConflictId,
    ],
  );

  const prefetchDecisionProblemFromConflict = useCallback(
    (conflictId: string) => {
      if (!readyTripId || decisionProblemsInbox.useLegacy) return;
      const conflict = planningConflicts.items.find((item) => item.id === conflictId);
      const problem = conflict
        ? resolveDecisionProblemForConflict(conflict, decisionProblemsInbox.items ?? [])
        : undefined;
      if (problem) prefetchDecisionProblemInSpace(problem.id);
    },
    [
      readyTripId,
      decisionProblemsInbox.useLegacy,
      decisionProblemsInbox.items,
      planningConflicts.items,
      prefetchDecisionProblemInSpace,
    ],
  );

  const openWorkbenchPlanningActions = useCallback(() => {
    if (workbenchPlanningActionTarget === 'decision_space') {
      openDecisionSpace();
      return;
    }
    openPlanningInbox();
  }, [workbenchPlanningActionTarget, openDecisionSpace, openPlanningInbox]);

  const closeDecisionSpace = useCallback(() => {
    const fromTravel = searchParams.get('from') === 'travel';
    setDecisionSpaceOpen(false);
    setActiveDecisionProblemId(null);
    setDecisionSpaceActionPreview(null);
    setDecisionSpaceActionPreviewLoading(false);
    setWorkbenchExplicitFocusConflict(null);
    const next = new URLSearchParams(searchParams);
    clearDecisionSpaceSearchParams(next);
    next.delete('from');
    if (fromTravel && tripId) {
      navigate(buildTripTravelStatusPath(tripId));
      return;
    }
    next.set('arrangeItinerary', '1');
    setArrangeItineraryOpen(true);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, tripId, navigate]);

  const openItineraryDiagnosis = useCallback(() => {
    setActiveTab('schedule');
    setDecisionSpaceOpen(false);
    setAttractionExploreOpen(false);
    setArrangeItineraryOpen(false);
    setItineraryDiagnosisOpen(true);
    const next = new URLSearchParams(searchParams);
    clearDecisionSpaceSearchParams(next);
    clearAttractionExploreSearchParams(next);
    clearArrangeItinerarySearchParams(next);
    next.set('tab', 'schedule');
    next.set('itineraryDiagnosis', '1');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const closeItineraryDiagnosis = useCallback(() => {
    setItineraryDiagnosisOpen(false);
    const next = new URLSearchParams(searchParams);
    clearItineraryDiagnosisSearchParams(next);
    clearDecisionSpaceSearchParams(next);
    next.set('tab', 'schedule');
    next.set('arrangeItinerary', '1');
    setArrangeItineraryOpen(true);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const openAttractionExplore = useCallback(() => {
    setActiveTab('schedule');
    setDecisionSpaceOpen(false);
    setArrangeItineraryOpen(false);
    setItineraryDiagnosisOpen(false);
    setAttractionExploreOpen(true);
    const next = new URLSearchParams(searchParams);
    clearDecisionSpaceSearchParams(next);
    clearArrangeItinerarySearchParams(next);
    clearItineraryDiagnosisSearchParams(next);
    next.set('tab', 'schedule');
    next.set('attractionExplore', '1');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const closeAttractionExplore = useCallback(() => {
    setAttractionExploreOpen(false);
    const next = new URLSearchParams(searchParams);
    clearAttractionExploreSearchParams(next);
    next.set('tab', 'schedule');
    next.set('arrangeItinerary', '1');
    setArrangeItineraryOpen(true);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const openArrangeItinerary = useCallback((options?: { autoArrange?: boolean }) => {
    setActiveTab('schedule');
    setDecisionSpaceOpen(false);
    setAttractionExploreOpen(false);
    setItineraryDiagnosisOpen(false);
    setArrangeItineraryOpen(true);
    const next = new URLSearchParams(searchParams);
    clearDecisionSpaceSearchParams(next);
    clearAttractionExploreSearchParams(next);
    clearItineraryDiagnosisSearchParams(next);
    next.set('tab', 'schedule');
    next.set('arrangeItinerary', '1');
    if (options?.autoArrange) {
      next.set('arrangeAutoArrange', '1');
    } else {
      next.delete('arrangeAutoArrange');
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const openWorkbenchPendingProposal = useCallback(() => {
    openArrangeItinerary();
  }, [openArrangeItinerary]);

  const consumeArrangeAutoArrangeIntent = useCallback(() => {
    if (searchParams.get('arrangeAutoArrange') !== '1') return;
    const next = new URLSearchParams(searchParams);
    next.delete('arrangeAutoArrange');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const closeArrangeItinerary = useCallback(() => {
    setArrangeItineraryOpen(false);
    const next = new URLSearchParams(searchParams);
    clearArrangeItinerarySearchParams(next);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleDecisionSpaceActionPreviewChange = useCallback(
    (payload: {
      preview: GatewayDecisionPreviewResult | null;
      loading?: boolean;
      selectedOptionId?: string | null;
      selectedOptionLetter?: string;
    }) => {
      setDecisionSpaceActionPreview(payload.preview);
      setDecisionSpaceActionPreviewLoading(Boolean(payload.loading));
      setDecisionSpaceSelectedOptionId(payload.selectedOptionId ?? null);
      if (payload.selectedOptionLetter) {
        setDecisionSpaceSelectedOptionLetter(payload.selectedOptionLetter);
      }
    },
    [],
  );

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
      if (tab === 'conflicts') {
        openFeasibilitySheet();
        return;
      }
      setActiveTab(tab);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', tab);
      clearCollabDeepLinkKeys(newParams);
      newParams.delete('roundId');
      newParams.delete('roundDomain');
      if (tab !== 'schedule') {
        clearDecisionSpaceSearchParams(newParams);
        clearAttractionExploreSearchParams(newParams);
        clearArrangeItinerarySearchParams(newParams);
        clearArrangeItinerarySearchParams(newParams);
        setDecisionSpaceOpen(false);
        setAttractionExploreOpen(false);
        setArrangeItineraryOpen(false);
        setActiveDecisionProblemId(null);
        setDecisionSpaceActionPreview(null);
      setDecisionSpaceActionPreviewLoading(false);
      }
      setSearchParams(newParams);
    };
    window.addEventListener('plan-studio:switch-tab', onSwitchTab);
    return () => window.removeEventListener('plan-studio:switch-tab', onSwitchTab);
  }, [searchParams, setSearchParams, navigate, tripId, openFeasibilitySheet]);

  // 旧链接 ?tab=conflicts → 行前准备 · 规划待办收件箱
  useEffect(() => {
    if (!tripId || searchParams.get('tab') !== 'conflicts') return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'tasks');
    newParams.set('planningInbox', '1');
    setSearchParams(newParams, { replace: true });
  }, [tripId, searchParams, setSearchParams]);

  // URL ?tab= 变化时同步 Tab（例如时间轴卡片「查看报告」仅改 query）
  useEffect(() => {
    const tabFromUrl = resolvePlanStudioTab(searchParams.get('tab'));
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    const fromUrl = searchParams.get('decisionSpace') === '1';
    setDecisionSpaceOpen(fromUrl);
    const conflictFromUrl = searchParams.get('conflictId');
    if (conflictFromUrl) setDecisionSpaceConflictId(conflictFromUrl);
    setAttractionExploreOpen(searchParams.get('attractionExplore') === '1');
    setItineraryDiagnosisOpen(searchParams.get('itineraryDiagnosis') === '1');
    setArrangeItineraryOpen(searchParams.get('arrangeItinerary') === '1');
  }, [searchParams]);

  useEffect(() => {
    if (activeTab !== 'schedule' || !readyTripId || loading) return;
    const hasScheduleSubview =
      searchParams.get('arrangeItinerary') === '1' ||
      searchParams.get('attractionExplore') === '1' ||
      searchParams.get('itineraryDiagnosis') === '1' ||
      searchParams.get('decisionSpace') === '1' ||
      searchParams.get('view') === 'constraints';
    if (hasScheduleSubview) return;
    const next = new URLSearchParams(searchParams);
    next.set('arrangeItinerary', '1');
    setArrangeItineraryOpen(true);
    setSearchParams(next, { replace: true });
  }, [activeTab, readyTripId, loading, searchParams, setSearchParams]);

  useEffect(() => {
    if (activeTab === 'schedule' || !attractionExploreOpen) return;
    setAttractionExploreOpen(false);
    if (searchParams.get('attractionExplore') !== '1') return;
    const next = new URLSearchParams(searchParams);
    clearAttractionExploreSearchParams(next);
    setSearchParams(next, { replace: true });
  }, [activeTab, attractionExploreOpen, searchParams, setSearchParams]);

  useEffect(() => {
    if (activeTab === 'schedule' || !itineraryDiagnosisOpen) return;
    setItineraryDiagnosisOpen(false);
    if (searchParams.get('itineraryDiagnosis') !== '1') return;
    const next = new URLSearchParams(searchParams);
    clearItineraryDiagnosisSearchParams(next);
    setSearchParams(next, { replace: true });
  }, [activeTab, itineraryDiagnosisOpen, searchParams, setSearchParams]);

  useEffect(() => {
    if (activeTab === 'schedule' || !arrangeItineraryOpen) return;
    setArrangeItineraryOpen(false);
    if (searchParams.get('arrangeItinerary') !== '1') return;
    const next = new URLSearchParams(searchParams);
    clearArrangeItinerarySearchParams(next);
    setSearchParams(next, { replace: true });
  }, [activeTab, arrangeItineraryOpen, searchParams, setSearchParams]);

  const attractionExploreSuggestShownRef = useRef(false);
  useEffect(() => {
    if (!readyTripId || loading || attractionExploreOpen) return;
    if (attractionExploreSuggestShownRef.current) return;
    if (
      !shouldShowAttractionExploreSuggest({
        tripId: readyTripId,
        trip: currentTrip,
        searchParams,
      })
    ) {
      return;
    }

    attractionExploreSuggestShownRef.current = true;
    markAttractionExploreSuggestSeen(readyTripId);
    const next = new URLSearchParams(searchParams);
    clearAttractionExploreSuggestSearchParams(next);
    setSearchParams(next, { replace: true });

    const source = searchParams.get('source');
    const fromRouteSeed = readTripAttractionExploreSuggest(currentTrip) && source !== 'guide_import';
    toast.message(
      source === 'guide_import'
        ? '攻略景点已写入候选清单'
        : fromRouteSeed
          ? '路线景点已写入候选清单'
          : '可以继续探索更多景点',
      {
        description: '在探索景点中查漏补缺、对比取舍，再自动编排进日程',
        duration: 9000,
        action: {
          label: '去探索景点',
          onClick: () => openAttractionExplore(),
        },
      },
    );
  }, [
    readyTripId,
    loading,
    attractionExploreOpen,
    currentTrip,
    searchParams,
    setSearchParams,
    openAttractionExplore,
  ]);

  useEffect(() => {
    if (activeTab === 'schedule' || !decisionSpaceOpen) return;
    setDecisionSpaceOpen(false);
    setActiveDecisionProblemId(null);
    setDecisionSpaceActionPreview(null);
    setDecisionSpaceActionPreviewLoading(false);
    if (searchParams.get('decisionSpace') !== '1') return;
    const next = new URLSearchParams(searchParams);
    clearDecisionSpaceSearchParams(next);
    setSearchParams(next, { replace: true });
  }, [activeTab, decisionSpaceOpen, searchParams, setSearchParams]);

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

  const handleRelaxationDiscuss = useCallback(() => {
    openAssistant();
  }, [openAssistant]);

  useEffect(() => {
    if (assistantUrlHandledRef.current) return;
    if (searchParams.get('assistant') !== 'open') return;
    assistantUrlHandledRef.current = true;

    const urlMessage = searchParams.get('assistantMessage');
    const pending = consumeAssistantPendingMessage();
    const message =
      pending ?? (urlMessage ? decodeURIComponent(urlMessage) : null);

    openAssistant();
    if (message) {
      window.setTimeout(() => sendAssistantMessage(message), 350);
    }

    const next = new URLSearchParams(searchParams);
    next.delete('assistant');
    next.delete('assistantMessage');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, openAssistant, sendAssistantMessage]);

  const handleRelaxationSubmit = useCallback(
    (actionIds: string[]) => {
      if (!relaxationModel.bundle) return;
      void relaxationSubmit.submit(relaxationModel.bundle.context, actionIds);
    },
    [relaxationModel.bundle, relaxationSubmit],
  );

  const handleDecisionStripPrimaryCta = (type: DecisionStripCtaType) => {
    switch (type) {
      case 'open_plan_gate':
        solutionMatrix.setExpanded(true);
        openPlanGateFromWorkbench();
        break;
      case 'open_budget':
        handleTabChange('budget');
        break;
      case 'open_conflicts':
        openWorkbenchPlanningActions();
        break;
      case 'open_feasibility':
        openFeasibilitySheet();
        break;
      case 'open_team':
        handleOpenCollaborationCenter();
        break;
      case 'confirm_regret':
        if (tripId) navigate(buildFeasibilityPagePath(tripId));
        break;
      case 'adjust_schedule':
        handleTabChange('schedule');
        break;
      case 'optimize':
        if (!guardRouteRecalculationOrToast(worldModelGuards)) break;
        sendAssistantMessage(decisionStrip.optimizeMessage ?? '请帮我优化当前行程方案');
        break;
      case 'confirm_continue':
        if (routeRunConfirmation?.approvalId) {
          setApprovalDialogOpen(true);
        } else {
          openAssistant();
        }
        break;
      case 'open_negotiation':
        if (routeRunNegotiation?.payload) {
          setNegotiationDialogOpen(true);
        } else {
          openAssistant();
        }
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
    trackDecisionStripDeepLink({
      tripId,
      target: 'evidence_drawer',
      stripState: decisionStrip.state,
    });
    drawer.setDrawerTab('decision');
    drawer.setDrawerOpen(true);
  };

  const handleDecisionStripOpenCausalInsight = useCallback(() => {
    setDecisionCheckerTab('counterfactual');
  }, []);

  const handleDecisionStripOpenDecisionCockpit = useCallback(() => {
    setDecisionCheckerTab('evidence');
  }, []);

  useEffect(() => {
    if (!readyTripId) return;
    setWorkbenchMobileColumn(
      planningConflicts.summary.mustHandle > 0 ? 'summary' : 'itinerary',
    );
  }, [readyTripId]);

  useEffect(() => {
    if (activeTab !== 'schedule' || !readyTripId) return;
    trackWorkbenchScheduleImpression({
      tripId: readyTripId,
      viewport: isWorkbenchDesktop ? 'desktop' : 'mobile',
    });
  }, [activeTab, readyTripId, isWorkbenchDesktop]);

  const workbenchTopVisibleConflict = useMemo(
    () => resolveTopPlanningConflictBanner(workbenchConflictDismiss.visibleItems),
    [workbenchConflictDismiss.visibleItems],
  );
  const workbenchConclusionGateStatus = useMemo(
    () =>
      workbenchTopVisibleConflict
        ? resolvePlanningConflictGateStatus(workbenchTopVisibleConflict)
        : null,
    [workbenchTopVisibleConflict],
  );
  const workbenchConclusionFocusDayIndex = useMemo(() => {
    const days = workbenchTopVisibleConflict?.affectedDays;
    if (days?.length) return Math.max(0, days[0] - 1);
    return selectedScheduleDayIndex;
  }, [workbenchTopVisibleConflict, selectedScheduleDayIndex]);
  const workbenchItineraryDayBadgeCount = useMemo(() => {
    const set = new Set<number>();
    for (const item of workbenchConflictDismiss.visibleItems) {
      const days = item.affectedDays ?? item.issue?.affectedDays;
      days?.forEach((day) => set.add(day - 1));
    }
    return set.size;
  }, [workbenchConflictDismiss.visibleItems]);
  const canDeferWorkbenchDayConflicts = useMemo(
    () =>
      workbenchConflictDismiss.canDeferDay(
        selectedScheduleDayIndex,
        workbenchConflictDismiss.visibleItems,
      ),
    [workbenchConflictDismiss, selectedScheduleDayIndex],
  );

  const handleWorkbenchScheduleDayChange = useCallback(
    (dayIndex: number) => {
      setSelectedScheduleDayIndex(dayIndex);
      setSelectedTimelineEntryId(null);
      if (!isWorkbenchDesktop && !decisionSpaceOpen) {
        setWorkbenchMobileColumn('itinerary');
      }
    },
    [isWorkbenchDesktop, decisionSpaceOpen],
  );

  const handleOpenScheduleEditor = useCallback((dayIndex?: number) => {
    setScheduleSheetFocusDayIndex(dayIndex);
    setScheduleSheetOpen(true);
  }, []);

  const handleScheduleSheetOpenChange = useCallback((open: boolean) => {
    setScheduleSheetOpen(open);
    if (!open) {
      setScheduleSheetFocusDayIndex(undefined);
    }
  }, []);

  const handleWorkbenchItineraryChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
    tripExecutability.refreshAfterPlanEdit();
    if (tripId) {
      tripsApi.getById(tripId).then(setCurrentTrip).catch(console.error);
    }
  }, [tripId, tripExecutability.refreshAfterPlanEdit]);

  const handleTepFocusDay = useCallback(
    (dayIndex: number) => {
      const zeroBased = Math.max(0, dayIndex - 1);
      setSelectedScheduleDayIndex(zeroBased);
      if (!isWorkbenchDesktop) {
        setWorkbenchMobileColumn('itinerary');
      }
    },
    [isWorkbenchDesktop],
  );

  const handleSelfDriveSettingsSaved = useCallback(async () => {
    await tripExecutability.reload();
    void constraintsSummary.reload();
    if (tripId) {
      tripsApi.getById(tripId).then(setCurrentTrip).catch(console.error);
    }
  }, [tripExecutability.reload, constraintsSummary, tripId]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ dayIndex?: number }>).detail;
      if (typeof detail?.dayIndex === 'number') {
        handleTepFocusDay(detail.dayIndex);
        document.querySelector('[data-testid="tep-panel"]')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    };
    window.addEventListener('plan-studio:scroll-tep-day', handler);
    return () => window.removeEventListener('plan-studio:scroll-tep-day', handler);
  }, [handleTepFocusDay]);

  const navigateToWorkbenchJourneyMap = useCallback(
    (dayIndex?: number) => {
      if (!tripId) {
        navigate('/dashboard/journey-map');
        return;
      }
      const day = (dayIndex ?? selectedScheduleDayIndex) + 1;
      navigate(`/dashboard/journey-map?tripId=${tripId}&day=${day}`);
    },
    [navigate, selectedScheduleDayIndex, tripId],
  );

  const handleViewTimelineEntryImpact = useCallback(
    (_entryId: string, dayIndex: number) => {
      setSelectedScheduleDayIndex(dayIndex);
      setDecisionCheckerTab('impact');
      if (!isWorkbenchDesktop) {
        setWorkbenchMobileColumn('decision');
      }
    },
    [isWorkbenchDesktop],
  );

  const handleWorkbenchMobileColumnChange = useCallback(
    (column: WorkbenchMobileColumn) => {
      setWorkbenchMobileColumn(column);
      if (readyTripId) {
        trackWorkbenchMobileColumnChange({ tripId: readyTripId, column, source: 'nav' });
      }
    },
    [readyTripId],
  );

  const handleWorkbenchConclusionPrimaryCta = useCallback(() => {
    if (!isWorkbenchDesktop && readyTripId) {
      setWorkbenchMobileColumn('decision');
      trackWorkbenchMobileColumnChange({
        tripId: readyTripId,
        column: 'decision',
        source: 'conclusion_cta',
      });
    }
    handleDecisionStripPrimaryCta(
      decisionStrip.primaryCta?.type ?? 'open_feasibility',
    );
  }, [
    isWorkbenchDesktop,
    readyTripId,
    decisionStrip.primaryCta?.type,
  ]);

  const handleWorkbenchConclusionFocusDay = useCallback(
    (dayIndex: number) => {
      setSelectedScheduleDayIndex(dayIndex);
      if (!isWorkbenchDesktop) {
        setWorkbenchMobileColumn('itinerary');
        if (readyTripId) {
          trackWorkbenchMobileColumnChange({
            tripId: readyTripId,
            column: 'itinerary',
            source: 'conclusion_focus_day',
          });
        }
      }
    },
    [isWorkbenchDesktop, readyTripId],
  );

  useEffect(() => {
    if (isWorkbenchDesktop || activeTab !== 'schedule' || !readyTripId || decisionSpaceOpen) return;
    trackWorkbenchConclusionStripView({
      tripId: readyTripId,
      gateStatus: workbenchConclusionGateStatus,
      mustHandleCount: workbenchVisibleConflicts.summary.mustHandle,
    });
  }, [
    isWorkbenchDesktop,
    activeTab,
    readyTripId,
    decisionSpaceOpen,
    workbenchConclusionGateStatus,
    workbenchVisibleConflicts.summary.mustHandle,
  ]);

  const handleOpenSplitPlanTab = useCallback(() => {
    setDecisionCheckerTab(workbenchSplitPlan ? 'split' : 'counterfactual');
    decisionCockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [workbenchSplitPlan]);

  const handleViewSplitAlternatives = useCallback(() => {
    setDecisionCheckerTab('alternatives');
    decisionCockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const handleApplySplitPlan = useCallback(
    async (splitPlanId: string) => {
      if (!tripId) return;
      try {
        const result = await applySplitPlan(tripId, splitPlanId, {
          confirm: true,
          constraintsVersion: constraintsSummary.summary?.constraintsVersion ?? undefined,
        });
        if (result.applied) {
          toast.success('分流方案已应用', {
            description: result.affectedDays?.length
              ? `Day ${result.affectedDays.join('、')} 已写入单线日程，行中可按 note 分流标记执行`
              : '行程已更新，分流标记已写入各活动 note',
          });
          await invalidateWorkbenchAfterConstraintChange(queryClient, tripId);
          void decisionCheckerModel.reload();
          void tripsApi.getById(tripId).then(setCurrentTrip).catch(console.error);
          setRefreshKey((k) => k + 1);
          setDecisionCheckerTab('overview');
        }
      } catch (error) {
        toast.message(
          error instanceof Error ? error.message : '应用分流方案失败',
        );
      }
    },
    [
      tripId,
      constraintsSummary.summary?.constraintsVersion,
      queryClient,
      decisionCheckerModel,
    ],
  );

  const handleDiscussSplitWithNara = useCallback(
    (payload: Record<string, unknown>) => {
      openAssistant();
      const prompt =
        typeof payload.prompt === 'string'
          ? payload.prompt
          : '请帮我评估当前分流方案的风险与备选。';
      window.setTimeout(() => sendAssistantMessage(prompt), 350);
    },
    [openAssistant, sendAssistantMessage],
  );

  const handleDailyDriveHoursSaved = useCallback((hours: number) => {
    setCurrentTrip((prev) => {
      if (!prev) return prev;
      const prevMeta = (prev.metadata ?? {}) as Record<string, unknown>;
      const prevConstraints = (prevMeta.constraints ?? {}) as Record<string, unknown>;
      return {
        ...prev,
        metadata: {
          ...prevMeta,
          constraints: {
            ...prevConstraints,
            maxDailyDrivingHours: hours,
          },
          maxDailyDrivingHours: hours,
          dailyDrivingLimitHours: hours,
        },
      };
    });
  }, []);

  const openConstraintConsole = useCallback(
    (constraintId?: string, source = 'workbench') => {
      if (planStudio.planGateOpen) {
        planStudio.closePlanGate();
        if (tripId) {
          trackPlanGateConstraintMutex({
            tripId,
            action: 'plan_gate_closed_for_constraint',
          });
        }
      }
      if (decisionSpaceOpen) {
        setDecisionSpaceOpen(false);
        setActiveDecisionProblemId(null);
        setDecisionSpaceActionPreview(null);
      setDecisionSpaceActionPreviewLoading(false);
        if (tripId) {
          trackPlanGateConstraintMutex({
            tripId,
            action: 'decision_space_closed_for_constraint',
          });
        }
      }
      const uiId = constraintId
        ? constraintId === TRAVEL_GOALS_SECTION_ID || selectionIdToSectionKey(constraintId)
          ? constraintId
          : apiConstraintIdToUi(constraintId)
        : TRAVEL_GOALS_SECTION_ID;
      setSelectedConstraintId(uiId);
      setConstraintConsoleOpen(true);
      constraintDrawerOpenedAtRef.current = Date.now();
      constraintDrawerHadSaveRef.current = false;
      if (tripId) {
        trackConstraintDrawerOpen({
          tripId,
          constraintId: uiId,
          source,
          dayIndex: selectedScheduleDayIndex,
        });
      }
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'schedule');
      next.set('view', 'constraints');
      clearDecisionSpaceSearchParams(next);
      if (constraintId) next.set('constraintId', uiId);
      else next.delete('constraintId');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, tripId, selectedScheduleDayIndex, planStudio, decisionSpaceOpen],
  );

  const closeConstraintConsole = useCallback(
    (options?: { saved?: boolean }) => {
      const hadSaveDuringSession = constraintDrawerHadSaveRef.current;
      if (tripId && constraintDrawerOpenedAtRef.current != null) {
        trackConstraintDrawerClose({
          tripId,
          constraintId: selectedConstraintId,
          saved: options?.saved ?? hadSaveDuringSession,
          hadSaveDuringSession,
          durationMs: Date.now() - constraintDrawerOpenedAtRef.current,
        });
      }
      constraintDrawerOpenedAtRef.current = null;
      constraintDrawerHadSaveRef.current = false;
      setConstraintDrawerDirty(false);
      setConstraintPendingSaveCount(0);
      setConstraintConsoleOpen(false);
      const next = new URLSearchParams(searchParams);
      next.delete('view');
      next.delete('constraintId');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, tripId, selectedConstraintId],
  );

  const requestCloseConstraintConsole = useCallback(() => {
    const hasUnsavedEdits =
      constraintPendingSaveCount > 0 || constraintDrawerDirty;
    if (hasUnsavedEdits) {
      setDiscardConstraintDraftOpen(true);
      return;
    }
    if (constraintEvalPendingRef.current) {
      setConstraintEvalCloseConfirmOpen(true);
      return;
    }
    closeConstraintConsole();
  }, [constraintPendingSaveCount, constraintDrawerDirty, closeConstraintConsole]);

  const handleConstraintDrawerOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setConstraintConsoleOpen(true);
        if (constraintDrawerOpenedAtRef.current == null) {
          constraintDrawerOpenedAtRef.current = Date.now();
        }
        return;
      }
      requestCloseConstraintConsole();
    },
    [requestCloseConstraintConsole],
  );

  const handleConfirmDiscardConstraintDraft = useCallback(() => {
    if (tripId) {
      trackConstraintDrawerUnsavedPrompt({ tripId, action: 'confirm' });
    }
    setDiscardConstraintDraftOpen(false);
    constraintWorkbenchRef.current?.discardPendingSaves();
    closeConstraintConsole();
    const pendingPlanGate = pendingPlanGateOptionsRef.current;
    pendingPlanGateOptionsRef.current = null;
    if (pendingPlanGate) {
      if (decisionSpaceOpen) {
        closeDecisionSpace();
      }
      planStudio.openPlanGate(pendingPlanGate);
    }
  }, [tripId, closeConstraintConsole, decisionSpaceOpen, closeDecisionSpace, planStudio]);

  const handleCancelDiscardConstraintDraft = useCallback(() => {
    if (tripId) {
      trackConstraintDrawerUnsavedPrompt({ tripId, action: 'cancel' });
    }
    pendingPlanGateOptionsRef.current = null;
    setDiscardConstraintDraftOpen(false);
  }, [tripId]);

  const openPlanGateFromWorkbench = useCallback(
    (options?: { autoGenerate?: boolean }) => {
      if (constraintConsoleOpen) {
        if (constraintPendingSaveCount > 0 || constraintDrawerDirty) {
          pendingPlanGateOptionsRef.current = options ?? {};
          setDiscardConstraintDraftOpen(true);
          return;
        }
        closeConstraintConsole({ saved: constraintDrawerHadSaveRef.current });
        if (tripId) {
          trackPlanGateConstraintMutex({
            tripId,
            action: 'constraint_closed_for_plan_gate',
          });
        }
      }
      if (decisionSpaceOpen) {
        closeDecisionSpace();
      }
      planStudio.openPlanGate(options);
    },
    [
      constraintConsoleOpen,
      constraintPendingSaveCount,
      constraintDrawerDirty,
      closeConstraintConsole,
      decisionSpaceOpen,
      closeDecisionSpace,
      planStudio,
      tripId,
    ],
  );

  const maybePromptResumePlanGate = useCallback(() => {
    if (!resumePlanGateAfterConstraintsRef.current) {
      return;
    }
    resumePlanGateAfterConstraintsRef.current = false;
    openPlanGateFromWorkbench({ autoGenerate: true });
    toast.success('约束已更新', {
      description: '正在重新评估方案，合规规则将一并刷新',
    });
  }, [openPlanGateFromWorkbench]);

  const handleConstraintSavedExtra = useCallback(async () => {
    if (tripId) {
      void tripsApi.getById(tripId).then(setCurrentTrip).catch(console.error);
    }
    void decisionCheckerModel.reload();
    maybePromptResumePlanGate();
  }, [tripId, decisionCheckerModel, maybePromptResumePlanGate]);

  const handleWorkbenchModeBack = useCallback(() => {
    const mode = resolveWorkbenchMode({
      decisionSpaceOpen,
      constraintConsoleOpen,
      attractionExploreOpen,
      arrangeItineraryOpen: showArrangeHome,
      itineraryDiagnosisOpen,
    });
    if (mode === 'browse' || mode === 'arrange_itinerary' || !tripId) return;
    trackWorkbenchModeBackClick({
      tripId,
      mode,
      hadUnsavedDraft: mode === 'constraint_edit' ? constraintDrawerDirty : false,
    });
    if (decisionSpaceOpen) {
      closeDecisionSpace();
      return;
    }
    if (attractionExploreOpen) {
      closeAttractionExplore();
      return;
    }
    if (itineraryDiagnosisOpen) {
      closeItineraryDiagnosis();
      return;
    }
    if (constraintConsoleOpen) {
      requestCloseConstraintConsole();
    }
  }, [
    tripId,
    showArrangeHome,
    decisionSpaceOpen,
    attractionExploreOpen,
    itineraryDiagnosisOpen,
    constraintConsoleOpen,
    constraintDrawerDirty,
    closeDecisionSpace,
    closeAttractionExplore,
    closeItineraryDiagnosis,
    requestCloseConstraintConsole,
  ]);

  useEffect(() => {
    if (activeTab !== 'schedule') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (discardConstraintDraftOpen || planStudio.planGateOpen) return;
      if (decisionSpaceOpen) {
        event.preventDefault();
        closeDecisionSpace();
        return;
      }
      if (itineraryDiagnosisOpen) {
        event.preventDefault();
        closeItineraryDiagnosis();
        return;
      }
      if (attractionExploreOpen) {
        event.preventDefault();
        closeAttractionExplore();
        return;
      }
      if (constraintConsoleOpen) {
        event.preventDefault();
        requestCloseConstraintConsole();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTab,
    discardConstraintDraftOpen,
    planStudio.planGateOpen,
    decisionSpaceOpen,
    itineraryDiagnosisOpen,
    attractionExploreOpen,
    constraintConsoleOpen,
    closeDecisionSpace,
    closeItineraryDiagnosis,
    closeAttractionExplore,
    requestCloseConstraintConsole,
  ]);

  const handleConstraintNaturalLanguage = useCallback(
    (text: string) => {
      if (!constraintConsoleOpen) {
        openConstraintConsole('daily_drive');
      }
      sendAssistantMessage(`请帮我把以下需求结构化为行程约束，并说明影响：${text}`);
      openAssistant();
    },
    [constraintConsoleOpen, openConstraintConsole, sendAssistantMessage, openAssistant],
  );

  const openConstraintEditor = useCallback(
    (key: ConstraintPendingKey, item?: ConstraintPendingItem) => {
      if (item?.deepLink) {
        const nav = parseConstraintDeepLink(item.deepLink);
        if (nav.editTab === 'conflicts') {
          openFeasibilitySheet();
          return;
        }
        if (nav.key) {
          setActiveConstraintDialog(nav.key);
          return;
        }
        if (nav.editTab) {
          handleTabChange(nav.editTab);
          return;
        }
      }
      setActiveConstraintDialog(key);
    },
    [openFeasibilitySheet, handleTabChange],
  );

  useEffect(() => {
    constraintConsoleOpenRef.current = constraintConsoleOpen;
  }, [constraintConsoleOpen]);

  const constraintMutations = useConstraintMutations({
    tripId: tripId ?? '',
    trip: currentTrip,
    summary: constraintsSummary.summary,
    constraintsApiList,
    budgetProfile: budgetProfileQuery.data ?? null,
    constraintConsoleOpen,
    onAfterConstraintEvalCommit: handleConstraintSavedExtra,
    onDailyDriveHoursSaved: handleDailyDriveHoursSaved,
    onLegacyEditor: openConstraintEditor,
    onNaturalLanguageSubmit: handleConstraintNaturalLanguage,
    onOpenEditorAfterCreate: useCallback(
      (editorId: string) => {
        if (!constraintConsoleOpenRef.current) return false;
        setSelectedConstraintId(editorId);
        setOpenEditorForConstraintId(editorId);
        const next = new URLSearchParams(searchParams);
        next.set('constraintId', editorId);
        setSearchParams(next, { replace: true });
        return true;
      },
      [searchParams, setSearchParams],
    ),
  });

  const handleAddConstraint = constraintMutations.openAddDialog;
  const handleEditConstraintItem = constraintMutations.openEditItem;
  const handleConstraintSaved = constraintMutations.handleConstraintSaved;
  const handleSoftPrefsChanged = constraintMutations.handleSoftPrefsChanged;
  const constraintEditSession = constraintMutations.constraintEditSession;

  useEffect(() => {
    constraintEvalPendingRef.current = constraintEditSession.evalPending;
  }, [constraintEditSession.evalPending]);

  const handleCommitConstraintEval = useCallback(
    async (options?: { closeDrawer?: boolean }) => {
      const hadPending = (constraintWorkbenchRef.current?.pendingSaveCount ?? 0) > 0;
      const hadEvalPending = constraintEvalPendingRef.current;
      const saved = await constraintWorkbenchRef.current?.commitPendingSaves();
      if (saved === false) {
        toast.error('保存失败，请稍后重试');
        return false;
      }
      await constraintEditSession.commitEval();
      if (hadPending) {
        toast.success('旅行条件已更新，并完成重新检查');
      } else if (hadEvalPending) {
        toast.success('已完成重新检查');
      }
      if (options?.closeDrawer) {
        closeConstraintConsole({ saved: true });
        maybePromptResumePlanGate();
      }
      return true;
    },
    [closeConstraintConsole, constraintEditSession, maybePromptResumePlanGate],
  );

  const handleSaveAndCloseConstraintConsole = useCallback(() => {
    void (async () => {
      const ok = await handleCommitConstraintEval({ closeDrawer: true });
      if (ok) {
        setDiscardConstraintDraftOpen(false);
      }
    })();
  }, [handleCommitConstraintEval]);

  const handleConfirmEvalAndCloseConstraintConsole = useCallback(() => {
    setConstraintEvalCloseConfirmOpen(false);
    void constraintEditSession.commitEval().then(() => {
      closeConstraintConsole({ saved: true });
    });
  }, [closeConstraintConsole, constraintEditSession]);

  const handleCloseConstraintConsoleWithoutEval = useCallback(() => {
    setConstraintEvalCloseConfirmOpen(false);
    constraintEditSession.dismissPendingEval();
    closeConstraintConsole({ saved: constraintDrawerHadSaveRef.current });
  }, [closeConstraintConsole, constraintEditSession]);

  const handleConfirmDiscardConstraintDraftWithEval = useCallback(() => {
    constraintEditSession.dismissPendingEval();
    handleConfirmDiscardConstraintDraft();
  }, [constraintEditSession, handleConfirmDiscardConstraintDraft]);

  const handleConstraintDrawerSaved = useCallback(() => {
    constraintDrawerHadSaveRef.current = true;
    if (tripId && constraintConsoleOpenRef.current) {
      trackConstraintDrawerSave({
        tripId,
        constraintId: selectedConstraintId,
      });
    }
    handleConstraintSaved();
  }, [tripId, selectedConstraintId, handleConstraintSaved]);

  const handleConfirmConstraints = () => {
    if (!user?.id) {
      toast.error('请先登录后再确认约束');
      return;
    }
    void constraintsSummary.confirmConstraints(user.id).then(() => {
      if (tripId) {
        tripsApi.getById(tripId).then(setCurrentTrip).catch(console.error);
      }
      maybePromptResumePlanGate();
    });
  };

  useEffect(() => {
    if (!tripId || loading) return;
    const pending = consumePendingScheduleNavigation();
    if (!pending) return;
    window.setTimeout(() => {
      dispatchPlanStudioSelectScheduleDay(pending);
    }, 200);
  }, [tripId, loading]);

  useEffect(() => {
    const onSelectScheduleDay = (event: Event) => {
      const detail = (event as CustomEvent<PlanStudioScheduleNavigateDetail>).detail ?? {};
      setActiveTab('schedule');
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', 'schedule');
      setSearchParams(newParams, { replace: true });

      const dayIndex = resolveScheduleDayIndex(detail);
      if (typeof dayIndex === 'number' && dayIndex >= 0) {
        setSelectedScheduleDayIndex(dayIndex);
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
      openFeasibilitySheet(issueId ?? null);
    };
    window.addEventListener('plan-studio:open-feasibility', onOpenFeasibility);
    return () => window.removeEventListener('plan-studio:open-feasibility', onOpenFeasibility);
  }, [tripId, openFeasibilitySheet]);

  useEffect(() => {
    const onOpenDecisionChecker = (event: Event) => {
      if (!tripId) return;
      const detail = (event as CustomEvent<{ issueId?: string; dayIndex?: number }>).detail;
      if (detail?.issueId) {
        setDecisionSpaceConflictId(detail.issueId);
      }
      setDecisionCheckerTab('evidence');
      if (typeof detail?.dayIndex === 'number') {
        dispatchPlanStudioSelectScheduleDay({ dayNumber: detail.dayIndex });
      }
      window.setTimeout(() => {
        decisionCockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    };
    window.addEventListener('plan-studio:open-decision-checker', onOpenDecisionChecker);
    return () => window.removeEventListener('plan-studio:open-decision-checker', onOpenDecisionChecker);
  }, [tripId]);

  useEffect(() => {
    const onOpenConstraintEditor = (event: Event) => {
      const detail = (event as CustomEvent<PlanStudioOpenConstraintEditorDetail>).detail;
      if (!tripId || (detail?.tripId && detail.tripId !== tripId)) return;

      if (detail?.closePlanGate !== false) {
        planStudio.closePlanGate();
      }

      if (detail?.resumePlanGate) {
        resumePlanGateAfterConstraintsRef.current = true;
      }

      const pending = constraintsSummary.summary?.pendingItems ?? [];
      const targetItem = detail?.item ?? pending.find((p) => p.key === detail?.key) ?? pending[0];
      const targetKey = detail?.key ?? targetItem?.key ?? 'time_range';

      if (targetItem) {
        openConstraintEditor(targetKey, targetItem);
      } else {
        openConstraintEditor(targetKey);
      }

      window.setTimeout(() => {
        document
          .getElementById('plan-studio-planning-constraints')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    };
    window.addEventListener(PLAN_STUDIO_OPEN_CONSTRAINT_EDITOR, onOpenConstraintEditor);
    return () =>
      window.removeEventListener(PLAN_STUDIO_OPEN_CONSTRAINT_EDITOR, onOpenConstraintEditor);
  }, [
    tripId,
    planStudio,
    openConstraintEditor,
    constraintsSummary.summary?.pendingItems,
  ]);

  useEffect(() => {
    if (!tripId) return;
    if (searchParams.get('tab') !== 'team') return;
    const next = mergeCollabDeepLink(searchParams, {
      collabTab: resolveCollabCenterTab(searchParams.get('collabTab')),
    });
    setSearchParams(next, { replace: true });
    setActiveTab('schedule');
  }, [tripId, searchParams, setSearchParams]);

  const roundIdParam = searchParams.get('roundId');
  const roundDomainParam = searchParams.get('roundDomain');
  useEffect(() => {
    if (!tripId || !roundIdParam) return;
    navigateToCollabTab('decisions', {
      replace: true,
      roundId: roundIdParam,
      roundDomain: roundDomainParam,
    });
  }, [tripId, roundIdParam, roundDomainParam, navigateToCollabTab]);

  const voteIdParam = searchParams.get('voteId');
  useEffect(() => {
    if (!tripId || !voteIdParam) return;
    if (searchParams.get('collab') !== '1' || searchParams.get('collabTab') !== 'decisions') {
      navigateToCollabTab('decisions', { replace: true, voteId: voteIdParam });
    }
  }, [tripId, voteIdParam, navigateToCollabTab, searchParams]);

  const wishIdParam = searchParams.get('wishId');
  useEffect(() => {
    if (!tripId || !wishIdParam) return;
    if (searchParams.get('collab') !== '1' || searchParams.get('collabTab') !== 'wishes') {
      navigateToCollabTab('wishes', { replace: true, wishId: wishIdParam });
    }
  }, [tripId, wishIdParam, navigateToCollabTab, searchParams]);

  useEffect(() => {
    const onOpenStructuredNegotiation = (event: Event) => {
      const detail = (event as CustomEvent<{ tripId?: string }>).detail;
      if (!tripId || detail?.tripId !== tripId) return;
      openDecisionSpaceNegotiation();
    };
    window.addEventListener('plan-studio:open-structured-negotiation', onOpenStructuredNegotiation);
    return () =>
      window.removeEventListener('plan-studio:open-structured-negotiation', onOpenStructuredNegotiation);
  }, [tripId, openDecisionSpaceNegotiation]);

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
    navigateToCollabTab('persona', { replace: true });
  }, [
    tripId,
    openDecisionProfilingParam,
    decisionProfilingStepParam,
    decisionProfilingForceReuse,
    navigateToCollabTab,
  ]);

  useEffect(() => {
    const onOpenDecisionProfiling = (event: Event) => {
      const detail = (event as CustomEvent<{ tripId?: string; step?: DecisionProfilingStep }>).detail;
      if (!tripId || detail?.tripId !== tripId) return;
      setDecisionProfilingQuizRequest(detail?.step ?? 'travel_style');
      navigateToCollabTab('persona');
    };
    window.addEventListener('plan-studio:open-decision-profiling', onOpenDecisionProfiling);
    return () =>
      window.removeEventListener('plan-studio:open-decision-profiling', onOpenDecisionProfiling);
  }, [tripId, navigateToCollabTab]);

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
    openPlanGateFromWorkbench({ autoGenerate });
  }, [tripId, tripExists, searchParams, setSearchParams, openPlanGateFromWorkbench]);

  useEffect(() => {
    constraintViewUrlHandledRef.current = false;
  }, [tripId]);

  useEffect(() => {
    if (!readyTripId || constraintViewUrlHandledRef.current) return;
    if (searchParams.get('view') !== 'constraints') return;
    constraintViewUrlHandledRef.current = true;
    const rawId = searchParams.get('constraintId') ?? undefined;
    const id =
      rawId === TRAVEL_GOALS_SECTION_ID || selectionIdToSectionKey(rawId ?? null)
        ? rawId!
        : rawId
          ? apiConstraintIdToUi(rawId)
          : undefined;
    setSelectedConstraintId(id ?? TRAVEL_GOALS_SECTION_ID);
    setConstraintConsoleOpen(true);
    constraintDrawerOpenedAtRef.current = Date.now();
    constraintDrawerHadSaveRef.current = false;
    if (planStudio.planGateOpen) {
      planStudio.closePlanGate();
      trackPlanGateConstraintMutex({
        tripId: readyTripId,
        action: 'plan_gate_closed_for_constraint',
      });
    }
    trackConstraintDrawerOpen({
      tripId: readyTripId,
      constraintId: id ?? TRAVEL_GOALS_SECTION_ID,
      source: 'deeplink',
      dayIndex: selectedScheduleDayIndex,
    });
    setActiveTab('schedule');
  }, [readyTripId, searchParams, selectedScheduleDayIndex, planStudio]);

  useEffect(() => {
    if (!showDecisionCockpitDeepLink || !decisionCockpit || !decisionCockpitRef.current) return;
    decisionCockpitRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const next = new URLSearchParams(searchParams);
    next.delete('decisionCockpit');
    setSearchParams(next, { replace: true });
  }, [showDecisionCockpitDeepLink, decisionCockpit, searchParams, setSearchParams]);

  // 加载国家信息（行程就绪后再拉，避免与首屏抢带宽）
  useEffect(() => {
    if (!tripExists) return;

    const loadCountries = async () => {
      try {
        const response = await countriesApi.getAll();
        const countries = response.countries || [];
        const map = new Map<string, Country>();
        countries.forEach((country) => {
          map.set(country.isoCode, country);
        });
        setCountryMap(map);
      } catch (err: unknown) {
        console.error('Failed to load countries:', err);
      }
    };
    void loadCountries();
  }, [tripExists]);

  // 处理从其他页面传递过来的状态（如侧边栏的操作）
  useEffect(() => {
    const state = location.state as {
      openEditDialog?: boolean;
      openShareDialog?: boolean;
      openCollaboratorsDialog?: boolean;
    } | null;

    if (state) {
      if (state.openEditDialog) {
        setActiveConstraintDialog('time_range');
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
    const needsFullPageGate = tripGateCheckedIdRef.current !== tripId;

    const checkTripsAndTripId = async () => {
      try {
        if (needsFullPageGate) {
          setLoading(true);
          setTripExists(false);
          setCurrentTrip(null);
        }

        if (tripId) {
          // 有 tripId 时并行拉列表与当前行程，避免 getAll → getById 串行阻塞首屏
          const [tripResult, allTripsResult] = await Promise.allSettled([
            tripsApi.getById(tripId),
            tripsApi.getAll(),
          ]);

          let allTripsList: TripListItem[] = [];
          if (allTripsResult.status === 'fulfilled') {
            allTripsList = Array.isArray(allTripsResult.value) ? allTripsResult.value : [];
            const planningTrips = allTripsList.filter((trip) => trip.status === 'PLANNING');
            setAllTrips(planningTrips);
            setHasTrips(planningTrips.length > 0);
            if (allTripsList.length === 0) {
              setShowWelcomeModal(true);
            }
          }

          if (tripResult.status === 'fulfilled') {
            const trip = tripResult.value;
            if (trip.status === 'PLANNING') {
              setTripExists(true);
              setCurrentTrip(trip);
              if (allTripsResult.status === 'rejected') {
                setHasTrips(true);
              }
            } else {
              console.warn('Trip is not in PLANNING status:', tripId, trip.status);
              setTripExists(false);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete('tripId');
                return next;
              });
            }
          } else {
            console.warn('Trip not found or deleted:', tripId);
            setTripExists(false);
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete('tripId');
              return next;
            });
          }
          return;
        }

        // 无 tripId：只需行程列表
        const allTripsData = await tripsApi.getAll();
        const allTripsList = Array.isArray(allTripsData) ? allTripsData : [];
        const planningTrips = allTripsList.filter((trip) => trip.status === 'PLANNING');
        setAllTrips(planningTrips);
        setHasTrips(planningTrips.length > 0);
        setTripExists(false);

        if (allTripsList.length === 0) {
          setShowWelcomeModal(true);
        }
      } catch (err) {
        console.error('Failed to check trips:', err);
        setHasTrips(false);
        setTripExists(false);
        setShowWelcomeModal(true);
      } finally {
        if (needsFullPageGate) {
          setLoading(false);
          tripGateCheckedIdRef.current = tripId ?? null;
        }
      }
    };

    void checkTripsAndTripId();
  }, [tripId, setSearchParams]);

  // 获取行程 Pipeline 状态
  const loadPipelineStatus = async () => {
    if (!tripId) return;

    try {
      setLoadingStatus(true);
      setStatusError(null);
      const status = await tripsApi.getPipelineStatus(tripId);
      setPipelineStatus(status);
    } catch (err: unknown) {
      console.error('[PlanStudio] Failed to load pipeline status:', err);
      setStatusError(err instanceof Error ? err.message : '获取状态失败');
      if (currentTrip?.id === tripId && currentTrip.pipelineStatus) {
        setPipelineStatus(currentTrip.pipelineStatus);
      } else {
        try {
          const trip = await tripsApi.getById(tripId);
          if (trip.pipelineStatus) {
            setPipelineStatus(trip.pipelineStatus);
          }
        } catch {
          // 忽略错误，保持 statusError
        }
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  // 当 tripId 变化时，加载 Pipeline 状态
  useEffect(() => {
    if (tripId && tripExists) {
      if (currentTrip?.pipelineStatus) {
        setPipelineStatus(currentTrip.pipelineStatus);
      }
      void loadPipelineStatus();
    } else {
      setPipelineStatus(null);
      setStatusError(null);
    }
  }, [tripId, tripExists, currentTrip?.id, currentTrip?.pipelineStatus]);

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

  const showSelfDriveCoverageTab = useMemo(
    () => isSelfDrivePlanningTrip(currentTrip),
    [currentTrip],
  );

  const handleWelcomeComplete = (experienceType: 'steady' | 'balanced' | 'exploratory') => {
    setShowWelcomeModal(false);
    navigate('/dashboard/trips/new?experience=' + experienceType);
  };

  const workbenchMode = resolveWorkbenchMode({
    decisionSpaceOpen,
    constraintConsoleOpen,
    attractionExploreOpen,
    arrangeItineraryOpen: showArrangeHome,
    itineraryDiagnosisOpen,
  });

  useEffect(() => {
    if (!tripId) return;
    const prev = prevWorkbenchModeRef.current;
    const next = workbenchMode;
    prevWorkbenchModeRef.current = next;
    if (prev === next) return;

    if (next !== 'browse' && next !== 'arrange_itinerary') {
      workbenchModeEnteredAtRef.current = { mode: next, at: Date.now() };
      trackWorkbenchModeEnter({ tripId, mode: next });
    }

    if (prev !== 'browse' && prev !== 'arrange_itinerary') {
      const entered = workbenchModeEnteredAtRef.current;
      if (entered?.mode === prev) {
        trackWorkbenchModeExit({
          tripId,
          mode: prev,
          durationMs: Date.now() - entered.at,
          completed: next === 'browse' || next === 'arrange_itinerary',
        });
      }
    }
  }, [tripId, workbenchMode]);

  const decisionResolutionPhase = useMemo(() => {
    if (!decisionSpaceOpen) return null;
    const detail = decisionSpaceBffContent.detail as GatewayDecisionProblemDetailResult | null;
    return resolveDecisionResolutionCtaPhase(detail);
  }, [decisionSpaceOpen, decisionSpaceBffContent.detail]);

  const constraintScheduleConflictHint = useMemo(() => {
    if (!constraintConsoleOpen) return null;
    const day = selectedScheduleDayIndex + 1;
    const focusConflict =
      workbenchScheduleFocus?.dayConflicts?.[0]?.title ??
      workbenchScheduleFocus?.conflict?.title ??
      decisionSpaceActiveConflict?.title;
    if (focusConflict) return `第 ${day} 天 · ${focusConflict}`;
    return scheduleDaySubtitle;
  }, [
    constraintConsoleOpen,
    selectedScheduleDayIndex,
    workbenchScheduleFocus,
    decisionSpaceActiveConflict?.title,
    scheduleDaySubtitle,
  ]);

  const workbenchModeBarModel = buildWorkbenchModeBarViewModel({
    mode: workbenchMode,
    fromTravelOverview: searchParams.get('from') === 'travel',
    conflict: decisionSpaceActiveConflict,
    problem: decisionSpaceActiveProblem,
    scheduleDayIndex: selectedScheduleDayIndex,
    constraintLabel: resolveConstraintUiLabel(selectedConstraintId),
    decisionResolutionPhase,
    hasUnsavedConstraintDraft: constraintDrawerDirty || constraintPendingSaveCount > 0,
  });

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

  const constraintsCardProps = {
    tripId,
    summary: constraintsSummary.summary,
    loading: constraintsSummary.loading,
    loadSettled: constraintsSummary.loadSettled,
    error: constraintsSummary.error,
    onRetry: () => void constraintsSummary.reload(),
    confirming: constraintsSummary.confirming,
    destinationLabel: currentTrip ? getCountryName(currentTrip.destination) : undefined,
    trip: currentTrip,
    onEditConstraint: openConstraintEditor,
    onConfirm: handleConfirmConstraints,
    confirmExecutabilityBlocked:
      tripExecutability.visible &&
      Boolean(tripExecutability.data) &&
      !canConfirmTripWithExecutability(
        tripExecutability.data,
        tepConstraintsSummaryDto ?? constraintsSummary.summary,
      ),
    confirmExecutabilityBlockedReason: tripExecutability.data?.ui.statusLabel,
    onOpenConflicts: openWorkbenchPlanningActions,
    planningActionsLabel: `${workbenchPlanningActionLabel} →`,
    planningInboxCount: planningConflicts.inbox.inboxCount,
    deferToPlanningInbox: planningConflicts.inbox.inboxCount > 0,
  };

  const decisionStripProps = {
    tripId: tripId!,
    model: decisionStrip,
    hasGuards: Boolean(worldModelGuards),
    onPrimaryCta: handleDecisionStripPrimaryCta,
    onOpenPlanningInbox: openWorkbenchPlanningActions,
    onOpenEvidence: drawer ? handleDecisionStripOpenEvidence : undefined,
    onOpenCausalInsight: handleDecisionStripOpenCausalInsight,
    hasCausalInsight: Boolean(causalProjection),
    onOpenDecisionCockpit: handleDecisionStripOpenDecisionCockpit,
    hasDecisionCockpit: showPlanStudioDecisionCockpit,
    compareSelection,
  };

  const relaxationBarProps =
    showPlanStudioRelaxationBar && relaxationModel.bundle
      ? {
          visible: true as const,
          context: relaxationModel.bundle.context,
          suggestions: relaxationModel.bundle.suggestions,
          selectionMode: relaxationModel.bundle.context.selectionMode,
          selectedActionIds: relaxationModel.selectedActionIds,
          onToggleAction: relaxationModel.toggleAction,
          onSubmit: handleRelaxationSubmit,
          submitting: relaxationSubmit.submitting,
          onDiscussInAssistant: handleRelaxationDiscuss,
        }
      : undefined;

  const workbenchHeader = tripId && tripExists ? (
    <PlanningWorkbenchHeader
      displayTitle={workbenchDisplayTitle}
      planBadge={workbenchPlanBadge}
      pipelineStatus={pipelineStatus}
      lastSavedAt={currentTrip?.updatedAt ?? currentTrip?.createdAt}
      feasibilityScore={workbenchFeasibility.score}
      feasibilityLoading={workbenchFeasibility.loading}
      travelAssurance={workbenchFeasibility.assurance}
      onFeasibilityClick={() => openFeasibilitySheet()}
      onPipelineClick={() => setShowStatusDialog(true)}
      isPipelineLoading={loadingStatus}
      tripId={tripId}
      collaborators={collaboratorsQuery.data}
      collaboratorsLoading={collaboratorsQuery.isLoading}
      onOpenCollaborators={() => setCollaboratorsDialogOpen(true)}
      onOpenCollaborationCenter={handleOpenCollaborationCenter}
      collaborationPendingCount={collabPendingCount}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onOpenAssistant={openAssistant}
      hideTabBar={isCollabCenterOpen}
    />
  ) : null;

  const scheduleWorkbenchHeader = workbenchHeader ? (
    <>
      {workbenchHeader}
      {workbenchModeBarModel ? (
        <WorkbenchModeIndicatorBar
          model={workbenchModeBarModel}
          onBack={handleWorkbenchModeBack}
        />
      ) : null}
      {constraintEditSession.sessionUiActive && !constraintConsoleOpen ? (
        <ConstraintEditSessionBar
          pendingCount={constraintPendingSaveCount}
          saveCount={constraintEditSession.saveCount}
          evalPending={constraintEditSession.evalPending}
          onCommitEval={() => void handleCommitConstraintEval()}
        />
      ) : null}
      {tripExecutability.visible ? (
        <SelfDriveExecutabilityPanel
          data={tripExecutability.data}
          loading={tripExecutability.loading}
          refreshing={tripExecutability.refreshing}
          error={tripExecutability.error}
          onReload={() => void tripExecutability.reload()}
          onPrimaryCta={handleTepPrimaryCta}
          onFocusDay={handleTepFocusDay}
        />
      ) : null}
    </>
  ) : null;

  return (
    <div className="flex h-full flex-col">
      {tripId && tripExists ? (
        <>
        {isCollabCenterOpen ? (
          <div className="flex h-full min-h-0 flex-col bg-background">
            {workbenchHeader}
            <TeamCollaborationCenterPage
              tripId={tripId}
              trip={currentTrip}
              onBack={closeCollabCenter}
              onTripRefetch={loadTrip}
              onInviteMembers={() => setCollaboratorsDialogOpen(true)}
              onOpenTeamSettings={() => navigateToCollabTab('members')}
              destinationLabel={currentTrip?.destination?.trim() || '冰岛'}
              userDisplayName={user?.displayName ?? user?.email ?? '我'}
              onWishSummaryChange={() => void reloadWishSummary()}
              decisionProfilingInitialStep={decisionProfilingInitialStep}
              decisionProfilingForceQuiz={decisionProfilingForceQuiz}
              decisionProfilingForceReuse={decisionProfilingForceReuse}
            />
          </div>
        ) : (
        <>
        <div
          className={cn('flex h-full min-h-0 flex-col', activeTab !== 'schedule' && 'hidden')}
          aria-hidden={activeTab !== 'schedule'}
        >
        {attractionExploreOpen ? (
          <>
            {scheduleWorkbenchHeader}
            <PlanningWorkbenchAttractionExplore
              className="min-h-0 flex-1"
              tripId={tripId}
              trip={currentTrip}
              collaborators={collaboratorsQuery.data}
              onViewMap={() => navigateToWorkbenchJourneyMap(selectedScheduleDayIndex)}
              onEditPreferences={handleOpenCollaborationCenter}
              onOpenArrangeItinerary={openArrangeItinerary}
            />
          </>
        ) : showArrangeHome ? (
          <>
            {scheduleWorkbenchHeader}
            <PlanningWorkbenchArrangeItinerary
              className="min-h-0 flex-1"
              tripId={tripId}
              trip={currentTrip}
              conflicts={workbenchVisibleConflicts.items}
              refreshKey={refreshKey}
              collaborators={collaboratorsQuery.data}
              autoArrangeOnMount={searchParams.get('arrangeAutoArrange') === '1'}
              onAutoArrangeIntentConsumed={consumeArrangeAutoArrangeIntent}
              onViewMap={(dayIndex) =>
                navigateToWorkbenchJourneyMap(dayIndex ?? selectedScheduleDayIndex)
              }
              onEditPreferences={handleOpenCollaborationCenter}
              onItineraryChanged={handleWorkbenchItineraryChanged}
              tepFlexibilityEnabled={tripExecutability.visible}
              onOpenFullSchedule={handleOpenScheduleEditor}
              onOpenAttractionExplore={openAttractionExplore}
              onOpenItineraryDiagnosis={openItineraryDiagnosis}
              onOpenConstraints={() => openConstraintConsole()}
              conflictMustHandleCount={planningConflicts.summary.mustHandle}
            />
          </>
        ) : (
        <WorkbenchDecisionFocusProvider
          conflicts={workbenchConflictDismiss.visibleItems}
          decisionProblems={
            decisionProblemsInbox.useLegacy ? undefined : decisionProblemsInbox.items
          }
          selectedDayIndex={selectedScheduleDayIndex}
          scheduleDayTimelinePois={scheduleDayTimelinePois}
          scheduleDayExtraTokens={scheduleDayExtraTokens}
          onSelectDayIndex={setSelectedScheduleDayIndex}
          onSelectTimelineEntryId={setSelectedTimelineEntryId}
          onDecisionCheckerTab={setDecisionCheckerTab}
          onFocusAttention={handleConstraintSidebarFocusAttention}
          onScrollToDecision={() =>
            decisionCockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
          onMobileColumn={handleWorkbenchMobileColumnChange}
          onFocusConflictChange={setWorkbenchExplicitFocusConflict}
          isDesktop={isWorkbenchDesktop}
        >
        <PlanningWorkbenchLayout
          header={scheduleWorkbenchHeader}
          conclusionStrip={
            !isWorkbenchDesktop && !decisionSpaceOpen ? (
              <WorkbenchConclusionStrip
                gateStatus={workbenchConclusionGateStatus}
                headline={workbenchTopVisibleConflict?.title ?? planningConflicts.verdictHeadline}
                detail={workbenchTopVisibleConflict?.message}
                affectedDayLabel={buildWorkbenchAffectedDayLabel(
                  workbenchTopVisibleConflict?.affectedDays,
                )}
                pendingCount={workbenchVisibleConflicts.summary.mustHandle}
                feasibilityScore={workbenchFeasibility.score}
                primaryCtaLabel={
                  decisionStrip.primaryCta?.labelOverride?.trim() ||
                  workbenchPlanningActionLabel ||
                  '查看修复方案'
                }
                onPrimaryCta={handleWorkbenchConclusionPrimaryCta}
                focusDayIndex={workbenchConclusionFocusDayIndex}
                onFocusDay={handleWorkbenchConclusionFocusDay}
                onViewAnalysis={() => handleWorkbenchMobileColumnChange('decision')}
              />
            ) : null
          }
          mobileColumn={
            !isWorkbenchDesktop && !decisionSpaceOpen ? workbenchMobileColumn : null
          }
          mobileColumnNav={
            !isWorkbenchDesktop && !decisionSpaceOpen ? (
              <WorkbenchMobileColumnNav
                value={workbenchMobileColumn}
                onChange={handleWorkbenchMobileColumnChange}
                badges={{
                  constraints: planningConflicts.summary.mustHandle,
                  itinerary: workbenchItineraryDayBadgeCount,
                  decision: useDecisionProblemsBff
                    ? openDecisionProblemCount
                    : planningConflicts.inbox.inboxCount,
                }}
              />
            ) : null
          }
          mobileSummary={
            !decisionSpaceOpen ? (
              <PlanningWorkbenchItineraryPanel
                tripId={tripId}
                trip={currentTrip}
                conflicts={workbenchVisibleConflicts}
                showRouteSummary
                refreshKey={refreshKey}
                memberCount={constraintsSummary.summary?.travelers.count ?? 1}
                splitBanner={workbenchSplitBanner}
                daySplits={workbenchDaySplits}
                collaborators={collaboratorsQuery.data}
                splitPreviewPending={workbenchDaySplits.length > 0}
                onOpenSplitPlan={handleOpenSplitPlanTab}
                onOpenConflicts={openWorkbenchPlanningActions}
                onOpenDecisionSpace={openDecisionSpace}
                onAdjustSegmentDistance={() => handleEditConstraintItem('max_segment_distance')}
                onViewFullMap={() => navigateToWorkbenchJourneyMap(selectedScheduleDayIndex)}
                onOpenFullSchedule={handleOpenScheduleEditor}
                onOpenAttractionExplore={openAttractionExplore}
                onOpenArrangeItinerary={openArrangeItinerary}
                onItineraryChanged={handleWorkbenchItineraryChanged}
                tepFlexibilityEnabled={tripExecutability.visible}
                decisionProblems={
                  decisionProblemsInbox.useLegacy ? undefined : decisionProblemsInbox.items
                }
                selectedDay={selectedScheduleDayIndex}
                onSelectedDayChange={handleWorkbenchScheduleDayChange}
                panelDepth="summary"
              />
            ) : null
          }
          constraints={
            <div
              id="plan-studio-planning-constraints"
              className={cn('scroll-mt-4', decisionSpaceOpen && 'flex h-full min-h-0 flex-col')}
            >
              {decisionSpaceOpen ? (
                <WorkbenchDecisionQueuePanel
                  className="min-h-0 flex-1"
                  tripId={tripId}
                    items={planningConflicts.items}
                    selectedConflictId={decisionSpaceConflictId}
                    onSelectConflict={(conflictId) => {
                      setDecisionSpaceConflictId(conflictId);
                      const conflict = planningConflicts.items.find((item) => item.id === conflictId);
                      const problem =
                        conflict && !decisionProblemsInbox.useLegacy
                          ? resolveDecisionProblemForConflict(
                              conflict,
                              decisionProblemsInbox.items ?? [],
                            )
                          : undefined;
                      if (problem) {
                        setActiveDecisionProblemId(problem.id);
                      }
                      const next = new URLSearchParams(searchParams);
                      next.set('conflictId', conflictId);
                      if (problem) next.set('problemId', problem.id);
                      else next.delete('problemId');
                      setSearchParams(next, { replace: true });
                    }}
                    decisionProblems={
                      decisionProblemsInbox.useLegacy ? undefined : decisionProblemsInbox.items
                    }
                    useDecisionProblemsBff={!decisionProblemsInbox.useLegacy}
                    decisionCenterOverview={decisionCenterOverview.overview}
                    decisionCenterOverviewLoading={decisionCenterOverview.loading}
                    activePacks={decisionCenterOverview.unifiedView?.activePacks}
                    selectedProblemId={activeDecisionProblemId}
                    onSelectProblem={selectDecisionProblemInSpace}
                    onPrefetchProblem={prefetchDecisionProblemInSpace}
                    onPrefetchConflict={prefetchDecisionProblemFromConflict}
                    planningInboxCount={planningConflicts.inbox.inboxCount}
                    onOpenFullPlanningInbox={openPlanningInbox}
                    onViewDecision={openDecisionRecord}
                    decisionProblemsOpenCount={decisionProblemsInbox.listMeta?.openCount}
                    decisionProblemsListMeta={decisionProblemsInbox.listMeta}
                    planningConflictsTotal={planningConflicts.summary.total}
                    pendingProposalCount={workbenchPendingProposalCount}
                    pendingProposalTitle={workbenchPendingProposalTitle}
                    onOpenPendingProposal={
                      workbenchPendingProposalCount > 0 ? openWorkbenchPendingProposal : undefined
                    }
                  />
              ) : (
                <PlanningWorkbenchConstraintsPanel
                  tripId={tripId}
                  constraints={constraintsCardProps}
                  trip={currentTrip}
                  conflictCount={planningConflicts.summary.mustHandle}
                  onAddConstraint={handleAddConstraint}
                  onViewAllConstraints={() => openConstraintConsole()}
                  onOpenConstraintConsole={openConstraintConsole}
                  onEditConstraintItem={handleEditConstraintItem}
                  softPrefsRevision={constraintMutations.softPrefsRevision}
                  onSoftPrefsChanged={handleSoftPrefsChanged}
                  constraintsApiList={constraintsApiList}
                  budgetProfile={budgetProfileQuery.data ?? null}
                  onOpenFeasibilityReport={() => openFeasibilitySheet()}
                  onOpenDecisionProblem={openDecisionProblem}
                  onOpenPlanningInbox={openWorkbenchPlanningActions}
                  focusMode={constraintSidebarFocusMode}
                  onFocusAttention={handleConstraintSidebarFocusAttention}
                  wishSummary={wishSummary}
                  collaborators={collaboratorsQuery.data ?? null}
                  onOpenCollaborationCenter={handleOpenCollaborationCenter}
                  onOpenBudgetTab={() => handleTabChange('budget')}
                  selfDriveSettings={{
                    visible: tripExecutability.visible,
                    profile: tripExecutability.data?.profile ?? null,
                    constraintsWasConfirmed: constraintsSummary.summary?.isUserConfirmed === true,
                    onSaved: handleSelfDriveSettingsSaved,
                  }}
                />
              )}
            </div>
          }
          itinerary={
            decisionSpaceOpen ? (
              <PlanningWorkbenchDecisionSpace
                tripId={tripId}
                conflict={decisionSpaceActiveConflict}
                conflicts={planningConflicts.items}
                decisionChecker={decisionCheckerModel}
                solutionMatrix={solutionMatrix}
                memberCount={constraintsSummary.summary?.travelers.count ?? 1}
                collaboratorCount={collaboratorsQuery.data?.length ?? 0}
                onBack={closeDecisionSpace}
                backLabel={
                  searchParams.get('from') === 'travel' ? '返回概览' : '返回编排行程'
                }
                onOpenTravelStatus={
                  tripId && searchParams.get('from') === 'travel'
                    ? () => navigate(buildTripTravelStatusPath(tripId))
                    : undefined
                }
                onSelectOption={() => {
                  decisionCockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
                onInitiateNegotiation={openDecisionSpaceNegotiation}
                onInitiateVote={openDecisionSpaceVote}
                onOpenCollaboration={openDecisionSpaceNegotiation}
                negotiationSubmitting={negotiationSubmitting}
                decisionProblems={
                  decisionProblemsInbox.useLegacy ? undefined : decisionProblemsInbox.items
                }
                useDecisionProblemsBff={!decisionProblemsInbox.useLegacy}
                activeProblemId={activeDecisionProblemId}
                onOpenDecisionProblem={openDecisionProblem}
                bffSpaceContent={decisionSpaceTier2.bffContent}
                onCanonicalExecuted={handleDecisionProblemExecuted}
                onReservationEvidenceSaved={handleDecisionProblemExecuted}
                trip={currentTrip}
                personaAlerts={decisionStrip.personaAlerts}
                displayTimezone={workbenchDisplayTimezone}
                collaborators={collaboratorsQuery.data}
                collaboratorsLoading={collaboratorsQuery.isLoading}
                onActionPreviewChange={handleDecisionSpaceActionPreviewChange}
                compactChrome={Boolean(workbenchModeBarModel)}
                activeProposalId={workbenchActiveProposalId}
                inspectorBasis={decisionSpaceTier2.inspectorBasis}
              />
            ) : (
            <PlanningWorkbenchItineraryPanel
              tripId={tripId}
              trip={currentTrip}
              conflicts={workbenchVisibleConflicts}
              showRouteSummary
              refreshKey={refreshKey}
              memberCount={constraintsSummary.summary?.travelers.count ?? 1}
              splitBanner={workbenchSplitBanner}
              daySplits={workbenchDaySplits}
              collaborators={collaboratorsQuery.data}
              splitPreviewPending={workbenchDaySplits.length > 0}
              onOpenSplitPlan={handleOpenSplitPlanTab}
              onOpenConflicts={openWorkbenchPlanningActions}
              onOpenDecisionSpace={openDecisionSpace}
              onAdjustSegmentDistance={() => handleEditConstraintItem('max_segment_distance')}
              onViewFullMap={() => navigateToWorkbenchJourneyMap(selectedScheduleDayIndex)}
              onOpenFullSchedule={handleOpenScheduleEditor}
              onOpenAttractionExplore={openAttractionExplore}
              onOpenArrangeItinerary={openArrangeItinerary}
              onItineraryChanged={handleWorkbenchItineraryChanged}
              tepFlexibilityEnabled={tripExecutability.visible}
              decisionProblems={
                decisionProblemsInbox.useLegacy ? undefined : decisionProblemsInbox.items
              }
              selectedDay={selectedScheduleDayIndex}
              onSelectedDayChange={handleWorkbenchScheduleDayChange}
              onScheduleDayFocusDetailChange={setScheduleDayExtraTokens}
              onScheduleDayTimelinePoisChange={setScheduleDayTimelinePois}
              cascadeHints={cascadeUiHints}
              cascadeAffectedItems={cascadeAffectedItems}
              onViewDayMap={navigateToWorkbenchJourneyMap}
              selectedTimelineEntryId={selectedTimelineEntryId}
              onSelectedTimelineEntryChange={setSelectedTimelineEntryId}
              onViewTimelineEntryImpact={handleViewTimelineEntryImpact}
              panelDepth="full"
              onDeferDayConflicts={(dayIndex) =>
                workbenchConflictDismiss.deferConflictsForDay(dayIndex, planningConflicts.items)
              }
              canDeferDayConflicts={canDeferWorkbenchDayConflicts}
              isConflictDismissed={(conflictId) =>
                workbenchConflictDismiss.isDismissed({ id: conflictId })
              }
              onRestoreConflict={workbenchConflictDismiss.restoreConflict}
              topBanners={
                <>
                  {!decisionStrip.hidePlanningBanner ? (
                    <PlanningBanner guards={worldModelGuards} />
                  ) : null}
                </>
              }
            />
            )
          }
          decisionChecker={
            <div ref={decisionCockpitRef} className="flex h-full min-h-0 flex-col">
              <PlanningWorkbenchDecisionChecker
                tripId={tripId}
                decisionChecker={decisionCheckerModel}
                strip={decisionStripProps}
                solutionMatrix={{ matrix: solutionMatrix }}
                relaxation={relaxationBarProps}
                onOpenPlanningActions={openWorkbenchPlanningActions}
                planningActionCount={
                  useDecisionProblemsBff
                    ? openDecisionProblemCount
                    : planningConflicts.inbox.inboxCount
                }
                planningActionLabel={workbenchPlanningActionLabel}
                onPrimaryCta={handleDecisionStripPrimaryCta}
                onOpenFeasibility={() => openFeasibilitySheet()}
                onApplySplitPlan={handleApplySplitPlan}
                onDiscussSplitWithNara={handleDiscussSplitWithNara}
                onViewSplitAlternatives={handleViewSplitAlternatives}
                splitPlanSnapshotStale={splitPlanSnapshotStale}
                splitPreviewPending={workbenchDaySplits.length > 0}
                requestedTab={decisionCheckerTab}
                onRequestedTabConsumed={() => setDecisionCheckerTab(null)}
                onUserTabChange={() => setDecisionCheckerTab(null)}
                decisionSpaceMode={decisionSpaceOpen}
                decisionResolutionPhase={decisionResolutionPhase}
                selectedOptionLetter={
                  decisionSpaceOpen
                    ? decisionSpaceSelectedOptionLetter
                    : selectedDecisionOptionLetter
                }
                selectedOptionId={decisionSpaceOpen ? decisionSpaceSelectedOptionId : null}
                onConfirmSelectedOption={() => {
                  handleDecisionStripPrimaryCta('open_plan_gate');
                }}
                planningInterim={decisionCheckerPlanningInterim}
                displayTimezone={workbenchDisplayTimezone}
                splitPlan={workbenchSplitPlan}
                maxSegmentDistanceKm={maxSegmentDistanceKm}
                focusConflict={workbenchCheckerFocusConflict}
                focusProblem={workbenchCheckerFocusProblem}
                focusProblemDetail={
                  decisionSpaceOpen
                    ? decisionSpaceBffContent.detail
                    : workbenchFocusProblemContent.detail
                }
                focusProblemDetailLoading={
                  decisionSpaceOpen
                    ? decisionSpaceBffContent.detailLoading
                    : workbenchFocusProblemContent.detailLoading
                }
                focusProblemOptions={
                  decisionSpaceOpen ? decisionSpaceBffContent.options : undefined
                }
                scheduleDayFocus={
                  decisionSpaceOpen ? null : workbenchScheduleFocus
                }
                scheduleDayExtraTokens={
                  decisionSpaceOpen ? undefined : scheduleDayExtraTokens
                }
                scheduleDayTimelinePois={
                  decisionSpaceOpen ? undefined : scheduleDayTimelinePois
                }
                scheduleDaySubtitle={scheduleDaySubtitle}
                personaAlerts={decisionStrip.personaAlerts}
                focusedActionPreview={
                  decisionSpaceOpen ? decisionSpaceActionPreview : null
                }
                actionPreviewLoading={
                  decisionSpaceOpen ? decisionSpaceActionPreviewLoading : false
                }
                constraintEvalPending={constraintEditSession.evalPending}
                onRefreshConstraintEval={handleCommitConstraintEval}
                onOpenDecisionSpace={openDecisionSpace}
                activeProposalId={workbenchActiveProposalId}
                sharedInspector={decisionSpaceSharedInspector}
                solutionCount={
                  workbenchVisibleConflicts.summary.mustHandle +
                  workbenchVisibleConflicts.summary.suggestAdjust
                }
                planDiffCounterfactualRows={decisionSpacePlanDiffFallback?.counterfactualRows}
                planDiffImpactScope={decisionSpacePlanDiffFallback?.impactScope}
                planDiffUnchangedHints={decisionSpacePlanDiffFallback?.unchangedHints}
              />
            </div>
          }
          decisionSpaceMode={decisionSpaceOpen}
        />
        </WorkbenchDecisionFocusProvider>
        )}
        </div>
        {tripId ? (
          <ConstraintConsoleDrawer
            ref={constraintWorkbenchRef}
            open={constraintConsoleOpen}
            onOpenChange={handleConstraintDrawerOpenChange}
            focusTitle={resolveConstraintUiLabel(selectedConstraintId)}
            drawerSubtitle={
              constraintPendingSaveCount > 0
                ? `${workbenchDisplayTitle ?? '当前行程'} · 编辑草稿`
                : (workbenchDisplayTitle ?? undefined)
            }
            scheduleConflictHint={constraintScheduleConflictHint}
            editSessionPendingCount={constraintPendingSaveCount}
            editSessionSaveCount={constraintEditSession.saveCount}
            editSessionEvalPending={constraintEditSession.evalPending}
            sessionCommitting={constraintSessionCommitting}
            onCommitConstraintEval={() => void handleCommitConstraintEval({ closeDrawer: true })}
            onDirtyChange={setConstraintDrawerDirty}
            onPendingSaveCountChange={setConstraintPendingSaveCount}
            onSessionCommittingChange={setConstraintSessionCommitting}
            tripId={tripId}
            summary={constraintsSummary.summary}
            trip={currentTrip}
            conflicts={planningConflicts}
            feasibilityScore={workbenchFeasibility.score}
            selectedId={selectedConstraintId}
            onSelectedIdChange={setSelectedConstraintId}
            onOpenLegacyEditor={openConstraintEditor}
            onAddConstraint={handleAddConstraint}
            openEditorForId={openEditorForConstraintId}
            onOpenEditorConsumed={() => setOpenEditorForConstraintId(null)}
            onSaved={handleConstraintDrawerSaved}
            onDailyDriveHoursSaved={handleDailyDriveHoursSaved}
            onSoftPrefsChanged={handleSoftPrefsChanged}
            softPrefsRevision={constraintMutations.softPrefsRevision}
            constraintsApiList={constraintsApiList}
            budgetProfile={budgetProfileQuery.data ?? null}
            onOpenFeasibilityReport={() => openFeasibilitySheet()}
            onOpenDecisionProblem={openDecisionProblem}
            onOpenPlanningActions={openWorkbenchPlanningActions}
            onOpenCollaborationCenter={handleOpenCollaborationCenter}
            focusMode={constraintSidebarFocusMode}
            onFocusAttention={handleConstraintSidebarFocusAttention}
          />
        ) : null}
        <div
          className={cn('flex h-full min-h-0 flex-col', activeTab === 'schedule' && 'hidden')}
          aria-hidden={activeTab === 'schedule'}
        >
          {workbenchHeader}
          <div
            className={cn(
              'min-h-0 flex-1',
              activeTab === 'budget' ? 'overflow-hidden' : 'overflow-y-auto p-6',
            )}
          >
            <div
              className={cn(
                activeTab === 'budget' ? 'h-full' : 'mx-auto',
                activeTab === 'tasks' ? 'max-w-7xl' : activeTab !== 'budget' ? 'max-w-5xl' : undefined,
              )}
            >
              {activeTab === 'budget' ? (
                <BudgetTab
                  tripId={tripId}
                  tripDayCount={currentTrip?.TripDay?.length ?? 0}
                  tripDayDates={currentTrip?.TripDay?.map((day) => day.date).filter(Boolean) ?? []}
                />
              ) : null}
              {activeTab === 'tasks' ? (
                <TasksTab
                  tripId={tripId}
                  initialSubTab={
                    searchParams.get('subtab') === 'packing'
                      ? 'packing'
                      : searchParams.get('subtab') === 'bookings'
                        ? 'bookings'
                        : 'tasks'
                  }
                  planningConflicts={planningConflicts.items}
                  planningConflictsResult={planningConflicts}
                  conflictsLoading={planningConflicts.loading}
                  decisionProblems={
                    decisionProblemsInbox.useLegacy ? undefined : decisionProblemsInbox.items
                  }
                  decisionCenterOverview={decisionCenterOverview.overview}
                  decisionCenterOverviewLoading={decisionCenterOverview.loading}
                  activePacks={decisionCenterOverview.unifiedView?.activePacks}
                  useDecisionProblemsBff={!decisionProblemsInbox.useLegacy}
                  onOpenDecisionProblem={openDecisionProblem}
                  focusPlanningInbox={searchParams.get('planningInbox') === '1'}
                  onOpenFeasibility={openFeasibilitySheet}
                  onGoToSchedule={() => handleTabChange('schedule')}
                  onViewDecision={openDecisionRecord}
                />
              ) : null}
            </div>
          </div>
        </div>
        </>
        )}
        </>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b bg-white px-4 py-4 sm:px-6">
            <h1 className="text-xl font-bold">{t('planStudio.title')}</h1>
          </div>
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">请先选择行程</p>
          </div>
        </div>
      )}

      <PlanGateDrawer
        tripId={tripId}
        initialTrip={currentTrip}
        inputsSummary={{
          memberCount: constraintsSummary.summary?.travelers.count,
          budgetPerPerson:
            constraintsSummary.summary?.budget.total != null &&
            (constraintsSummary.summary.travelers.count ?? 0) > 0
              ? Math.round(
                  constraintsSummary.summary.budget.total /
                    constraintsSummary.summary.travelers.count,
                )
              : constraintsSummary.summary?.budget.total ?? undefined,
          budgetCurrency: constraintsSummary.summary?.budget.currency ?? undefined,
          missingInfoCount: constraintsSummary.summary?.pendingCount,
          decisionCount: openDecisionProblemCount > 0 ? openDecisionProblemCount : undefined,
        }}
      />

      <AlertDialog open={discardConstraintDraftOpen} onOpenChange={setDiscardConstraintDraftOpen}>
        <AlertDialogStackContent>
          <AlertDialogHeader>
            <AlertDialogTitle>是否保存当前旅行条件？</AlertDialogTitle>
            <AlertDialogDescription>
              你有尚未保存的修改。保存后将写入正式条件并重新检查是否走得通；不保存则丢弃本次修改。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDiscardConstraintDraft}>
              继续编辑
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={handleConfirmDiscardConstraintDraftWithEval}
            >
              不保存并关闭
            </Button>
            <Button
              type="button"
              className={cn(buttonVariants())}
              disabled={constraintSessionCommitting}
              onClick={handleSaveAndCloseConstraintConsole}
            >
              保存并检查
            </Button>
          </AlertDialogFooter>
        </AlertDialogStackContent>
      </AlertDialog>

      <AlertDialog
        open={constraintEvalCloseConfirmOpen}
        onOpenChange={setConstraintEvalCloseConfirmOpen}
      >
        <AlertDialogStackContent>
          <AlertDialogHeader>
            <AlertDialogTitle>条件已保存，是否重新检查？</AlertDialogTitle>
            <AlertDialogDescription>
              本次修改已写入，但尚未反映到可执行性与待办。你可以立即检查后再关闭，或直接关闭稍后再刷新。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseConstraintConsoleWithoutEval}>
              直接关闭
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEvalAndCloseConstraintConsole}>
              检查并关闭
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogStackContent>
      </AlertDialog>

      {routeRunConfirmation?.approvalId ? (
        <ApprovalDialog
          approvalId={routeRunConfirmation.approvalId}
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          onDecision={() => {
            clearRouteRunConfirmationFromStore();
            setApprovalDialogOpen(false);
          }}
        />
      ) : null}

      {routeRunNegotiation?.payload ? (
        <NegotiationDialog
          open={negotiationDialogOpen}
          correlationRequestId={routeRunNegotiation.requestId}
          negotiation={routeRunNegotiation.payload}
          onOpenChange={(open) => {
            if (
              !open &&
              routeRunNegotiation.payload.status === 'PENDING_USER_DECISION'
            ) {
              toast.message('需要你做一个选择', {
                description: '请选择并确认一个方案，或点击“放弃本次调整”回到纯净态。',
              });
              return;
            }
            setNegotiationDialogOpen(open);
          }}
          onConfirmed={() => {
            clearRouteRunNegotiationFromStore();
            setNegotiationDialogOpen(false);
            void loadTrip();
            if (tripId) {
              void invalidateWorkbenchAfterConstraintChange(queryClient, tripId);
            }
          }}
          onDiscard={() => {
            clearRouteRunNegotiationFromStore();
            setNegotiationDialogOpen(false);
          }}
        />
      ) : null}

      {tripId && tripExists ? (
        <DecisionSpaceDomainClaimDialog
          tripId={tripId}
          open={negotiationCreateOpen}
          onOpenChange={(open) => {
            setNegotiationCreateOpen(open);
            if (!open) {
              setNegotiationClaimDomain(null);
              setPendingNegotiationRetry(null);
            }
          }}
          domain={negotiationClaimDomain}
          onClaimed={async () => {
            if (pendingNegotiationRetry) {
              await submitDecisionProblemNegotiation(pendingNegotiationRetry, {
                autoClaimDomain: true,
              });
            }
            decisionSpaceBffContent.reload();
          }}
        />
      ) : null}

      {tripId && tripExists ? (
        <StructuredNegotiationDialog
          tripId={tripId}
          open={structuredNegotiationOpen}
          onOpenChange={(open) => {
            setStructuredNegotiationOpen(open);
            if (!open) {
              decisionSpaceBffContent.reload();
            }
          }}
          initialRoundId={structuredNegotiationRoundId}
          initialRoundDomain={structuredNegotiationRoundDomain}
        />
      ) : null}

      {tripId && tripExists ? (
        <SilentVoteCreateDialog
          tripId={tripId}
          open={silentVoteCreateOpen}
          onOpenChange={(open) => {
            setSilentVoteCreateOpen(open);
            if (!open) setSilentVoteCreateDraft(null);
          }}
          draft={silentVoteCreateDraft}
          onCreated={(voteId) => {
            trackCollabVoteStart({ tripId, voteId });
            setSilentVoteDetailId(voteId);
            setSilentVoteDetailOpen(true);
          }}
        />
      ) : null}

      {tripId && tripExists ? (
        <SilentVoteDialog
          tripId={tripId}
          voteId={silentVoteDetailId}
          open={silentVoteDetailOpen}
          onOpenChange={(open) => {
            setSilentVoteDetailOpen(open);
            if (!open) setSilentVoteDetailId(null);
          }}
        />
      ) : null}

      {/* Pipeline 状态详情对话框 */}
      {(pipelineStatus || statusError) && (
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>行程规划状态</DialogTitle>
              <DialogDescription>
                {statusError && !pipelineStatus
                  ? statusError
                  : '查看行程规划的各个阶段完成情况'}
              </DialogDescription>
            </DialogHeader>
            {pipelineStatus ? (
              <div className="space-y-4 mt-4">
                {pipelineStatus.stages.map((stage) => (
                  <PipelineStageCard
                    key={stage.id}
                    stage={stage}
                    onAction={tripId ? executePipelineStageAction : undefined}
                  />
                ))}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      )}

      {tripId ? (
        <ConstraintMutationHost
          tripId={tripId}
          trip={currentTrip}
          summary={constraintsSummary.summary}
          constraintsApiList={constraintsApiList}
          mutations={constraintMutations}
        />
      ) : null}

      {/* 完整意图页（Pipeline 等入口）；固化约束四项使用下方聚焦弹窗 */}
      <Dialog
        open={showIntentDialog}
        onOpenChange={(open) => {
          setShowIntentDialog(open);
          if (!open) constraintMutations.handleSoftPrefsChanged();
        }}
      >
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

      {currentTrip && (
        <>
          <PlanningTimeRangeConstraintsDialog
            trip={currentTrip}
            tripId={tripId}
            open={activeConstraintDialog === 'time_range'}
            onOpenChange={(open) => {
              if (!open) setActiveConstraintDialog(null);
            }}
            onSaved={handleConstraintSaved}
          />
          {tripId ? (
            <PlanningBudgetConstraintsDialog
              tripId={tripId}
              open={activeConstraintDialog === 'budget'}
              onOpenChange={(open) => {
                if (!open) setActiveConstraintDialog(null);
              }}
              onSaved={handleConstraintSaved}
            />
          ) : null}
          <PlanningTravelersConstraintsDialog
            trip={currentTrip}
            tripId={tripId}
            open={activeConstraintDialog === 'travelers'}
            onOpenChange={(open) => {
              if (!open) setActiveConstraintDialog(null);
            }}
            onSaved={handleConstraintSaved}
            onOpenTeamTab={() => navigateToCollabTab('members')}
          />
          <PlanningTransportConstraintsDialog
            trip={currentTrip}
            tripId={tripId}
            open={activeConstraintDialog === 'transport'}
            onOpenChange={(open) => {
              if (!open) setActiveConstraintDialog(null);
            }}
            onSaved={handleConstraintSaved}
          />
        </>
      )}

      {/* 侧栏「编辑行程」等非约束入口仍用通用编辑弹窗 */}
      {currentTrip && editDialogOpen ? (
        <EditTripDialog
          trip={currentTrip}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            if (tripId) {
              tripsApi.getById(tripId).then(setCurrentTrip).catch(console.error);
            }
          }}
        />
      ) : null}

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

      {tripId && tripExists && activeTab === 'schedule' ? (
        <WorkbenchScheduleSheet
          open={scheduleSheetOpen}
          onOpenChange={handleScheduleSheetOpenChange}
          tripId={tripId}
          trip={currentTrip}
          refreshKey={refreshKey}
          focusDayIndex={scheduleSheetFocusDayIndex}
          tepEnabled={tripExecutability.visible}
          tepExecutability={tripExecutability.data}
          onTepRefresh={() => tripExecutability.reload()}
          onScheduleChanged={() => {
            setRefreshKey((k) => k + 1);
            if (tripId) {
              tripsApi.getById(tripId).then(setCurrentTrip).catch(console.error);
            }
          }}
        />
      ) : null}

      {tripId && tripExists ? (
        <FeasibilityReportSheet
          tripId={tripId}
          open={feasibilitySheetOpen}
          onOpenChange={(open) => {
            setFeasibilitySheetOpen(open);
            if (!open) setFeasibilityInitialIssueId(null);
          }}
          initialIssueId={feasibilityInitialIssueId}
          onNavigateToSchedule={handleNavigateToScheduleFromFeasibility}
          onViewDecision={openDecisionRecord}
        />
      ) : null}

      {tripId && tripExists ? (
        <DecisionRecordDrawer
          tripId={tripId}
          decisionId={activeDecisionRecordId}
          open={decisionRecordSheetOpen}
          onOpenChange={(open) => {
            setDecisionRecordSheetOpen(open);
            if (!open) {
              setActiveDecisionRecordId(null);
              const next = new URLSearchParams(searchParams);
              next.delete('decisionId');
              setSearchParams(next, { replace: true });
            }
          }}
          onExecutionSettled={handleDecisionProblemExecuted}
        />
      ) : null}
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
function PlanStudioTravelContextBridge({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId') ?? undefined;
  if (!tripId) return <>{children}</>;
  return <TripTravelContextProvider tripId={tripId}>{children}</TripTravelContextProvider>;
}

export default function PlanStudioPage() {
  return (
    <PlanStudioProvider>
      <PlanStudioTravelContextBridge>
        <PlanStudioPageContent />
      </PlanStudioTravelContextBridge>
    </PlanStudioProvider>
  );
}