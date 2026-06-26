import apiClient from './client';
import type {
  MoneyDashboard,
  MoneyNudge,
  RecordTransactionInput,
  RecordTransactionResult,
  RebalanceSuggestionSummary,
  RebalanceResponse,
  TransactionListResult,
} from '@/types/in-trip-money';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class InTripMoneyApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'InTripMoneyApiError';
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback = '请求失败'): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new InTripMoneyApiError(
      err.error?.code ?? 'REQUEST_ERROR',
      err.error?.message ?? fallback,
      err.error?.details,
    );
  }
  return response.data.data;
}

function moneyPath(tripId: string): string {
  return `/trips/${tripId}/in-trip/money`;
}

export const inTripMoneyApi = {
  getDashboard: async (tripId: string): Promise<MoneyDashboard> => {
    const response = await apiClient.get<ApiResponseWrapper<MoneyDashboard>>(
      `${moneyPath(tripId)}/dashboard`,
    );
    return handleResponse(response, '获取消费仪表盘失败');
  },

  recordTransaction: async (
    tripId: string,
    body: RecordTransactionInput,
  ): Promise<RecordTransactionResult> => {
    const response = await apiClient.post<ApiResponseWrapper<RecordTransactionResult>>(
      `${moneyPath(tripId)}/transactions`,
      body,
    );
    return handleResponse(response, '记账失败');
  },

  listTransactions: async (
    tripId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<TransactionListResult> => {
    const response = await apiClient.get<ApiResponseWrapper<TransactionListResult>>(
      `${moneyPath(tripId)}/transactions`,
      { params },
    );
    return handleResponse(response, '获取消费流水失败');
  },

  getTodayNudges: async (tripId: string): Promise<MoneyNudge[]> => {
    const response = await apiClient.get<ApiResponseWrapper<MoneyNudge[]>>(
      `${moneyPath(tripId)}/nudges/today`,
    );
    return handleResponse(response, '获取今日助推失败');
  },

  listRebalanceSuggestions: async (tripId: string): Promise<RebalanceSuggestionSummary[]> => {
    const response = await apiClient.get<ApiResponseWrapper<RebalanceSuggestionSummary[]>>(
      `${moneyPath(tripId)}/rebalance`,
    );
    return handleResponse(response, '获取再平衡建议失败');
  },

  respondRebalance: async (
    tripId: string,
    suggestionId: string,
    response: RebalanceResponse,
  ): Promise<RebalanceSuggestionSummary> => {
    const res = await apiClient.post<ApiResponseWrapper<RebalanceSuggestionSummary>>(
      `${moneyPath(tripId)}/rebalance/${suggestionId}/respond`,
      { response },
    );
    return handleResponse(res, '处理再平衡建议失败');
  },
};

export function isMoneyBrainDisabledError(error: unknown): boolean {
  return error instanceof InTripMoneyApiError && error.code === 'SERVICE_UNAVAILABLE';
}
