import {
  dedupeDecisionPreviewRequest,
  decisionPreviewRequestKey,
} from '@/lib/decision-preview-request.util';
import apiClient from './client';
import { coerceExecutionStatusResponse } from '@/trips/decision-semantics/frontend/decision-center-execution-state-machine.util';
import {
  normalizeCreateDecisionResponse,
  normalizeDecisionAuthority,
  normalizeDecisionCenterOverview,
} from '@/lib/decision-semantics-normalize.util';
import type {
  CreateDecisionRequest,
  CreateDecisionResponse,
  DecisionCenterOverview,
  DecisionExecutionStatusResponse,
  DecisionLedgerNodeDecisionResponse,
  DecisionProblemLegacy,
  DecisionProblemListResponse,
  DecisionProblemSummary,
  DecisionRecordDetail,
  DecisionSemanticsErrorCode,
  DecisionOutcomeValidation,
} from '@/types/decision-problem';
import {
  normalizeCanonicalEvaluateResponse,
} from '@/lib/canonical-evaluate-response.util';
import type {
  CanonicalAuthorizeRequest,
  CanonicalAuthorizeResponse,
  CanonicalEvaluateResponse,
  CanonicalExecuteResponse,
  NormalizedCanonicalEvaluateResponse,
  UnifiedDecisionCenterView,
  UnifiedDecisionProblemListView,
  ApplyDecisionProblemRequest,
  ApplyDecisionProblemResponse,
  DecisionProblemApplyAcceptedView,
  DecisionProblemApplyTaskView,
  SubmitDecisionResolutionRequest,
  SubmitDecisionResolutionResponse,
  CreateDecisionCollaborativeSubTaskRequest,
  CreateDecisionCollaborativeSubTaskResponse,
  ListDecisionCollaborativeSubTasksResponse,
  PatchDecisionCollaborativeSubTaskRequest,
  PatchDecisionCollaborativeSubTaskResponse,
} from '@/types/unified-decision';
import {
  isUnifiedDecisionProblemListView,
  mapUnifiedDecisionProblemList,
} from '@/lib/unified-decision-problem-list.util';
import {
  normalizeGatewayOptionsResponse,
  normalizeGatewayPreviewResponse,
  normalizeGatewayProblemDetail,
  type GatewayDecisionOptionsResult,
  type GatewayDecisionPreviewResult,
  type GatewayDecisionProblemDetailResult,
} from '@/lib/unified-gateway-response.util';
import {
  normalizeApplyDecisionProblemResponse,
  normalizeSubmitDecisionResolutionResponse,
  normalizeSubmitResolutionRequest,
} from '@/lib/decision-resolution.util';
import {
  normalizeApplyAcceptedResponse,
  normalizeApplyTaskResponse,
  type StartApplyProblemDecisionResult,
} from '@/lib/decision-apply-task.util';
import {
  normalizeCreateDecisionCollaborativeSubTaskResponse,
  normalizeListDecisionCollaborativeSubTasksResponse,
  normalizePatchDecisionCollaborativeSubTaskResponse,
} from '@/lib/decision-collaborative-sub-task.util';
import { normalizeCausalTraceReplayView } from '@/lib/causal-trace-view.util';
import type { CausalTraceReplayView } from '@/types/causal-trace';
import { normalizeCausalTraceReference } from '@/lib/causal-trace-view.util';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code?: DecisionSemanticsErrorCode; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class DecisionSemanticsApiError extends Error {
  readonly code?: DecisionSemanticsErrorCode;
  readonly details?: unknown;

  constructor(message: string, code?: DecisionSemanticsErrorCode, details?: unknown) {
    super(message);
    this.name = 'DecisionSemanticsApiError';
    this.code = code;
    this.details = details;
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) throw new DecisionSemanticsApiError('无效的 API 响应');
  if (!response.data.success) {
    const err = response.data.error;
    throw new DecisionSemanticsApiError(
      err?.message ?? '请求失败',
      err?.code,
      err?.details,
    );
  }
  if (response.data.data == null) {
    throw new DecisionSemanticsApiError('API 响应数据为空');
  }
  return response.data.data;
}

