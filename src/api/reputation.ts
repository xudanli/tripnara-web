/**
 * Reputation OS API
 * @see Decision OS · Reputation OS 前端集成指南 v2.0.0 (P2)
 */

import apiClient from './client';
import { reputationMockStore } from '@/lib/api-mocks/reputation-mock-store';
import { withMatchSquareFallback } from '@/lib/api-fallback-mode';
import type {
  PendingSurveysResponse,
  ReputationSurveyQuestionsResponse,
  SubmitSurveyBody,
  UserReputationAssets,
  UserSafetyProfile,
} from '@/types/reputation';

const BASE_PATH = '/reputation-os';

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

export class ReputationApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ReputationApiError';
  }
}

function toApiError(error: unknown, fallback: string): ReputationApiError {
  const err = error as {
    response?: { data?: { error?: { code?: string; message?: string } } };
    message?: string;
  };
  const code = err.response?.data?.error?.code ?? 'REQUEST_ERROR';
  const message = err.response?.data?.error?.message ?? err.message ?? fallback;
  return new ReputationApiError(code, message);
}

async function live<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toApiError(error, fallback);
  }
}

export const reputationApi = {
  getPendingSurveys: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<PendingSurveysResponse>>(
            `${BASE_PATH}/pending-surveys`
          );
          return unwrap(response.data);
        }, '获取待互评列表失败'),
      () => reputationMockStore.getPendingSurveys()
    ),

  getSurveyQuestions: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<ReputationSurveyQuestionsResponse>>(
            `${BASE_PATH}/survey/questions`
          );
          return unwrap(response.data);
        }, '获取问卷题目失败'),
      () => reputationMockStore.getSurveyQuestions()
    ),

  submitSurvey: (payload: SubmitSurveyBody) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          await apiClient.post(`${BASE_PATH}/surveys/submit`, payload);
        }, '提交互评失败'),
      () => reputationMockStore.submitSurvey(payload)
    ),

  getProfileMe: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<UserReputationAssets>>(
            `${BASE_PATH}/profile/me`
          );
          return unwrap(response.data);
        }, '获取信誉资产失败'),
      () => reputationMockStore.getProfileMe()
    ),

  getUserProfile: (userId: string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<UserReputationAssets>>(
            `${BASE_PATH}/users/${userId}/profile`
          );
          return unwrap(response.data);
        }, '获取用户信誉失败'),
      () => reputationMockStore.getUserProfile(userId)
    ),

  getUserSafety: (userId: string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<UserSafetyProfile>>(
            `${BASE_PATH}/users/${userId}/safety`
          );
          return unwrap(response.data);
        }, '获取安全预警失败'),
      () => reputationMockStore.getUserSafety(userId)
    ),
};
