import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { planningWorkbenchApi, pickWorkbenchOptionComparison } from '@/api/planning-workbench';
import { useWorkbenchCtreTaskStore } from '@/store/workbenchCtreTaskStore';
import { enrichPlanningWorkbenchExecuteRequest } from '@/lib/enrich-planning-workbench-travel-compiler';
import type {
  CommitPlanOptions,
  ExecutePlanningWorkbenchResponse,
  PaceFeedback,
  UserAction,
} from '@/api/planning-workbench';
import { tripsApi } from '@/api/trips';
import type { TripDetail } from '@/types/trip';
import type { ContextPackage } from '@/api/context';
import { useContextApi } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import PlanStudioContext from '@/contexts/PlanStudioContext';
import { publishPlanStudioComparison, usePlanStudioCompareStore } from '@/store/planStudioCompareStore';
import { saveCausalRuntimeFromWorkbench } from '@/lib/causal-runtime-session';
import {
  resolveExecuteScheduleRevision,
  resolveTripScheduleRevision,
} from '@/lib/schedule-timeline-apply';
import { isPlanningWorkbenchAsyncUnavailable, planningWorkbenchErrorToUserMessage } from '@/lib/planning-workbench-error-map';
import {
  getWorkbenchGuidance,
  isWorkbenchChooseActive,
  mapWorkbenchChooseToOptionId,
  resolveEffectiveWorkbenchGate,
  resolveWorkbenchCommitSelectedOptionId,
  resolveWorkbenchConfirmationItems,
  resolveWorkbenchRiskExplanation,
  resolveWorkbenchSubmitBlocked,
} from '@/lib/planning-workbench-ux.util';
import {
  buildPlanGateConfirmedItemsPayload,
  buildPlanGateVerificationModel,
  mapPlanGateOverallStatusToGate,
  resolvePlanGateCanProceed,
  resolvePlanGateTradeoffConfirmations,
  resolvePlanGateWizardStepFromResult,
} from '@/lib/plan-gate-verification.util';
import { normalizePlanGatePipelineSteps } from '@/lib/normalize-plan-gate.util';
import type { GateStatus } from '@/lib/gate-status';
import type {
  PlanGateConfirmedItemPayload,
  PlanGateCommitResult,
  PlanGatePipelineStep,
  PlanGateReadinessResponse,
  PlanGateUserConfirmationState,
} from '@/types/plan-gate';

export type PlanGateWizardStep =
  | 'generate'
  | 'generating'
  | 'verify'
  | 'tradeoffs'
  | 'compare'
  | 'submit'
  | 'success';

export interface PlanGateInputsSummary {
  constraintCount?: number;
  decisionCount?: number;
  budgetPerPerson?: number;
  budgetCurrency?: string;
  memberCount?: number;
  missingInfoCount?: number;
  blockers?: string[];
  warnings?: string[];
}

import {
  buildPlanGateCommitOptions,
  isValidPartialCommitSelection,
  resolvePlanGatePartialCommitDayOptions,
} from '@/lib/plan-gate-commit.util';
import { formatPlanGateMaterializationSummary } from '@/lib/plan-gate-timeline.util';
import {
  readAgentPlanDraftMutation,
  resolveAgentPlanDraftMutationForDisplay,
} from '@/lib/agent-plan-draft-mutation.util';
import {
  formatLegacyApplyBlockedMessage,
  shouldBlockCommitPlanDirectWrite,
} from '@/lib/effective-plan-write-chain.util';

type ExecuteWorkbenchExtras = {
  paceFeedback?: PaceFeedback;
  confirmedItems?: string[] | PlanGateConfirmedItemPayload[];
  selectedOptionId?: string;
  commitOptions?: CommitPlanOptions;
  preferAsync?: boolean;
  silentToast?: boolean;
  manageLoading?: boolean;
};

export interface UsePlanGateFlowOptions {
  tripId: string;
  initialTrip?: TripDetail | null;
  autoGenerateOnOpen?: boolean;
  inputsSummary?: PlanGateInputsSummary;
  onPlanCommitted?: () => void;
}

