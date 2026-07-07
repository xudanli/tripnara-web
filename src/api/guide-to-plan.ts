/**
 * Guide-to-Plan Pipeline API
 * Base: /api/guide-to-plan
 */

import axios from 'axios';
import apiClient from './client';
import type {
  AcceptPlanRequest,
  AcceptPlanResponse,
  AcceptPlanTripResponse,
  AbandonSessionResponse,
  ConfirmPlanRequest,
  ConfirmPlanResponse,
  CreateSessionRequest,
  GeneratePlanRequest,
  GeneratePlanResponse,
  GuideParseProgressView,
  GuidePlanCandidateDetailView,
  GuideToPlanSessionView,
  GuideTravelContext,
  GuideToPlanSessionListParams,
  GuideToPlanSessionListView,
  GuideUnderstandingView,
  ImportGuideRequest,
  ImportPreviewView,
  ImportedGuideView,
  ParseAsyncResponse,
  PatchPlaceCandidateRequest,
  PatchPlaceCandidateResponse,
  PlacesRematchRequest,
  PlacesRematchResponse,
  PlanReviewItemsResponse,
  PlanVariant,
} from '@/types/guide-to-plan-api';

const BASE = '/guide-to-plan';

/** 设计稿默认展示的三版草案 */
export const DEFAULT_DRAFT_VARIANTS: PlanVariant[] = ['faithful', 'comfortable', 'risk_min'];

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface NestErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

function unwrap<T>(response: { data: SuccessResponse<T> }): T {
  if (!response?.data?.success) {
    throw new Error('请求失败');
  }
  return response.data.data;
}

export function isGuideToPlanUnavailable(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    return status === 404 || status === 501;
  }
  const msg = err instanceof Error ? err.message : '';
  return /404|501|ENOTFOUND|Network Error/i.test(msg);
}

export function extractApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as NestErrorBody | undefined;
    if (Array.isArray(body?.message)) return body.message.join('；');
    if (typeof body?.message === 'string') return body.message;
    return err.message;
  }
  return err instanceof Error ? err.message : '请求失败';
}

function unwrapCandidateDetail(data: unknown): GuidePlanCandidateDetailView {
  if (data && typeof data === 'object' && 'candidate' in data) {
    return (data as { candidate: GuidePlanCandidateDetailView }).candidate;
  }
  return data as GuidePlanCandidateDetailView;
}

function unwrapCandidateList(data: unknown): GuidePlanCandidateDetailView[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'candidates' in data) {
    const wrapped = data as { candidates?: GuidePlanCandidateDetailView[] };
    if (wrapped.candidates?.length) return wrapped.candidates;
  }
  if (data && typeof data === 'object' && 'candidate' in data) {
    return [(data as { candidate: GuidePlanCandidateDetailView }).candidate];
  }
  return [];
}

export function mergePlanCandidates(
  ...lists: Array<GuidePlanCandidateDetailView[] | undefined | null>
): GuidePlanCandidateDetailView[] {
  const byId = new Map<string, GuidePlanCandidateDetailView>();
  for (const list of lists) {
    for (const candidate of list ?? []) {
      if (candidate?.id) byId.set(candidate.id, candidate);
    }
  }
  return [...byId.values()];
}

function parseGeneratePlanResponse(data: unknown): GeneratePlanResponse {
  const candidate = unwrapCandidateDetail(data);
  const candidates = mergePlanCandidates(unwrapCandidateList(data), [candidate]);
  return { candidate, candidates };
}

function normalizeAcceptBody(body: AcceptPlanRequest): Record<string, unknown> {
  return {
    acceptanceMode: body.acceptanceMode ?? body.mode ?? 'accept_all',
    planCandidateId: body.planCandidateId ?? body.candidateId,
    variant: body.variant,
  };
}

export function isAcceptReviewResponse(
  data: AcceptPlanResponse,
): data is import('@/types/guide-to-plan-api').AcceptPlanReviewResponse {
  return data.reviewRequired === true;
}

export function isAcceptTripResponse(
  data: AcceptPlanResponse,
): data is AcceptPlanTripResponse {
  return typeof (data as AcceptPlanTripResponse).tripId === 'string';
}

function unwrapSessionList(data: unknown): GuideToPlanSessionListView {
  if (Array.isArray(data)) {
    return { items: data, total: data.length, limit: data.length, offset: 0 };
  }
  if (data && typeof data === 'object' && 'items' in data) {
    const wrapped = data as GuideToPlanSessionListView;
    return {
      items: wrapped.items ?? [],
      total: wrapped.total ?? wrapped.items?.length ?? 0,
      limit: wrapped.limit ?? 20,
      offset: wrapped.offset ?? 0,
    };
  }
  return { items: [], total: 0, limit: 20, offset: 0 };
}

function apiBaseUrl(): string {
  const win = typeof globalThis !== 'undefined' ? globalThis.window : undefined;
  const runtimeBase =
    win?.__CONFIG__?.apiBaseUrl ||
    (win as Window & { _CONFIG__?: { apiBaseUrl?: string } })?._CONFIG__?.apiBaseUrl;
  return runtimeBase || import.meta.env.VITE_API_BASE_URL || '/api';
}

