import { useMemo, useState, useEffect, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Vote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { UseDecisionCheckerResult } from '@/hooks/useDecisionChecker';
import type { UseSolutionMatrixModelResult } from '@/hooks/useSolutionMatrixModel';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import { resolveActiveDecisionProblem } from '@/lib/planning-conflicts-decision.util';
import { dayLabelForDecisionProblem } from '@/lib/decision-problem-display.util';
import {
  dayLabelForDecisionContext,
  stripEmbeddedDayFromDecisionTitle,
} from '@/lib/impact-scope-i18n.util';
import { isDecisionCheckerFocusedOnConflict } from '@/lib/decision-checker-focus.util';
import {
  mapDecisionOptionsToCheckerScenarios,
  resolveDecisionProblemDescription,
} from '@/lib/decision-problem-display.util';
import { buildDecisionSpaceOptionViews } from '@/lib/decision-space-option-view.util';
import { useDecisionProblemSpaceContent } from '@/hooks/useDecisionProblemFlow';
import { useDecisionOptionPreviewEnrichment } from '@/hooks/useDecisionOptionPreviewEnrichment';
import { useDecisionProblemNegotiationPreflight } from '@/hooks/useDecisionProblemNegotiationPreflight';
import { shouldShowDecisionSpaceCollaborationActions } from '@/lib/decision-negotiation-eligibility.util';
import { isUnifiedDecisionGatewayEnabled } from '@/lib/decision-gateway.util';
import { resolveSummaryWriteChain, isEvaluateAuthorizeExecuteChain } from '@/lib/decision-write-chain.util';
import type { DecisionProblemNegotiationProjection } from '@/types/decision-problem-negotiation';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';
import type { DecisionOption, DecisionProblemDetail, DecisionProblemSummary } from '@/types/decision-problem';
import type { TripDetail } from '@/types/trip';
import { DecisionProblemResolutionSection } from '@/components/decision-problems/DecisionProblemResolutionSection';
import { DecisionBeforeAfterPanel } from '@/components/decision-problems/DecisionBeforeAfterPanel';
import { buildDecisionContextCapsuleFacts } from '@/lib/decision-context-capsule.util';
import { resolvePlanningConflictIdForBasis } from '@/lib/planning-decision-basis-query.util';
import { resolveDecisionProblemQueueDisplay } from '@/lib/decision-problem-queue-display.util';
import { resolveDecisionSpaceGuardianWarning } from '@/lib/decision-space-guardian-warning.util';
import { matchPackOptionIdForAction } from '@/lib/decision-proposal-option-view.util';
import {
  getOptionLetter,
} from '@/dto/frontend-planning-decision-option.util';
import { usePlanProposal } from '@/components/plan-studio/workbench/arrange-itinerary/usePlanProposal';
import { optionNeedsPreviewEnrichment } from '@/lib/decision-option-preview-enrichment.util';
import { buildDecisionApplyCtaLabel, buildDecisionWriteSummary } from '@/lib/decision-write-summary.util';
import { extractItineraryDiffFromDecisionPreview } from '@/lib/decision-space-itinerary-diff.util';
import { DecisionValidityStrip } from '@/components/decision-problems/DecisionValidityStrip';
import { DecisionWriteBackStepsPanel } from '@/components/decision-problems/DecisionWriteBackStepsPanel';
import { DecisionAcknowledgementConfirmDialog } from '@/components/decision-problems/DecisionAcknowledgementConfirmDialog';
import { DecisionResolutionStepBar } from '@/components/decision-problems/DecisionResolutionStepBar';
import { decisionActionConfirmLabel } from '@/lib/decision-action-display.util';
import { useDecisionProblemActions } from '@/hooks/useDecisionProblemActions';
import { CandidateComparisonViewPanel } from '@/components/decision-problems/CandidateComparisonViewPanel';
import type { CandidateComparisonView } from '@/types/candidate-comparison';
import {
  normalizeDecisionCheckerResponse,
  type DecisionCheckerScenarioDto,
} from '@/types/decision-checker';
import { DecisionSpaceOptionCard } from './DecisionSpaceOptionCard';
import { WorkbenchPrivateConcernsPanel } from './WorkbenchPrivateConcernsPanel';
import {
  workbenchCard,
  workbenchColumnSurface,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchPrimaryAction,
} from './workbench-ui';

export interface PlanningWorkbenchDecisionSpaceProps {
  tripId: string;
  conflict?: PlanningConflictItem | null;
  conflicts?: PlanningConflictItem[];
  decisionChecker?: UseDecisionCheckerResult;
  solutionMatrix?: UseSolutionMatrixModelResult;
  memberCount?: number;
  collaboratorCount?: number;
  onBack?: () => void;
  /** 返回按钮文案（默认「返回行程分析」） */
  backLabel?: string;
  /** 跳转行程概览 Tab */
  onOpenTravelStatus?: () => void;
  onSelectOption?: (optionId: string) => void;
  onInitiateNegotiation?: (payload?: { selectedOptionId?: string | null }) => void;
  onInitiateVote?: () => void;
  onOpenCollaboration?: (payload?: { selectedOptionId?: string | null }) => void;
  negotiationSubmitting?: boolean;
  /** decision-problems BFF */
  decisionProblems?: DecisionProblemSummary[];
  activeProblemId?: string | null;
  useDecisionProblemsBff?: boolean;
  onOpenDecisionProblem?: (problemId: string) => void;
  /** 父级共享的 BFF 内容（与决策检查器联动，避免重复请求） */
  bffSpaceContent?: {
    detail: GatewayDecisionProblemDetailResult | DecisionProblemDetail | null;
    options: DecisionOption[];
    optionsActions?: import('@/types/unified-decision').DecisionAction[];
    comparisonView?: CandidateComparisonView | null;
    packOptions?: import('@/dto/frontend-planning-decision-pack.types').PlanningDecisionPackOption[];
    loading: boolean;
    detailLoading?: boolean;
    basisLoading?: boolean;
    optionsLoading?: boolean;
    error: string | null;
    reload?: () => void;
  };
  /** Canonical L2 execute 后刷新行程 / 列表 */
  onCanonicalExecuted?: () => void | Promise<void>;
  /** 预约凭证保存后刷新冲突 / 队列 */
  onReservationEvidenceSaved?: () => void | Promise<void>;
  trip?: TripDetail | null;
  personaAlerts?: import('@/types/trip').PersonaAlert[];
  /** 目的地 IANA 时区（格式化方案文案中的 ISO 时间） */
  displayTimezone?: string;
  collaborators?: import('@/types/trip').Collaborator[] | null;
  collaboratorsLoading?: boolean;
  /** 中栏 preview 变更时通知父级（同步右侧「影响」Tab） */
  onActionPreviewChange?: (payload: {
    preview: import('@/lib/unified-gateway-response.util').GatewayDecisionPreviewResult | null;
    loading: boolean;
    /** 决策检查器 optionId（pack option id 优先） */
    selectedOptionId?: string | null;
    selectedOptionLetter?: string;
  }) => void;
  /** 顶栏模式条已展示时，隐藏中栏重复的 header / 步骤条 */
  compactChrome?: boolean;
  /** orchestration.activeProposalId — decision-basis optionCount */
  activeProposalId?: string | null;
  /** Tier-2 父级并行 decision-inspector?problemId — 跳过 decision-basis 独立请求 */
  inspectorBasis?: import('@/dto/frontend-planning-decision-basis.types').PlanningDecisionBasis | null;
  className?: string;
}

function buildMatrixScenarios(
  matrix: UseSolutionMatrixModelResult,
): DecisionCheckerScenarioDto[] {
  if (!matrix.model.visible) return [];
  const letters = ['A', 'B', 'C'];
  return matrix.model.columns.map((column, index) => {
    const rowValues = matrix.model.rows.slice(0, 3).flatMap((row) => {
      const cell = row.cells[index];
      if (!cell) return [];
      return [
        {
          key: `${column.optionId}-${row.dimensionId}`,
          label: row.label,
          displayValue: cell.displayValue,
          tone:
            cell.diffTone === 'better'
              ? ('good' as const)
              : cell.diffTone === 'worse'
                ? ('bad' as const)
                : ('neutral' as const),
        },
      ];
    });

    return {
      id: column.optionId,
      letter: letters[index],
      title: column.label,
      badge: column.isRecommended ? ('recommended' as const) : ('alternative' as const),
      badgeLabel: column.isRecommended ? '推荐' : undefined,
      description: column.caveat ?? '基于当前约束生成的替代方案。',
      variant: 'blue' as const,
      metrics: rowValues,
    };
  });
}

/** 中间 · 决策空间（设计稿样式） */
export const PlanningWorkbenchDecisionSpace = memo(function PlanningWorkbenchDecisionSpace({
  tripId,
  conflict,
  conflicts: _conflicts = [],
  decisionChecker,
  solutionMatrix,
  memberCount = 0,
  collaboratorCount = 0,
  onBack,
  backLabel = '返回行程分析',
  onOpenTravelStatus,
  onSelectOption,
  onInitiateNegotiation,
  onInitiateVote,
  onOpenCollaboration,
  negotiationSubmitting = false,
  decisionProblems,
  activeProblemId,
  useDecisionProblemsBff = false,
  onOpenDecisionProblem: _onOpenDecisionProblem,
  bffSpaceContent,
  onCanonicalExecuted,
  onReservationEvidenceSaved,
  trip,
  personaAlerts,
  displayTimezone,
  collaborators,
  collaboratorsLoading,
  onActionPreviewChange,
  compactChrome = false,
  activeProposalId,
  inspectorBasis,
  className,
}: PlanningWorkbenchDecisionSpaceProps) {
  const { i18n } = useTranslation();
  const [localSelectedOptionId, setLocalSelectedOptionId] = useState<string | null>(null);

  const matchedDecisionProblem = useMemo(() => {
    if (!decisionProblems?.length) return undefined;
    return resolveActiveDecisionProblem(activeProblemId, conflict, decisionProblems);
  }, [decisionProblems, activeProblemId, conflict]);

  const writeChain = resolveSummaryWriteChain(matchedDecisionProblem);
  const useEvaluateAuthorizeExecute = isEvaluateAuthorizeExecuteChain(writeChain);
  const bffProblemId = matchedDecisionProblem?.id ?? activeProblemId ?? null;
  const canUseProblemWriteApi = useDecisionProblemsBff || isUnifiedDecisionGatewayEnabled();
  const showResolutionUi = canUseProblemWriteApi && Boolean(bffProblemId);
  const showLegacyEvaluateHint = !canUseProblemWriteApi && useEvaluateAuthorizeExecute;

  const internalBffContent = useDecisionProblemSpaceContent({
    tripId,
    problemId: bffProblemId,
    enabled: canUseProblemWriteApi && Boolean(bffProblemId) && !bffSpaceContent,
  });
  const bffContent = bffSpaceContent ?? internalBffContent;

  const activeProposalQuery = usePlanProposal(
    tripId,
    activeProposalId,
    Boolean(
      activeProposalId &&
        showResolutionUi &&
        !bffContent.detailLoading &&
        !(bffContent.packOptions?.length),
    ),
  );
  const packOptions =
    bffContent.packOptions?.length
      ? bffContent.packOptions
      : activeProposalQuery.data?.decisionPack?.options ?? [];

  const optionPreviewEnrichment = useDecisionOptionPreviewEnrichment(tripId, bffProblemId);
  const displayOptions = useMemo(
    () => optionPreviewEnrichment.mergeOptions(bffContent.options),
    [bffContent.options, optionPreviewEnrichment],
  );

  const detailForActions = (bffContent.detail as GatewayDecisionProblemDetailResult | null) ?? null;
  const decisionActionsModel = useDecisionProblemActions({
    tripId,
    problemId: bffProblemId,
    detail: detailForActions,
    options: displayOptions,
    optionsActions: bffContent.optionsActions ?? [],
    eagerPreviewOnSelect: true,
    onRefresh: async () => {
      bffContent.reload?.();
    },
    onApplied: onCanonicalExecuted,
  });

  const guardianWarningView = useMemo(() => {
    const queueDisplay = matchedDecisionProblem
      ? resolveDecisionProblemQueueDisplay(matchedDecisionProblem)
      : null;
    const contextParts = [queueDisplay?.dayBadge, queueDisplay?.issueTitle].filter(Boolean);
    const headline =
      resolveDecisionSpaceGuardianWarning({
        detail: detailForActions,
        preview: decisionActionsModel.selectedActionPreview,
        problem: matchedDecisionProblem,
      }) ||
      (matchedDecisionProblem?.primaryEnforcement === 'BLOCK'
        ? '不处理此项，行程无法继续锁定或确认。'
        : undefined);

    return {
      headline,
      contextLabel: contextParts.length ? contextParts.join(' · ') : undefined,
      primaryEnforcement: matchedDecisionProblem?.primaryEnforcement,
    };
  }, [
    matchedDecisionProblem,
    detailForActions,
    decisionActionsModel.selectedActionPreview,
  ]);

  const guardianWarningHeadline = guardianWarningView.headline;

  const [ackConfirmOpen, setAckConfirmOpen] = useState(false);
  const [ackConfirmIntent, setAckConfirmIntent] = useState<'submit' | 'apply' | null>(null);

  const openAckConfirmDialog = useCallback((intent: 'submit' | 'apply') => {
    setAckConfirmIntent(intent);
    setAckConfirmOpen(true);
  }, []);

  const handleSubmitResolutionClick = useCallback(() => {
    const action = decisionActionsModel.selectedAction;
    if (!action) return;
    if (decisionActionsModel.acknowledgementRequired.length > 0) {
      openAckConfirmDialog('submit');
      return;
    }
    void decisionActionsModel.submitResolution(action);
  }, [decisionActionsModel, openAckConfirmDialog]);

  const handleApplyToTripClick = useCallback(() => {
    if (
      decisionActionsModel.acknowledgementRequired.length > 0 &&
      !decisionActionsModel.acknowledgementsComplete
    ) {
      openAckConfirmDialog('apply');
      return;
    }
    void decisionActionsModel.applyToTrip();
  }, [decisionActionsModel, openAckConfirmDialog]);

  const handleAckConfirmDialogConfirm = useCallback(() => {
    if (!decisionActionsModel.acknowledgementsComplete) return;
    const intent = ackConfirmIntent;
    setAckConfirmOpen(false);
    setAckConfirmIntent(null);
    if (intent === 'submit' && decisionActionsModel.selectedAction) {
      void decisionActionsModel.submitResolution(decisionActionsModel.selectedAction);
      return;
    }
    if (intent === 'apply') {
      void decisionActionsModel.applyToTrip();
    }
  }, [ackConfirmIntent, decisionActionsModel]);

  const ackConfirmTitle =
    ackConfirmIntent === 'apply'
      ? '应用到行程前，请确认以下事项'
      : '提交结论前，请确认以下事项';
  const ackConfirmDescription =
    decisionActionsModel.selectedAction && ackConfirmIntent === 'submit'
      ? decisionActionConfirmLabel(decisionActionsModel.selectedAction)
      : undefined;

  const dc = decisionChecker ?? {
    data: null,
    loading: false,
    unavailable: false,
    error: null,
  };

  const data = normalizeDecisionCheckerResponse(dc.data, tripId);
  const checkerAlignedWithConflict = isDecisionCheckerFocusedOnConflict(data, conflict);

  /** options / comparisonView 已到则可先渲染行动区，不必等 detail */
  const hasBffRenderableContent = useMemo(() => {
    if (!showResolutionUi) {
      return (
        displayOptions.length > 0 ||
        Boolean(bffContent.comparisonView) ||
        Boolean(bffContent.detail)
      );
    }
    return (
      displayOptions.length > 0 ||
      packOptions.length > 0 ||
      (bffContent.optionsActions?.length ?? 0) > 0 ||
      Boolean(
        (bffContent.detail as GatewayDecisionProblemDetailResult | null)?.actions?.length,
      )
    );
  }, [
    showResolutionUi,
    displayOptions,
    packOptions,
    bffContent.optionsActions,
    bffContent.comparisonView,
    bffContent.detail,
  ]);

  const bffStillBootstrapping =
    showResolutionUi &&
    !hasBffRenderableContent &&
    !bffContent.error &&
    bffContent.detailLoading;

  const loading = bffStillBootstrapping || (!canUseProblemWriteApi && dc.loading);

  useEffect(() => {
    setLocalSelectedOptionId(null);
  }, [bffProblemId, conflict?.id]);

  const comparisonView = bffContent.comparisonView;

  useEffect(() => {
    const recommended = comparisonView?.recommendedCandidateId;
    if (recommended) {
      setLocalSelectedOptionId(recommended);
    }
  }, [comparisonView?.recommendedCandidateId, bffProblemId]);

  const scenarios = useMemo(() => {
    if (showResolutionUi) return [];

    // Gateway 开：只信当前 problem 的 options，禁止回落行程级 checker / matrix
    if (useDecisionProblemsBff && matchedDecisionProblem) {
      if (displayOptions.length > 0) {
        return mapDecisionOptionsToCheckerScenarios(displayOptions);
      }
      return [];
    }

    const fromChecker = data.counterfactual.scenarios ?? [];
    if (checkerAlignedWithConflict && fromChecker.length >= 2) {
      return fromChecker.slice(0, 3);
    }
    if (solutionMatrix) {
      const fromMatrix = buildMatrixScenarios(solutionMatrix);
      if (fromMatrix.length >= 2) return fromMatrix;
    }
    if (checkerAlignedWithConflict && data.overview.repairPlan) {
      const plan = data.overview.repairPlan;
      return [
        {
          id: plan.id,
          letter: 'A',
          title: plan.title,
          badge: 'recommended' as const,
          badgeLabel: plan.badge ?? '推荐',
          description: plan.description,
          variant: 'blue' as const,
          metrics: plan.metrics,
        },
      ];
    }
    if (checkerAlignedWithConflict) return fromChecker;
    return [];
  }, [
    showResolutionUi,
    useDecisionProblemsBff,
    matchedDecisionProblem,
    displayOptions,
    data,
    solutionMatrix,
    checkerAlignedWithConflict,
  ]);

  const selectedOptionId =
    (useDecisionProblemsBff && matchedDecisionProblem
      ? localSelectedOptionId
      : solutionMatrix?.selectedOptionId ?? localSelectedOptionId) ??
    scenarios.find((s) => s.badge === 'recommended')?.id ??
    scenarios[0]?.id;

  const optionViews = useMemo(
    () =>
      buildDecisionSpaceOptionViews({
        options: displayOptions,
        scenarios,
        detail: bffContent.detail,
        displayTimezone,
      }),
    [displayOptions, bffContent.detail, scenarios, displayTimezone],
  );

  const effectiveSelectionId =
    (showResolutionUi ? decisionActionsModel.selectedActionId : null) ?? selectedOptionId;

  const selectedOptionLetter = useMemo(() => {
    if (packOptions.length > 0 && effectiveSelectionId) {
      const matchIndex = packOptions.findIndex(
        (option) =>
          option.id === effectiveSelectionId || option.action?.actionId === effectiveSelectionId,
      );
      if (matchIndex >= 0) {
        return getOptionLetter(packOptions[matchIndex]!, matchIndex);
      }
    }
    return (
      optionViews.find((view) => view.id === effectiveSelectionId)?.letter ??
      scenarios.find((scenario) => scenario.id === effectiveSelectionId)?.letter ??
      'A'
    );
  }, [packOptions, effectiveSelectionId, optionViews, scenarios]);

  const checkerOptionId = useMemo(() => {
    if (!effectiveSelectionId) return null;
    if (packOptions.length > 0) {
      return matchPackOptionIdForAction(packOptions, effectiveSelectionId) ?? effectiveSelectionId;
    }
    return effectiveSelectionId;
  }, [packOptions, effectiveSelectionId]);

  useEffect(() => {
    onActionPreviewChange?.({
      preview: decisionActionsModel.selectedActionPreview,
      loading: Boolean(decisionActionsModel.previewingActionId),
      selectedOptionId: checkerOptionId,
      selectedOptionLetter,
    });
  }, [
    decisionActionsModel.selectedActionPreview,
    decisionActionsModel.previewingActionId,
    onActionPreviewChange,
    checkerOptionId,
    selectedOptionLetter,
  ]);

  const negotiationInitiatePayload = { selectedOptionId: effectiveSelectionId };
  const activeProblemIdForPreflight = matchedDecisionProblem?.id ?? activeProblemId ?? null;
  const negotiationPreflight = useDecisionProblemNegotiationPreflight(
    tripId,
    activeProblemIdForPreflight,
    conflict?.id ?? null,
    Boolean(
      useDecisionProblemsBff &&
        activeProblemIdForPreflight &&
        !bffStillBootstrapping &&
        !bffContent.detailLoading &&
        (memberCount > 1 || collaboratorCount > 0),
    ),
  );
  const negotiationProjection: DecisionProblemNegotiationProjection | undefined =
    (bffContent.detail as GatewayDecisionProblemDetailResult | null)?.negotiation ?? undefined;
  const collaborationActions = useMemo(
    () =>
      shouldShowDecisionSpaceCollaborationActions({
        travelerCount: memberCount,
        collaboratorCount,
        problem: matchedDecisionProblem,
        conflict,
        detail: bffContent.detail as GatewayDecisionProblemDetailResult | null,
        negotiationVisible: negotiationProjection?.visible,
        preflightCanStart: negotiationPreflight.isLoading
          ? undefined
          : negotiationPreflight.data?.canStart,
      }),
    [
      memberCount,
      collaboratorCount,
      matchedDecisionProblem,
      conflict,
      bffContent.detail,
      negotiationProjection?.visible,
      negotiationPreflight.isLoading,
      negotiationPreflight.data?.canStart,
    ],
  );
  const negotiateButtonLabel = negotiationProjection?.buttonLabel ?? null;
  const negotiateDetailLoading = bffContent.detailLoading ?? bffContent.loading;
  const showNegotiateButton =
    collaborationActions.showNegotiate &&
    (negotiateDetailLoading ||
      negotiateButtonLabel != null ||
      negotiationProjection?.status === 'in_discussion' ||
      negotiationProjection?.status === 'closed');
  const negotiateButtonDisabled =
    negotiationSubmitting || negotiateDetailLoading || negotiateButtonLabel == null;
  const negotiateButtonText = negotiationSubmitting
    ? '处理中…'
    : negotiateButtonLabel ?? '发起协商';
  const negotiationClosedOutcome =
    negotiationProjection?.status === 'closed' ? negotiationProjection.closedOutcome : undefined;

  const conflictTitleRaw =
    matchedDecisionProblem?.title ??
    conflict?.title ??
    (useDecisionProblemsBff
      ? undefined
      : checkerAlignedWithConflict
        ? data.overview.conflict.primary?.title
        : undefined) ??
    '路线修复决策';

  const effectiveImpactScopeView =
    bffContent.detail?.impactScopeView ?? matchedDecisionProblem?.impactScopeView;

  const dayLabel = useMemo(() => {
    const fromImpact = dayLabelForDecisionContext({
      impactScopeView: effectiveImpactScopeView,
      problem: matchedDecisionProblem,
      language: i18n.language,
    });
    if (fromImpact) return fromImpact;

    const fromProblem = dayLabelForDecisionProblem(matchedDecisionProblem);
    if (fromProblem) return fromProblem;

    const days = conflict?.affectedDays ?? data.overview.conflict.primary?.affectedDays;
    if (!days?.length) return null;
    return dayLabelForDecisionContext({
      problem: { affectedDayNumbers: days },
      language: i18n.language,
    });
  }, [
    effectiveImpactScopeView,
    matchedDecisionProblem,
    conflict?.affectedDays,
    data.overview.conflict.primary?.affectedDays,
    i18n.language,
  ]);

  const conflictTitle = useMemo(() => {
    if (!conflictTitleRaw) return conflictTitleRaw;
    if (!dayLabel || !effectiveImpactScopeView) return conflictTitleRaw;
    const stripped = stripEmbeddedDayFromDecisionTitle(conflictTitleRaw);
    return stripped || conflictTitleRaw;
  }, [conflictTitleRaw, dayLabel, effectiveImpactScopeView]);

  const conflictMessage =
    conflict?.message?.trim() ??
    resolveDecisionProblemDescription(bffContent.detail, matchedDecisionProblem) ??
    (useDecisionProblemsBff && matchedDecisionProblem
      ? matchedDecisionProblem.affectedScopeSummary
      : undefined) ??
    conflict?.message ??
    (checkerAlignedWithConflict ? data.overview.conflict.primary?.message : undefined) ??
    (checkerAlignedWithConflict ? data.overview.aiSuggestion?.text : undefined);

  const handleSelectScenario = (scenarioId: string) => {
    setLocalSelectedOptionId(scenarioId);
    solutionMatrix?.setSelectedOptionId(scenarioId);
    solutionMatrix?.setExpanded(true);
    onSelectOption?.(scenarioId);

    if (!showResolutionUi && bffProblemId) {
      const option = displayOptions.find((row) => row.id === scenarioId);
      if (option) void optionPreviewEnrichment.enrichOption(option);
    }
  };

  const contextCapsuleFacts = useMemo(
    () =>
      buildDecisionContextCapsuleFacts({
        detail: bffContent.detail,
        problem: matchedDecisionProblem,
        narrative: conflictMessage,
        conflict: conflict ?? null,
      }),
    [bffContent.detail, matchedDecisionProblem, conflictMessage, conflict],
  );

  /** Legacy 六卡模式：仅补齐当前选中方案的 preview；Gateway 写路径由 useDecisionProblemActions 按需 preview */
  useEffect(() => {
    if (showResolutionUi || !bffProblemId || !displayOptions.length) return;
    const targetId = selectedOptionId ?? displayOptions[0]?.id;
    const target = displayOptions.find((option) => option.id === targetId);
    if (!target || !optionNeedsPreviewEnrichment(target)) return;

    let cancelled = false;
    void optionPreviewEnrichment.enrichOption(target).finally(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [
    showResolutionUi,
    bffProblemId,
    selectedOptionId,
    displayOptions,
    optionPreviewEnrichment.enrichOption,
  ]);

  const writeBackSummary = useMemo(() => {
    const previewDiff = extractItineraryDiffFromDecisionPreview(
      decisionActionsModel.selectedActionPreview,
    );
    return buildDecisionWriteSummary({
      itineraryDiff: previewDiff,
      memberImpacts: bffContent.detail?.memberImpacts,
      action: decisionActionsModel.selectedAction,
    });
  }, [
    decisionActionsModel.selectedActionPreview,
    decisionActionsModel.selectedAction,
    bffContent.detail?.memberImpacts,
  ]);

  const applyCtaLabel = useMemo(
    () =>
      buildDecisionApplyCtaLabel({
        action: decisionActionsModel.selectedAction,
        optionLetter: selectedOptionLetter,
        dayLabel,
      }),
    [decisionActionsModel.selectedAction, selectedOptionLetter, dayLabel],
  );

  return (
    <div className={cn('flex h-full min-h-0 flex-col', workbenchColumnSurface, className)}>
      {!compactChrome ? (
      <div className={workbenchPanelHeader}>
        <div className="flex items-center gap-2">
          {onBack ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={onBack}
              aria-label={backLabel}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={workbenchPanelTitle}>决策执行</h2>
              {onOpenTravelStatus ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={onOpenTravelStatus}
                >
                  <LayoutDashboard className="mr-1 h-3 w-3" />
                  概览
                </Button>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {dayLabel ? `${dayLabel} · ` : ''}
              {conflictTitle}
            </p>
          </div>
        </div>
      </div>
      ) : null}

      <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', compactChrome ? 'p-2' : 'p-3 sm:p-4')}>
        <>
            {showLegacyEvaluateHint ? (
              <Alert className="mb-3 rounded-xl border-border/60 bg-muted/10">
                <AlertTitle className="text-sm">需启用决策 Gateway</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed">
                  此类问题请开启 VITE_DECISION_GATEWAY_UNIFIED 或使用下方方案对比；不再支持 evaluate→authorize→execute 直写。
                </AlertDescription>
              </Alert>
            ) : null}

            {canUseProblemWriteApi && bffContent.detailLoading && !packOptions.length && !displayOptions.length ? (
              <div
                className={cn(workbenchCard, 'mb-3 space-y-2 px-3 py-3')}
                aria-busy="true"
                aria-label="正在加载问题说明"
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner className="h-7 w-7" />
              </div>
            ) : showResolutionUi ? (
              <DecisionProblemResolutionSection
                className={compactChrome ? 'mb-0' : 'mb-4'}
                tripId={tripId}
                problemId={bffProblemId}
                trip={trip}
                problem={matchedDecisionProblem}
                detail={bffContent.detail}
                conflict={conflict}
                conflicts={_conflicts}
                displayTimezone={displayTimezone}
                model={decisionActionsModel}
                options={displayOptions}
                personaAlerts={personaAlerts}
                collaborators={collaborators}
                collaboratorsLoading={collaboratorsLoading}
                onReservationEvidenceSaved={onReservationEvidenceSaved}
                onRefreshDetail={bffContent.reload}
                proposalLayout
                compactLayout
                whatHappened={conflictMessage}
                basisFacts={contextCapsuleFacts}
                conflictId={resolvePlanningConflictIdForBasis(conflict)}
                proposalId={activeProposalId}
                inspectorBasis={inspectorBasis}
                packOptions={packOptions}
                guardianWarningHeadline={guardianWarningHeadline}
                guardianWarningContextLabel={guardianWarningView.contextLabel}
                guardianPrimaryEnforcement={guardianWarningView.primaryEnforcement}
                emptyMessage={
                  packOptions.length > 0 || displayOptions.length > 0
                    ? undefined
                    : activeProposalQuery.isLoading || activeProposalQuery.isFetching
                      ? undefined
                      : bffContent.error ??
                        '当前草案暂无 decisionPack.options；请确认编排提案已生成方案卡。'
                }
              />
            ) : comparisonView ? (
              <CandidateComparisonViewPanel
                className="mb-4"
                view={comparisonView}
                selectedCandidateId={selectedOptionId}
                onSelectCandidate={handleSelectScenario}
              />
            ) : scenarios.length === 0 ? (
              <div className={cn(workbenchCard, 'px-4 py-8 text-center')}>
                <p className="text-sm font-medium text-foreground">暂无可用修复方案</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {bffContent.error ??
                    (canUseProblemWriteApi && !bffProblemId
                      ? '请从左侧决策队列选择待决问题，以加载 SSOT 行动方案（detail.actions[]）。'
                      : useDecisionProblemsBff && matchedDecisionProblem
                        ? '当前决策问题暂无可选修复路径；请确认后端已为该 problem 返回 detail.actions[]。'
                        : '系统正在分析冲突，或需要先运行路线优化。请稍后重试，或通过决策检查器查看松弛建议。')}
                </p>
              </div>
            ) : canUseProblemWriteApi ? (
              <div className={cn(workbenchCard, 'px-4 py-8 text-center')}>
                <p className="text-sm font-medium text-foreground">请从决策队列进入</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  统一写路径已启用；请从左侧队列选择决策问题，不再使用旧版六卡方案对比。
                </p>
              </div>
            ) : (
              <div
                key={bffProblemId ?? conflict?.id ?? 'decision-space-scenarios'}
                className={cn(
                  'mb-4 grid gap-3',
                  optionViews.length <= 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : compactChrome
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1 xl:grid-cols-3',
                )}
              >
                {optionViews.map((option) => (
                  <DecisionSpaceOptionCard
                    key={option.id}
                    option={option}
                    selected={option.id === selectedOptionId}
                    loading={optionPreviewEnrichment.previewingOptionId === option.id}
                    onSelect={() => handleSelectScenario(option.id)}
                  />
                ))}
              </div>
            )}

            {!showResolutionUi && !canUseProblemWriteApi && displayOptions.length > 0 ? (
              <DecisionBeforeAfterPanel
                className="mb-4"
                options={displayOptions}
                selectedOptionId={selectedOptionId}
              />
            ) : null}

            {!comparisonView && !showResolutionUi && !canUseProblemWriteApi && optionViews.length > 0 ? (
              <WorkbenchPrivateConcernsPanel
                options={displayOptions}
                problemDescription={conflictMessage ?? undefined}
                displayTimezone={displayTimezone}
              />
            ) : null}
        </>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 border-t border-border/60 bg-card/95 px-2 py-2 sm:px-3 backdrop-blur-sm">
        {showResolutionUi && decisionActionsModel.ctaPhase === 'done' ? (
          <DecisionWriteBackStepsPanel
            phase="done"
            itineraryDiff={extractItineraryDiffFromDecisionPreview(
              decisionActionsModel.selectedActionPreview,
            )}
            memberNotifyCount={bffContent.detail?.memberImpacts?.length}
          />
        ) : null}
        {showResolutionUi && decisionActionsModel.ctaPhase === 'done' ? (
          <p className="text-center text-[11px] text-success">
            已应用到行程
            {decisionActionsModel.appliedActionLabel
              ? ` · ${decisionActionsModel.appliedActionLabel}`
              : null}
          </p>
        ) : null}
        {showResolutionUi && decisionActionsModel.ctaPhase !== 'done' ? (
          <>
            {!compactChrome ? (
              <>
                <DecisionValidityStrip
                  validUntil={matchedDecisionProblem?.evidenceValidUntil}
                  dependencyHint={
                    matchedDecisionProblem?.evidenceValidUntil
                      ? '道路或预约条件变化时，系统会重新评估该方案是否仍成立。'
                      : null
                  }
                />
                <DecisionWriteBackStepsPanel
                  phase={decisionActionsModel.applying ? 'applying' : 'idle'}
                  itineraryDiff={extractItineraryDiffFromDecisionPreview(
                    decisionActionsModel.selectedActionPreview,
                  )}
                  memberNotifyCount={bffContent.detail?.memberImpacts?.length}
                />
              </>
            ) : null}
            {!compactChrome ? (
              <DecisionResolutionStepBar
                phase={decisionActionsModel.ctaPhase}
                className="sm:hidden"
              />
            ) : null}
            {decisionActionsModel.ctaPhase === 'select_action' ? (
              <>
                {decisionActionsModel.selectedAction ? (
                  <p className="truncate text-center text-[10px] text-muted-foreground">{writeBackSummary}</p>
                ) : null}
                <Button
                  type="button"
                  className={cn('h-10 w-full rounded-lg text-xs', workbenchPrimaryAction)}
                  disabled={
                    !decisionActionsModel.selectedAction ||
                    Boolean(decisionActionsModel.submittingActionId)
                  }
                  onClick={handleSubmitResolutionClick}
                >
                  {decisionActionsModel.submittingActionId
                    ? '提交中…'
                    : decisionActionsModel.selectedAction
                      ? applyCtaLabel
                      : '请先选择方案'}
                </Button>
              </>
            ) : null}
            {decisionActionsModel.ctaPhase === 'apply' ? (
              <>
                <p className="truncate text-center text-[10px] text-muted-foreground">{writeBackSummary}</p>
                <Button
                type="button"
                className={cn('h-10 w-full rounded-lg text-xs', workbenchPrimaryAction)}
                disabled={decisionActionsModel.applying}
                onClick={handleApplyToTripClick}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {decisionActionsModel.applying ? '写入中…' : applyCtaLabel}
              </Button>
              </>
            ) : null}
          </>
        ) : null}
        {negotiationClosedOutcome ? (
          <Alert className="border-border/60 bg-muted/20 py-2">
            <AlertTitle className="text-xs font-medium">协商已结束</AlertTitle>
            <AlertDescription className="text-[11px] leading-relaxed text-muted-foreground">
              {negotiationClosedOutcome.summaryCN ??
                (negotiationClosedOutcome.recommendedOptionId
                  ? `推荐方案：${negotiationClosedOutcome.recommendedOptionId}`
                  : '团队已完成本轮结构化协商')}
              {negotiationClosedOutcome.utteranceCount != null
                ? ` · ${negotiationClosedOutcome.utteranceCount} 条发言`
                : null}
            </AlertDescription>
          </Alert>
        ) : null}
        {!compactChrome ? (
        <div className="flex flex-wrap gap-2">
        {showNegotiateButton ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex flex-1 sm:flex-none">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-full rounded-lg text-xs sm:w-auto"
                  disabled={negotiateButtonDisabled}
                  onClick={() => onInitiateNegotiation?.(negotiationInitiatePayload)}
                >
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  {negotiateButtonText}
                </Button>
              </span>
            </TooltipTrigger>
            {negotiateButtonDisabled && negotiateDetailLoading ? (
              <TooltipContent side="top" className="max-w-xs text-xs">
                正在加载协商状态…
              </TooltipContent>
            ) : null}
          </Tooltip>
        </TooltipProvider>
        ) : null}
        {collaborationActions.showVote ? (
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 rounded-lg text-xs sm:flex-none"
          onClick={onInitiateVote}
        >
          <Vote className="mr-1.5 h-3.5 w-3.5" />
          发起投票
        </Button>
        ) : null}
        </div>
        ) : null}
      </div>
      <DecisionAcknowledgementConfirmDialog
        open={ackConfirmOpen}
        onOpenChange={(open) => {
          setAckConfirmOpen(open);
          if (!open) setAckConfirmIntent(null);
        }}
        title={ackConfirmTitle}
        description={ackConfirmDescription}
        items={decisionActionsModel.acknowledgementRequired}
        checked={decisionActionsModel.acknowledgement}
        onToggle={decisionActionsModel.toggleAcknowledgement}
        confirmLabel={
          ackConfirmIntent === 'apply'
            ? '确认并应用到行程'
            : decisionActionsModel.selectedAction
              ? decisionActionConfirmLabel(decisionActionsModel.selectedAction)
              : '确认提交'
        }
        confirming={
          Boolean(decisionActionsModel.submittingActionId) || decisionActionsModel.applying
        }
        onConfirm={handleAckConfirmDialogConfirm}
      />
    </div>
  );
});
