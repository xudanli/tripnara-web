import apiClient from './client';
import type {
  FrictionRadarData,
  MoneyDnaCard,
  OnboardingStatus,
  QuizPayload,
  SimulateSplitRequest,
  SplitConsensusData,
  SubmitTravelStyleRequest,
  ReuseProfileRequest,
  ReuseProfileResponse,
  QuizPrefillResponse,
  TravelStyleCard,
  TeamMoneyDnaItem,
  TeamTravelStyleItem,
} from '@/types/trip-decision-profiling';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class DecisionProfilingApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'DecisionProfilingApiError';
  }
}

function sanitizeMessage(message: string | undefined, fallback: string): string {
  const raw = message?.trim() ?? '';
  if (!raw) return fallback;
  if (/does not exist in the current database/i.test(raw)) {
    return '决策风格画像数据库尚未初始化，请确认后端已执行 migration';
  }
  if (raw.length > 180) return fallback;
  return raw;
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback = '请求失败'): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new DecisionProfilingApiError(
      err.error?.code ?? 'REQUEST_ERROR',
      sanitizeMessage(err.error?.message, fallback),
      err.error?.details,
    );
  }
  return response.data.data;
}

function toApiError(error: unknown, fallback: string): DecisionProfilingApiError {
  if (error instanceof DecisionProfilingApiError) return error;

  const err = error as {
    response?: { status?: number; data?: ErrorResponse };
    code?: string;
    message?: string;
    details?: unknown;
  };

  const httpStatus = err.response?.status;
  const body = err.response?.data;

  if (httpStatus === 401) {
    throw new DecisionProfilingApiError('UNAUTHORIZED', '请先登录');
  }
  if (httpStatus === 403) {
    throw new DecisionProfilingApiError('FORBIDDEN', body?.error?.message ?? '无权访问此行程');
  }
  if (httpStatus === 404) {
    throw new DecisionProfilingApiError('NOT_FOUND', body?.error?.message ?? '行程不存在');
  }
  if (httpStatus === 400) {
    throw new DecisionProfilingApiError(
      'BAD_REQUEST',
      body?.error?.message ?? err.message ?? fallback,
      body?.error?.details,
    );
  }
  if (body && body.success === false) {
    throw new DecisionProfilingApiError(
      body.error?.code ?? 'REQUEST_ERROR',
      sanitizeMessage(body.error?.message, fallback),
      body.error?.details,
    );
  }

  throw new DecisionProfilingApiError(err.code ?? 'REQUEST_ERROR', err.message ?? fallback, err.details);
}

const basePath = (tripId: string) => `/trips/${tripId}/decision-profiling`;

