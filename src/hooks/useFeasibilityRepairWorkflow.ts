import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { applyRepair, getRepairOptions, previewRepair } from '@/api/feasibility-repair';
import {
  decisionProblemsApi,
} from '@/api/decision-problems';
import {
  loadDecisionProblemOptions,
  mapDecisionOptionsToRepairOptions,
} from '@/lib/constraint-conflict-repair-flow';
import {
  isDecisionSemanticsApplyError,
  mapDecisionPreviewToRepairPreview,
} from '@/lib/decision-problem-repair-bridge.util';
import {
  applyDecisionProblemToTrip,
  submitDecisionResolution,
} from '@/lib/decision-apply-action.util';
import {
  isDecisionExecutionApplied,
  isRevalidationPending,
} from '@/lib/decision-apply-polling.util';
import { isUnifiedDecisionGatewayEnabled } from '@/lib/decision-gateway.util';
import {
  assertFeasibilityApplyRepairAllowed,
  formatLegacyApplyBlockedMessage,
  isLegacyApplyBlockedError,
  shouldBlockDirectFeasibilityApplyRepair,
  shouldRetryLegacyApply,
} from '@/lib/effective-plan-write-chain.util';
import {
  runDecisionConfirmWithExecutionGate,
  type DecisionExecutionClassification,
} from '@/generated/decision-semantics-contracts';
import type { DecisionAction } from '@/generated/unified-decision-contracts';
import { executionCapabilityConfirmLabel } from '@/lib/decision-problem-display.util';
import type {
  CreateDecisionResponse,
  DecisionExecutionStatusResponse,
  DecisionOption,
  DecisionOptionPreviewResponse,
} from '@/types/decision-problem';
import { resolveGuardianNegotiationForDev } from '@/lib/readiness-cascade-mock.util';
import { normalizeGuardianNegotiationResult } from '@/lib/readiness-guardian-negotiation.util';
import type { GuardianNegotiationResult } from '@/types/readiness-guardian-negotiation';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import type {
  CascadeCausalPreAnalysis,
  CascadeUiHint,
} from '@/types/readiness-cascade';
import type {
  PreviewRepairResponse,
  RepairDrawerPhase,
} from '@/types/feasibility-repair';
import type { FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';
import { isPlanClassAction } from '@/lib/feasibility-repair-plan-class';
import { isSyntheticPlanBRepairOption } from '@/lib/feasibility-proof-plan-b';
import {
  isRepairOptionNotInBlockerListError,
  mergeAuthoritativeRepairOptions,
  parseInvalidRepairOptionFromError,
} from '@/lib/feasibility-repair-options';

export interface UseFeasibilityRepairWorkflowOptions {
  tripId: string;
  issueId: string | null | undefined;
  /** decision-problems BFF 问题 ID（可用时走 previewOption + createDecision） */
  decisionProblemId?: string | null;
  /** repair-options / preview / apply 使用的权威 issueId（可与展示 issue 不同） */
  repairIssueId?: string | null;
  /** 初始选项（报告内嵌 planBOptions / repairOptions） */
  initialOptions?: FeasibilityRepairOptionDto[];
  onApplied?: () => void | Promise<void>;
  onOptionsLoaded?: (options: FeasibilityRepairOptionDto[]) => void;
  /** 拉取 repair-options 后按行程语境过滤 */
  filterLoadedOptions?: (
    options: FeasibilityRepairOptionDto[],
  ) => FeasibilityRepairOptionDto[];
}

export function useFeasibilityRepairWorkflow({
  tripId,
  issueId,
  decisionProblemId,
  repairIssueId,
  initialOptions,
  onApplied,
  onOptionsLoaded,
  filterLoadedOptions,
}: UseFeasibilityRepairWorkflowOptions) {
  const [phase, setPhase] = useState<RepairDrawerPhase>('select_option');
  const [optionsSource, setOptionsSource] = useState<'decision-problems' | 'feasibility-repair' | null>(
    null,
  );
  const [decisionPreview, setDecisionPreview] = useState<DecisionOptionPreviewResponse | null>(null);
  const [decisionAcknowledgement, setDecisionAcknowledgement] = useState<string[]>([]);
  const [options, setOptions] = useState<FeasibilityRepairOptionDto[]>(initialOptions ?? []);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRepairResponse | null>(null);
  const [guardianNegotiation, setGuardianNegotiation] = useState<GuardianNegotiationResult | null>(
    null,
  );
  const [guardianMock, setGuardianMock] = useState(false);
  const [forceDecisionRepair, setForceDecisionRepair] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [cascadeHints, setCascadeHints] = useState<CascadeUiHint[]>([]);
  const [cascadePreAnalysis, setCascadePreAnalysis] = useState<CascadeCausalPreAnalysis | null>(
    null,
  );
  const [issueMessage, setIssueMessage] = useState<string | null>(null);
  const [deferredChoosePoints, setDeferredChoosePoints] = useState<string[]>([]);
  const [deferredPresentation, setDeferredPresentation] =
    useState<GuardianPersonaPresentation | null>(null);
  const [executionClassification, setExecutionClassification] =
    useState<DecisionExecutionClassification | null>(null);
  const [executionStatus, setExecutionStatus] = useState<DecisionExecutionStatusResponse | null>(
    null,
  );
  const [lastDecisionResult, setLastDecisionResult] = useState<CreateDecisionResponse | null>(
    null,
  );
  const [resolutionId, setResolutionId] = useState<string | null>(null);
  const clientAttemptIdRef = useRef<string | null>(null);
  const confirmInFlightRef = useRef(false);

  const resetClientAttempt = useCallback(() => {
    clientAttemptIdRef.current = crypto.randomUUID();
  }, []);

  useEffect(() => {
    setOptions(initialOptions ?? []);
    setSelectedOptionId(null);
    setPreview(null);
    setPhase('select_option');
    setForceDecisionRepair(false);
    setPreviewError(null);
    setApplyError(null);
    setCascadeHints([]);
    setCascadePreAnalysis(null);
    setIssueMessage(null);
    setDeferredChoosePoints([]);
    setDeferredPresentation(null);
    setOptionsSource(null);
    setDecisionPreview(null);
    setDecisionAcknowledgement([]);
    setExecutionClassification(null);
    setExecutionStatus(null);
    setLastDecisionResult(null);
    setResolutionId(null);
    clientAttemptIdRef.current = null;
    confirmInFlightRef.current = false;
  }, [issueId, initialOptions]);

  const apiIssueId = repairIssueId ?? issueId;

  const loadOptions = useCallback(async () => {
    if (!apiIssueId && !decisionProblemId) return;
    try {
      setOptionsLoading(true);

      if (decisionProblemId) {
        const loaded = await loadDecisionProblemOptions({
          tripId,
          problemId: decisionProblemId,
          fallbackIssueId: apiIssueId ?? undefined,
        });
        if (loaded.source === 'decision-problems') {
          const mapped = mapDecisionOptionsToRepairOptions(loaded.options as DecisionOption[]);
          const filtered = filterLoadedOptions ? filterLoadedOptions(mapped) : mapped;
          setOptionsSource('decision-problems');
          setOptions(filtered);
          onOptionsLoaded?.(filtered);
          return;
        }
      }

      if (!apiIssueId) return;
      const res = await getRepairOptions(tripId, apiIssueId);
      const apiOptions = filterLoadedOptions
        ? filterLoadedOptions(res.options)
        : res.options;
      const merged = mergeAuthoritativeRepairOptions(apiOptions, initialOptions ?? []);
      setOptionsSource('feasibility-repair');
      setOptions(merged);
      onOptionsLoaded?.(merged);
      setCascadeHints(res.cascadeUiHints ?? []);
      setCascadePreAnalysis(res.causalPreAnalysis ?? null);
      setIssueMessage(res.issueMessage ?? res.blockerMessage ?? null);
      const guardianRaw = res.guardianNegotiation;
      const { data, isMock } = resolveGuardianNegotiationForDev(
        normalizeGuardianNegotiationResult(guardianRaw),
      );
      setGuardianNegotiation(data);
      setGuardianMock(isMock);
    } catch {
      toast.error('加载修复方案失败');
    } finally {
      setOptionsLoading(false);
    }
  }, [tripId, apiIssueId, decisionProblemId, initialOptions, onOptionsLoaded, filterLoadedOptions]);

  const selectOption = useCallback(
    async (optionId: string) => {
      if (!apiIssueId && !decisionProblemId) return;
      const picked = options.find((o) => o.id === optionId);
      setSelectedOptionId(optionId);
      setPreviewError(null);
      setForceDecisionRepair(false);
      setDecisionPreview(null);
      setResolutionId(null);

      if (picked && isSyntheticPlanBRepairOption(picked)) {
        setPreview(null);
        setPhase('guidance_ready');
        setPreviewError(null);
        return;
      }

      setPhase('preview_loading');

      if (optionsSource === 'decision-problems' && decisionProblemId) {
        resetClientAttempt();
        try {
          const res = await decisionProblemsApi.previewOption(tripId, decisionProblemId, optionId);
          setDecisionPreview(res);
          setPreview(mapDecisionPreviewToRepairPreview(res, picked!));
          if (res.acknowledgementRequired?.length) {
            setDeferredChoosePoints(res.acknowledgementRequired);
            setDecisionAcknowledgement([]);
            setPhase('preview_deferred');
          } else if (
            res.executionCapability?.toUpperCase() === 'GUIDED_MANUAL' ||
            res.executionCapability?.toUpperCase() === 'ADVISORY_ONLY'
          ) {
            setPhase('preview_deferred');
          } else {
            setPhase('preview_ready');
          }
        } catch (e) {
          setPreview(null);
          setPhase('select_option');
          setPreviewError(e instanceof Error ? e.message : '预览失败');
        }
        return;
      }

      if (!apiIssueId) return;

      try {
        const res = await previewRepair(tripId, apiIssueId, optionId);
        setPreview(res);
        if (res.cascadeUiHints?.length) {
          setCascadeHints(res.cascadeUiHints);
        }
        if (res.causalPreAnalysis) {
          setCascadePreAnalysis(res.causalPreAnalysis);
        }
        if (res.guardianNegotiation) {
          const { data, isMock } = resolveGuardianNegotiationForDev(
            normalizeGuardianNegotiationResult(res.guardianNegotiation),
          );
          setGuardianNegotiation(data);
          setGuardianMock(isMock);
        }
        if (res.status === 'would_defer' || res.wouldDefer) {
          setDeferredChoosePoints(res.humanDecisionPointsFlat ?? []);
          setDeferredPresentation(res.presentation ?? null);
          setPhase('preview_deferred');
        } else {
          setPhase('preview_ready');
        }
      } catch (e) {
        setPreview(null);
        setPhase('select_option');
        const message = e instanceof Error ? e.message : '预览失败';
        if (isRepairOptionNotInBlockerListError(message)) {
          const invalidId = parseInvalidRepairOptionFromError(message);
          if (invalidId) {
            setOptions((prev) => prev.filter((option) => option.id !== invalidId));
          }
          setSelectedOptionId(null);
          setPreviewError(
            '该方案与当前阻塞项不匹配，已从列表移除。请重新加载方案或改在时间轴手动调整。',
          );
          return;
        }
        setPreviewError(message);
      }
    },
    [tripId, apiIssueId, decisionProblemId, optionsSource, options, resetClientAttempt],
  );

  const confirmApply = useCallback(async () => {
    if (!selectedOptionId) return;
    const selectedOption = options.find((o) => o.id === selectedOptionId);
    setPhase('applying');
    setApplyError(null);

    if (optionsSource === 'decision-problems' && decisionProblemId) {
      if (confirmInFlightRef.current) return;

      try {
        confirmInFlightRef.current = true;

        if (isUnifiedDecisionGatewayEnabled()) {
          const executable =
            (selectedOption?.metadata as { executable?: boolean } | undefined)?.executable;
          const action: DecisionAction = {
            actionId: selectedOptionId,
            label: selectedOption?.label ?? selectedOptionId,
            allowed: executable !== false,
            blockedReason: executable === false ? '当前不可执行' : null,
          };

          if (!resolutionId) {
            setPhase('submitting_resolution');
            const submitResult = await submitDecisionResolution({
              tripId,
              problemId: decisionProblemId,
              action,
              acknowledgement:
                decisionAcknowledgement.length > 0 ? decisionAcknowledgement : undefined,
            });

            if (!submitResult?.resolution?.resolutionId) {
              setApplyError('提交结论失败');
              setPhase(
                decisionPreview?.acknowledgementRequired?.length
                  ? 'preview_deferred'
                  : 'preview_ready',
              );
              return;
            }

            setResolutionId(submitResult.resolution.resolutionId);
            setPhase('apply_ready');
            return;
          }

          setPhase('applying');
          const applyResult = await applyDecisionProblemToTrip(tripId, decisionProblemId);

          if (!applyResult) {
            setApplyError('应用失败');
            setPhase('apply_ready');
            return;
          }

          setExecutionClassification({
            variant: 'success',
            shouldRefreshItinerary: true,
            shouldShowSuccessToast: false,
            isTerminal: true,
            shouldPoll:
              isRevalidationPending(applyResult.revalidation?.status) &&
              !isDecisionExecutionApplied(applyResult.problem?.executionStatus),
            needsRepair: false,
          });
          if (applyResult.problem?.executionStatus) {
            setExecutionStatus({ status: String(applyResult.problem.executionStatus) });
          }
          setPhase('done');
          await onApplied?.();
          return;
        }

        if (!clientAttemptIdRef.current) {
          resetClientAttempt();
        }

        const capability =
          decisionPreview?.executionCapability ??
          (selectedOption?.metadata as { executionCapability?: string } | undefined)
            ?.executionCapability;

        const { response, executionStatus: terminalStatus, classification } =
          await runDecisionConfirmWithExecutionGate(
            {
              tripId,
              problemId: decisionProblemId,
              selectedOptionId,
              clientAttemptId: clientAttemptIdRef.current!,
              executionCapability: capability,
              acknowledgement:
                decisionAcknowledgement.length > 0 ? decisionAcknowledgement : undefined,
            },
            { onRefreshItinerary: onApplied },
          );

        setLastDecisionResult(response);
        setExecutionClassification(classification);
        setExecutionStatus(terminalStatus);

        if (response.applyResult?.status === 'deferred') {
          setDeferredChoosePoints([]);
          setPhase('apply_deferred');
          return;
        }

        if (classification.isTerminal) {
          setPhase('done');
          return;
        }

        setPhase('done');
      } catch (e) {
        const message = e instanceof Error ? e.message : '确认决策失败';
        setApplyError(message);
        setPhase(decisionPreview?.acknowledgementRequired?.length ? 'preview_deferred' : 'preview_ready');
        if (isDecisionSemanticsApplyError(e) && e.code === 'DECISION_ACKNOWLEDGEMENT_REQUIRED') {
          setDeferredChoosePoints(decisionPreview?.acknowledgementRequired ?? []);
          setPhase('preview_deferred');
        }
        throw e instanceof Error ? e : new Error(message);
      } finally {
        confirmInFlightRef.current = false;
      }
      return;
    }

    if (!apiIssueId) return;

    if (optionsSource === 'feasibility-repair' && shouldBlockDirectFeasibilityApplyRepair()) {
      setApplyError(formatLegacyApplyBlockedMessage());
      setPhase(preview?.status === 'would_defer' ? 'preview_deferred' : 'preview_ready');
      return;
    }

    try {
      assertFeasibilityApplyRepairAllowed({ id: apiIssueId, decisionProblemId: decisionProblemId ?? undefined });
      const res = await applyRepair(tripId, apiIssueId, {
        optionId: selectedOptionId,
        ...(isPlanClassAction(selectedOption?.actionType)
          ? { executeDecision: true }
          : {}),
        ...(forceDecisionRepair
          ? { forceDecisionRepair: true, persistDecision: true }
          : {}),
      });

      if (res.guardianNegotiation) {
        const { data, isMock } = resolveGuardianNegotiationForDev(
          normalizeGuardianNegotiationResult(res.guardianNegotiation),
        );
        setGuardianNegotiation(data);
        setGuardianMock(isMock);
      }

      if (res.status === 'deferred') {
        setDeferredChoosePoints(res.humanDecisionPointsFlat ?? []);
        setDeferredPresentation(res.presentation ?? null);
        setPhase('apply_deferred');
        return;
      }

      setPhase('done');
      await onApplied?.();
    } catch (e) {
      const message = isLegacyApplyBlockedError(e)
        ? formatLegacyApplyBlockedMessage(e)
        : e instanceof Error
          ? e.message
          : '应用修复失败';
      setApplyError(message);
      setPhase(preview?.status === 'would_defer' ? 'preview_deferred' : 'preview_ready');
      if (!shouldRetryLegacyApply(e)) return;
      throw e instanceof Error ? e : new Error(message);
    }
  }, [
    tripId,
    apiIssueId,
    decisionProblemId,
    optionsSource,
    selectedOptionId,
    options,
    decisionPreview,
    decisionAcknowledgement,
    forceDecisionRepair,
    onApplied,
    preview?.status,
    resetClientAttempt,
    resolutionId,
  ]);

  const reset = useCallback(() => {
    setSelectedOptionId(null);
    setPreview(null);
    setPhase('select_option');
    setForceDecisionRepair(false);
    setPreviewError(null);
    setApplyError(null);
    setDeferredChoosePoints([]);
    setDeferredPresentation(null);
    setExecutionClassification(null);
    setExecutionStatus(null);
    setLastDecisionResult(null);
    setResolutionId(null);
  }, []);

  const decisionAcksRequired = decisionPreview?.acknowledgementRequired ?? [];
  const decisionAcksComplete =
    decisionAcksRequired.length === 0 ||
    decisionAcksRequired.every((item) => decisionAcknowledgement.includes(item));

  const applyBlocked =
    (optionsSource !== 'decision-problems' &&
      (phase === 'preview_deferred' ||
        preview?.wouldDefer === true ||
        preview?.status === 'would_defer')) &&
    !forceDecisionRepair;

  const decisionAckBlocked =
    optionsSource === 'decision-problems' &&
    decisionAcksRequired.length > 0 &&
    !decisionAcksComplete &&
    !forceDecisionRepair;

  const guardianBlocked =
    guardianNegotiation?.consensus === 'BLOCKED' && !forceDecisionRepair;

  const selectedOption = selectedOptionId
    ? options.find((option) => option.id === selectedOptionId) ?? null
    : null;
  const guidanceOption =
    selectedOption && isSyntheticPlanBRepairOption(selectedOption) ? selectedOption : null;

  const confirmDisabled = applyBlocked || guardianBlocked || decisionAckBlocked;
  const confirmLabel =
    optionsSource === 'decision-problems'
      ? isUnifiedDecisionGatewayEnabled()
        ? phase === 'submitting_resolution'
          ? '提交中…'
          : phase === 'applying'
            ? '应用中…'
            : resolutionId
              ? '应用到行程'
              : '提交结论'
        : executionCapabilityConfirmLabel(
            decisionPreview?.executionCapability ??
              (selectedOption?.metadata as { executionCapability?: string } | undefined)
                ?.executionCapability,
            phase === 'applying',
          )
      : applyBlocked || guardianBlocked
        ? '需先确认协商点'
        : '确认应用';

  return {
    phase,
    options,
    optionsLoading,
    selectedOptionId,
    selectedOption,
    guidanceOption,
    preview,
    previewError,
    applyError,
    issueMessage,
    cascadeHints,
    cascadePreAnalysis,
    guardianNegotiation,
    guardianMock,
    forceDecisionRepair,
    setForceDecisionRepair,
    loadOptions,
    selectOption,
    confirmApply,
    reset,
    applyBlocked,
    guardianBlocked,
    confirmDisabled,
    confirmLabel,
    deferredChoosePoints,
    deferredPresentation,
    setDeferredPresentation,
    optionsSource,
    decisionPreview,
    decisionAcknowledgement,
    executionClassification,
    executionStatus,
    lastDecisionResult,
    resolutionId,
    toggleDecisionAcknowledgement: (item: string, checked: boolean) => {
      setDecisionAcknowledgement((prev) => {
        if (checked) return prev.includes(item) ? prev : [...prev, item];
        return prev.filter((x) => x !== item);
      });
    },
    isApplying: phase === 'applying' || phase === 'submitting_resolution',
    isApplyReady: phase === 'apply_ready',
    isPreviewLoading: phase === 'preview_loading',
    showPreview:
      phase !== 'select_option' || selectedOptionId != null || guidanceOption != null,
  };
}