export const guideToPlanApi = {
  createSession: async (body: CreateSessionRequest = {}): Promise<GuideToPlanSessionView> => {
    const res = await apiClient.post<SuccessResponse<GuideToPlanSessionView>>(
      `${BASE}/sessions`,
      body,
      { timeout: 15000 },
    );
    return unwrap(res);
  },

  listSessions: async (
    params?: GuideToPlanSessionListParams,
  ): Promise<GuideToPlanSessionListView> => {
    const res = await apiClient.get<SuccessResponse<GuideToPlanSessionListView | GuideToPlanSessionView[]>>(
      `${BASE}/sessions`,
      { params },
    );
    return unwrapSessionList(unwrap(res));
  },

  getSession: async (sessionId: string): Promise<GuideToPlanSessionView> => {
    const res = await apiClient.get<SuccessResponse<GuideToPlanSessionView>>(
      `${BASE}/sessions/${sessionId}`,
      { timeout: 15000 },
    );
    return unwrap(res);
  },

  getImportPreview: async (sessionId: string): Promise<ImportPreviewView> => {
    const res = await apiClient.get<SuccessResponse<ImportPreviewView>>(
      `${BASE}/sessions/${sessionId}/import/preview`,
    );
    return unwrap(res);
  },

  importGuide: async (
    sessionId: string,
    body: ImportGuideRequest,
  ): Promise<ImportedGuideView> => {
    const res = await apiClient.post<SuccessResponse<ImportedGuideView>>(
      `${BASE}/sessions/${sessionId}/import`,
      body,
    );
    return unwrap(res);
  },

  importFile: async (
    sessionId: string,
    file: File,
    title?: string,
  ): Promise<ImportedGuideView> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    const res = await apiClient.post<SuccessResponse<ImportedGuideView>>(
      `${BASE}/sessions/${sessionId}/import/file`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      },
    );
    return unwrap(res);
  },

  importScreenshot: async (
    sessionId: string,
    file: File,
    title?: string,
  ): Promise<ImportedGuideView> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    const res = await apiClient.post<SuccessResponse<ImportedGuideView>>(
      `${BASE}/sessions/${sessionId}/import/screenshot`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      },
    );
    return unwrap(res);
  },

  deleteGuide: async (
    sessionId: string,
    guideId: string,
  ): Promise<{ deleted: boolean; guideId: string }> => {
    const res = await apiClient.delete<SuccessResponse<{ deleted: boolean; guideId: string }>>(
      `${BASE}/sessions/${sessionId}/guides/${guideId}`,
    );
    return unwrap(res);
  },

  parseAsync: async (sessionId: string): Promise<ParseAsyncResponse> => {
    const res = await apiClient.post<SuccessResponse<ParseAsyncResponse>>(
      `${BASE}/sessions/${sessionId}/parse/async`,
    );
    return unwrap(res);
  },

  getParseStatus: async (sessionId: string): Promise<GuideParseProgressView> => {
    const res = await apiClient.get<SuccessResponse<GuideParseProgressView>>(
      `${BASE}/sessions/${sessionId}/parse/status`,
    );
    return unwrap(res);
  },

  getUnderstanding: async (sessionId: string): Promise<GuideUnderstandingView> => {
    const res = await apiClient.get<SuccessResponse<GuideUnderstandingView>>(
      `${BASE}/sessions/${sessionId}/understanding`,
    );
    return unwrap(res);
  },

  rematchPlaces: async (
    sessionId: string,
    body: PlacesRematchRequest = {},
  ): Promise<PlacesRematchResponse> => {
    const res = await apiClient.post<SuccessResponse<PlacesRematchResponse>>(
      `${BASE}/sessions/${sessionId}/places/rematch`,
      body,
    );
    return unwrap(res);
  },

  patchPlaceCandidate: async (
    sessionId: string,
    candidateId: string,
    body: PatchPlaceCandidateRequest,
  ): Promise<PatchPlaceCandidateResponse> => {
    const res = await apiClient.patch<SuccessResponse<PatchPlaceCandidateResponse>>(
      `${BASE}/sessions/${sessionId}/places/${candidateId}`,
      body,
    );
    return unwrap(res);
  },

  patchTravelContext: async (
    sessionId: string,
    travelContext: Partial<GuideTravelContext> | Record<string, unknown>,
  ): Promise<GuideToPlanSessionView> => {
    const res = await apiClient.patch<SuccessResponse<GuideToPlanSessionView>>(
      `${BASE}/sessions/${sessionId}/travel-context`,
      travelContext,
    );
    return unwrap(res);
  },

  generatePlan: async (
    sessionId: string,
    body: GeneratePlanRequest = {},
  ): Promise<GeneratePlanResponse> => {
    const res = await apiClient.post<SuccessResponse<GeneratePlanResponse>>(
      `${BASE}/sessions/${sessionId}/generate`,
      body,
      { timeout: 180000 },
    );
    return parseGeneratePlanResponse(unwrap(res));
  },

  /** 补生成缺失 variant（后端未一次返回多版时） */
  expandMissingPlanVariants: async (
    sessionId: string,
    existing?: GuidePlanCandidateDetailView[],
  ): Promise<GuidePlanCandidateDetailView[]> => {
    let merged = mergePlanCandidates(
      existing,
      await guideToPlanApi.getPlanCandidates(sessionId),
    );
    const presentVariants = new Set(merged.map((c) => c.variant));
    const missing = DEFAULT_DRAFT_VARIANTS.filter((v) => !presentVariants.has(v));
    if (missing.length === 0) return merged;

    for (const variant of missing) {
      try {
        const generated = await guideToPlanApi.generatePlan(sessionId, { variant });
        merged = mergePlanCandidates(merged, generated.candidates, [generated.candidate]);
      } catch {
        // 单版本生成失败时继续尝试其余 variant
      }
    }

    const remote = await guideToPlanApi.getPlanCandidates(sessionId);
    return mergePlanCandidates(merged, remote);
  },

  getPlanCandidates: async (sessionId: string): Promise<GuidePlanCandidateDetailView[]> => {
    const res = await apiClient.get<SuccessResponse<GuidePlanCandidateDetailView[]>>(
      `${BASE}/sessions/${sessionId}/plan-candidates`,
    );
    return unwrapCandidateList(unwrap(res));
  },

  getPlanCandidate: async (
    sessionId: string,
    planCandidateId: string,
  ): Promise<GuidePlanCandidateDetailView> => {
    const res = await apiClient.get<SuccessResponse<GuidePlanCandidateDetailView>>(
      `${BASE}/sessions/${sessionId}/plan-candidates/${planCandidateId}`,
    );
    return unwrap(res);
  },

  acceptPlan: async (
    sessionId: string,
    body: AcceptPlanRequest = { acceptanceMode: 'accept_all' },
  ): Promise<AcceptPlanResponse> => {
    const res = await apiClient.post<SuccessResponse<AcceptPlanResponse>>(
      `${BASE}/sessions/${sessionId}/accept`,
      normalizeAcceptBody(body),
      { timeout: 120000 },
    );
    return unwrap(res);
  },

  getReviewItems: async (
    sessionId: string,
    planCandidateId: string,
  ): Promise<PlanReviewItemsResponse> => {
    const res = await apiClient.get<SuccessResponse<PlanReviewItemsResponse>>(
      `${BASE}/sessions/${sessionId}/plan-candidates/${planCandidateId}/review-items`,
    );
    return unwrap(res);
  },

  confirmPlan: async (
    sessionId: string,
    planCandidateId: string,
    body: ConfirmPlanRequest,
  ): Promise<ConfirmPlanResponse> => {
    const res = await apiClient.post<SuccessResponse<ConfirmPlanResponse>>(
      `${BASE}/sessions/${sessionId}/plan-candidates/${planCandidateId}/confirm`,
      body,
      { timeout: 120000 },
    );
    return unwrap(res);
  },

  abandonSession: async (sessionId: string): Promise<AbandonSessionResponse> => {
    const res = await apiClient.post<SuccessResponse<AbandonSessionResponse>>(
      `${BASE}/sessions/${sessionId}/abandon`,
    );
    return unwrap(res);
  },
};

