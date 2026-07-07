import apiClient from './client';
import { CONFIG } from '@/constants/config';
import {
  normalizeAiActionResponse,
  normalizeAutoArrangeResponse,
  normalizeCopilotActionResponse,
  normalizeCopilotSuggestions,
  normalizeItemMutationResponse,
  normalizeOrchestrationState,
  normalizePlaceCandidateResponse,
  normalizePlanProposal,
  normalizePlanningWorkbenchSnapshot,
  normalizeProposalWriteResponse,
  normalizeItemLocks,
} from './normalize-arrange-itinerary';
import { normalizeAttractionExploreCandidates } from './normalize-attraction-explore';
import {
  normalizePlanningDecisionExecutionSteps,
  normalizePlanningProposalMonitor,
} from './normalize-planning-decision-pack';
import { normalizePlanningCausalChain } from './normalize-planning-causal-chain';
import { normalizePlanningDecisionBasis } from './normalize-planning-decision-basis';
import { normalizePlanningDecisionInspector } from './normalize-planning-decision-inspector';
import type {
  AnalyzeMoveItemRequest,
  AnalyzeMoveItemResult,
  ArrangeItemLocksResponse,
  ArrangePlanningMode,
  ArrangePlanningModeResponse,
  ArrangeItineraryAddItemRequest,
  ArrangeItineraryAddItemResult,
  ArrangeItineraryAiActionRequest,
  ArrangeItineraryAiActionResult,
  ArrangeItineraryApplyProposalRequest,
  ArrangeItineraryApplyProposalResponse,
  ArrangeItineraryAutoArrangeRequest,
  ArrangeItineraryAutoArrangeResult,
  ArrangeItineraryCommitMode,
  ArrangeItineraryCreateProposalRequest,
  ArrangeItineraryInsertGapRequest,
  ArrangeItineraryInsertGapResult,
  ArrangeItineraryOverviewResponse,
  ArrangeOrchestrationState,
  CopilotActionRequest,
  CopilotActionResult,
  CopilotSuggestionsResponse,
  PlaceCandidateRequest,
  PlaceCandidateResult,
  PlanProposal,
  PlanningWorkbenchSnapshot,
} from '@/types/arrange-itinerary';
import type { ScheduleTimelineResponse } from '@/types/schedule-timeline';

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的 API 响应');
  }
  if (!response.data.success) {
    const err = new Error(response.data.error?.message || '请求失败') as Error & {
      code?: string;
      status?: number;
    };
    err.code = response.data.error?.code;
    throw err;
  }
  return response.data.data;
}

function handleAxiosError(error: unknown): never {
  const axiosErr = error as {
    response?: { status?: number; data?: ErrorResponse };
    message?: string;
    code?: string;
  };
  const apiError = axiosErr.response?.data?.error;
  const err = new Error(apiError?.message ?? axiosErr.message ?? '请求失败') as Error & {
    code?: string;
    status?: number;
  };
  err.code = apiError?.code ?? axiosErr.code;
  err.status = axiosErr.response?.status;
  throw err;
}

const INTEGRATION_DEBUG = import.meta.env.DEV && import.meta.env.VITE_ATTRACTION_EXPLORE_DEBUG === '1';

function logIntegration(endpoint: string, payload: unknown) {
  if (!INTEGRATION_DEBUG) return;
  console.debug(`[arrange-itinerary] ${endpoint}`, payload);
}

function tripBase(tripId: string): string {
  return `/trips/${tripId}`;
}

function arrangeBase(tripId: string): string {
  return `${tripBase(tripId)}/arrange-itinerary`;
}

