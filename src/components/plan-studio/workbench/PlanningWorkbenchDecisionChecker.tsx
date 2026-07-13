import { useEffect, useMemo, useRef, useState, memo, useCallback } from 'react';
import { ScanSearch, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DecisionStripProps } from '@/components/plan-studio/DecisionStrip';
import type { RelaxationSuggestionBarProps } from '@/components/plan-studio/RelaxationSuggestionBar';
import type { UseSolutionMatrixModelResult } from '@/hooks/useSolutionMatrixModel';
import type { UseDecisionCheckerResult } from '@/hooks/useDecisionChecker';
import type { DecisionCheckerPlanningInterim } from '@/lib/decision-checker-interim.util';
import { scopeDecisionCheckerForDecisionSpace } from '@/lib/decision-checker-focus.util';
import { deferUntilIdle } from '@/lib/idle-defer.util';
import { mergePreviewIntoDecisionCheckerImpact } from '@/lib/decision-preview-impact.util';
import { runDecisionCheckerAction } from '@/lib/decision-checker-action.util';
import { DECISION_STRIP_CTA_LABEL_KEY } from '@/lib/decision-strip-model';
import { normalizeDecisionCheckerResponse } from '@/types/decision-checker';
import type { DecisionCheckerSplitPlanDto } from '@/types/decision-checker';
import type { PersonaAlert } from '@/types/trip';
import type { DecisionOption } from '@/types/decision-problem';
import type { DecisionStripCtaType } from '@/lib/decision-strip-model';
import { useTranslation } from 'react-i18next';
import { DecisionCheckerOverviewTab } from './decision-checker/DecisionCheckerOverviewTab';
import { DestinationInsightsSection } from './decision-checker/DestinationInsightsSection';
import { DecisionCheckerEvidenceTab } from './decision-checker/DecisionCheckerEvidenceTab';
import { isApplyAndPollChain, resolveSummaryWriteChain } from '@/lib/decision-write-chain.util';
import type { DecisionResolutionCtaPhase } from '@/lib/decision-resolution.util';
import { useTripDestinationInsights } from '@/hooks/useTripDestinationInsights';
import { DecisionCheckerImpactTab } from './decision-checker/DecisionCheckerImpactTab';
import { DecisionCheckerCounterfactualTab } from './decision-checker/DecisionCheckerCounterfactualTab';
import { DecisionCheckerSplitTab } from './decision-checker/DecisionCheckerSplitTab';
import { DecisionCheckerMembersTab } from './decision-checker/DecisionCheckerMembersTab';
import { DecisionCheckerRecordsTab } from './decision-checker/DecisionCheckerRecordsTab';
import { ConstraintEvalPendingBanner } from './ConstraintEvalPendingBanner';
import { DecisionSpaceCausalChainPanel } from '@/components/decision-problems/decision-space/DecisionSpaceCausalChainPanel';
import { DecisionProfessionalReviewStrip } from '@/components/decision-problems/DecisionProfessionalReviewStrip';
import { DecisionSpacePlanDiffPanel } from '@/components/decision-problems/decision-space/DecisionSpacePlanDiffPanel';
import { DecisionSpaceFeasibilityGatePanel } from '@/components/decision-problems/decision-space/DecisionSpaceFeasibilityGatePanel';
import { DecisionSpaceMembersConsensusPanel } from '@/components/decision-problems/decision-space/DecisionSpaceMembersConsensusPanel';
import { buildDecisionSpaceActionPreviewView } from '@/lib/decision-space-action-preview.util';
import { resolvePlanningConflictIdForBasis } from '@/lib/planning-decision-basis-query.util';
import {
  feasibilityViewFromInspector,
  membersConsensusViewFromInspector,
} from '@/lib/planning-decision-inspector-adapter.util';
import { inspectorTabEmptyMessage, resolveInspectorTabDeferred } from '@/lib/planning-decision-inspector-empty.util';
import { hasGatewayCausalStoryView } from '@/lib/causal-trace-view.util';
import { resolveDecisionProblemQueueDisplay } from '@/lib/decision-problem-queue-display.util';
import { resolveDecisionSpaceGuardianWarning } from '@/lib/decision-space-guardian-warning.util';
import { useDecisionInspector } from '@/components/plan-studio/workbench/arrange-itinerary/useDecisionInspector';
import { useDecisionCausalChain } from '@/components/plan-studio/workbench/arrange-itinerary/useDecisionCausalChain';
import type { SharedDecisionInspectorQuery } from '@/components/plan-studio/workbench/arrange-itinerary/decision-inspector-shared.types';
import {
  workbenchDecisionCheckerStaleBanner,
  workbenchDecisionShell,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchDecisionCheckerTabList,
  workbenchDecisionCheckerTabTrigger,
  workbenchPrimaryAction,
  workbenchScrollable,
} from './workbench-ui';