function isNotImplemented(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
}

function tripPath(tripId: string, suffix = ''): string {
  return `/trips/${encodeURIComponent(tripId)}/decision-problems${suffix}`;
}

export const decisionProblemsApi = {
  /** GET /trips/:tripId/decision-center — Unified Gateway 聚合 */
  getUnifiedDecisionCenter: async (tripId: string): Promise<UnifiedDecisionCenterView> => {
    const response = await apiClient.get<ApiResponseWrapper<UnifiedDecisionCenterView>>(
      `/trips/${encodeURIComponent(tripId)}/decision-center`,
    );
    return handleResponse(response);
  },

  /** GET /trips/:tripId/decision-center/overview */
  getCenterOverview: async (tripId: string): Promise<DecisionCenterOverview> => {
    const response = await apiClient.get<ApiResponseWrapper<DecisionCenterOverview>>(
      `/trips/${encodeURIComponent(tripId)}/decision-center/overview`,
    );
    return normalizeDecisionCenterOverview(handleResponse(response));
  },

  /** GET /trips/:tripId/decision-problems — Legacy V1.5 或 Gateway 统一列表 */
  listByTrip: async (tripId: string): Promise<DecisionProblemListResponse> => {
    const response = await apiClient.get<
      ApiResponseWrapper<DecisionProblemListResponse | UnifiedDecisionProblemListView>
    >(tripPath(tripId));
    const data = handleResponse(response);
    if (isUnifiedDecisionProblemListView(data)) {
      return {
        meta: data.meta
          ? {
              tripId,
              tripVersion: '',
              total: data.meta.total,
              generatedAt: new Date().toISOString(),
            }
          : undefined,
        items: mapUnifiedDecisionProblemList(data),
      };
    }
    return data as DecisionProblemListResponse;
  },

  /** GET /trips/:tripId/decision-problems — Gateway 统一列表（带 meta.canonicalCount） */
  listUnifiedByTrip: async (
    tripId: string,
  ): Promise<{ meta: UnifiedDecisionProblemListView['meta']; items: DecisionProblemSummary[] }> => {
    const response = await apiClient.get<ApiResponseWrapper<UnifiedDecisionProblemListView>>(
      tripPath(tripId),
    );
    const data = handleResponse(response);
    if (!isUnifiedDecisionProblemListView(data)) {
      throw new DecisionSemanticsApiError('期望 unified_decision_problems@v1 响应');
    }
    return {
      meta: data.meta,
      items: mapUnifiedDecisionProblemList(data),
    };
  },

  /** GET /trips/:tripId/decision-problems/:problemId — Gateway 信封或 Legacy 详情（含 actions） */
  getProblem: async (
    tripId: string,
    problemId: string,
    options?: {
      focusConflictId?: string | null;
      includeDebug?: boolean;
      signal?: AbortSignal;
    },
  ): Promise<GatewayDecisionProblemDetailResult> => {
    const params: Record<string, string> = {};
    if (options?.focusConflictId) params.focusConflictId = options.focusConflictId;
    if (options?.includeDebug) params.includeDebug = '1';

    const response = await apiClient.get<ApiResponseWrapper<unknown>>(
      `${tripPath(tripId)}/${encodeURIComponent(problemId)}`,
      {
        params: Object.keys(params).length ? params : undefined,
        signal: options?.signal,
        timeout: 15_000,
      },
    );
    return normalizeGatewayProblemDetail(handleResponse(response), problemId);
  },

  /** GET /trips/:tripId/decision-problems/:problemId/causal-trace — 技术回放 */
  getCausalTrace: async (
    tripId: string,
    problemId: string,
    options?: { signal?: AbortSignal },
  ): Promise<CausalTraceReplayView> => {
    const response = await apiClient.get<ApiResponseWrapper<unknown>>(
      `${tripPath(tripId)}/${encodeURIComponent(problemId)}/causal-trace`,
      { signal: options?.signal, timeout: 15_000 },
    );
    const replay = normalizeCausalTraceReplayView(handleResponse(response));
    if (!replay) {
      throw new DecisionSemanticsApiError('期望 tripnara.causal_trace_replay@v1 响应');
    }
    return replay;
  },

  /**
   * GET .../options — 仅保留给非 Plan Studio 的 repair 回退；决策空间勿调用。
   * @deprecated Plan Studio 使用 getProblem + detail.actions
   */
  getOptions: async (
    tripId: string,
    problemId: string,
  ): Promise<GatewayDecisionOptionsResult> => {
    const response = await apiClient.get<ApiResponseWrapper<unknown>>(
      `${tripPath(tripId)}/${encodeURIComponent(problemId)}/options`,
    );
    return normalizeGatewayOptionsResponse(handleResponse(response));
  },

  /** POST /trips/:tripId/decision-problems/:problemId/options/:optionId/preview */
  previewOption: async (
    tripId: string,
    problemId: string,
    optionId: string,
    body?: Record<string, unknown>,
  ): Promise<GatewayDecisionPreviewResult> => {
    const key = decisionPreviewRequestKey(tripId, problemId, optionId);
    return dedupeDecisionPreviewRequest(key, async () => {
      const response = await apiClient.post<ApiResponseWrapper<unknown>>(
        `${tripPath(tripId)}/${encodeURIComponent(problemId)}/options/${encodeURIComponent(optionId)}/preview`,
        body ?? {},
      );
      const data = normalizeGatewayPreviewResponse(handleResponse(response), optionId);
      return {
        ...data,
        authority: normalizeDecisionAuthority(data.authority),
      };
    });
  },

  /** POST /trips/:tripId/decisions */
  createDecision: async (
    tripId: string,
    body: CreateDecisionRequest,
  ): Promise<CreateDecisionResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CreateDecisionResponse>>(
      `/trips/${encodeURIComponent(tripId)}/decisions`,
      body,
    );
    const data = handleResponse(response);
    return normalizeCreateDecisionResponse(data);
  },

  /** GET /trips/:tripId/decisions/:decisionId */
  getDecision: async (tripId: string, decisionId: string): Promise<DecisionRecordDetail> => {
    const response = await apiClient.get<ApiResponseWrapper<DecisionRecordDetail>>(
      `/trips/${encodeURIComponent(tripId)}/decisions/${encodeURIComponent(decisionId)}`,
    );
    return handleResponse(response);
  },

  /** GET /trips/:tripId/decisions/:decisionId/execution-status */
  getDecisionExecutionStatus: async (
    tripId: string,
    decisionId: string,
  ): Promise<DecisionExecutionStatusResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<DecisionExecutionStatusResponse>>(
      `/trips/${encodeURIComponent(tripId)}/decisions/${encodeURIComponent(decisionId)}/execution-status`,
    );
    const data = handleResponse(response);
    return coerceExecutionStatusResponse(data) ?? data;
  },

  /** GET /trips/:tripId/decisions/:decisionId/validation */
  getDecisionValidation: async (
    tripId: string,
    decisionId: string,
  ): Promise<DecisionOutcomeValidation> => {
    const response = await apiClient.get<ApiResponseWrapper<DecisionOutcomeValidation>>(
      `/trips/${encodeURIComponent(tripId)}/decisions/${encodeURIComponent(decisionId)}/validation`,
    );
    return handleResponse(response);
  },

  /** GET /trips/:tripId/decision-ledger/nodes/:ledgerNodeId/decision */
  getDecisionByLedgerNode: async (
    tripId: string,
    ledgerNodeId: string,
  ): Promise<DecisionLedgerNodeDecisionResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<DecisionLedgerNodeDecisionResponse>>(
      `/trips/${encodeURIComponent(tripId)}/decision-ledger/nodes/${encodeURIComponent(ledgerNodeId)}/decision`,
    );
    return handleResponse(response);
  },

  /** POST /trips/:tripId/decision-problems/:problemId/resolutions — 提交结论（不写时间轴） */
  submitResolution: async (
    tripId: string,
    problemId: string,
    body: SubmitDecisionResolutionRequest,
  ): Promise<SubmitDecisionResolutionResponse> => {
    const payload = normalizeSubmitResolutionRequest(body);
    const response = await apiClient.post<ApiResponseWrapper<unknown>>(
      `${tripPath(tripId)}/${encodeURIComponent(problemId)}/resolutions`,
      payload,
    );
    return normalizeSubmitDecisionResolutionResponse(handleResponse(response));
  },

  /** POST /trips/:tripId/decision-problems/:problemId/apply — 同步应用到行程（legacy） */
  applyProblemDecision: async (
    tripId: string,
    problemId: string,
    body?: ApplyDecisionProblemRequest,
  ): Promise<ApplyDecisionProblemResponse> => {
    const payload = body
      ? {
          ...body,
          causalTraceRef: body.causalTraceRef
            ? normalizeCausalTraceReference(body.causalTraceRef)
            : undefined,
        }
      : {};
    const response = await apiClient.post<ApiResponseWrapper<unknown>>(
      `${tripPath(tripId)}/${encodeURIComponent(problemId)}/apply`,
      payload,
    );
    return normalizeApplyDecisionProblemResponse(handleResponse(response));
  },

  /**
   * POST .../apply?async=1 — 异步 apply（202 Accepted + taskId）
   * 同一 problem 进行中任务会 reused 返回相同 taskId。
   */
  startApplyProblemDecision: async (
    tripId: string,
    problemId: string,
    body?: ApplyDecisionProblemRequest,
  ): Promise<StartApplyProblemDecisionResult> => {
    const payload = body
      ? {
          ...body,
          causalTraceRef: body.causalTraceRef
            ? normalizeCausalTraceReference(body.causalTraceRef)
            : undefined,
        }
      : {};
    const response = await apiClient.post<ApiResponseWrapper<unknown>>(
      `${tripPath(tripId)}/${encodeURIComponent(problemId)}/apply`,
      payload,
      {
        params: { async: 1 },
        validateStatus: (status) => status === 200 || status === 202,
      },
    );

    if (response.status === 202) {
      return {
        mode: 'async',
        accepted: normalizeApplyAcceptedResponse(handleResponse(response)),
      };
    }

    if (!response.data?.success) {
      const err = response.data?.error;
      throw new DecisionSemanticsApiError(
        err?.message ?? '请求失败',
        err?.code,
        err?.details,
      );
    }

    return {
      mode: 'sync',
      result: normalizeApplyDecisionProblemResponse(handleResponse(response)),
    };
  },

  /** GET pollUrl 或 apply-tasks/:taskId — 轮询异步 apply 任务 */
  getApplyProblemTask: async (pollPath: string): Promise<DecisionProblemApplyTaskView> => {
    const response = await apiClient.get<ApiResponseWrapper<unknown>>(pollPath);
    return normalizeApplyTaskResponse(handleResponse(response));
  },

  /** GET /trips/:tripId/decision-problems/:problemId/collaborative-sub-tasks */
  listCollaborativeSubTasks: async (
    tripId: string,
    problemId: string,
    query?: { resolutionId?: string },
  ): Promise<ListDecisionCollaborativeSubTasksResponse> => {
    const params: Record<string, string> = {};
    if (query?.resolutionId) params.resolutionId = query.resolutionId;

    const response = await apiClient.get<ApiResponseWrapper<unknown>>(
      `${tripPath(tripId)}/${encodeURIComponent(problemId)}/collaborative-sub-tasks`,
      { params: Object.keys(params).length ? params : undefined },
    );
    return normalizeListDecisionCollaborativeSubTasksResponse(handleResponse(response));
  },

  /** POST /trips/:tripId/decision-problems/:problemId/collaborative-sub-tasks */
  createCollaborativeSubTask: async (
    tripId: string,
    problemId: string,
    body: CreateDecisionCollaborativeSubTaskRequest,
  ): Promise<CreateDecisionCollaborativeSubTaskResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<unknown>>(
      `${tripPath(tripId)}/${encodeURIComponent(problemId)}/collaborative-sub-tasks`,
      body,
    );
    return normalizeCreateDecisionCollaborativeSubTaskResponse(handleResponse(response));
  },

  /** PATCH /trips/:tripId/decision-problems/:problemId/collaborative-sub-tasks/:subTaskId */
  patchCollaborativeSubTask: async (
    tripId: string,
    problemId: string,
    subTaskId: string,
    body: PatchDecisionCollaborativeSubTaskRequest,
  ): Promise<PatchDecisionCollaborativeSubTaskResponse> => {
    const response = await apiClient.patch<ApiResponseWrapper<unknown>>(
      `${tripPath(tripId)}/${encodeURIComponent(problemId)}/collaborative-sub-tasks/${encodeURIComponent(subTaskId)}`,
      body,
    );
    return normalizePatchDecisionCollaborativeSubTaskResponse(handleResponse(response));
  },

  /** POST /trips/:tripId/decision-problems/:problemId/evaluate — Canonical L2 step 1 */
  evaluateProblem: async (
    tripId: string,
    problemId: string,
  ): Promise<NormalizedCanonicalEvaluateResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CanonicalEvaluateResponse>>(
      `${tripPath(tripId)}/${encodeURIComponent(problemId)}/evaluate`,
    );
    return normalizeCanonicalEvaluateResponse(handleResponse(response));
  },

  /** POST /trips/:tripId/decisions/:decisionId/authorize — Canonical L2 step 2 */
  authorizeDecision: async (
    tripId: string,
    decisionId: string,
    body: CanonicalAuthorizeRequest = {},
  ): Promise<CanonicalAuthorizeResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CanonicalAuthorizeResponse>>(
      `/trips/${encodeURIComponent(tripId)}/decisions/${encodeURIComponent(decisionId)}/authorize`,
      body,
    );
    return handleResponse(response);
  },

  /** POST /trips/:tripId/decisions/:decisionId/execute — Canonical L2 step 3 */
  executeDecision: async (
    tripId: string,
    decisionId: string,
    idempotencyKey?: string,
  ): Promise<CanonicalExecuteResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CanonicalExecuteResponse>>(
      `/trips/${encodeURIComponent(tripId)}/decisions/${encodeURIComponent(decisionId)}/execute`,
      null,
      idempotencyKey
        ? { headers: { 'Idempotency-Key': idempotencyKey } }
        : undefined,
    );
    return handleResponse(response);
  },

  /** POST /trips/:tripId/decisions/:decisionId/rollback */
  rollbackDecision: async (
    tripId: string,
    decisionId: string,
  ): Promise<CanonicalExecuteResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CanonicalExecuteResponse>>(
      `/trips/${encodeURIComponent(tripId)}/decisions/${encodeURIComponent(decisionId)}/rollback`,
    );
    return handleResponse(response);
  },

  /** @deprecated 兼容旧路径；优先使用 getProblem(tripId, id) */
  getById: async (id: string): Promise<DecisionProblemLegacy> => {
    const response = await apiClient.get<ApiResponseWrapper<DecisionProblemLegacy>>(
      `/decision-problems/${encodeURIComponent(id)}`,
    );
    return handleResponse(response);
  },

  /** 是否 BFF 尚未部署（404/501） */
  isNotImplemented,
};