function withCommitMode<T extends { commitMode?: ArrangeItineraryCommitMode }>(
  payload: T,
): T & { commitMode: ArrangeItineraryCommitMode } {
  return {
    commitMode: 'proposal',
    ...payload,
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  try {
    const response = await apiClient.post<ApiResponseWrapper<T>>(url, body);
    return handleResponse(response);
  } catch (error) {
    return handleAxiosError(error);
  }
}

async function getJson<T>(url: string, options?: { timeout?: number }): Promise<T> {
  try {
    const response = await apiClient.get<ApiResponseWrapper<T>>(url, {
      timeout: options?.timeout,
    });
    return handleResponse(response);
  } catch (error) {
    return handleAxiosError(error);
  }
}

export const arrangeItineraryApi = {
  getOverview: async (tripId: string): Promise<ArrangeItineraryOverviewResponse> => {
    const data = await getJson<ArrangeItineraryOverviewResponse>(`${arrangeBase(tripId)}/overview`);
    logIntegration('GET overview', data);
    return data;
  },

  getOrchestrationState: async (tripId: string): Promise<ArrangeOrchestrationState> => {
    const data = normalizeOrchestrationState(
      await getJson<unknown>(`${arrangeBase(tripId)}/orchestration-state`),
    );
    logIntegration('GET orchestration-state', data);
    return data;
  },

  listProposals: async (tripId: string): Promise<PlanProposal[]> => {
    const data = await getJson<unknown>(`${arrangeBase(tripId)}/proposals`);
    const list = Array.isArray(data)
      ? data
      : Array.isArray((data as { proposals?: unknown[] }).proposals)
        ? (data as { proposals: unknown[] }).proposals
        : [];
    return list.map((item) => normalizePlanProposal(item));
  },

  getProposal: async (tripId: string, proposalId: string): Promise<PlanProposal> => {
    const data = normalizePlanProposal(
      await getJson<unknown>(`${arrangeBase(tripId)}/proposals/${encodeURIComponent(proposalId)}`),
    );
    logIntegration('GET proposal', data);
    return data;
  },

  createProposal: async (
    tripId: string,
    payload: ArrangeItineraryCreateProposalRequest,
  ): Promise<ReturnType<typeof normalizeProposalWriteResponse>> => {
    const data = normalizeProposalWriteResponse(
      await postJson<unknown>(`${arrangeBase(tripId)}/proposals`, payload),
    );
    logIntegration('POST proposals', payload);
    return data;
  },

  applyProposal: async (
    tripId: string,
    proposalId: string,
    payload: ArrangeItineraryApplyProposalRequest,
  ): Promise<ArrangeItineraryApplyProposalResponse> => {
    const raw = await postJson<unknown>(
      `${arrangeBase(tripId)}/proposals/${encodeURIComponent(proposalId)}/apply`,
      payload,
    );
    const record = raw as Record<string, unknown>;
    const candidatesRaw = record.candidates;
    const data: ArrangeItineraryApplyProposalResponse = {
      tripId: String(record.tripId ?? tripId),
      proposalId: String(record.proposalId ?? proposalId),
      orchestrationState: record.orchestrationState
        ? normalizeOrchestrationState(record.orchestrationState)
        : undefined,
      scheduleTimeline: record.scheduleTimeline as ScheduleTimelineResponse | undefined,
      candidates: candidatesRaw
        ? normalizeAttractionExploreCandidates(candidatesRaw)
        : undefined,
      executionSteps: normalizePlanningDecisionExecutionSteps(
        record.executionSteps ?? record.execution_steps,
      ),
      validUntil: String(record.validUntil ?? record.valid_until ?? '') || undefined,
      monitorWebhookUrl:
        String(record.monitorWebhookUrl ?? record.monitor_webhook_url ?? '') || undefined,
      tripVersionAfter: String(record.tripVersionAfter ?? record.trip_version_after ?? '') || undefined,
    };
    logIntegration('POST proposals/apply', { proposalId, ...payload });
    return data;
  },

  getProposalMonitor: async (
    tripId: string,
    proposalId: string,
  ): Promise<import('@/types/planning-decision-pack').PlanningProposalMonitorView> => {
    const data = normalizePlanningProposalMonitor(
      await getJson<unknown>(
        `${arrangeBase(tripId)}/proposals/${encodeURIComponent(proposalId)}/monitor`,
      ),
    );
    logIntegration('GET proposals/monitor', { proposalId, isStale: data.isStale });
    return data;
  },

  getDecisionCausalChain: async (
    tripId: string,
    params?: { proposalId?: string; problemId?: string; optionId?: string },
  ): Promise<import('@/dto/frontend-planning-causal-chain.types').PlanningCausalChain> => {
    const proposalId = params?.proposalId?.trim();
    const problemId = params?.problemId?.trim();
    const optionId = params?.optionId?.trim();
    if (!proposalId && !problemId) {
      throw new Error('decision-causal-chain requires proposalId or problemId');
    }
    const search = new URLSearchParams();
    if (proposalId) search.set('proposalId', proposalId);
    if (problemId) search.set('problemId', problemId);
    if (optionId) search.set('optionId', optionId);
    const query = search.toString();
    const data = normalizePlanningCausalChain(
      await getJson<unknown>(
        `${arrangeBase(tripId)}/decision-causal-chain${query ? `?${query}` : ''}`,
        optionId ? { timeout: CONFIG.API.TIMEOUT_LONG } : undefined,
      ),
      tripId,
    );
    logIntegration('GET decision-causal-chain', {
      proposalId,
      problemId,
      optionId,
      nodeCount: data.nodes.length,
      refreshUrl: data.refreshUrl,
    });
    return data;
  },

  getDecisionBasis: async (
    tripId: string,
    params?: { conflictId?: string; proposalId?: string },
  ): Promise<import('@/dto/frontend-planning-decision-basis.types').PlanningDecisionBasis> => {
    const search = new URLSearchParams();
    if (params?.conflictId) search.set('conflictId', params.conflictId);
    if (params?.proposalId) search.set('proposalId', params.proposalId);
    const query = search.toString();
    const data = normalizePlanningDecisionBasis(
      await getJson<unknown>(
        `${arrangeBase(tripId)}/decision-basis${query ? `?${query}` : ''}`,
      ),
      tripId,
    );
    logIntegration('GET decision-basis', {
      conflictId: params?.conflictId,
      proposalId: params?.proposalId,
      fieldCount: data.contextFields.length,
      optionCount: data.optionCount,
    });
    return data;
  },

  getDecisionInspector: async (
    tripId: string,
    params: import('@/dto/frontend-planning-decision-inspector.types').PlanningDecisionInspectorFetchParams,
  ): Promise<import('@/dto/frontend-planning-decision-inspector.types').PlanningDecisionInspector> => {
    const proposalId = params.proposalId?.trim();
    const problemId = params.problemId?.trim();
    if (!proposalId && !problemId) {
      throw new Error('decision-inspector requires proposalId or problemId');
    }

    const search = new URLSearchParams();
    if (proposalId) search.set('proposalId', proposalId);
    if (problemId) search.set('problemId', problemId);
    if (params.optionId) search.set('optionId', params.optionId);
    if (params.conflictId) search.set('conflictId', params.conflictId);
    const data = normalizePlanningDecisionInspector(
      await getJson<unknown>(
        `${arrangeBase(tripId)}/decision-inspector?${search.toString()}`,
        params.optionId?.trim() ? { timeout: CONFIG.API.TIMEOUT_LONG } : undefined,
      ),
      tripId,
    );
    logIntegration('GET decision-inspector', {
      mode: data.mode,
      proposalId,
      problemId,
      optionId: params.optionId,
      conflictId: params.conflictId,
      tabEmptyState: data.tabEmptyState,
      hasBasis: Boolean(data.decisionBasis),
      causalNodeCount: data.causalChain?.nodes?.length ?? 0,
      planDiffRows: data.planDiff?.changeRows.length ?? 0,
    });
    return data;
  },

  discardProposal: async (tripId: string, proposalId: string): Promise<ArrangeOrchestrationState> => {
    const data = normalizeOrchestrationState(
      await postJson<unknown>(
        `${arrangeBase(tripId)}/proposals/${encodeURIComponent(proposalId)}/discard`,
        {},
      ),
    );
    logIntegration('POST proposals/discard', { proposalId });
    return data;
  },

  placeCandidate: async (
    tripId: string,
    candidateId: string,
    payload: PlaceCandidateRequest,
  ): Promise<PlaceCandidateResult> => {
    const data = normalizePlaceCandidateResponse(
      await postJson<unknown>(
        `${tripBase(tripId)}/attraction-explore/candidates/${encodeURIComponent(candidateId)}/place`,
        withCommitMode(payload),
      ),
    );
    logIntegration('POST place candidate', { candidateId, ...payload });
    return data;
  },

  addItem: async (
    tripId: string,
    payload: ArrangeItineraryAddItemRequest,
  ): Promise<ArrangeItineraryAddItemResult> => {
    const data = normalizeItemMutationResponse(
      await postJson<unknown>(`${arrangeBase(tripId)}/items`, withCommitMode(payload)),
    );
    logIntegration('POST items', payload);
    return data;
  },

  insertGap: async (
    tripId: string,
    payload: ArrangeItineraryInsertGapRequest,
  ): Promise<ArrangeItineraryInsertGapResult> => {
    const data = normalizeItemMutationResponse(
      await postJson<unknown>(`${arrangeBase(tripId)}/gaps`, withCommitMode(payload)),
    );
    logIntegration('POST gaps', payload);
    return data;
  },

  autoArrange: async (
    tripId: string,
    payload: ArrangeItineraryAutoArrangeRequest = {},
  ): Promise<ArrangeItineraryAutoArrangeResult> => {
    const data = normalizeAutoArrangeResponse(
      await postJson<unknown>(
        `${tripBase(tripId)}/attraction-explore/auto-arrange`,
        withCommitMode(payload),
      ),
    );
    logIntegration('POST auto-arrange', payload);
    return data;
  },

  runAiAction: async (
    tripId: string,
    payload: ArrangeItineraryAiActionRequest,
  ): Promise<ArrangeItineraryAiActionResult> => {
    const data = normalizeAiActionResponse(
      await postJson<unknown>(`${arrangeBase(tripId)}/ai-actions`, withCommitMode(payload)),
    );
    logIntegration('POST ai-actions', payload);
    return data;
  },

  getPlanningMode: async (tripId: string): Promise<ArrangePlanningModeResponse> => {
    const data = await getJson<ArrangePlanningModeResponse>(`${arrangeBase(tripId)}/planning-mode`);
    logIntegration('GET planning-mode', data);
    return data;
  },

  setPlanningMode: async (
    tripId: string,
    mode: ArrangePlanningMode,
  ): Promise<ArrangePlanningModeResponse> => {
    const data = await postJson<ArrangePlanningModeResponse>(`${arrangeBase(tripId)}/planning-mode`, {
      mode,
    });
    logIntegration('POST planning-mode', { mode });
    return data;
  },

  getItemLocks: async (tripId: string): Promise<ArrangeItemLocksResponse> => {
    const data = normalizeItemLocks(await getJson<unknown>(`${arrangeBase(tripId)}/item-locks`));
    logIntegration('GET item-locks', data);
    return data;
  },

  analyzeMove: async (
    tripId: string,
    itemId: string,
    payload: AnalyzeMoveItemRequest,
  ): Promise<AnalyzeMoveItemResult> => {
    const data = normalizeItemMutationResponse(
      await postJson<unknown>(
        `${arrangeBase(tripId)}/items/${encodeURIComponent(itemId)}/analyze-move`,
        withCommitMode(payload),
      ),
    );
    logIntegration('POST analyze-move', { itemId, ...payload });
    return data as AnalyzeMoveItemResult;
  },

  getCopilotSuggestions: async (tripId: string): Promise<CopilotSuggestionsResponse> => {
    const data = normalizeCopilotSuggestions(
      await getJson<unknown>(`${arrangeBase(tripId)}/copilot-suggestions`),
    );
    logIntegration('GET copilot-suggestions', { count: data.suggestions.length });
    return data;
  },

  getPlanningWorkbenchSnapshot: async (tripId: string): Promise<PlanningWorkbenchSnapshot> => {
    const data = normalizePlanningWorkbenchSnapshot(
      await getJson<unknown>(`${arrangeBase(tripId)}/planning-workbench-snapshot`),
    );
    logIntegration('GET planning-workbench-snapshot', {
      pendingProposals: data.pendingProposalCount,
      copilotCount: data.copilotSuggestions.length,
    });
    return data;
  },

  runCopilotAction: async (
    tripId: string,
    payload: CopilotActionRequest,
  ): Promise<CopilotActionResult> => {
    const data = normalizeCopilotActionResponse(
      await postJson<unknown>(`${arrangeBase(tripId)}/copilot-actions`, payload),
    );
    logIntegration('POST copilot-actions', payload);
    return data;
  },
};
