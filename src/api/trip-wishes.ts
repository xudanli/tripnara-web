import apiClient from './client';
import type {
  ArchiveWishResponse,
  CreateWishFromCardRequest,
  CreateWishFromInspirationRequest,
  CreateWishFromVoiceRequest,
  CreateWishRequest,
  DayWishImpactResponse,
  InspirationListResponse,
  InspirationQuery,
  TeamWishListResponse,
  TripWishItem,
  UpdateWishRequest,
  VoiceOneShotResponse,
  VoiceTranscribeResponse,
  WishListResponse,
  WishSuggestionCardsResponse,
  WishSummary,
  WishCategoriesResponse,
  WishCategory,
} from '@/types/trip-wishes';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class TripWishesApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'TripWishesApiError';
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback = '愿望单请求失败'): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new TripWishesApiError(
      err.error?.code ?? 'REQUEST_ERROR',
      sanitizeWishErrorMessage(err.error?.message, fallback),
      err.error?.details,
    );
  }
  return response.data.data;
}

function sanitizeWishErrorMessage(message: string | undefined, fallback: string): string {
  const raw = message?.trim() ?? '';
  if (!raw) return fallback;
  if (/does not exist in the current database/i.test(raw)) {
    return '愿望单数据库尚未初始化，请确认后端已执行 migration';
  }
  if (/Invalid `this\.prisma/i.test(raw) || raw.length > 180) {
    return fallback;
  }
  return raw;
}

function toApiError(error: unknown, fallback: string): TripWishesApiError {
  if (error instanceof TripWishesApiError) return error;

  const err = error as {
    response?: { status?: number; data?: ErrorResponse };
    code?: string;
    message?: string;
    details?: unknown;
  };

  const httpStatus = err.response?.status;
  const body = err.response?.data;

  if (httpStatus === 401) {
    throw new TripWishesApiError('UNAUTHORIZED', '请先登录');
  }
  if (httpStatus === 400) {
    throw new TripWishesApiError(
      'VALIDATION_ERROR',
      sanitizeWishErrorMessage(body?.error?.message ?? err.message, fallback),
      body?.error?.details,
    );
  }
  if (body && body.success === false) {
    throw new TripWishesApiError(
      body.error?.code ?? 'REQUEST_ERROR',
      sanitizeWishErrorMessage(body.error?.message, fallback),
      body.error?.details,
    );
  }

  throw new TripWishesApiError(
    err.code ?? 'REQUEST_ERROR',
    sanitizeWishErrorMessage(err.message, fallback),
    err.details,
  );
}

const wishesPath = (tripId: string) => `/trips/${tripId}/wishes`;

export const tripWishesApi = {
  /** GET /trips/:tripId/wishes/mine */
  async getMine(tripId: string): Promise<WishListResponse> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<WishListResponse>>(
        `${wishesPath(tripId)}/mine`,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载我的心愿失败');
    }
  },

  /** GET /trips/:tripId/wishes/team */
  async getTeam(tripId: string): Promise<TeamWishListResponse> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<TeamWishListResponse>>(
        `${wishesPath(tripId)}/team`,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载团队心愿失败');
    }
  },

  /** GET /trips/:tripId/wishes/summary */
  async getSummary(tripId: string): Promise<WishSummary> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<WishSummary>>(
        `${wishesPath(tripId)}/summary`,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载愿望摘要失败');
    }
  },

  /** GET /planning-workbench/trips/:tripId/wish-summary */
  async getWorkbenchSummary(tripId: string): Promise<WishSummary> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<WishSummary>>(
        `/planning-workbench/trips/${tripId}/wish-summary`,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载愿望摘要失败');
    }
  },

  /** GET /trips/:tripId/wishes/day-impact */
  async getDayImpact(tripId: string): Promise<DayWishImpactResponse> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<DayWishImpactResponse>>(
        `${wishesPath(tripId)}/day-impact`,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载每日影响计数失败');
    }
  },

  /** GET /trips/:tripId/wishes/categories */
  async getCategories(
    tripId: string,
    locale = 'zh-CN',
  ): Promise<WishCategoriesResponse> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<WishCategoriesResponse>>(
        `${wishesPath(tripId)}/categories`,
        { params: { locale } },
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载领域选项失败');
    }
  },

  /** GET /trips/:tripId/wishes/suggestions/cards */
  async getSuggestionCards(
    tripId: string,
    category?: WishCategory,
  ): Promise<WishSuggestionCardsResponse> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<WishSuggestionCardsResponse>>(
        `${wishesPath(tripId)}/suggestions/cards`,
        { params: category ? { category } : undefined },
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载推荐卡片失败');
    }
  },

  /** GET /trips/:tripId/wishes/inspiration */
  async getInspiration(
    tripId: string,
    query?: InspirationQuery,
  ): Promise<InspirationListResponse> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<InspirationListResponse>>(
        `${wishesPath(tripId)}/inspiration`,
        { params: query },
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '加载灵感图库失败');
    }
  },

  /** POST /trips/:tripId/wishes — 自由输入 */
  async create(tripId: string, body: CreateWishRequest): Promise<TripWishItem> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<TripWishItem>>(
        wishesPath(tripId),
        body,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '提交心愿失败');
    }
  },

  /** POST /trips/:tripId/wishes/from-card/:cardId */
  async createFromCard(
    tripId: string,
    cardId: string,
    body?: CreateWishFromCardRequest,
  ): Promise<TripWishItem> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<TripWishItem>>(
        `${wishesPath(tripId)}/from-card/${encodeURIComponent(cardId)}`,
        body ?? {},
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '从卡片创建心愿失败');
    }
  },

  /** POST /trips/:tripId/wishes/from-inspiration */
  async createFromInspiration(
    tripId: string,
    body: CreateWishFromInspirationRequest,
  ): Promise<TripWishItem> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<TripWishItem>>(
        `${wishesPath(tripId)}/from-inspiration`,
        body,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '收藏灵感失败');
    }
  },

  /** POST /trips/:tripId/wishes/voice/transcribe */
  async transcribeVoice(
    tripId: string,
    audio: Blob,
    options?: { language?: string; format?: string; filename?: string },
  ): Promise<VoiceTranscribeResponse> {
    try {
      const form = new FormData();
      form.append('audio', audio, options?.filename ?? 'recording.webm');
      if (options?.language) form.append('language', options.language);
      if (options?.format) form.append('format', options.format);

      const res = await apiClient.post<ApiResponseWrapper<VoiceTranscribeResponse>>(
        `${wishesPath(tripId)}/voice/transcribe`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '语音转写失败');
    }
  },

  /** POST /trips/:tripId/wishes/from-voice */
  async createFromVoice(
    tripId: string,
    body: CreateWishFromVoiceRequest,
  ): Promise<TripWishItem> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<TripWishItem>>(
        `${wishesPath(tripId)}/from-voice`,
        body,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '提交语音心愿失败');
    }
  },

  /** POST /trips/:tripId/wishes/from-voice/audio — 一键提交 */
  async createFromVoiceAudio(
    tripId: string,
    audio: Blob,
    options?: {
      language?: string;
      format?: string;
      category?: WishCategory;
      importance?: number;
      visibility?: string;
      filename?: string;
    },
  ): Promise<VoiceOneShotResponse> {
    try {
      const form = new FormData();
      form.append('audio', audio, options?.filename ?? 'recording.webm');
      if (options?.language) form.append('language', options.language);
      if (options?.format) form.append('format', options.format);
      if (options?.category) form.append('category', options.category);
      if (options?.importance != null) form.append('importance', String(options.importance));
      if (options?.visibility) form.append('visibility', options.visibility);

      const res = await apiClient.post<ApiResponseWrapper<VoiceOneShotResponse>>(
        `${wishesPath(tripId)}/from-voice/audio`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '语音提交失败');
    }
  },

  /** PATCH /trips/:tripId/wishes/:wishId */
  async update(
    tripId: string,
    wishId: string,
    body: UpdateWishRequest,
  ): Promise<TripWishItem> {
    try {
      const res = await apiClient.patch<ApiResponseWrapper<TripWishItem>>(
        `${wishesPath(tripId)}/${wishId}`,
        body,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '更新心愿失败');
    }
  },

  /** DELETE /trips/:tripId/wishes/:wishId — 归档 */
  async archive(tripId: string, wishId: string): Promise<ArchiveWishResponse> {
    try {
      const res = await apiClient.delete<ApiResponseWrapper<ArchiveWishResponse>>(
        `${wishesPath(tripId)}/${wishId}`,
      );
      return handleResponse(res);
    } catch (e) {
      throw toApiError(e, '删除心愿失败');
    }
  },
};
