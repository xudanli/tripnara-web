import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DecisionSemanticsApiError,
  decisionProblemsApi,
} from '@/api/decision-problems';
import { isUnifiedDecisionGatewayEnabled } from '@/lib/decision-gateway.util';
import {
  DECISION_PROBLEMS_STALE_MS,
  DECISION_PROBLEM_DETAIL_STALE_MS,
  decisionProblemsQueryErrorMessage,
  decisionProblemsQueryKeys,
  fetchDecisionCenterOverview,
  fetchDecisionProblemsList,
} from '@/hooks/decision-problems-query.util';
import { deriveDecisionSpaceContentFromDetail } from '@/lib/decision-space-detail-content.util';
import {
  shouldBlockLegacyDecisionCreate,
  type GatewayDecisionPreviewResult,
} from '@/generated/unified-decision-contracts';
import {
  buildDecisionIdempotencyKey,
  runDecisionConfirmWithExecutionGate,
  type DecisionExecutionClassification,
} from '@/generated/decision-semantics-contracts';
import type {
  CreateDecisionRequest,
  CreateDecisionResponse,
  DecisionExecutionStatusResponse,
  DecisionOption,
  DecisionProblemDetail,
} from '@/types/decision-problem';

export type DecisionProblemFlowPhase =
  | 'idle'
  | 'loading_detail'
  | 'detail_ready'
  | 'loading_options'
  | 'options_ready'
  | 'preview_loading'
  | 'preview_ready'
  | 'confirming'
  | 'polling_execution'
  | 'executed'
  | 'deferred'
  | 'error';

export interface UseDecisionProblemFlowOptions {
  tripId: string;
  problemId: string | null | undefined;
  /** 执行成功后刷新 feasibility + 行程（仅 shouldRefreshItinerary 时调用） */
  onExecuted?: (result: CreateDecisionResponse) => void | Promise<void>;
}

/** 同一 trip+problem+option 意图下固定 idempotency 子键（勿每次 uuid） */
export const DECISION_CLIENT_ATTEMPT_ID_DEFAULT = 'default';

