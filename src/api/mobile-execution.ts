import apiClient from './client';
import { tripExecutabilityApi } from '@/api/trip-executability';
import type {
  AcceptRecommendedRequestBody,
  ConsumerDecisionItem,
  ExecutionAdjustmentQueueDto,
  ExecutionAlertsDto,
  ExecutionCausalTraceDto,
  ExecutionRiskRecommendationsDto,
  MobileContextSnapshotDto,
  MobileDecisionAcceptRequest,
  MobileExecutionOverviewDto,
  MobileTodayItineraryDto,
  DepartureSlipRequest,
  DepartureSlipResponse,
  TepRepairAcceptRequest,
  TepRepairAcceptResponse,
} from '@/types/mobile-execution';
import type { DecisionQueueHydratedDetail } from '@/lib/mobile-execution.util';
import { normalizeConsumerDecisionItem } from '@/lib/execution-slip.util';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class MobileExecutionApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'MobileExecutionApiError';
  }
}

function unwrap<T>(response: { data: ApiResponseWrapper<T>; status?: number }): T {
  const body = response?.data;
  if (!body?.success || body.data == null) {
    const code = body?.error?.code ?? 'UNKNOWN_ERROR';
    const message = body?.error?.message ?? '请求失败';
    throw new MobileExecutionApiError(code, message, response.status, body?.error?.details);
  }
  return body.data;
}

async function request<T>(
  method: 'get' | 'post',
  path: string,
  data?: unknown,
  config?: { headers?: Record<string, string> },
): Promise<T> {
  try {
    const response =
      method === 'get'
        ? await apiClient.get<ApiResponseWrapper<T>>(path, config)
        : await apiClient.post<ApiResponseWrapper<T>>(path, data ?? {}, config);
    return unwrap(response);
  } catch (err) {
    if (err instanceof MobileExecutionApiError) throw err;
    const axiosErr = err as {
      response?: { status?: number; data?: ErrorResponse };
      message?: string;
    };
    const code = axiosErr.response?.data?.error?.code ?? 'UNKNOWN_ERROR';
    const message =
      axiosErr.response?.data?.error?.message ?? axiosErr.message ?? '请求失败';
    throw new MobileExecutionApiError(code, message, axiosErr.response?.status);
  }
}