export interface PlanningWorkbenchDecisionCheckerProps {
  tripId: string;
  decisionChecker?: UseDecisionCheckerResult;
  strip: DecisionStripProps;
  solutionMatrix?: {
    matrix: UseSolutionMatrixModelResult;
  };
  relaxation?: RelaxationSuggestionBarProps;
  onPrimaryCta: DecisionStripProps['onPrimaryCta'];
  onOpenFeasibility?: () => void;
  onOpenPlanningActions?: () => void;
  planningActionCount?: number;
  planningActionLabel?: string;
  onApplySplitPlan?: (splitPlanId: string) => void;
  onDiscussSplitWithNara?: (payload: Record<string, unknown>) => void;
  onViewSplitAlternatives?: () => void;
  splitPlanSnapshotStale?: boolean;
  /** 有待应用 daySplits 时为 true */
  splitPreviewPending?: boolean;
  maxSegmentDistanceKm?: number | null;
  /** 父级程序化切 tab（消费后应置 null，避免反复覆盖用户选择） */
  requestedTab?: string | null;
  onRequestedTabConsumed?: () => void;
  /** 用户手动切 tab */
  onUserTabChange?: (tab: string) => void;
  /** 决策空间模式：底部展示确认选中方案 CTA */
  decisionSpaceMode?: boolean;
  /** 与中栏步骤对齐；select_action 阶段主 CTA 留在中栏底栏 */
  decisionResolutionPhase?: DecisionResolutionCtaPhase | null;
  selectedOptionLetter?: string;
  /** 当前选中方案 id — decision-inspector optionId */
  selectedOptionId?: string | null;
  onConfirmSelectedOption?: () => void;
  /** planning-conflicts 已返回、decisionChecker 仍加载时的中栏摘要 */
  planningInterim?: DecisionCheckerPlanningInterim | null;
  /** 目的地时区 — 格式化 BFF 文案中的 ISO 时间 */
  displayTimezone?: string;
  /** eligibility 过滤后的 splitPlan（无 schedule / 无 team_fit 时为 undefined） */
  splitPlan?: DecisionCheckerSplitPlanDto | null;
  /** 决策空间：裁剪检查器到当前冲突/决策问题 */
  focusConflict?: import('@/lib/planning-conflicts.util').PlanningConflictItem | null;
  focusProblem?: import('@/types/decision-problem').DecisionProblemSummary | null;
  focusProblemDetail?: import('@/types/decision-problem').DecisionProblemDetail | null;
  /** detail GET 进行中时延迟 inspector 等次级 BFF，减轻首屏并发 */
  focusProblemDetailLoading?: boolean;
  focusProblemOptions?: import('@/types/decision-problem').DecisionOption[];
  /** 工作台按天联动：当天全部问题/冲突与补充关键词 */
  scheduleDayFocus?: import('@/lib/decision-checker-focus.util').WorkbenchScheduleDayFocus | null;
  /** 按 POI 过滤洞察（如 is.reynisfjara） */
  destinationInsightsPoiSlug?: string | null;
  /** 按地点 ID 过滤洞察 */
  destinationInsightsPlaceId?: string | null;
  scheduleDayExtraTokens?: string[];
  /** 中栏当日时间轴 POI 展示名 */
  scheduleDayTimelinePois?: string[];
  /** 工作台模式副标题（如「第 5 天 · 冲突与依据」） */
  scheduleDaySubtitle?: string;
  personaAlerts?: PersonaAlert[];
  /** 中栏选中方案的 POST preview（同步到右侧「影响」Tab） */
  focusedActionPreview?: import('@/lib/unified-gateway-response.util').GatewayDecisionPreviewResult | null;
  /** 中栏 preview POST 进行中 */
  actionPreviewLoading?: boolean;
  /** 约束编辑会话内延迟了行程评估 */
  constraintEvalPending?: boolean;
  onRefreshConstraintEval?: () => void;
  /** 工作台：跳转决策空间（方案对比在中栏） */
  onOpenDecisionSpace?: (context?: {
    conflictId?: string;
    problemId?: string;
    dayIndex?: number;
  }) => void;
  /** 待确认编排草案 — 因果链级联模拟 */
  activeProposalId?: string | null;
  /** Tier-2 父级并行 decision-inspector?problemId，避免右栏重复请求 */
  sharedInspector?: SharedDecisionInspectorQuery;
  solutionCount?: number;
  /** planDiff 降级 — decisionPack.counterfactualRows */
  planDiffCounterfactualRows?: import('@/lib/decision-space-plan-diff-view.util').PlanDiffCounterfactualRowInput[];
  planDiffImpactScope?: import('@/dto/frontend-planning-decision-pack.types').PlanningDecisionImpactScope;
  planDiffUnchangedHints?: string[];
  className?: string;
}

