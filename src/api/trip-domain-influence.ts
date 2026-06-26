import apiClient from './client';
import type {
  BulkUpdateDomainWeightsRequest,
  ConfirmDomainRulesRequest,
  ConfirmDomainRulesResponse,
  CreateDomainClaimRequest,
  DomainDecisionBrief,
  DomainInfluenceItem,
  DomainInfluenceSnapshot,
  DomainRecommendationsResponse,
  DomainWorkbenchSidebar,
  EndorseDomainClaimRequest,
  EndorseDomainClaimResponse,
  TripDomain,
  UpdateDomainWeightsRequest,
  WithdrawDomainClaimResponse,
} from '@/types/trip-domain-influence';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class TripDomainInfluenceApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'TripDomainInfluenceApiError';
  }
}

function sanitizeDomainInfluenceErrorMessage(message: string | undefined, fallback: string): string {
  const raw = message?.trim() ?? '';
  if (!raw) return fallback;
  if (/does not exist in the current database/i.test(raw)) {
    return '领域影响力数据库尚未初始化，请确认后端已执行 migration';
  }
  if (/Cannot read properties of undefined/i.test(raw) || /reading 'get'/i.test(raw)) {
    return '领域影响力服务未就绪（后端依赖注入或数据层异常），请检查 Nest 服务日志';
  }
  if (/Invalid `this\.prisma/i.test(raw) || raw.length > 180) {
    return fallback;
  }
  return raw;
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback = '领域影响力请求失败'): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new TripDomainInfluenceApiError(
      err.error?.code ?? 'REQUEST_ERROR',
      sanitizeDomainInfluenceErrorMessage(err.error?.message, fallback),
      err.error?.details,
    );
  }
  return response.data.data;
}

function toApiError(error: unknown, fallback: string): TripDomainInfluenceApiError {
  if (error instanceof TripDomainInfluenceApiError) return error;

  const err = error as {
    response?: { status?: number; data?: ErrorResponse };
    code?: string;
    message?: string;
    details?: unknown;
  };

  const httpStatus = err.response?.status;
  const body = err.response?.data;

  if (httpStatus === 401) {
    throw new TripDomainInfluenceApiError('UNAUTHORIZED', '请先登录');
  }
  if (httpStatus === 403) {
    throw new TripDomainInfluenceApiError('FORBIDDEN', body?.error?.message ?? '无权操作');
  }
  if (httpStatus === 400) {
    throw new TripDomainInfluenceApiError(
      'VALIDATION_ERROR',
      sanitizeDomainInfluenceErrorMessage(body?.error?.message ?? err.message, fallback),
      body?.error?.details,
    );
  }
  if (body && body.success === false) {
    throw new TripDomainInfluenceApiError(
      body.error?.code ?? 'REQUEST_ERROR',
      sanitizeDomainInfluenceErrorMessage(body.error?.message, fallback),
      body.error?.details,
    );
  }

  throw new TripDomainInfluenceApiError(
    err.code ?? 'REQUEST_ERROR',
    sanitizeDomainInfluenceErrorMessage(err.message, fallback),
    err.details,
  );
}

const basePath = (tripId: string) => `/trips/${tripId}/domain-influence`;

export const tripDomainInfluenceApi = {
  /** GET /trips/:tripId/domain-influence */
  async getSnapshot(tripId: string): Promise<DomainInfluenceSnapshot> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<DomainInfluenceSnapshot>>(basePath(tripId));
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载领域认领失败');
    }
  },

  /** GET /trips/:tripId/domain-influence/recommendations */
  async getRecommendations(tripId: string): Promise<DomainRecommendationsResponse> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<DomainRecommendationsResponse>>(
        `${basePath(tripId)}/recommendations`,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载推荐领域失败');
    }
  },

  /** POST /trips/:tripId/domain-influence/claims */
  async createOrUpdateClaim(
    tripId: string,
    body: CreateDomainClaimRequest,
  ): Promise<DomainInfluenceItem> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<DomainInfluenceItem>>(
        `${basePath(tripId)}/claims`,
        body,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '认领领域失败');
    }
  },

  /** DELETE /trips/:tripId/domain-influence/claims/:claimId */
  async withdrawClaim(tripId: string, claimId: string): Promise<WithdrawDomainClaimResponse> {
    try {
      const res = await apiClient.delete<ApiResponseWrapper<WithdrawDomainClaimResponse>>(
        `${basePath(tripId)}/claims/${claimId}`,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '撤回认领失败');
    }
  },

  /** POST /trips/:tripId/domain-influence/endorsements */
  async endorseClaim(
    tripId: string,
    body: EndorseDomainClaimRequest,
  ): Promise<EndorseDomainClaimResponse> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<EndorseDomainClaimResponse>>(
        `${basePath(tripId)}/endorsements`,
        body,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '认可认领失败');
    }
  },

  /** PUT /trips/:tripId/domain-influence/weights */
  async updateWeights(
    tripId: string,
    body: UpdateDomainWeightsRequest,
  ): Promise<DomainInfluenceItem> {
    try {
      const res = await apiClient.put<ApiResponseWrapper<DomainInfluenceItem>>(
        `${basePath(tripId)}/weights`,
        body,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '调整权重失败');
    }
  },

  /** PUT /trips/:tripId/domain-influence/weights/bulk */
  async updateWeightsBulk(
    tripId: string,
    body: BulkUpdateDomainWeightsRequest,
  ): Promise<DomainInfluenceSnapshot> {
    try {
      const res = await apiClient.put<ApiResponseWrapper<DomainInfluenceSnapshot>>(
        `${basePath(tripId)}/weights/bulk`,
        body,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '批量调整权重失败');
    }
  },

  /** POST /trips/:tripId/domain-influence/confirm-rules */
  async confirmRules(
    tripId: string,
    body?: ConfirmDomainRulesRequest,
  ): Promise<ConfirmDomainRulesResponse> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<ConfirmDomainRulesResponse>>(
        `${basePath(tripId)}/confirm-rules`,
        body ?? {},
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '确认决策规则失败');
    }
  },

  /** GET /trips/:tripId/domain-influence/workbench-sidebar */
  async getWorkbenchSidebar(tripId: string): Promise<DomainWorkbenchSidebar> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<DomainWorkbenchSidebar>>(
        `${basePath(tripId)}/workbench-sidebar`,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载领域分工失败');
    }
  },

  /** GET /planning-workbench/trips/:tripId/domain-breakdown */
  async getDomainBreakdown(tripId: string): Promise<DomainWorkbenchSidebar> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<DomainWorkbenchSidebar>>(
        `/planning-workbench/trips/${tripId}/domain-breakdown`,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载领域分工失败');
    }
  },

  /** GET /trips/:tripId/domain-influence/domains/:domain/decision-brief */
  async getDecisionBrief(tripId: string, domain: TripDomain): Promise<DomainDecisionBrief> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<DomainDecisionBrief>>(
        `${basePath(tripId)}/domains/${domain}/decision-brief`,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载决策简报失败');
    }
  },
};