export function useDecisionProblemFlow({
  tripId,
  problemId,
  onExecuted,
}: UseDecisionProblemFlowOptions) {
  const [phase, setPhase] = useState<DecisionProblemFlowPhase>('idle');
  const [detail, setDetail] = useState<DecisionProblemDetail | null>(null);
  const [options, setOptions] = useState<DecisionOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<GatewayDecisionPreviewResult | null>(null);
  const [acknowledgement, setAcknowledgement] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [lastResult, setLastResult] = useState<CreateDecisionResponse | null>(null);
  const [executionStatus, setExecutionStatus] = useState<DecisionExecutionStatusResponse | null>(
    null,
  );
  const [executionClassification, setExecutionClassification] =
    useState<DecisionExecutionClassification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const clientAttemptIdRef = useRef<string>(DECISION_CLIENT_ATTEMPT_ID_DEFAULT);
  const confirmInFlightRef = useRef(false);

  const resetClientAttempt = useCallback(() => {
    clientAttemptIdRef.current = DECISION_CLIENT_ATTEMPT_ID_DEFAULT;
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setDetail(null);
    setOptions([]);
    setSelectedOptionId(null);
    setPreview(null);
    setAcknowledgement([]);
    setReason('');
    setLastResult(null);
    setExecutionStatus(null);
    setExecutionClassification(null);
    setError(null);
    setErrorCode(null);
    clientAttemptIdRef.current = null;
    confirmInFlightRef.current = false;
  }, []);

  useEffect(() => {
    reset();
  }, [tripId, problemId, reset]);

  const handleApiError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof DecisionSemanticsApiError) {
      setError(err.message);
      setErrorCode(err.code ?? null);
      setPhase('error');
      return err;
    }
    setError(fallback);
    setErrorCode(null);
    setPhase('error');
    return err;
  }, []);

  const loadDetail = useCallback(async () => {
    if (!problemId) return null;
    try {
      setPhase('loading_detail');
      setError(null);
      const data = await decisionProblemsApi.getProblem(tripId, problemId);
      setDetail(data);
      setPhase('detail_ready');
      return data;
    } catch (err) {
      handleApiError(err, '加载问题详情失败');
      return null;
    }
  }, [tripId, problemId, handleApiError]);

  const loadOptions = useCallback(async () => {
    if (!problemId) return [];
    try {
      setPhase('loading_options');
      setError(null);
      const problem = await decisionProblemsApi.getProblem(tripId, problemId);
      setDetail(problem);
      const { options: next } = deriveDecisionSpaceContentFromDetail(problem);
      setOptions(next);
      setPhase('options_ready');
      return next;
    } catch (err) {
      handleApiError(err, '加载方案列表失败');
      return [];
    }
  }, [tripId, problemId, handleApiError]);

  const loadDetailAndOptions = useCallback(async () => {
    const problem = await loadDetail();
    if (!problem) return null;
    await loadOptions();
    return problem;
  }, [loadDetail, loadOptions]);

  const previewOption = useCallback(
    async (optionId: string) => {
      if (!problemId) return null;
      try {
        setSelectedOptionId(optionId);
        resetClientAttempt();
        setPhase('preview_loading');
        setError(null);
        const data = await decisionProblemsApi.previewOption(tripId, problemId, optionId);
        setPreview(data);
        setPhase('preview_ready');
        return data;
      } catch (err) {
        handleApiError(err, '预览方案影响失败');
        return null;
      }
    },
    [tripId, problemId, handleApiError, resetClientAttempt],
  );

  const selectedOption = options.find((o) => o.id === selectedOptionId) ?? null;

  const confirmDecision = useCallback(
    async (input?: Partial<CreateDecisionRequest>) => {
      if (!problemId || !selectedOptionId) return null;
      if (confirmInFlightRef.current) return null;

      if (isUnifiedDecisionGatewayEnabled()) {
        toast.error('请使用「提交结论 → 应用到行程」', {
          description: '统一写路径：POST resolutions 后 POST apply',
        });
        return null;
      }

      if (shouldBlockLegacyDecisionCreate({ flow: preview?.flow })) {
        toast.error('请使用「确认选择 → 确认生效」流程', {
          description: 'Canonical 问题不走 POST decisions',
        });
        return null;
      }

      const capability =
        preview?.executionCapability ?? selectedOption?.executionCapability;

      if (!clientAttemptIdRef.current) {
        clientAttemptIdRef.current = DECISION_CLIENT_ATTEMPT_ID_DEFAULT;
      }

      try {
        confirmInFlightRef.current = true;
        setPhase('confirming');
        setError(null);

        const idempotencyKey = buildDecisionIdempotencyKey({
          tripId,
          problemId,
          selectedOptionId,
          clientAttemptId: clientAttemptIdRef.current,
        });

        const {
          response: result,
          executionStatus: terminalExecution,
          classification,
        } = await runDecisionConfirmWithExecutionGate(
          {
            tripId,
            problemId,
            selectedOptionId,
            clientAttemptId: clientAttemptIdRef.current,
            executionCapability: capability,
            reason: input?.reason ?? (reason.trim() || undefined),
            acknowledgement: input?.acknowledgement ?? acknowledgement,
            execute: input?.execute,
            idempotencyKey: input?.idempotencyKey ?? idempotencyKey,
          },
          { onRefreshItinerary: onExecuted },
        );

        setLastResult(result);
        setExecutionClassification(classification);
        if (terminalExecution) setExecutionStatus(terminalExecution);

        if (classification.shouldPoll && !classification.isTerminal) {
          setPhase('polling_execution');
        }

        if (result.applyResult?.status === 'deferred') {
          setPhase('deferred');
          return result;
        }

        if (classification.isTerminal) {
          setPhase('executed');
          return result;
        }

        if (result.decision.status === 'PROPOSED') {
          setPhase('preview_ready');
          return result;
        }

        setPhase('executed');
        return result;
      } catch (err) {
        const apiErr = handleApiError(err, '确认决策失败');
        if (apiErr instanceof DecisionSemanticsApiError) {
          if (apiErr.code === 'DECISION_ACKNOWLEDGEMENT_REQUIRED') {
            toast.error('请先勾选确认项');
          } else if (apiErr.code === 'DECISION_PROBLEM_NOT_FOUND') {
            toast.error('报告已过期', { description: '请重新验证可行性报告' });
          } else if (apiErr.code === 'DECISION_OPTION_NOT_FOUND') {
            toast.error('方案已变更', { description: '正在刷新方案列表…' });
            void loadOptions();
          } else if (apiErr.code === 'DECISION_APPLY_FAILED') {
            toast.error('应用失败', { description: apiErr.message });
          }
        }
        return null;
      } finally {
        confirmInFlightRef.current = false;
      }
    },
    [
      tripId,
      problemId,
      selectedOptionId,
      reason,
      acknowledgement,
      preview,
      selectedOption,
      onExecuted,
      handleApiError,
      loadOptions,
      resetClientAttempt,
    ],
  );

  const toggleAcknowledgement = useCallback((item: string, checked: boolean) => {
    setAcknowledgement((prev) => {
      if (checked) return prev.includes(item) ? prev : [...prev, item];
      return prev.filter((x) => x !== item);
    });
  }, []);

  return {
    phase,
    detail,
    options,
    selectedOptionId,
    selectedOption,
    preview,
    acknowledgement,
    reason,
    setReason,
    lastResult,
    executionStatus,
    executionClassification,
    error,
    errorCode,
    reset,
    loadDetail,
    loadOptions,
    loadDetailAndOptions,
    previewOption,
    confirmDecision,
    toggleAcknowledgement,
    setSelectedOptionId,
  };
}