/** 右侧 · 决策检查器（BFF SSOT：`tripnara.decision_checker@v1`） */
export const PlanningWorkbenchDecisionChecker = memo(function PlanningWorkbenchDecisionChecker({
  tripId,
  decisionChecker,
  strip,
  solutionMatrix,
  relaxation,
  onPrimaryCta,
  onOpenFeasibility,
  onOpenPlanningActions,
  planningActionCount = 0,
  planningActionLabel = '查看规划待办',
  onApplySplitPlan,
  onDiscussSplitWithNara,
  onViewSplitAlternatives,
  splitPlanSnapshotStale,
  splitPreviewPending = false,
  maxSegmentDistanceKm,
  requestedTab,
  onRequestedTabConsumed,
  onUserTabChange,
  decisionSpaceMode = false,
  decisionResolutionPhase = null,
  selectedOptionLetter = 'A',
  selectedOptionId,
  onConfirmSelectedOption,
  planningInterim,
  displayTimezone,
  splitPlan: splitPlanProp,
  focusConflict,
  focusProblem,
  focusProblemDetail,
  focusProblemDetailLoading = false,
  focusProblemOptions,
  scheduleDayFocus,
  destinationInsightsPoiSlug,
  destinationInsightsPlaceId,
  scheduleDayExtraTokens,
  scheduleDayTimelinePois,
  scheduleDaySubtitle,
  personaAlerts,
  focusedActionPreview,
  actionPreviewLoading = false,
  constraintEvalPending = false,
  onRefreshConstraintEval,
  onOpenDecisionSpace,
  activeProposalId,
  sharedInspector,
  solutionCount = 0,
  planDiffCounterfactualRows,
  planDiffImpactScope,
  planDiffUnchangedHints,
  className,
}: PlanningWorkbenchDecisionCheckerProps) {
  const { t } = useTranslation();
  const defaultTab = decisionSpaceMode ? 'causal' : 'overview';
  const [tab, setTab] = useState(defaultTab);
  const [includeDestinationRag, setIncludeDestinationRag] = useState(false);
  const [inspectorIdleReady, setInspectorIdleReady] = useState(false);
  const prevRequestedTabRef = useRef<string | null>(null);
  const prevDecisionFocusRef = useRef<string | null>(null);
  const prevDecisionSpaceModeRef = useRef(decisionSpaceMode);

  const middleColumnHasOptions = Boolean(focusProblemOptions?.length);

  const handleTabChange = (value: string) => {
    setTab(value);
    onUserTabChange?.(value);
  };

  const dc = decisionChecker ?? {
    data: null,
    source: null,
    loading: false,
    awaitingEmbedded: false,
    refreshing: false,
    error: null,
    unavailable: false,
    reload: async () => {},
    refresh: async () => {},
  };

  const data = useMemo(() => {
    const normalized = normalizeDecisionCheckerResponse(dc.data, tripId);
    const shouldScopeByScheduleDay =
      !decisionSpaceMode && scheduleDayFocus != null;
    if (!focusConflict && !focusProblem && !shouldScopeByScheduleDay) {
      return normalized;
    }
    return scopeDecisionCheckerForDecisionSpace(normalized, {
      conflict: focusConflict,
      problem: focusProblem,
      problemDetail: focusProblemDetail,
      problemOptions: focusProblemOptions,
      scheduleDayIndex: scheduleDayFocus?.dayIndex,
      scheduleDayProblems: scheduleDayFocus?.dayProblems,
      scheduleDayConflicts: scheduleDayFocus?.dayConflicts,
      scheduleDayExtraTokens,
      scheduleDayTimelinePois,
    });
  }, [
    dc.data,
    tripId,
    decisionSpaceMode,
    focusConflict,
    focusProblem,
    focusProblemDetail,
    focusProblemOptions,
    scheduleDayFocus,
    scheduleDayExtraTokens,
    scheduleDayTimelinePois,
  ]);

  const impactModel = useMemo(() => {
    if (!decisionSpaceMode || !focusedActionPreview) {
      return data.impact;
    }
    return mergePreviewIntoDecisionCheckerImpact(
      data.impact,
      focusedActionPreview,
      displayTimezone,
    );
  }, [data.impact, decisionSpaceMode, focusedActionPreview, displayTimezone]);

  const splitPlan = splitPlanProp ?? undefined;
  const hasAlternatives = data.counterfactual.scenarios.length > 0;
  const showAlternativesTab = Boolean(decisionSpaceMode && splitPlan && hasAlternatives);
  const counterfactualTabValue = splitPlan && !hasAlternatives ? 'split' : 'counterfactual';
  const showCounterfactualTab = Boolean(
    decisionSpaceMode && (Boolean(splitPlan) || data.counterfactual.scenarios.length > 0),
  );

  const decisionCheckerTabs = useMemo(() => {
    if (decisionSpaceMode) {
      return [
        { value: 'causal', label: '因果链' },
        { value: 'plan_diff', label: '方案差异' },
        { value: 'members', label: '成员共识' },
        { value: 'feasibility', label: '可执行性' },
      ];
    }
    return [
      { value: 'overview', label: '判断' },
      { value: 'members', label: '成员' },
      { value: 'impact', label: '影响' },
      { value: 'evidence', label: '依据' },
    ];
  }, [decisionSpaceMode]);
  const tabState = {
    loading: dc.loading,
    unavailable: dc.unavailable,
    error: dc.error,
  };

  const decisionSpacePreviewView = useMemo(
    () =>
      decisionSpaceMode
        ? buildDecisionSpaceActionPreviewView({
            preview: focusedActionPreview,
            displayTimezone,
          })
        : null,
    [decisionSpaceMode, focusedActionPreview, displayTimezone],
  );

  const selectedOptionTitle = useMemo(() => {
    if (!decisionSpaceMode || !focusProblemOptions?.length) return undefined;
    if (selectedOptionId) {
      return focusProblemOptions.find((option) => option.id === selectedOptionId)?.title;
    }
    const index = Math.max(0, selectedOptionLetter.charCodeAt(0) - 65);
    return focusProblemOptions[index]?.title ?? focusProblemOptions[0]?.title;
  }, [decisionSpaceMode, focusProblemOptions, selectedOptionLetter, selectedOptionId]);

  const inspectorFetchOptionId = selectedOptionId?.trim() || undefined;

  const displayOptionId = useMemo(() => {
    if (inspectorFetchOptionId) return inspectorFetchOptionId;
    if (!focusProblemOptions?.length) return undefined;
    const index = Math.max(0, selectedOptionLetter.charCodeAt(0) - 65);
    return focusProblemOptions[index]?.id ?? focusProblemOptions[0]?.id;
  }, [inspectorFetchOptionId, focusProblemOptions, selectedOptionLetter]);

  const inspectorConflictId = useMemo(
    () => resolvePlanningConflictIdForBasis(focusConflict),
    [focusConflict],
  );

  const inspectorProblemId = focusProblem?.id ?? focusProblemDetail?.id ?? null;

  /** 选方案后预拉 causal-chain（含 option_preview），即使用户尚未打开因果链 Tab */
  useDecisionCausalChain(
    tripId,
    {
      proposalId: activeProposalId,
      problemId: inspectorProblemId,
      optionId: inspectorFetchOptionId,
    },
    Boolean(
      decisionSpaceMode &&
        inspectorProblemId &&
        inspectorFetchOptionId &&
        tab !== 'causal',
    ),
  );

  const professionalReviewOption = useMemo((): DecisionOption | null => {
    if (!decisionSpaceMode || !focusProblemOptions?.length) return null;
    const matched = displayOptionId
      ? focusProblemOptions.find((option) => option.id === displayOptionId)
      : null;
    if (matched) return matched;
    if (focusedActionPreview?.tradeoffs?.length) {
      return {
        id: displayOptionId ?? 'preview',
        tradeoffs: focusedActionPreview.tradeoffs,
      };
    }
    return null;
  }, [decisionSpaceMode, focusProblemOptions, displayOptionId, focusedActionPreview]);

  const inspectorNeedsData =
    tab === 'causal' ||
    tab === 'feasibility' ||
    tab === 'members' ||
    (tab === 'plan_diff' && !focusedActionPreview);

  const useLocalInspector = decisionSpaceMode && !sharedInspector;

  useEffect(() => {
    if (!useLocalInspector) return undefined;
    setInspectorIdleReady(false);
    if (focusProblemDetailLoading) return undefined;
    return deferUntilIdle(() => setInspectorIdleReady(true));
  }, [useLocalInspector, focusProblemDetailLoading, inspectorProblemId, activeProposalId]);

  const localInspectorEnabled = Boolean(
    useLocalInspector &&
      inspectorIdleReady &&
      inspectorNeedsData &&
      (activeProposalId || inspectorProblemId) &&
      !focusProblemDetailLoading,
  );

  const localInspectorQuery = useDecisionInspector(
    tripId,
    {
      proposalId: activeProposalId,
      problemId: inspectorProblemId,
      optionId: inspectorFetchOptionId,
      conflictId: inspectorConflictId,
    },
    localInspectorEnabled,
  );

  /** 选中方案后补拉 option-scoped decision-inspector（legacy 路径；bundle 由 Tier-2 surface=inspector 内联） */
  const optionInspectorEnabled = Boolean(
    useLocalInspector &&
      inspectorFetchOptionId &&
      (inspectorProblemId || activeProposalId) &&
      !focusProblemDetailLoading,
  );

  const optionInspectorQuery = useDecisionInspector(
    tripId,
    {
      proposalId: activeProposalId,
      problemId: inspectorProblemId,
      optionId: inspectorFetchOptionId,
      conflictId: inspectorConflictId,
    },
    optionInspectorEnabled,
  );

  const baseInspector = sharedInspector?.data ?? localInspectorQuery.data;
  const activeInspector = useMemo(() => {
    const optionScoped = optionInspectorQuery.data;
    const base = baseInspector;
    if (optionScoped?.planDiff?.changeRows?.length) return optionScoped;
    if (base?.planDiff?.changeRows?.length) {
      return optionScoped ? { ...optionScoped, planDiff: base.planDiff } : base;
    }
    return optionScoped ?? base;
  }, [optionInspectorQuery.data, baseInspector]);

  const refetchInspector = useCallback(() => {
    sharedInspector?.refetch();
    void optionInspectorQuery.refetch();
    void localInspectorQuery.refetch();
  }, [sharedInspector, optionInspectorQuery, localInspectorQuery]);

  const inspectorEnabled = sharedInspector
    ? Boolean(decisionSpaceMode && (activeProposalId || inspectorProblemId))
    : localInspectorEnabled;

  const tabEmptyState = activeInspector?.tabEmptyState;
  const inspectorBusy =
    (sharedInspector?.isLoading && !baseInspector) ||
    (sharedInspector?.isFetching ?? false) ||
    optionInspectorQuery.isLoading ||
    optionInspectorQuery.isFetching ||
    localInspectorQuery.isLoading ||
    localInspectorQuery.isFetching;

  const inspectorHasError =
    (sharedInspector?.isError && !baseInspector && !optionInspectorQuery.data) ||
    (optionInspectorEnabled && optionInspectorQuery.isError && !activeInspector) ||
    (localInspectorEnabled && localInspectorQuery.isError && !activeInspector);

  const hasSelection = Boolean(inspectorFetchOptionId);
  const optionInspectorLoading =
    optionInspectorEnabled &&
    (optionInspectorQuery.isLoading || optionInspectorQuery.isFetching) &&
    !optionInspectorQuery.data?.planDiff?.changeRows?.length;

  const planDiffTabEmpty = resolveInspectorTabDeferred('planDiff', tabEmptyState, {
    hasPreview: Boolean(focusedActionPreview),
    hasInspectorSlice: Boolean(activeInspector?.planDiff?.changeRows?.length),
    isLoading:
      optionInspectorLoading ||
      actionPreviewLoading ||
      Boolean(hasSelection && sharedInspector?.isFetching),
    hasSelection,
  });

  const feasibilityTabEmpty = resolveInspectorTabDeferred('feasibility', tabEmptyState, {
    hasInspectorSlice: Boolean(activeInspector?.feasibility),
    isLoading: optionInspectorLoading,
    hasSelection,
  });

  const membersTabEmpty = resolveInspectorTabDeferred('memberConsensus', tabEmptyState, {
    hasInspectorSlice: Boolean(activeInspector?.memberConsensus?.opinions?.length),
    isLoading: optionInspectorLoading,
    hasSelection,
  });
  const inspectorFeasibilityView = useMemo(
    () =>
      activeInspector?.feasibility
        ? feasibilityViewFromInspector(
            activeInspector.feasibility,
            selectedOptionLetter,
            selectedOptionTitle,
          )
        : null,
    [activeInspector?.feasibility, selectedOptionLetter, selectedOptionTitle],
  );
  const inspectorMembersView = useMemo(
    () =>
      activeInspector?.memberConsensus
        ? membersConsensusViewFromInspector(
            activeInspector.memberConsensus,
            selectedOptionLetter,
          )
        : null,
    [activeInspector?.memberConsensus, selectedOptionLetter],
  );

  const decisionSpaceNarrative = useMemo(() => {
    if (!decisionSpaceMode) return null;
    return (
      focusProblemDetail?.description?.trim() ||
      focusProblem?.affectedScopeSummary?.trim() ||
      focusConflict?.message?.trim() ||
      null
    );
  }, [decisionSpaceMode, focusProblemDetail, focusProblem, focusConflict]);

  const focusCausalStoryView = (
    focusProblemDetail as import('@/lib/unified-gateway-response.util').GatewayDecisionProblemDetailResult | null
  )?.causalStoryView;

  const causalChainNarrative = useMemo(() => {
    if (hasGatewayCausalStoryView({ causalStoryView: focusCausalStoryView ?? undefined })) {
      return null;
    }
    return decisionSpaceNarrative;
  }, [focusCausalStoryView, decisionSpaceNarrative]);

  const guardianWarningView = useMemo(() => {
    if (!decisionSpaceMode) {
      return {
        headline: undefined as string | undefined,
        contextLabel: undefined as string | undefined,
        primaryEnforcement: undefined as string | undefined,
      };
    }
    const queueDisplay = focusProblem ? resolveDecisionProblemQueueDisplay(focusProblem) : null;
    const contextParts = [queueDisplay?.dayBadge, queueDisplay?.issueTitle].filter(Boolean);
    const headline =
      resolveDecisionSpaceGuardianWarning({
        detail: focusProblemDetail,
        preview: focusedActionPreview,
        problem: focusProblem,
      }) ||
      (focusProblem?.primaryEnforcement === 'BLOCK'
        ? '不处理此项，行程无法继续锁定或确认。'
        : undefined);

    return {
      headline,
      contextLabel: contextParts.length ? contextParts.join(' · ') : undefined,
      primaryEnforcement: focusProblem?.primaryEnforcement,
    };
  }, [decisionSpaceMode, focusProblem, focusProblemDetail, focusedActionPreview]);

  const scheduleDayEvidenceEmptyMessage = useMemo(() => {
    if (decisionSpaceMode || scheduleDayFocus == null) return undefined;
    const day = scheduleDayFocus.dayIndex + 1;
    return `第 ${day} 天暂无决策检查器证据条目。可点击右上角刷新按钮重新加载，或确认服务端已按当日 itinerary POI 投影 evidence.items。`;
  }, [decisionSpaceMode, scheduleDayFocus]);

  const destinationInsightsScope = useMemo(
    () => ({
      problemId: focusProblem?.id ?? focusProblemDetail?.id,
      focusConflictId: focusConflict?.id ?? data.focusConflictId,
      poiSlug: destinationInsightsPoiSlug,
      placeId: destinationInsightsPlaceId,
      dayIndex: scheduleDayFocus?.dayIndex,
      includeRag: includeDestinationRag,
    }),
    [
      focusProblem?.id,
      focusProblemDetail?.id,
      focusConflict?.id,
      data.focusConflictId,
      destinationInsightsPoiSlug,
      destinationInsightsPlaceId,
      scheduleDayFocus?.dayIndex,
      includeDestinationRag,
    ],
  );

  const destinationInsightsQuery = useTripDestinationInsights(tripId, {
    ...destinationInsightsScope,
    enabled: tab === 'evidence',
  });

  const decisionCheckerBusy = dc.loading || dc.refreshing;

  const handleRefreshDecisionChecker = () => {
    void dc.reload();
  };

  const primaryCtaType: DecisionStripCtaType = strip?.model?.primaryCta?.type ?? 'open_feasibility';
  const primaryCtaLabel =
    strip?.model?.primaryCta?.labelOverride?.trim() ||
    t(`decisionStrip.cta.${DECISION_STRIP_CTA_LABEL_KEY[primaryCtaType]}`, {
      defaultValue: '查看修复方案',
    });

  useEffect(() => {
    if (!requestedTab) {
      prevRequestedTabRef.current = null;
      return;
    }

    if (requestedTab === 'counterfactual') {
      setTab(counterfactualTabValue);
      prevRequestedTabRef.current = requestedTab;
      onRequestedTabConsumed?.();
      return;
    }

    if (prevRequestedTabRef.current === requestedTab) return;

    const mappedTab =
      decisionSpaceMode && requestedTab === 'evidence'
        ? 'causal'
        : decisionSpaceMode && requestedTab === 'impact'
          ? 'plan_diff'
          : decisionSpaceMode && requestedTab === 'overview'
            ? 'feasibility'
            : requestedTab;

    setTab(mappedTab);
    prevRequestedTabRef.current = requestedTab;
    onRequestedTabConsumed?.();
  }, [requestedTab, counterfactualTabValue, onRequestedTabConsumed, decisionSpaceMode]);

  useEffect(() => {
    if (prevDecisionSpaceModeRef.current === decisionSpaceMode) return;
    prevDecisionSpaceModeRef.current = decisionSpaceMode;
    setTab(decisionSpaceMode ? 'causal' : 'overview');
  }, [decisionSpaceMode]);

  useEffect(() => {
    const focusKey = focusProblem?.id ?? focusConflict?.id ?? null;
    if (!focusKey || focusKey === prevDecisionFocusRef.current) return;
    prevDecisionFocusRef.current = focusKey;
    setIncludeDestinationRag(false);
    setTab(decisionSpaceMode ? 'causal' : 'overview');
  }, [decisionSpaceMode, focusConflict?.id, focusProblem?.id]);

  const handleOpenDecisionSpaceFromPanel = () => {
    onOpenDecisionSpace?.({
      conflictId: focusConflict?.id,
      problemId: focusProblem?.id,
      dayIndex: scheduleDayFocus?.dayIndex,
    });
  };

  useEffect(() => {
    setIncludeDestinationRag(false);
  }, [
    focusConflict?.id,
    focusProblem?.id,
    scheduleDayFocus?.dayIndex,
    destinationInsightsPoiSlug,
    destinationInsightsPlaceId,
  ]);

  const actionContext = {
    onOpenFeasibility,
    onOpenEvidence: () => setTab('evidence'),
    onPrimaryCta: () => onPrimaryCta(primaryCtaType),
    onApplyRelaxation: (actionId: string) => {
      relaxation?.onToggleAction(actionId);
      onPrimaryCta(primaryCtaType);
    },
    onSelectOption: (optionId: string) => {
      solutionMatrix?.matrix.setSelectedOptionId(optionId);
      solutionMatrix?.matrix.setExpanded(true);
    },
    onOpenRepairPlan: () => onOpenFeasibility?.(),
    onApplySplitPlan,
    onDiscussWithNara: onDiscussSplitWithNara,
    onViewSplitAlternatives,
  };

  const handleViewRepair = () => {
    const cta = data.overview.repairPlan?.cta;
    if (runDecisionCheckerAction(cta, actionContext)) return;
    if (relaxation?.visible && relaxation.suggestions.length > 0) {
      onPrimaryCta(primaryCtaType);
      return;
    }
    onOpenFeasibility?.();
  };

  const handleSelectScenario = (scenarioId: string) => {
    const scenario = data.counterfactual.scenarios.find((s) => s.id === scenarioId);
    if (scenario?.action && runDecisionCheckerAction(scenario.action, actionContext)) return;
    if (relaxation?.suggestions.some((s) => s.actionId === scenarioId)) {
      relaxation.onToggleAction(scenarioId);
      onPrimaryCta(primaryCtaType);
      return;
    }
    solutionMatrix?.matrix.setSelectedOptionId(scenarioId);
    solutionMatrix?.matrix.setExpanded(true);
  };

  return (
    <div className={cn(workbenchDecisionShell, className)}>
      <div className={cn(workbenchPanelHeader, 'flex items-start justify-between gap-2')}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {decisionSpaceMode ? (
              <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ScanSearch className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <h2 className={workbenchPanelTitle}>
              {decisionSpaceMode ? '决策检查器' : '行程诊断'}
            </h2>
          </div>
          {decisionSpaceMode ? (
            <p className="mt-0.5 truncate pl-6 text-[11px] text-muted-foreground">
              基于当前预测与原计划进行差异分析
            </p>
          ) : scheduleDaySubtitle ? (
            <p className="mt-0.5 truncate pl-6 text-[11px] text-muted-foreground">
              {scheduleDaySubtitle}
            </p>
          ) : (
            <p className="mt-0.5 truncate pl-6 text-[11px] text-muted-foreground">
              {focusConflict || focusProblem
                ? '说明为何需要决定 · 方案请在决策空间确认'
                : '按选中天查看判断、成员、影响与依据'}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          disabled={decisionCheckerBusy}
          onClick={handleRefreshDecisionChecker}
          title="刷新决策检查器"
          aria-label="刷新决策检查器"
        >
          <RefreshCw className={cn('h-4 w-4', decisionCheckerBusy && 'animate-spin')} />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
        <TabsList className={cn(workbenchDecisionCheckerTabList, 'relative z-10 mx-3 mt-1.5 w-auto shrink-0 justify-start overflow-x-auto border-b border-border/40 pb-0')}>
          {decisionCheckerTabs.map(({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={workbenchDecisionCheckerTabTrigger}
            >
              {label}
            </TabsTrigger>
          ))}
          {showAlternativesTab ? (
            <TabsTrigger value="alternatives" className={workbenchDecisionCheckerTabTrigger}>
              备选
            </TabsTrigger>
          ) : null}
        </TabsList>

        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-1.5', workbenchScrollable)}>
          {constraintEvalPending && onRefreshConstraintEval ? (
            <ConstraintEvalPendingBanner
              onRefresh={onRefreshConstraintEval}
              refreshing={decisionCheckerBusy}
              className="mx-0.5"
            />
          ) : null}
          {splitPlanSnapshotStale ? (
            <p className={cn('mb-2 px-2.5 py-1.5', workbenchDecisionCheckerStaleBanner)}>
              分流方案快照与当前决策检查器版本不一致，请刷新后重试。
            </p>
          ) : null}
          <TabsContent value="overview" className="mt-0">
            {tab === 'overview' && !decisionSpaceMode ? (
            <DecisionCheckerOverviewTab
              model={data.overview}
              evidence={data.evidence}
              impact={data.impact}
              isStale={data.isStale}
              staleReason={data.staleReason}
              {...tabState}
              awaitingEmbedded={dc.awaitingEmbedded}
              planningInterim={planningInterim}
              onViewEvidence={() => setTab('evidence')}
              onViewImpact={() => setTab('impact')}
              onViewRepair={handleViewRepair}
              onExploreMore={
                decisionSpaceMode ? () => solutionMatrix?.matrix.setExpanded(true) : undefined
              }
              primaryCtaLabel={primaryCtaLabel}
              showExploreMore={decisionSpaceMode && solutionMatrix?.matrix.model.visible}
              displayTimezone={displayTimezone}
              planningActionCount={planningActionCount}
              planningActionLabel={planningActionLabel}
              onOpenPlanningActions={onOpenPlanningActions}
              maxSegmentDistanceKm={maxSegmentDistanceKm}
              personaAlerts={personaAlerts}
              selectedOptionLetter={selectedOptionLetter}
              decisionSpaceMode={decisionSpaceMode}
              middleColumnHasOptions={middleColumnHasOptions}
              scheduleDayScoped={Boolean(scheduleDayFocus)}
              scheduleDayLabel={scheduleDaySubtitle}
              onOpenDecisionSpace={
                decisionSpaceMode ? undefined : handleOpenDecisionSpaceFromPanel
              }
              solutionCount={solutionCount}
            />
            ) : null}
          </TabsContent>

          <TabsContent value="evidence" className="mt-0 space-y-3">
            {tab === 'evidence' && !decisionSpaceMode ? (
            <>
            <DecisionCheckerEvidenceTab
              model={data.evidence}
              displayTimezone={displayTimezone}
              emptyMessage={scheduleDayEvidenceEmptyMessage}
              onRefresh={handleRefreshDecisionChecker}
              refreshing={decisionCheckerBusy}
              {...tabState}
            />
            <DestinationInsightsSection
              insights={destinationInsightsQuery.data?.insights ?? {}}
              response={destinationInsightsQuery.data ?? null}
              loading={destinationInsightsQuery.isLoading}
              error={
                destinationInsightsQuery.error instanceof Error
                  ? destinationInsightsQuery.error.message
                  : null
              }
              displayTimezone={displayTimezone}
              includeRag={includeDestinationRag}
              ragLoading={destinationInsightsQuery.isFetching && includeDestinationRag}
              onRequestRag={() => setIncludeDestinationRag(true)}
              hideConflictExplanation={decisionSpaceMode}
            />
            </>
            ) : null}
          </TabsContent>

          {decisionSpaceMode ? (
            <TabsContent value="causal" className="mt-0">
              {tab === 'causal' ? (
                <div className="space-y-3">
                  <DecisionSpaceCausalChainPanel
                    tripId={tripId}
                    proposalId={activeProposalId}
                    tabActive
                    problemOnlyBinding={Boolean(inspectorProblemId && !activeProposalId)}
                    problemId={inspectorProblemId}
                    optionId={inspectorFetchOptionId}
                    inspectorCausalChain={activeInspector?.causalChain}
                    inspectorLoading={inspectorBusy}
                    onInspectorRefresh={refetchInspector}
                    tabEmpty={Boolean(tabEmptyState?.causalChain)}
                    emptyMessage={inspectorTabEmptyMessage('causalChain', activeInspector)}
                    preferInspectorOnly={inspectorEnabled}
                    checkerCascade={data.impact.cascade}
                    detail={focusProblemDetail}
                    causalStoryView={focusCausalStoryView}
                    guardianCausalStoryView={
                      (focusProblemDetail as import('@/lib/unified-gateway-response.util').GatewayDecisionProblemDetailResult | null)
                        ?.guardianCausalStoryView
                    }
                    focusProblemOptions={focusProblemOptions}
                    guardianWarningHeadline={guardianWarningView.headline}
                    guardianWarningContextLabel={guardianWarningView.contextLabel}
                    guardianPrimaryEnforcement={guardianWarningView.primaryEnforcement}
                    evidence={data.evidence}
                    narrative={causalChainNarrative}
                  />
                  {professionalReviewOption ? (
                    <DecisionProfessionalReviewStrip
                      selectedOption={professionalReviewOption}
                      selectedOptionLetter={selectedOptionLetter}
                      personaAlerts={personaAlerts}
                    />
                  ) : null}
                </div>
              ) : null}
            </TabsContent>
          ) : null}

          {decisionSpaceMode ? (
            <TabsContent value="plan_diff" className="mt-0">
              {tab === 'plan_diff' ? (
                <DecisionSpacePlanDiffPanel
                  preview={focusedActionPreview}
                  itineraryDiff={decisionSpacePreviewView?.itineraryDiff}
                  mutationLines={decisionSpacePreviewView?.mutationLines}
                  comparison={decisionSpacePreviewView?.comparison}
                  optionLetter={selectedOptionLetter}
                  optionTitle={selectedOptionTitle}
                  inspectorPlanDiff={activeInspector?.planDiff}
                  counterfactualRows={planDiffCounterfactualRows}
                  impactScope={planDiffImpactScope}
                  unchangedHints={planDiffUnchangedHints}
                  tabEmpty={planDiffTabEmpty}
                  emptyMessage={inspectorTabEmptyMessage('planDiff', activeInspector, undefined, {
                    hasSelection,
                  })}
                  loading={
                    hasSelection &&
                    !planDiffTabEmpty &&
                    !activeInspector?.planDiff?.changeRows?.length &&
                    (actionPreviewLoading ||
                      optionInspectorLoading ||
                      Boolean(sharedInspector?.isFetching))
                  }
                />
              ) : null}
            </TabsContent>
          ) : null}

          {decisionSpaceMode ? (
            <TabsContent value="feasibility" className="mt-0">
              {tab === 'feasibility' ? (
                <DecisionSpaceFeasibilityGatePanel
                  detail={focusProblemDetail}
                  problem={focusProblem}
                  optionLetter={selectedOptionLetter}
                  optionTitle={selectedOptionTitle}
                  inspectorView={
                    feasibilityTabEmpty ? undefined : inspectorFeasibilityView
                  }
                  tabEmpty={feasibilityTabEmpty}
                  emptyMessage={inspectorTabEmptyMessage('feasibility', activeInspector)}
                  loading={feasibilityTabEmpty && optionInspectorLoading}
                />
              ) : null}
            </TabsContent>
          ) : null}

          <TabsContent value="impact" className="mt-0">
            {tab === 'impact' && !decisionSpaceMode ? (
            <DecisionCheckerImpactTab
              model={impactModel}
              displayTimezone={displayTimezone}
              {...tabState}
              onViewRepair={decisionSpaceMode ? handleViewRepair : undefined}
            />
            ) : null}
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            {tab === 'members' ? (
            decisionSpaceMode ? (
              <DecisionSpaceMembersConsensusPanel
                memberImpacts={focusProblemDetail?.memberImpacts}
                optionLetter={selectedOptionLetter}
                loading={inspectorBusy && !activeInspector}
                error={
                  inspectorHasError && inspectorEnabled
                    ? '成员共识加载失败，请稍后重试。'
                    : tabState.error
                }
                inspectorView={
                  membersTabEmpty ? undefined : inspectorMembersView
                }
                tabEmpty={membersTabEmpty}
                emptyMessage={inspectorTabEmptyMessage('memberConsensus', activeInspector)}
              />
            ) : (
            <DecisionCheckerMembersTab
              personaAlerts={personaAlerts}
              memberImpacts={focusProblemDetail?.memberImpacts}
              selectedOptionLetter={selectedOptionLetter}
              {...tabState}
            />
            )
            ) : null}
          </TabsContent>

          {decisionSpaceMode && splitPlan ? (
            <TabsContent value="split" className="mt-0">
              {tab === 'split' ? (
              <DecisionCheckerSplitTab
                model={splitPlan}
                splitPreviewPending={splitPreviewPending}
                displayTimezone={displayTimezone}
                {...tabState}
                actionContext={actionContext}
              />
              ) : null}
            </TabsContent>
          ) : null}

          {showAlternativesTab ? (
            <TabsContent value="alternatives" className="mt-0">
              {tab === 'alternatives' ? (
              <DecisionCheckerCounterfactualTab
                model={data.counterfactual}
                displayTimezone={displayTimezone}
                {...tabState}
                onSelectScenario={handleSelectScenario}
              />
              ) : null}
            </TabsContent>
          ) : null}

          {showCounterfactualTab ? (
            <TabsContent value="counterfactual" className="mt-0">
              {tab === 'counterfactual' ? (
              <DecisionCheckerCounterfactualTab
                model={data.counterfactual}
                displayTimezone={displayTimezone}
                {...tabState}
                onSelectScenario={handleSelectScenario}
              />
              ) : null}
            </TabsContent>
          ) : null}

          {!decisionSpaceMode ? (
            <TabsContent value="records" className="mt-0">
              {tab === 'records' ? (
              <DecisionCheckerRecordsTab {...tabState} />
              ) : null}
            </TabsContent>
          ) : null}
        </div>
      </Tabs>

      {decisionSpaceMode &&
      onConfirmSelectedOption &&
      decisionResolutionPhase === 'apply' &&
      isApplyAndPollChain(resolveSummaryWriteChain(focusProblem)) ? (
        <div className="sticky bottom-0 z-10 shrink-0 border-t border-border/60 bg-card/95 px-3 py-3 backdrop-blur-sm">
          <Button
            className={cn('h-10 w-full rounded-lg text-xs', workbenchPrimaryAction)}
            onClick={onConfirmSelectedOption}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            确认方案 {selectedOptionLetter} 并生成草案
          </Button>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
            确认后将更新相关日程，并同步至团队视图。
          </p>
        </div>
      ) : null}
    </div>
  );
});