/** SSE 解析进度（fetch + Bearer，替代轮询） */
export async function subscribeParseProgress(
  sessionId: string,
  onProgress: (progress: GuideParseProgressView) => void,
  options?: { signal?: AbortSignal; onError?: (err: Error) => void },
): Promise<void> {
  const token = sessionStorage.getItem('accessToken');
  const url = `${apiBaseUrl()}${BASE}/sessions/${sessionId}/parse/stream`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    signal: options?.signal,
  });

  if (!res.ok) {
    throw new Error(`解析进度流连接失败 (${res.status})`);
  }
  if (!res.body) {
    throw new Error('解析进度流无响应体');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        if (!part.trim()) continue;
        if (part.includes('event: end')) return;

        const dataLine = part.split('\n').find((line) => line.startsWith('data:'));
        if (!dataLine) continue;

        const json = dataLine.replace(/^data:\s*/, '');
        try {
          const payload = JSON.parse(json) as GuideParseProgressView;
          onProgress(payload);
          if (payload.status === 'completed' || payload.status === 'failed') return;
        } catch {
          // 忽略单条解析失败
        }
      }
    }
  } catch (err) {
    if (options?.signal?.aborted) return;
    const error = err instanceof Error ? err : new Error('解析进度流中断');
    options?.onError?.(error);
    throw error;
  }
}

/** 轮询直至 completed / failed */
export async function waitForParseComplete(
  sessionId: string,
  onProgress: (progress: GuideParseProgressView) => void,
  options?: { signal?: AbortSignal; intervalMs?: number },
): Promise<GuideParseProgressView> {
  const interval = options?.intervalMs ?? 1500;

  while (!options?.signal?.aborted) {
    const status = await guideToPlanApi.getParseStatus(sessionId);
    onProgress(status);
    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('解析已取消');
}