export type UseDecisionProblemFlowResult = ReturnType<typeof useDecisionProblemFlow>;

export interface UseDecisionProblemsListOptions {
  tripId: string;
  enabled?: boolean;
}

export function useDecisionProblemsList({
  tripId,
  enabled = true,
}: UseDecisionProblemsListOptions) {
  const query = useQuery({
    queryKey: decisionProblemsQueryKeys.list(tripId),
    queryFn: () => fetchDecisionProblemsList(tripId),
    enabled: enabled && Boolean(tripId),
    staleTime: DECISION_PROBLEMS_STALE_MS,
  });

  const reload = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    items: query.data?.items ?? [],
    loading: query.isLoading,
    error: query.error
      ? decisionProblemsQueryErrorMessage(query.error, '加载决策问题失败')
      : null,
    useLegacy: query.data?.useLegacy ?? false,
    listMeta: query.data?.listMeta ?? null,
    reload,
  };
}

export interface UseDecisionCenterOverviewOptions {
  tripId: string;
  enabled?: boolean;
  /** Schedule 角标/队列仅用 /overview；Tasks Tab 再拉 full /decision-center */
  includeUnifiedGateway?: boolean;
}

export function useDecisionCenterOverview({
  tripId,
  enabled = true,
  includeUnifiedGateway = false,
}: UseDecisionCenterOverviewOptions) {
  const query = useQuery({
    queryKey: [
      ...decisionProblemsQueryKeys.center(tripId),
      includeUnifiedGateway ? 'full' : 'overview',
    ] as const,
    queryFn: () => fetchDecisionCenterOverview(tripId, { includeUnifiedGateway }),
    enabled: enabled && Boolean(tripId),
    staleTime: DECISION_PROBLEMS_STALE_MS,
  });

  const reload = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    overview: query.data?.overview ?? null,
    loading: query.isLoading,
    error: query.error
      ? decisionProblemsQueryErrorMessage(query.error, '加载决策中心总览失败')
      : null,
    useLegacy: query.data?.useLegacy ?? false,
    unifiedView: query.data?.unifiedView ?? null,
    reload,
  };
}

export interface UseDecisionProblemSpaceContentOptions {
  tripId: string;
  problemId: string | null | undefined;
  focusConflictId?: string | null;
  enabled?: boolean;
}

/** 决策空间中栏：仅 GET detail（含 actions）；完整 tradeoffs 由 POST preview 按需加载 */
export function useDecisionProblemSpaceContent({
  tripId,
  problemId,
  focusConflictId,
  enabled = true,
}: UseDecisionProblemSpaceContentOptions) {
  const queryClient = useQueryClient();
  const active = enabled && Boolean(problemId);
  const resolvedProblemId = problemId ?? '';

  const detailQuery = useQuery({
    queryKey: decisionProblemsQueryKeys.detail(tripId, resolvedProblemId, focusConflictId),
    queryFn: ({ signal }) =>
      decisionProblemsApi.getProblem(tripId, resolvedProblemId, {
        focusConflictId,
        signal,
      }),
    enabled: active,
    staleTime: DECISION_PROBLEM_DETAIL_STALE_MS,
    placeholderData: keepPreviousData,
  });

  const derived = useMemo(
    () => deriveDecisionSpaceContentFromDetail(detailQuery.data ?? null),
    [detailQuery.data],
  );

  const reload = useCallback(() => {
    if (!problemId) return;
    void queryClient.invalidateQueries({
      queryKey: decisionProblemsQueryKeys.detail(tripId, problemId, focusConflictId),
    });
  }, [queryClient, tripId, problemId, focusConflictId]);

  const detailError = detailQuery.error
    ? decisionProblemsQueryErrorMessage(detailQuery.error, '加载决策详情失败')
    : null;

  return {
    detail: active ? (detailQuery.data ?? null) : null,
    options: active ? derived.options : [],
    optionsActions: active ? derived.optionsActions : [],
    comparisonView: active ? derived.comparisonView : null,
    detailLoading: active && detailQuery.isLoading,
    /** 方案数据已内嵌于 detail.actions，无独立 options 请求 */
    optionsLoading: false,
    loading: active && (detailQuery.isLoading || detailQuery.isFetching),
    error: detailError,
    reload,
  };
}
