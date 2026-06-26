/**
 * Round 3 · Self-Evolution Memory API
 * Episodic + Semantic memory endpoints under /memory/*
 */

import apiClient from './client';
import { withSelfEvolutionFallback } from '@/features/self-evolution/lib/self-evolution-api-mode';
import { selfEvolutionMockStore } from '@/features/self-evolution/lib/mock-store';
import {
  normalizeEpisodicMemories,
  normalizeEpisodicMemory,
  normalizeSemanticMemories,
  normalizeSemanticMemory,
} from '@/features/self-evolution/lib/normalize-self-evolution-response';
import type {
  EpisodicMemory,
  EpisodicMemoryRequest,
  LifeEventType,
  SemanticMemory,
  SemanticMemoryReflectionRequest,
} from '@/types/self-evolution';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

function unwrap<T>(payload: SuccessResponse<T> | T): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as SuccessResponse<T>).data;
  }
  return payload as T;
}

export class SelfEvolutionMemoryApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'SelfEvolutionMemoryApiError';
  }
}

function toApiError(error: unknown, fallback: string): SelfEvolutionMemoryApiError {
  const err = error as {
    response?: { data?: { error?: { code?: string; message?: string } } };
    message?: string;
  };
  const code = err.response?.data?.error?.code ?? 'REQUEST_ERROR';
  const message = err.response?.data?.error?.message ?? err.message ?? fallback;
  return new SelfEvolutionMemoryApiError(code, message);
}

async function live<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toApiError(error, fallback);
  }
}

export const selfEvolutionMemoryApi = {
  generateEpisodicMemory: (data: EpisodicMemoryRequest) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<EpisodicMemory>>(
            '/memory/episodic',
            data
          );
          return normalizeEpisodicMemory(unwrap(response.data));
        }, '生成情景记忆失败'),
      async () => selfEvolutionMockStore.generateEpisodicMemory(data)
    ),

  retrieveEpisodicMemories: (
    userId: string,
    params?: { topK?: number; minActivationScore?: number; season?: string }
  ) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<EpisodicMemory[]>>(
            `/memory/episodic/${userId}`,
            { params }
          );
          return normalizeEpisodicMemories(unwrap(response.data));
        }, '检索情景记忆失败'),
      async () => selfEvolutionMockStore.retrieveEpisodicMemories(userId, params)
    ),

  resetOnLifeEvent: (userId: string, eventType: LifeEventType) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          await apiClient.post(`/memory/episodic/${userId}/reset`, { eventType });
        }, '生活事件重置失败'),
      async () => selfEvolutionMockStore.resetOnLifeEvent(userId, eventType)
    ),

  applySocialCorrection: (
    memoryId: string,
    companionId: string,
    correctionFactor: number
  ) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          await apiClient.post(`/memory/episodic/${memoryId}/social-correction`, {
            companionId,
            correctionFactor,
          });
        }, '社交修正失败'),
      async () => selfEvolutionMockStore.applySocialCorrection(memoryId, companionId, correctionFactor)
    ),

  reflect: (data: SemanticMemoryReflectionRequest) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<SemanticMemory[]>>(
            '/memory/semantic/reflect',
            data
          );
          return normalizeSemanticMemories(unwrap(response.data));
        }, '语义反思失败'),
      async () => selfEvolutionMockStore.reflect(data)
    ),

  retrieveSemanticMemories: (
    userId: string,
    params?: { topK?: number; minConfidence?: number; pattern?: string }
  ) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<SemanticMemory[]>>(
            `/memory/semantic/${userId}`,
            { params }
          );
          return normalizeSemanticMemories(unwrap(response.data));
        }, '检索语义记忆失败'),
      async () => selfEvolutionMockStore.retrieveSemanticMemories(userId, params)
    ),

  updateSemanticMemory: (memoryId: string, updates: Partial<SemanticMemory>) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<SemanticMemory>>(
            `/memory/semantic/${memoryId}`,
            updates
          );
          return normalizeSemanticMemory(unwrap(response.data));
        }, '更新语义记忆失败'),
      async () => selfEvolutionMockStore.updateSemanticMemory(memoryId, updates)
    ),

  mergeSemanticMemories: (memoryIds: string[]) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<SemanticMemory>>(
            '/memory/semantic/merge',
            { memoryIds }
          );
          return normalizeSemanticMemory(unwrap(response.data));
        }, '合并语义记忆失败'),
      async () => selfEvolutionMockStore.mergeSemanticMemories(memoryIds)
    ),

  scheduleReflection: (userId: string, episodicMemoryIds: string[]) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          await apiClient.post('/memory/semantic/schedule-reflection', {
            userId,
            episodicMemoryIds,
          });
        }, '调度反思失败'),
      async () => selfEvolutionMockStore.scheduleReflection(userId, episodicMemoryIds)
    ),
};
