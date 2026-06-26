/**
 * Gate 1 API 共享请求封装与错误类型
 */

import apiClient from './client';
import { unwrapApiData } from '@/lib/api-response';
import { resolveHttpErrorUserMessage } from '@/types/http-error';

export class Gate1ApiError extends Error {
  readonly statusCode?: number;
  readonly path?: string;

  constructor(message: string, options?: { statusCode?: number; path?: string }) {
    super(message);
    this.name = 'Gate1ApiError';
    this.statusCode = options?.statusCode;
    this.path = options?.path;
  }
}

export function isGate1ApiError(error: unknown): error is Gate1ApiError {
  return error instanceof Gate1ApiError;
}

function toGate1ApiError(error: unknown, fallback = 'Gate 1 请求失败'): Gate1ApiError {
  if (error instanceof Gate1ApiError) return error;

  const err = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };

  const statusCode = err.response?.status;
  const body = err.response?.data;
  const path =
    body && typeof body === 'object' && 'path' in body
      ? String((body as { path?: unknown }).path ?? '')
      : undefined;

  const message =
    resolveHttpErrorUserMessage(body ?? err.message, fallback) ||
    err.message ||
    fallback;

  return new Gate1ApiError(message, { statusCode, path: path || undefined });
}

export async function gate1Get<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  try {
    const response = await apiClient.get(path, params ? { params } : undefined);
    return unwrapApiData<T>(response.data);
  } catch (error) {
    throw toGate1ApiError(error);
  }
}

export async function gate1Post<T>(path: string, body?: unknown): Promise<T> {
  try {
    const response = await apiClient.post(path, body ?? {});
    return unwrapApiData<T>(response.data);
  } catch (error) {
    throw toGate1ApiError(error);
  }
}

export async function gate1Put<T>(path: string, body?: unknown): Promise<T> {
  try {
    const response = await apiClient.put(path, body ?? {});
    return unwrapApiData<T>(response.data);
  } catch (error) {
    throw toGate1ApiError(error);
  }
}

export async function gate1Patch<T>(path: string, body?: unknown): Promise<T> {
  try {
    const response = await apiClient.patch(path, body ?? {});
    return unwrapApiData<T>(response.data);
  } catch (error) {
    throw toGate1ApiError(error);
  }
}

/** 拼接成员 H5 完整链接 */
export function buildGate1ParticipantInviteUrl(invitePath: string): string {
  const path = invitePath.startsWith('/')
    ? invitePath
    : `/participant/invites/${invitePath}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}
