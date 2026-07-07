import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { decisionProblemsApi } from '@/api/decision-problems';
import { resolveDetailWriteChain } from '@/lib/decision-write-chain.util';
import {
  mapOptionsToDecisionActions,
  partitionDecisionActionsForUi,
  resolveDetailActions,
  findDecisionActionForSelection,
  resolveDecisionActionId,
} from '@/lib/decision-action.util';
import { deferUntilIdle } from '@/lib/idle-defer.util';
import {
  applyDecisionProblemToTrip,
  submitDecisionResolution,
} from '@/lib/decision-apply-action.util';
import {
  areDecisionAcknowledgementsComplete,
  isCausalTraceStaleError,
  isDecisionAcknowledgementRequiredError,
  isProblemApplyInFlight,
  resolveAcknowledgementRequiredFromError,
  resolveDecisionAcknowledgementRequired,
} from '@/lib/decision-acknowledgement.util';
import { inferExecutionStatusAfterApply } from '@/lib/decision-apply-polling.util';
import {
  isApplyOutcomeBlocked,
  isApplyOutcomeSuccessful,
} from '@/lib/decision-apply-outcome.util';
import { decisionActionDisplayTitle } from '@/lib/decision-action-display.util';
import { previewCollaborativeFollowUps, resolveCollaborativeTaskBinding } from '@/lib/decision-collaborative-sub-task.util';
import type { StructuredSuggestedFollowUp } from '@/lib/decision-collaborative-sub-task.util';
import {
  decisionProblemWriteQueryKeys,
  resolveDecisionResolutionCtaPhase,
  writeChainSubmitHint,
  type DecisionResolutionCtaPhase,
  type RefreshResolutionBindingResult,
} from '@/lib/decision-resolution.util';
import type { SubmitDecisionResolutionResponse, ApplyDecisionProblemResponse } from '@/generated/unified-decision-contracts';
import type { GatewayDecisionProblemDetailResult, GatewayDecisionPreviewResult } from '@/lib/unified-gateway-response.util';
import { resolveCausalTraceRefForSubmit } from '@/lib/causal-trace-view.util';
import type { CausalTraceReference } from '@/types/causal-trace';
import type {
  DecisionAction,
  DecisionCollaborativeSubTaskView,
  DecisionProblemResolutionView,
  DecisionWriteChain,
} from '@/generated/unified-decision-contracts';
import type { DecisionOption } from '@/types/decision-problem';

export interface UseDecisionProblemActionsOptions {
  tripId: string;
  problemId: string | null | undefined;
  detail: GatewayDecisionProblemDetailResult | null | undefined;
  options?: DecisionOption[];
  optionsActions?: DecisionAction[];
  onRefresh?: () => void | Promise<void>;
  onApplied?: () => void | Promise<void>;
  /** 决策空间：选中方案后立即 POST preview（右栏 planDiff 依赖） */
  eagerPreviewOnSelect?: boolean;
}

function resolveSuggestedFollowUpLabels(
  fromApi: string[] | undefined,
  semanticKey: string | undefined | null,
): string[] {
  if (fromApi?.length) return fromApi;
  return previewCollaborativeFollowUps(semanticKey).items.map((item) => item.title);
}

function pickAuthoritativeResolution(
  local: DecisionProblemResolutionView | null,
  server: DecisionProblemResolutionView | undefined,
): DecisionProblemResolutionView | undefined {
  const serverId = server?.resolutionId?.trim();
  const localId = local?.resolutionId?.trim();
  if (serverId && localId && serverId !== localId) return server;
  return local ?? server;
}