export const decisionProfilingApi = {
  /** GET /trips/:tripId/decision-profiling/onboarding */
  async getOnboarding(tripId: string): Promise<OnboardingStatus> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<OnboardingStatus>>(`${basePath(tripId)}/onboarding`);
      return handleResponse(res, '加载调查状态失败');
    } catch (e) {
      throw toApiError(e, '加载调查状态失败');
    }
  },

  /** GET /trips/:tripId/decision-profiling/quiz */
  async getQuiz(tripId: string): Promise<QuizPayload> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<QuizPayload>>(`${basePath(tripId)}/quiz`);
      return handleResponse(res, '加载题库失败');
    } catch (e) {
      throw toApiError(e, '加载题库失败');
    }
  },

  /** GET /trips/:tripId/decision-profiling/my/travel-style */
  async getMyTravelStyle(tripId: string): Promise<TravelStyleCard | null> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<TravelStyleCard | null>>(
        `${basePath(tripId)}/my/travel-style`,
      );
      return handleResponse(res, '加载旅行风格失败');
    } catch (e) {
      throw toApiError(e, '加载旅行风格失败');
    }
  },

  /** POST /trips/:tripId/decision-profiling/my/travel-style */
  async submitTravelStyle(tripId: string, body: SubmitTravelStyleRequest): Promise<TravelStyleCard> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<TravelStyleCard>>(
        `${basePath(tripId)}/my/travel-style`,
        body,
      );
      return handleResponse(res, '提交旅行风格失败');
    } catch (e) {
      throw toApiError(e, '提交旅行风格失败');
    }
  },

  /** PATCH /trips/:tripId/decision-profiling/my/travel-style */
  async patchTravelStyleNote(tripId: string, userNote: string): Promise<TravelStyleCard> {
    try {
      const res = await apiClient.patch<ApiResponseWrapper<TravelStyleCard>>(
        `${basePath(tripId)}/my/travel-style`,
        { userNote },
      );
      return handleResponse(res, '更新备注失败');
    } catch (e) {
      throw toApiError(e, '更新备注失败');
    }
  },

  /** GET /trips/:tripId/decision-profiling/team/travel-style */
  async getTeamTravelStyle(tripId: string): Promise<TeamTravelStyleItem[]> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<TeamTravelStyleItem[]>>(
        `${basePath(tripId)}/team/travel-style`,
      );
      return handleResponse(res, '加载团队风格失败');
    } catch (e) {
      throw toApiError(e, '加载团队风格失败');
    }
  },

  /** GET /trips/:tripId/decision-profiling/my/money-dna */
  async getMyMoneyDna(tripId: string): Promise<MoneyDnaCard | null> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<MoneyDnaCard | null>>(
        `${basePath(tripId)}/my/money-dna`,
      );
      return handleResponse(res, '加载 Money DNA 失败');
    } catch (e) {
      throw toApiError(e, '加载 Money DNA 失败');
    }
  },

  /** POST /trips/:tripId/decision-profiling/my/money-dna */
  async submitMoneyDna(tripId: string, body: SubmitTravelStyleRequest): Promise<MoneyDnaCard> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<MoneyDnaCard>>(
        `${basePath(tripId)}/my/money-dna`,
        body,
      );
      return handleResponse(res, '提交 Money DNA 失败');
    } catch (e) {
      throw toApiError(e, '提交 Money DNA 失败');
    }
  },

  /** GET /trips/:tripId/decision-profiling/team/money-dna */
  async getTeamMoneyDna(tripId: string): Promise<TeamMoneyDnaItem[]> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<TeamMoneyDnaItem[]>>(
        `${basePath(tripId)}/team/money-dna`,
      );
      return handleResponse(res, '加载团队消费相似度失败');
    } catch (e) {
      throw toApiError(e, '加载团队消费相似度失败');
    }
  },

  /** POST /trips/:tripId/decision-profiling/my/reuse-profile */
  async reuseProfile(tripId: string, body: ReuseProfileRequest = {
    sections: ['travel_style', 'money_dna'],
  }): Promise<ReuseProfileResponse> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<ReuseProfileResponse>>(
        `${basePath(tripId)}/my/reuse-profile`,
        body,
      );
      return handleResponse(res, '沿用上次调查失败');
    } catch (e) {
      throw toApiError(e, '沿用上次调查失败');
    }
  },

  /** POST /trips/:tripId/decision-profiling/my/quiz-prefill */
  async getQuizPrefill(tripId: string): Promise<QuizPrefillResponse> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<QuizPrefillResponse>>(
        `${basePath(tripId)}/my/quiz-prefill`,
        {},
      );
      return handleResponse(res, '加载预填答案失败');
    } catch (e) {
      throw toApiError(e, '加载预填答案失败');
    }
  },

  /** GET /trips/:tripId/decision-profiling/friction-radar */
  async getFrictionRadar(tripId: string): Promise<FrictionRadarData> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<FrictionRadarData>>(
        `${basePath(tripId)}/friction-radar`,
      );
      return handleResponse(res, '加载摩擦预警失败');
    } catch (e) {
      throw toApiError(e, '加载摩擦预警失败');
    }
  },

  /** GET /trips/:tripId/decision-profiling/split-consensus */
  async getSplitConsensus(tripId: string): Promise<SplitConsensusData> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<SplitConsensusData>>(
        `${basePath(tripId)}/split-consensus`,
      );
      return handleResponse(res, '加载分摊共识失败');
    } catch (e) {
      throw toApiError(e, '加载分摊共识失败');
    }
  },

  /** POST /trips/:tripId/decision-profiling/split-consensus/simulate */
  async simulateSplit(tripId: string, body: SimulateSplitRequest): Promise<SplitConsensusData> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<SplitConsensusData>>(
        `${basePath(tripId)}/split-consensus/simulate`,
        body,
      );
      return handleResponse(res, '分摊模拟失败');
    } catch (e) {
      throw toApiError(e, '分摊模拟失败');
    }
  },

  /** POST /trips/:tripId/decision-profiling/split-consensus/select */
  async selectSplitMode(tripId: string, mode: SplitConsensusData['selectedMode']): Promise<SplitConsensusData> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<SplitConsensusData>>(
        `${basePath(tripId)}/split-consensus/select`,
        { mode },
      );
      return handleResponse(res, '选择分摊方案失败');
    } catch (e) {
      throw toApiError(e, '选择分摊方案失败');
    }
  },

  /** POST /trips/:tripId/decision-profiling/split-consensus/confirm */
  async confirmSplitMode(tripId: string): Promise<SplitConsensusData> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<SplitConsensusData>>(
        `${basePath(tripId)}/split-consensus/confirm`,
        {},
      );
      return handleResponse(res, '确认分摊方案失败');
    } catch (e) {
      throw toApiError(e, '确认分摊方案失败');
    }
  },
};
