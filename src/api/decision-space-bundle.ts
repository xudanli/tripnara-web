import apiClient from './client';
import { CONFIG } from '@/constants/config';
import { normalizeDecisionSpaceBundle } from './normalize-decision-space-bundle';
import type {
  DecisionSpaceBundle,
  DecisionSpaceBundleFetchParams,
  DecisionSpaceBundleFetchResult,
  DecisionSpaceBundleIncludeField,
} from '@/dto/frontend-decision-space-bundle.types';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code: string; message: string };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function normalizeEtagValue(value: string | undefined | null): string | undefined {
  if (!value?.trim()) return undefined;
  return value.replace(/^W\//, '').replace(/^"|"$/g, '').trim() || undefined;
}

function formatIfNoneMatch(etag: string): string {
  const normalized = normalizeEtagValue(etag) ?? etag;
  return normalized.startsWith('"') ? normalized : `"${normalized}"`;
}

function appendListParam(
  search: URLSearchParams,
  key: string,
  value: DecisionSpaceBundleIncludeField[] | string | undefined,
) {
  if (!value) return;
  if (Array.isArray(value)) {
    if (value.length) search.set(key, value.join(','));
    return;
  }
  const trimmed = value.trim();
  if (trimmed) search.set(key, trimmed);
}

function buildBundleSearchParams(params: DecisionSpaceBundleFetchParams): URLSearchParams {
  const search = new URLSearchParams();
  const problemId = params.problemId?.trim();
  const proposalId = params.proposalId?.trim();
  const conflictId = (params.conflictId ?? params.focusConflictId)?.trim();
  if (problemId) search.set('problemId', problemId);
  if (proposalId) search.set('proposalId', proposalId);
  if (conflictId) search.set('conflictId', conflictId);
  if (params.optionId?.trim()) search.set('optionId', params.optionId.trim());
  if (params.surface?.trim()) search.set('surface', params.surface.trim());
  appendListParam(search, 'include', params.include);
  appendListParam(search, 'exclude', params.exclude);
  return search;
}

function bundlePath(tripId: string, suffix = ''): string {
  return `/trips/${encodeURIComponent(tripId)}/decision-space-bundle${suffix}`;
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
  console.debug(`[decision-space-bundle] ${endpoint}`, payload);
}

async function fetchBundleEnvelope(
  url: string,
  options?: { signal?: AbortSignal; ifNoneMatch?: string; timeout?: number },
): Promise<DecisionSpaceBundleFetchResult> {
  try {
    const response = await apiClient.get<ApiResponseWrapper<unknown>>(url, {
      signal: options?.signal,
      timeout: options?.timeout,
      headers: options?.ifNoneMatch
        ? { 'If-None-Match': formatIfNoneMatch(options.ifNoneMatch) }
        : undefined,
      validateStatus: (status) => status === 200 || status === 304,
    });

    const headerEtag =
      (response.headers?.etag as string | undefined) ??
      (response.headers?.ETag as string | undefined);

    if (response.status === 304) {
      return {
        status: 'not_modified',
        etag: normalizeEtagValue(headerEtag ?? options?.ifNoneMatch) ?? null,
      };
    }

    const wrapper = response.data;
    if (!wrapper?.success) {
      const err = new Error(wrapper?.error?.message ?? '请求失败') as Error & {
        code?: string;
        status?: number;
      };
      err.code = wrapper?.error?.code;
      err.status = response.status;
      throw err;
    }

    const etag = normalizeEtagValue(headerEtag ?? readEtagFromPayload(wrapper.data));
    return {
      status: 'ok',
      data: normalizeDecisionSpaceBundle(wrapper.data, ''),
      etag: etag ?? null,
    };
  } catch (error) {
    return handleAxiosError(error);
  }
}

function readEtagFromPayload(raw: unknown): string | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const etag = record.etag;
  return typeof etag === 'string' ? etag : undefined;
}

export const decisionSpaceBundleApi = {
  getBundle: async (
    tripId: string,
    params: DecisionSpaceBundleFetchParams,
    options?: { signal?: AbortSignal; ifNoneMatch?: string },
  ): Promise<DecisionSpaceBundleFetchResult> => {
    const search = buildBundleSearchParams(params);
    const query = search.toString();
    const url = `${bundlePath(tripId)}${query ? `?${query}` : ''}`;
    const result = await fetchBundleEnvelope(url, {
      ...options,
      timeout: params.optionId?.trim() ? CONFIG.API.TIMEOUT_LONG : undefined,
    });
    if (result.status === 'ok') {
      result.data = {
        ...result.data,
        tripId: result.data.tripId || tripId,
      };
      logIntegration('GET decision-space-bundle', {
        surface: params.surface ?? 'default',
        problemId: params.problemId,
        proposalId: params.proposalId,
        included: result.data.meta?.included,
        deferred: result.data.meta?.deferred,
      });
    }
    return result;
  },

  getDelta: async (
    tripId: string,
    params: DecisionSpaceBundleFetchParams & { problemId: string; include: DecisionSpaceBundleIncludeField[] | string },
    options?: { signal?: AbortSignal; ifNoneMatch?: string; since?: string },
  ): Promise<DecisionSpaceBundleFetchResult> => {
    const search = buildBundleSearchParams(params);
    if (options?.since?.trim()) search.set('since', options.since.trim());
    const query = search.toString();
    const url = `${bundlePath(tripId)}/delta${query ? `?${query}` : ''}`;
    const result = await fetchBundleEnvelope(url, options);
    if (result.status === 'ok') {
      result.data = { ...result.data, tripId: result.data.tripId || tripId };
      logIntegration('GET decision-space-bundle/delta', {
        problemId: params.problemId,
        include: params.include,
      });
    }
    return result;
  },
};

/** 404 / 501 — bundle 未部署，可回退独立接口 */
export function isDecisionSpaceBundleRecoverableError(error: unknown): boolean {
  const status = (error as { status?: number }).status;
  const code = String((error as { code?: string }).code ?? '').toUpperCase();
  return status === 404 || status === 501 || code === 'NOT_IMPLEMENTED';
}

export type { DecisionSpaceBundle, DecisionSpaceBundleFetchParams };