export function useDecisionProblemActions({
  tripId,
  problemId,
  detail,
  options = [],
  optionsActions = [],
  onRefresh,
  onApplied,
  eagerPreviewOnSelect = false,
}: UseDecisionProblemActionsOptions) {
  const queryClient = useQueryClient();
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [submittingActionId, setSubmittingActionId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [localResolution, setLocalResolution] = useState<DecisionProblemResolutionView | null>(
    null,
  );
  const [localExecutionStatus, setLocalExecutionStatus] = useState<string | null>(null);
  const [localActionPlanId, setLocalActionPlanId] = useState<string | null>(null);
  const [localWorkflowStatus, setLocalWorkflowStatus] = useState<string | null>(null);
  const [previewingActionId, setPreviewingActionId] = useState<string | null>(null);
  const [selectedActionPreview, setSelectedActionPreview] =
    useState<GatewayDecisionPreviewResult | null>(null);
  const [suggestedSubTasks, setSuggestedSubTasks] = useState<DecisionCollaborativeSubTaskView[]>(
    [],
  );
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
  const [structuredSuggestedFollowUps, setStructuredSuggestedFollowUps] = useState<
    StructuredSuggestedFollowUp[]
  >([]);
  const [acknowledgement, setAcknowledgement] = useState<string[]>([]);
  const [applyNeedsAcknowledgement, setApplyNeedsAcknowledgement] = useState(false);
  const [serverAckRequired, setServerAckRequired] = useState<string[]>([]);
  const [collaborativeProblemId, setCollaborativeProblemId] = useState<string | null>(null);
  const [appliedActionLabel, setAppliedActionLabel] = useState<string | null>(null);
  const [appliedActionSummary, setAppliedActionSummary] = useState<string | null>(null);

  const writeChain: DecisionWriteChain = resolveDetailWriteChain(detail);

  const activeCausalTraceRef = useMemo(
    (): CausalTraceReference | undefined =>
      resolveCausalTraceRefForSubmit({
        preview: selectedActionPreview,
        detail,
      }),
    [selectedActionPreview, detail],
  );

  const effectiveDetail = useMemo((): GatewayDecisionProblemDetailResult | null | undefined => {
    if (!detail && !localResolution) return detail;
    return {
      ...(detail ?? { id: problemId ?? '', type: 'INFEASIBILITY', title: '', status: 'OPEN', primaryEnforcement: 'BLOCK' }),
      resolution: pickAuthoritativeResolution(localResolution, detail?.resolution),
      actionPlanId: localActionPlanId ?? detail?.actionPlanId,
      workflowStatus: (localWorkflowStatus ?? detail?.workflowStatus) as GatewayDecisionProblemDetailResult['workflowStatus'],
      executionStatus: (localExecutionStatus ?? detail?.executionStatus) as GatewayDecisionProblemDetailResult['executionStatus'],
    };
  }, [detail, localResolution, localActionPlanId, localExecutionStatus, localWorkflowStatus, problemId]);

  const ctaPhase: DecisionResolutionCtaPhase = resolveDecisionResolutionCtaPhase(effectiveDetail);

  const rawActions = useMemo(() => {
    const fromDetail = detail?.actions;
    const fromOptions = optionsActions.length ? optionsActions : undefined;
    const base = fromDetail?.length
      ? fromDetail
      : mapOptionsToDecisionActions(options, writeChain);
    const debugSuppressed = detail?.debug?.suppressedActions ?? [];
    if (!debugSuppressed.length) return base;
    const seen = new Set(base.map((action) => action.actionId));
    return [
      ...base,
      ...debugSuppressed.filter((action) => !seen.has(action.actionId)),
    ];
  }, [detail?.actions, detail?.debug?.suppressedActions, optionsActions, options, writeChain]);

  const { visible: actions, suppressed: suppressedActions } = useMemo(
    () => partitionDecisionActionsForUi(rawActions),
    [rawActions],
  );

  const legacyActions = useMemo(
    () =>
      resolveDetailActions({
        actions: detail?.actions?.length ? detail.actions : optionsActions,
        options,
        writeChain,
      }),
    [detail?.actions, optionsActions, options, writeChain],
  );

  const effectiveActions = actions.length ? actions : legacyActions;

  const selectedAction = useMemo(() => {
    const selectionId =
      selectedActionId ?? effectiveDetail?.resolution?.selectedActionId ?? null;
    return findDecisionActionForSelection(effectiveActions, selectionId);
  }, [effectiveActions, selectedActionId, effectiveDetail?.resolution?.selectedActionId]);

  useEffect(() => {
    setSelectedActionId(null);
    setLocalResolution(null);
    setLocalExecutionStatus(null);
    setLocalActionPlanId(null);
    setLocalWorkflowStatus(null);
    setSuggestedSubTasks([]);
    setSuggestedFollowUps([]);
    setStructuredSuggestedFollowUps([]);
    setSelectedActionPreview(null);
    setAcknowledgement([]);
    setApplyNeedsAcknowledgement(false);
    setServerAckRequired([]);
    setCollaborativeProblemId(null);
    setAppliedActionLabel(null);
    setAppliedActionSummary(null);
  }, [problemId]);

  useEffect(() => {
    if (ctaPhase !== 'apply' && ctaPhase !== 'done') return;
    const fromResolution = effectiveDetail?.resolution?.selectedActionId?.trim();
    if (!fromResolution || selectedActionId === fromResolution) return;
    setSelectedActionId(fromResolution);
  }, [ctaPhase, effectiveDetail?.resolution?.selectedActionId, selectedActionId]);

  useEffect(() => {
    if (ctaPhase !== 'done' || appliedActionLabel) return;
    const action =
      selectedAction ??
      findDecisionActionForSelection(
        effectiveActions,
        effectiveDetail?.resolution?.selectedActionId,
      );
    if (!action) return;
    setAppliedActionLabel(decisionActionDisplayTitle(action));
    const summary = action.summary?.trim() || action.expectedImpact?.trim();
    if (summary) setAppliedActionSummary(summary);
  }, [
    ctaPhase,
    appliedActionLabel,
    selectedAction,
    effectiveActions,
    effectiveDetail?.resolution?.selectedActionId,
  ]);

  useEffect(() => {
    if (!detail?.resolution?.resolutionId?.trim()) return;
    setLocalResolution((current) => {
      const serverId = detail.resolution!.resolutionId!.trim();
      const localId = current?.resolutionId?.trim();
      if (!localId || localId !== serverId) return detail.resolution!;
      return current;
    });
  }, [detail?.resolution?.resolutionId]);

  const applySubmitSideEffects = useCallback(
    (
      result: Pick<
        SubmitDecisionResolutionResponse | ApplyDecisionProblemResponse,
        'resolution' | 'collaborativeTask' | 'problem'
      > & {
        resolution?: DecisionProblemResolutionView;
      },
    ) => {
      if (result.resolution?.resolutionId) {
        setLocalResolution(result.resolution);
      }
      if (result.problem?.workflowStatus) {
        setLocalWorkflowStatus(result.problem.workflowStatus);
      }

      const applyResponse =
        'revalidation' in result || 'applyResult' in result
          ? (result as ApplyDecisionProblemResponse)
          : null;
      const executionStatus =
        (applyResponse ? inferExecutionStatusAfterApply(applyResponse) : undefined) ??
        result.problem?.executionStatus;
      if (executionStatus) {
        setLocalExecutionStatus(executionStatus);
      }
      const binding = resolveCollaborativeTaskBinding({
        problemId: problemId ?? '',
        collaborativeTask: result.collaborativeTask,
        resolution: result.resolution ?? effectiveDetail?.resolution,
        actionPlanId:
          ('applyResult' in result && result.applyResult?.actionPlanId
            ? result.applyResult.actionPlanId
            : undefined) ??
          localActionPlanId ??
          effectiveDetail?.actionPlanId,
      });
      if (binding.actionPlanId) {
        setLocalActionPlanId(binding.actionPlanId);
      }
      if (binding.problemId) {
        setCollaborativeProblemId(binding.problemId);
      }
    },
    [problemId, effectiveDetail?.resolution, effectiveDetail?.actionPlanId, localActionPlanId],
  );

  useEffect(() => {
    if (ctaPhase !== 'apply') return;
    if (structuredSuggestedFollowUps.length || suggestedFollowUps.length) return;
    const preview = previewCollaborativeFollowUps(detail?.semanticKey);
    if (!preview.items.length) return;
    setStructuredSuggestedFollowUps(
      preview.items.map((item) => ({
        kind: item.kind,
        title: item.title,
      })),
    );
    setSuggestedFollowUps(preview.items.map((item) => item.title));
  }, [
    ctaPhase,
    detail?.semanticKey,
    structuredSuggestedFollowUps.length,
    suggestedFollowUps.length,
  ]);

  const acknowledgementRequired = useMemo(
    () =>
      resolveDecisionAcknowledgementRequired({
        preview: selectedActionPreview,
        action: selectedAction,
        forceFallback: applyNeedsAcknowledgement,
        includeAllTradeoffs: ctaPhase === 'apply',
        serverRequired: serverAckRequired,
      }),
    [
      selectedActionPreview,
      selectedAction,
      applyNeedsAcknowledgement,
      ctaPhase,
      serverAckRequired,
    ],
  );

  const acknowledgementsComplete = areDecisionAcknowledgementsComplete(
    acknowledgementRequired,
    acknowledgement,
  );

  useEffect(() => {
    setAcknowledgement([]);
    setApplyNeedsAcknowledgement(false);
    setServerAckRequired([]);
  }, [problemId]);

  useEffect(() => {
    if (ctaPhase !== 'select_action') return;
    setAcknowledgement([]);
    setApplyNeedsAcknowledgement(false);
  }, [selectedActionId, ctaPhase]);

  const invalidateAfterWrite = useCallback(async () => {
    await Promise.all(
      decisionProblemWriteQueryKeys(tripId).map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
    await onRefresh?.();
  }, [queryClient, tripId, onRefresh]);

  const refreshResolutionBinding = useCallback(
    async (ackPayload?: string[]): Promise<RefreshResolutionBindingResult> => {
      if (!problemId) return { ok: false };

      const action =
        selectedAction ??
        findDecisionActionForSelection(
          effectiveActions,
          effectiveDetail?.resolution?.selectedActionId,
        );
      if (!action?.allowed) return { ok: false };

      const resolvedActionId = resolveDecisionActionId(action);
      if (!resolvedActionId) return { ok: false };

      const submitResult = await submitDecisionResolution(
        {
          tripId,
          problemId,
          action: { ...action, actionId: resolvedActionId },
          acknowledgement: ackPayload?.length ? ackPayload : undefined,
        },
        { silent: true },
      );
      if (!submitResult) return { ok: false };

      applySubmitSideEffects(submitResult);
      await invalidateAfterWrite();
      return {
        ok: true,
        resolutionId: submitResult.resolution?.resolutionId?.trim() || undefined,
      };
    },
    [
      tripId,
      problemId,
      selectedAction,
      effectiveActions,
      effectiveDetail?.resolution?.selectedActionId,
      applySubmitSideEffects,
      invalidateAfterWrite,
    ],
  );

  const bindResolutionAcknowledgement = refreshResolutionBinding;

  useEffect(() => {
    if (ctaPhase !== 'select_action' || effectiveActions.length === 0) return;
    if (selectedActionId || effectiveDetail?.resolution?.selectedActionId) return;
    const firstId = resolveDecisionActionId(effectiveActions[0]!);
    if (firstId) setSelectedActionId(firstId);
  }, [
    ctaPhase,
    effectiveActions,
    selectedActionId,
    effectiveDetail?.resolution?.selectedActionId,
  ]);

  const resolutionId = effectiveDetail?.resolution?.resolutionId ?? null;
  const actionPlanId = localActionPlanId ?? effectiveDetail?.actionPlanId ?? null;
  const subTaskProblemId = collaborativeProblemId ?? problemId ?? null;
  const submitHint = writeChainSubmitHint(writeChain);

  const selectAction = useCallback((actionId: string) => {
    setSelectedActionId(actionId);
    setSelectedActionPreview(null);
    setAcknowledgement([]);
    setApplyNeedsAcknowledgement(false);
  }, []);

  const toggleAcknowledgement = useCallback((item: string, checked: boolean) => {
    setAcknowledgement((prev) => {
      if (checked) return prev.includes(item) ? prev : [...prev, item];
      return prev.filter((entry) => entry !== item);
    });
    setApplyNeedsAcknowledgement(false);
  }, []);

  const previewAction = useCallback(
    async (action: DecisionAction, options?: { silent?: boolean }) => {
      if (!problemId || !action.allowed) return null;
      setPreviewingActionId(action.actionId);
      try {
        const preview = await decisionProblemsApi.previewOption(
          tripId,
          problemId,
          action.actionId,
        );
        setSelectedActionPreview(preview);
        if (!options?.silent) {
          toast.message('方案预览已加载', {
            description:
              (preview as GatewayDecisionPreviewResult & { impactSummary?: string })
                .impactSummary?.trim() ||
              (preview as GatewayDecisionPreviewResult & { description?: string })
                .description?.trim() ||
              action.summary ||
              action.title,
          });
        }
        return preview;
      } catch (err) {
        setSelectedActionPreview(null);
        if (!options?.silent) {
          toast.error(err instanceof Error ? err.message : '预览失败');
        }
        return null;
      } finally {
        setPreviewingActionId(null);
      }
    },
    [tripId, problemId],
  );

  const submitResolution = useCallback(
    async (action?: DecisionAction) => {
      if (!problemId) return false;

      const target =
        action ??
        selectedAction ??
        findDecisionActionForSelection(effectiveActions, selectedActionId);
      if (!target?.allowed) {
        if (target?.blockedReason) toast.error(target.blockedReason);
        else toast.error('请先选择处理方式');
        return false;
      }
      const resolvedActionId = resolveDecisionActionId(target);
      if (!resolvedActionId) {
        toast.error('请先选择处理方式', {
          description: '当前问题缺少 detail.actions[].actionId',
        });
        return false;
      }

      let preview =
        selectedActionPreview?.optionId === resolvedActionId ? selectedActionPreview : null;
      if (!preview) {
        if (previewingActionId === resolvedActionId) {
          toast.message('正在加载方案预览', { description: '请稍候再提交结论' });
          return false;
        }
        preview = await previewAction(
          { ...target, actionId: resolvedActionId },
          { silent: true },
        );
      }
      if (!preview) {
        toast.error('无法加载方案预览', { description: '请稍后重试' });
        return false;
      }

      const requiredAcks = resolveDecisionAcknowledgementRequired({
        preview,
        action: { ...target, actionId: resolvedActionId },
        serverRequired: serverAckRequired,
      });

      if (requiredAcks.length > 0 && !areDecisionAcknowledgementsComplete(requiredAcks, acknowledgement)) {
        toast.error('请先勾选确认项', {
          description: '该方案需确认影响后再提交结论。',
        });
        return false;
      }

      const ackPayload =
        requiredAcks.length > 0
          ? requiredAcks.filter((item) => acknowledgement.includes(item))
          : undefined;

      setSelectedActionId(resolvedActionId);
      setSubmittingActionId(resolvedActionId);
      try {
        const result = await submitDecisionResolution({
          tripId,
          problemId,
          action: { ...target, actionId: resolvedActionId },
          acknowledgement: ackPayload?.length ? ackPayload : undefined,
          causalTraceRef: activeCausalTraceRef,
          previewCausalTraceRef: preview?.causalTraceRef,
          detailCausalTraceRef: detail?.causalTraceRef,
        });
        if (!result?.resolution?.resolutionId) return false;

        applySubmitSideEffects(result);
        setSuggestedFollowUps(
          resolveSuggestedFollowUpLabels(result.suggestedFollowUps, detail?.semanticKey),
        );
        if (result.structuredSuggestedFollowUps?.length) {
          setStructuredSuggestedFollowUps(result.structuredSuggestedFollowUps);
        } else if (result.suggestedFollowUps?.length) {
          setStructuredSuggestedFollowUps(
            result.suggestedFollowUps.map((title) => ({ kind: 'OTHER', title })),
          );
        }
        await invalidateAfterWrite();
        return true;
      } catch (err) {
        const fromServer = resolveAcknowledgementRequiredFromError(err);
        if (fromServer.length) {
          setServerAckRequired(fromServer);
        }
        if (!isDecisionAcknowledgementRequiredError(err)) {
          return false;
        }
        toast.error('请先勾选确认项', {
          description: '请按预览中的确认文案勾选后再提交。',
        });
        return false;
      } finally {
        setSubmittingActionId(null);
      }
    },
    [
      tripId,
      problemId,
      detail?.semanticKey,
      invalidateAfterWrite,
      selectedAction,
      effectiveActions,
      selectedActionId,
      acknowledgement,
      selectedActionPreview,
      previewingActionId,
      previewAction,
      serverAckRequired,
      applySubmitSideEffects,
      activeCausalTraceRef,
      detail?.causalTraceRef,
    ],
  );

  const applyToTrip = useCallback(async () => {
    if (!problemId) {
      toast.error('未选择决策问题');
      return false;
    }

    if (acknowledgementRequired.length > 0 && !acknowledgementsComplete) {
      setApplyNeedsAcknowledgement(true);
      toast.error('请先勾选确认项', {
        description: '该方案需确认影响后再应用到行程。',
      });
      return false;
    }

    const ackPayload = acknowledgement.length ? acknowledgement : undefined;
    const resolutionStatus = String(effectiveDetail?.resolution?.status ?? '').toUpperCase();
    const needsResolutionRefresh =
      isProblemApplyInFlight(effectiveDetail) || resolutionStatus === 'FAILED';

    if (needsResolutionRefresh) {
      toast.message('正在重置决策状态', {
        description: '检测到上次应用未完成，正在重新绑定结论…',
      });
    }

    setApplying(true);
    try {
      if (selectedAction?.allowed && !selectedActionPreview) {
        void previewAction(selectedAction, { silent: true });
      }

      const runApply = () =>
        applyDecisionProblemToTrip(tripId, problemId, {
          acknowledgement: ackPayload,
          causalTraceRef: activeCausalTraceRef,
        });

      if (needsResolutionRefresh) {
        const rebound = await refreshResolutionBinding(ackPayload);
        if (!rebound.ok) {
          toast.error('无法更新决策结论', {
            description: '请刷新页面后重试；若仍失败请联系支持重置该决策。',
          });
          return false;
        }
      }

      let result: ApplyDecisionProblemResponse | null = null;
      try {
        result = await runApply();
      } catch (err) {
        const fromServer = resolveAcknowledgementRequiredFromError(err);
        if (fromServer.length) {
          setServerAckRequired(fromServer);
        }
        if (
          isDecisionAcknowledgementRequiredError(err) &&
          ackPayload?.length &&
          selectedAction?.allowed
        ) {
          if ((await refreshResolutionBinding(ackPayload)).ok) {
            result = await runApply();
          } else {
            setApplyNeedsAcknowledgement(true);
            toast.error('确认项未能绑定到决策结论', {
              description: '请重新勾选后再试。',
            });
            return false;
          }
        } else if (isCausalTraceStaleError(err)) {
          toast.error('因果依据已过期', {
            description: '行程状态已变化，正在重新加载问题与预览…',
          });
          setSelectedActionPreview(null);
          await invalidateAfterWrite();
          await onRefresh?.();
          if (selectedAction?.allowed) {
            const refreshedPreview = await previewAction(selectedAction, { silent: true });
            if (!refreshedPreview?.causalTraceRef) {
              toast.error('请重新选择方案后再应用到行程');
              return false;
            }
            result = await applyDecisionProblemToTrip(tripId, problemId, {
              acknowledgement: ackPayload,
              causalTraceRef: refreshedPreview.causalTraceRef,
            });
          } else {
            return false;
          }
        } else {
          throw err;
        }
      }

      if (!result) {
        setApplyNeedsAcknowledgement(true);
        await invalidateAfterWrite();
        toast.error('应用到行程失败', {
          description: '未收到有效响应，请稍后重试或刷新页面。',
        });
        return false;
      }

      applySubmitSideEffects(result);

      if (isApplyOutcomeBlocked(result) || !isApplyOutcomeSuccessful(result)) {
        setApplyNeedsAcknowledgement(true);
        await invalidateAfterWrite();
        return false;
      }

      if (result.suggestedSubTasks?.length) {
        setSuggestedSubTasks(result.suggestedSubTasks);
      }

      const appliedAction =
        selectedAction ??
        findDecisionActionForSelection(
          effectiveActions,
          effectiveDetail?.resolution?.selectedActionId,
        );
      if (appliedAction) {
        setAppliedActionLabel(decisionActionDisplayTitle(appliedAction));
        const summary =
          selectedActionPreview?.impactSummary?.trim() ||
          selectedActionPreview?.description?.trim() ||
          appliedAction.summary?.trim() ||
          appliedAction.expectedImpact?.trim();
        if (summary) setAppliedActionSummary(summary);
      }

      await invalidateAfterWrite();
      await onApplied?.();
      return true;
    } catch (err) {
      const fromServer = resolveAcknowledgementRequiredFromError(err);
      if (fromServer.length) {
        setServerAckRequired(fromServer);
      }
      if (isDecisionAcknowledgementRequiredError(err)) {
        setApplyNeedsAcknowledgement(true);
        toast.error('请先勾选确认项', {
          description: '该方案需确认影响后再应用到行程。',
        });
      } else if (isCausalTraceStaleError(err)) {
        toast.error('因果依据已过期', {
          description: '请重新加载问题详情与方案预览后再应用到行程。',
        });
      } else {
        toast.error(err instanceof Error ? err.message : '应用到行程失败');
      }
      await invalidateAfterWrite();
      return false;
    } finally {
      setApplying(false);
    }
  }, [
    tripId,
    problemId,
    invalidateAfterWrite,
    onApplied,
    acknowledgement,
    acknowledgementRequired.length,
    acknowledgementsComplete,
    selectedAction,
    selectedActionPreview,
    previewAction,
    effectiveDetail,
    refreshResolutionBinding,
    activeCausalTraceRef,
    onRefresh,
  ]);

  useEffect(() => {
    if (!problemId) return;
    if (ctaPhase !== 'select_action' && ctaPhase !== 'apply') return;

    const action = selectedAction;
    if (!action?.allowed) {
      setSelectedActionPreview(null);
      return;
    }

    const actionId = resolveDecisionActionId(action);
    if (!actionId) return;

    const previewMatches = selectedActionPreview?.optionId === actionId;
    if (previewMatches || previewingActionId === actionId) return;

    if (eagerPreviewOnSelect) {
      void previewAction(action, { silent: true });
      return;
    }

    return deferUntilIdle(() => {
      void previewAction(action, { silent: true });
    });
  }, [
    ctaPhase,
    problemId,
    selectedAction,
    selectedActionPreview?.optionId,
    previewingActionId,
    previewAction,
    eagerPreviewOnSelect,
  ]);

  return {
    actions: effectiveActions,
    suppressedActions,
    selectedAction,
    writeChain,
    submitHint,
    ctaPhase,
    resolutionId,
    actionPlanId,
    subTaskProblemId,
    suggestedSubTasks,
    suggestedFollowUps,
    structuredSuggestedFollowUps,
    selectedActionId:
      selectedActionId ??
      effectiveDetail?.resolution?.selectedActionId ??
      null,
    submittingActionId,
    previewingActionId,
    selectedActionPreview,
    applying,
    appliedActionLabel,
    appliedActionSummary,
    acknowledgementRequired,
    acknowledgement,
    acknowledgementsComplete,
    applyNeedsAcknowledgement,
    selectAction,
    toggleAcknowledgement,
    submitResolution,
    previewAction,
    applyToTrip,
    refreshResolutionBinding,
    /** @deprecated 使用 refreshResolutionBinding */
    bindResolutionAcknowledgement: refreshResolutionBinding,
  };
}

export type UseDecisionProblemActionsResult = ReturnType<typeof useDecisionProblemActions>;