export const mobileExecutionApi = {
  getExecutionAlerts: (tripId: string) =>
    request<ExecutionAlertsDto>(
      'get',
      `/mobile/trips/${tripId}/execution/execution-alerts`,
    ),

  getAdjustmentQueue: (tripId: string) =>
    request<ExecutionAdjustmentQueueDto>(
      'get',
      `/mobile/trips/${tripId}/execution/adjustment-queue`,
    ),

  acceptTepRepair: (
    tripId: string,
    interventionId: string,
    body: TepRepairAcceptRequest,
  ) =>
    request<TepRepairAcceptResponse>(
      'post',
      `/mobile/trips/${tripId}/execution/tep-repairs/${encodeURIComponent(interventionId)}/accept`,
      body,
    ),

  acceptDecision: (
    tripId: string,
    decisionProblemId: string,
    body: MobileDecisionAcceptRequest,
  ) =>
    request<{ contextVersion?: number }>(
      'post',
      `/mobile/trips/${tripId}/decisions/${encodeURIComponent(decisionProblemId)}/accept`,
      body,
    ),

  deferDecision: (tripId: string, decisionProblemId: string) =>
    request<{ contextVersion?: number }>(
      'post',
      `/mobile/trips/${tripId}/decisions/${encodeURIComponent(decisionProblemId)}/defer`,
      {},
    ),

  getRiskRecommendations: (tripId: string, riskId: string) =>
    request<ExecutionRiskRecommendationsDto>(
      'get',
      `/trips/${tripId}/execution-risks/${encodeURIComponent(riskId)}/recommendations`,
    ),

  applyRiskRecommendation: (tripId: string, riskId: string, recId: string) =>
    request<{ contextVersion?: number }>(
      'post',
      `/trips/${tripId}/execution-risks/${encodeURIComponent(riskId)}/recommendations/${encodeURIComponent(recId)}/apply`,
      {},
    ),

  confirmRiskRecommendation: (tripId: string, riskId: string, recId: string) =>
    request<{ contextVersion?: number }>(
      'post',
      `/trips/${tripId}/execution-risks/${encodeURIComponent(riskId)}/recommendations/${encodeURIComponent(recId)}/confirm`,
      {},
    ),

  getCausalTrace: (tripId: string, interventionId: string) =>
    request<ExecutionCausalTraceDto>(
      'get',
      `/mobile/trips/${tripId}/execution/interventions/${encodeURIComponent(interventionId)}/causal-trace`,
    ),

  getDecisionQueueItem: (tripId: string, problemId: string) =>
    request<DecisionQueueHydratedDetail>(
      'get',
      `/trips/${tripId}/decision-queue/${encodeURIComponent(problemId)}`,
    ),

  getConsumerDecisionItem: async (tripId: string, problemId: string): Promise<ConsumerDecisionItem> => {
    const raw = await request<unknown>(
      'get',
      `/trips/${tripId}/decision-queue/${encodeURIComponent(problemId)}`,
    );
    const normalized = normalizeConsumerDecisionItem(raw);
    if (!normalized) {
      throw new MobileExecutionApiError('INVALID_DECISION_ITEM', '决策卡数据无效');
    }
    return normalized;
  },

  getExecutionOverview: (
    tripId: string,
    options?: { lite?: boolean; dayIndex?: number },
  ) => {
    const params = new URLSearchParams();
    if (options?.lite) params.set('lite', '1');
    if (options?.dayIndex != null) params.set('dayIndex', String(options.dayIndex));
    const query = params.toString();
    return request<MobileExecutionOverviewDto>(
      'get',
      `/mobile/trips/${tripId}/execution-overview${query ? `?${query}` : ''}`,
    );
  },

  getMobileContextSnapshot: (tripId: string) =>
    request<MobileContextSnapshotDto>(
      'get',
      `/mobile/trips/${tripId}/context-snapshot`,
    ),

  getTodayItinerary: (tripId: string, options?: { dayIndex?: number }) => {
    const params = new URLSearchParams();
    if (options?.dayIndex != null) params.set('dayIndex', String(options.dayIndex));
    const query = params.toString();
    return request<MobileTodayItineraryDto>(
      'get',
      `/mobile/trips/${tripId}/today-itinerary${query ? `?${query}` : ''}`,
    );
  },

  postDepartureSlip: (tripId: string, body: DepartureSlipRequest, idempotencyKey: string) =>
    request<DepartureSlipResponse>(
      'post',
      `/trips/${tripId}/execution/departure-slip`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ),

  acceptRecommendedDecision: (
    tripId: string,
    problemId: string,
    body: AcceptRecommendedRequestBody,
  ) =>
    request<{ contextVersion?: number }>(
      'post',
      `/trips/${tripId}/decision-queue/${encodeURIComponent(problemId)}/accept-recommended`,
      body,
    ),

  /** P3 写回后刷新总览 + 今日行程 + P2 双页 + 时间轴 */
  async refreshExecutionSurface(
    tripId: string,
    options?: { refreshExecutability?: boolean },
  ): Promise<{
    overview: MobileExecutionOverviewDto;
    alerts: ExecutionAlertsDto;
    queue: ExecutionAdjustmentQueueDto;
  }> {
    const [overview, alerts, queue] = await Promise.all([
      mobileExecutionApi.getExecutionOverview(tripId),
      mobileExecutionApi.getExecutionAlerts(tripId),
      mobileExecutionApi.getAdjustmentQueue(tripId),
    ]);
    window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
    if (options?.refreshExecutability) {
      try {
        await tripExecutabilityApi.refreshAfterPlanEdit(tripId);
      } catch {
        // 规划条刷新失败不阻断行中 UI
      }
    }
    return { overview, alerts, queue };
  },

  /** 写回后刷新 alerts + queue + timeline + 可选 executability */
  async refreshAfterWrite(
    tripId: string,
    options?: { refreshExecutability?: boolean },
  ): Promise<{ alerts: ExecutionAlertsDto; queue: ExecutionAdjustmentQueueDto }> {
    const [alerts, queue] = await Promise.all([
      mobileExecutionApi.getExecutionAlerts(tripId),
      mobileExecutionApi.getAdjustmentQueue(tripId),
    ]);
    window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
    if (options?.refreshExecutability) {
      try {
        await tripExecutabilityApi.refreshAfterPlanEdit(tripId);
      } catch {
        // 规划条刷新失败不阻断行中 UI
      }
    }
    return { alerts, queue };
  },
};