export function usePlanGateFlow({
  tripId,
  initialTrip = null,
  autoGenerateOnOpen = false,
  inputsSummary,
  onPlanCommitted,
}: UsePlanGateFlowOptions) {
  const { user } = useAuth();
  const { buildContextWithCompress } = useContextApi();
  const planStudioContext = useContext(PlanStudioContext);

  const [trip, setTrip] = useState<TripDetail | null>(initialTrip);
  const [tripLoading, setTripLoading] = useState(!initialTrip);
  const [tripLoadError, setTripLoadError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<PlanGateReadinessResponse | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [pipelineSteps, setPipelineSteps] = useState<PlanGatePipelineStep[]>([]);
  const [result, setResult] = useState<ExecutePlanningWorkbenchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [userConfirmations, setUserConfirmations] = useState<PlanGateUserConfirmationState[]>([]);
  const [userSelectedOptionId, setUserSelectedOptionId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<PlanGateWizardStep>('generate');
  const [commitSuccess, setCommitSuccess] = useState<PlanGateCommitResult | null>(null);
  const [partialCommitEnabled, setPartialCommitEnabled] = useState(false);
  const [partialCommitDays, setPartialCommitDays] = useState<number[]>([]);
  const autoGenerateStartedRef = useRef(false);

  const loadReadiness = useCallback(async () => {
    if (!tripId) return;
    setReadinessLoading(true);
    try {
      const data = await planningWorkbenchApi.getPlanGateReadiness(tripId);
      setReadiness(data);
    } catch (err) {
      console.warn('[Plan Gate] readiness load failed:', err);
      setReadiness(null);
    } finally {
      setReadinessLoading(false);
    }
  }, [tripId]);

  const loadTrip = useCallback(async () => {
    if (!tripId) return;
    setTripLoadError(null);
    setTripLoading(true);
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip:', err);
      setTripLoadError('加载行程信息失败，请重试');
    } finally {
      setTripLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadTrip();
    void loadReadiness();
  }, [loadTrip, loadReadiness]);

  useEffect(() => {
    if (initialTrip?.id === tripId) {
      setTrip(initialTrip);
      setTripLoading(false);
      setTripLoadError(null);
    }
  }, [initialTrip, tripId]);

  const buildPlanningContext = useCallback(() => {
    if (!trip) return null;
    const destinationParts = trip.destination?.split(',') || [];
    const country = destinationParts[0]?.trim().toUpperCase() || '';
    const city = destinationParts.length > 1 ? destinationParts.slice(1).join(',').trim() : undefined;
    const days = trip.TripDay?.length || 0;
    if (days === 0) {
      toast.error('行程天数不能为0，请先设置行程日期');
      return null;
    }
    const constraints: Record<string, unknown> = {};
    if (trip.totalBudget) {
      constraints.budget = { total: trip.totalBudget, currency: 'CNY' };
    }
    return {
      destination: { country, city },
      days,
      travelMode: 'mixed' as const,
      constraints: Object.keys(constraints).length > 0 ? constraints : undefined,
    };
  }, [trip]);

  const buildContextPackage = useCallback(
    async (userQuery: string): Promise<ContextPackage | null> => {
      if (!trip) return null;
      try {
        return await buildContextWithCompress({
          tripId,
          userId: user?.id,
          phase: 'planning',
          agent: 'PLANNER',
          userQuery,
          tokenBudget: 3600,
          includePrivate: true,
          requiredTopics: ['VISA', 'ROAD_RULES', 'SAFETY'],
          useCache: true,
        });
      } catch (err) {
        console.warn('[Plan Gate] Context package build failed:', err);
        return null;
      }
    },
    [buildContextWithCompress, trip, tripId, user?.id],
  );

  const resolveScheduleRevisionForExecute = useCallback(async (): Promise<number | undefined> => {
    let revision = resolveExecuteScheduleRevision(trip, initialTrip);
    if (typeof revision === 'number' || !tripId) return revision;
    try {
      const fresh = await tripsApi.getById(tripId);
      revision = resolveTripScheduleRevision(fresh);
      if (typeof revision === 'number') {
        setTrip((prev) => (prev ? { ...prev, revision: fresh.revision ?? prev.revision } : fresh));
      }
    } catch (err) {
      console.warn('[Plan Gate] Failed to refresh scheduleRevision:', err);
    }
    return revision;
  }, [initialTrip, trip, tripId]);

  const runExecute = useCallback(
    async (
      userAction: UserAction,
      existingPlanState?: ExecutePlanningWorkbenchResponse['planState'],
      extras?: ExecuteWorkbenchExtras,
    ): Promise<ExecutePlanningWorkbenchResponse | undefined> => {
      if (!trip) {
        toast.error('请先加载行程信息');
        return;
      }
      const context = buildPlanningContext();
      if (!context) return;

      const manageLoading = extras?.manageLoading !== false;
      if (manageLoading) {
        setLoading(true);
        setError(null);
        setLoadingStage('准备中…');
        setPipelineSteps([]);
        setActiveStep('generating');
      }

      try {
        const userQueryMap: Record<UserAction, string> = {
          generate: `帮我规划${trip.destination || ''}的${trip.TripDay?.length || 0}天行程`,
          compare: '对比当前方案与其他方案',
          commit: '提交当前方案到行程',
          adjust: '调整当前方案',
        };
        const userQuery = userQueryMap[userAction] || '执行规划操作';

        if (manageLoading) setLoadingStage('构建上下文…');
        const contextPkg = await buildContextPackage(userQuery);
        if (manageLoading) {
          setLoadingStage(userAction === 'generate' ? '提交生成任务…' : '执行规划操作…');
        }

        const planStateForRequest =
          userAction === 'commit'
            ? existingPlanState ?? result?.planState
            : existingPlanState || result?.planState;

        if (userAction === 'commit' && !planStateForRequest?.plan_id) {
          toast.error('缺少 planState，请先重新生成方案后再提交');
          return;
        }

        const scheduleRevision =
          userAction === 'generate' || userAction === 'commit'
            ? await resolveScheduleRevisionForExecute()
            : resolveExecuteScheduleRevision(trip, initialTrip);

        const payload = enrichPlanningWorkbenchExecuteRequest({
          context,
          tripId,
          existingPlanState: planStateForRequest,
          userAction,
          ...(extras?.paceFeedback ? { paceFeedback: extras.paceFeedback } : {}),
          ...(extras?.confirmedItems?.length ? { confirmedItems: extras.confirmedItems } : {}),
          ...(extras?.selectedOptionId ? { selectedOptionId: extras.selectedOptionId } : {}),
          ...(userAction === 'commit' && extras?.commitOptions
            ? { options: extras.commitOptions }
            : {}),
          metadata: {
            ...(contextPkg?.id ? { contextPackageId: contextPkg.id } : {}),
            ...(typeof scheduleRevision === 'number' ? { scheduleRevision } : {}),
            ...(user?.id ? { userId: user.id } : {}),
          },
        });

        const useAsync = extras?.preferAsync !== false && userAction === 'generate';
        let response: ExecutePlanningWorkbenchResponse;

        if (useAsync) {
          try {
            useWorkbenchCtreTaskStore.getState().reset();
            const { taskId } = await planningWorkbenchApi.executeAsync(payload);
            response = await planningWorkbenchApi.pollExecuteTask(taskId, {
              onStatus: (task) => {
                useWorkbenchCtreTaskStore.getState().syncFromTaskStatus(taskId, task);
                if (!manageLoading) return;
                const steps = normalizePlanGatePipelineSteps(task.pipelineSteps);
                if (steps.length > 0) setPipelineSteps(steps);
                setLoadingStage(
                  task.currentStage?.trim() ||
                    task.stage?.trim() ||
                    task.progress?.current?.trim() ||
                    (task.status === 'RUNNING' ? '生成中…' : '等待调度…'),
                );
              },
            });
            useWorkbenchCtreTaskStore
              .getState()
              .syncFromExecuteResult(response.uiOutput?.ctre);
          } catch (asyncErr) {
            if (!isPlanningWorkbenchAsyncUnavailable(asyncErr)) throw asyncErr;
            response = await planningWorkbenchApi.execute(payload);
          }
        } else {
          response = await planningWorkbenchApi.execute(payload);
        }

        setResult(response);
        setUserConfirmations([]);
        if (tripId) {
          saveCausalRuntimeFromWorkbench(tripId, response);
          const comparison = pickWorkbenchOptionComparison([response]);
          if (comparison) publishPlanStudioComparison(tripId, comparison);
        }

        if (!extras?.silentToast && userAction !== 'commit') {
          toast.success(userAction === 'generate' ? '方案草案已生成' : '操作成功');
        }

        if (manageLoading) {
          setLoadingStage('');
          setPipelineSteps([]);
          setLoading(false);
        }

        return response;
      } catch (err: unknown) {
        const errorMessage = planningWorkbenchErrorToUserMessage(err);
        if (manageLoading) {
          setError(errorMessage);
          setLoadingStage('');
          setPipelineSteps([]);
          setLoading(false);
          setActiveStep('generate');
        }
        if (!extras?.silentToast) toast.error(errorMessage);
        throw err;
      }
    },
    [
      buildContextPackage,
      buildPlanningContext,
      initialTrip,
      resolveScheduleRevisionForExecute,
      result?.planState,
      trip,
      tripId,
      user?.id,
    ],
  );

  const handleGenerate = useCallback(async () => {
    await runExecute('generate');
  }, [runExecute]);

  const handleRegenerateAfterChoose = useCallback(async () => {
    toast.message('已根据您的选择重新评估方案…');
    await handleGenerate();
  }, [handleGenerate]);

  const handleChooseSuccess = useCallback(
    (selectedIndex: number, selectedText: string) => {
      if (!result) return;
      const optionId = mapWorkbenchChooseToOptionId(result, selectedIndex, selectedText);
      if (optionId) {
        setUserSelectedOptionId(optionId);
        usePlanStudioCompareStore.getState().setSelectedOption(tripId, optionId);
      }
    },
    [result, tripId],
  );

  useEffect(() => {
    if (!result) {
      setPartialCommitEnabled(false);
      setPartialCommitDays([]);
      return;
    }
    const dayOptions = resolvePlanGatePartialCommitDayOptions(result, trip);
    setPartialCommitDays(dayOptions);
  }, [result?.planState?.plan_id, trip]);

  const partialCommitDayOptions = useMemo(
    () => resolvePlanGatePartialCommitDayOptions(result, trip),
    [result, trip],
  );

  const commitOptions = useMemo(
    () => buildPlanGateCommitOptions(partialCommitEnabled, partialCommitDays),
    [partialCommitDays, partialCommitEnabled],
  );

  const handleCommit = useCallback(async () => {
    if (!result?.planState || !tripId) return;

    if (shouldBlockCommitPlanDirectWrite()) {
      toast.error(formatLegacyApplyBlockedMessage());
      return;
    }

    if (!isValidPartialCommitSelection(partialCommitEnabled, partialCommitDays)) {
      toast.error('部分提交请至少选择一天');
      return;
    }

    const planGate = result.uiOutput.planGate;
    const verification = buildPlanGateVerificationModel(result);
    const proceed = resolvePlanGateCanProceed(planGate, userConfirmations, verification);
    if (!proceed.canProceed) {
      toast.error(proceed.reason ?? '暂无法提交');
      return;
    }

    setCommitting(true);
    try {
      const storeSelected = usePlanStudioCompareStore.getState().getSelectedOption(tripId);
      const selectedOptionId = resolveWorkbenchCommitSelectedOptionId(
        result,
        userSelectedOptionId ?? storeSelected,
      );

      const confirmedPayload = buildPlanGateConfirmedItemsPayload(userConfirmations);
      const legacyConfirmations = resolveWorkbenchConfirmationItems(result);

      const commitResponse = await runExecute('commit', result.planState, {
        confirmedItems:
          confirmedPayload.length > 0
            ? confirmedPayload
            : legacyConfirmations.length > 0
              ? legacyConfirmations
              : undefined,
        selectedOptionId,
        commitOptions,
        silentToast: true,
        manageLoading: false,
      });

      const commitResult = commitResponse?.uiOutput.planGate?.commitResult;
      const materializationSummary = formatPlanGateMaterializationSummary(
        commitResult?.timelineMaterialization,
      );

      if (commitResult?.success) {
        setCommitSuccess(commitResult);
      } else {
        const version =
          planGate?.verification.draftLabel?.replace(/^A/i, '') ??
          String(result.planState.plan_version ?? '—');
        setCommitSuccess({
          success: true,
          committedPlanId: result.planState.plan_id,
          committedVersionLabel: version.startsWith('A') ? version : `A${version}`,
          updates: [
            ...(materializationSummary ? [materializationSummary] : []),
            ...(result.uiOutput.consolidatedDecision?.nextSteps?.slice(0, 5) ??
              planGate?.submitEligibility.blockers?.slice(0, 3) ??
              ['方案已写入时间轴']),
          ],
          nextActions: [
            { label: '查看更新时间轴', action: 'view_timeline' },
            { label: '查看可执行性证明', action: 'view_feasibility_proof' },
          ],
        });
      }

      setResult(null);
      setUserConfirmations([]);
      setPartialCommitEnabled(false);
      setActiveStep('success');
      await loadTrip();
      void loadReadiness();
      planStudioContext?.notifyPlanCommitted();
      onPlanCommitted?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
      }
    } catch (err: unknown) {
      console.error('Commit plan failed:', err);
      toast.error(planningWorkbenchErrorToUserMessage(err));
    } finally {
      setCommitting(false);
    }
  }, [
    commitOptions,
    loadReadiness,
    loadTrip,
    onPlanCommitted,
    partialCommitDays,
    partialCommitEnabled,
    planStudioContext,
    result,
    runExecute,
    trip,
    tripId,
    userConfirmations,
    userSelectedOptionId,
  ]);

  useEffect(() => {
    if (!autoGenerateOnOpen || !trip || autoGenerateStartedRef.current) return;
    autoGenerateStartedRef.current = true;
    void handleGenerate();
  }, [autoGenerateOnOpen, handleGenerate, trip]);

  useEffect(() => {
    setUserConfirmations([]);
    setUserSelectedOptionId(null);
  }, [result?.planState?.plan_id]);

  useEffect(() => {
    if (commitSuccess) return;
    if (loading) {
      setActiveStep('generating');
      return;
    }
    if (!result) {
      setActiveStep('generate');
      return;
    }

    const inferred = resolvePlanGateWizardStepFromResult(result, userConfirmations);
    if (inferred) {
      setActiveStep(inferred);
    }
  }, [commitSuccess, loading, result, userConfirmations]);

  const planGate = result?.uiOutput.planGate;
  const verification = useMemo(() => buildPlanGateVerificationModel(result), [result]);
  const effectiveGateStatus = useMemo((): GateStatus => {
    if (planGate) return mapPlanGateOverallStatusToGate(planGate.verification.overallStatus);
    return resolveEffectiveWorkbenchGate(result) ?? 'NEED_CONFIRM';
  }, [planGate, result]);

  const proceedState = useMemo(
    () => resolvePlanGateCanProceed(planGate, userConfirmations, verification),
    [planGate, userConfirmations, verification],
  );

  const legacySubmitGate = useMemo(
    () =>
      resolveWorkbenchSubmitBlocked(result, {
        confirmationCount: resolveWorkbenchConfirmationItems(result).length,
        allConfirmationsChecked: userConfirmations.length > 0,
      }),
    [result, userConfirmations.length],
  );

  const canSubmit = planGate ? proceedState.canProceed : !legacySubmitGate.blocked;
  const chooseActive = planGate
    ? resolvePlanGateTradeoffConfirmations(verification).some(
        (item) =>
          !userConfirmations.some(
            (c) =>
              c.confirmationId === item.id &&
              c.accepted &&
              (item.options?.length ? Boolean(c.choiceId) : true),
          ),
      )
    : isWorkbenchChooseActive(result);

  const workbenchRiskExplanation = useMemo(
    () =>
      planGate?.verification.headline ??
      (result ? resolveWorkbenchRiskExplanation(result) : undefined),
    [planGate, result],
  );

  const guidance = useMemo(
    () =>
      getWorkbenchGuidance(result, {
        submitBlockedByGate: !canSubmit,
        planItemCount: result?.planState ? 1 : 0,
        choosePending: chooseActive,
      }),
    [canSubmit, chooseActive, result],
  );

  const resolvedInputs: PlanGateInputsSummary = useMemo(
    () => ({
      constraintCount:
        readiness?.confirmedConstraintCount ?? inputsSummary?.constraintCount,
      decisionCount:
        readiness?.decisionConclusionCount ?? inputsSummary?.decisionCount,
      budgetPerPerson:
        readiness?.budgetPerPerson ??
        inputsSummary?.budgetPerPerson ??
        trip?.totalBudget,
      budgetCurrency:
        readiness?.budgetCurrency ?? inputsSummary?.budgetCurrency ?? 'CNY',
      memberCount:
        readiness?.memberCount ??
        inputsSummary?.memberCount ??
        (trip as TripDetail & { pacingConfig?: { travelers?: unknown[] } })?.pacingConfig?.travelers
          ?.length ??
        1,
      missingInfoCount:
        readiness?.missingInfoCount ?? inputsSummary?.missingInfoCount,
      blockers: readiness?.blockers ?? inputsSummary?.blockers,
      warnings: readiness?.warnings ?? inputsSummary?.warnings,
    }),
    [inputsSummary, readiness, trip],
  );

  const allConfirmationsChecked = useMemo(() => {
    if (planGate) return proceedState.canProceed;
    const legacy = resolveWorkbenchConfirmationItems(result);
    return legacy.length === 0 || userConfirmations.length >= legacy.length;
  }, [planGate, proceedState.canProceed, result, userConfirmations.length]);

  const writeChainBlocksCommit = shouldBlockCommitPlanDirectWrite();

  const agentPlanDraftMutation = useMemo(
    () =>
      resolveAgentPlanDraftMutationForDisplay({
        planState: result?.planState,
        draftDiff: result?.uiOutput.planGate?.draftDiff,
      }),
    [result?.planState, result?.uiOutput.planGate?.draftDiff],
  );

  const agentPlanDraftMutationFromMetadata = useMemo(
    () => readAgentPlanDraftMutation(result?.planState),
    [result?.planState],
  );

  return {
    trip,
    tripLoading,
    tripLoadError,
    readiness,
    readinessLoading,
    loadTrip,
    loadReadiness,
    loading,
    loadingStage,
    pipelineSteps,
    error,
    result,
    planGate,
    committing,
    commitSuccess,
    activeStep,
    setActiveStep,
    handleGenerate,
    handleRegenerateAfterChoose,
    handleChooseSuccess,
    handleCommit,
    userConfirmations,
    setUserConfirmations,
    allConfirmationsChecked,
    setAllConfirmationsChecked: () => {},
    workbenchConfirmations: verification?.pendingConfirmations.map((p) => p.description) ?? [],
    workbenchRiskExplanation,
    effectiveGateStatus,
    verification,
    chooseActive,
    submitGate: { blocked: !canSubmit, reason: proceedState.reason },
    proceedState,
    guidance,
    inputsSummary: resolvedInputs,
    userId: user?.id,
    canSubmit,
    partialCommitEnabled,
    setPartialCommitEnabled,
    partialCommitDays,
    setPartialCommitDays,
    partialCommitDayOptions,
    writeChainBlocksCommit,
    agentPlanDraftMutation,
    agentPlanDraftMutationFromMetadata,
  };
}
