/**
 * Odyssey Intake API
 * @module api/odyssey-intake
 * @see Decision OS 前端集成指南 v1.0.0 · Swagger 标签 odyssey-intake
 */

import apiClient from './client';
import { normalizeProfileCardView } from '@/features/odyssey-intake/lib/normalize-profile-card';
import { reconcilePremiumProfileCardView, reconcilePremiumSubmitResult } from '@/features/odyssey-intake/lib/reconcile-premium-card';
import { normalizeOdysseyCredentialsMe } from '@/features/odyssey-intake/lib/normalize-credentials';
import { odysseyCredentialsMockStore } from '@/features/odyssey-intake/lib/credentials-mock-store';
import { isApiNotReadyError } from '@/lib/api-fallback-mode';
import { odysseyIntakeMockStore } from '@/features/odyssey-intake/lib/intake-mock-store';
import { premiumStressQuestionsToApiResponse, extractPremiumStressQuestionsPayload } from '@/features/odyssey-intake/lib/normalize-premium-stress-questions';
import { normalizeMatchResult } from '@/features/odyssey-intake/lib/normalize-companion-match';
import type { VerifiedCredentials } from '@/types/match-square';
import type {
  OdysseyAckRefreshResult,
  OdysseyCredentialsMe,
  OdysseyMatchResult,
  OdysseyOnboardingStatus,
  OdysseyPeerFeedbackRequest,
  OdysseyProfileCardView,
  OdysseyQuestionsResponse,
  OdysseySubmitAndMatchResult,
  PremiumStressQuestionsResponse,
  OdysseySubmitRequest,
  OdysseySubmitResult,
  OdysseyTripIntentRequest,
  OdysseyTripMetaRequest,
  OdysseyTripMetaResult,
  OdysseyTrustVerifyRequest,
  OdysseyTrustVerifyResult,
  OdysseyVerifyEducationRequest,
  OdysseySendWorkEmailCodeResponse,
  OdysseyVerifyWorkEmailRequest,
  OdysseyBadgeUploadResponse,
  OdysseyVerifyBadgeRequest,
  OdysseyVerifyOAuthRequest,
} from '@/types/odyssey-intake';

const BASE_PATH = '/odyssey-intake';

export class OdysseyIntakeApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'OdysseyIntakeApiError';
  }
}

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

function assertOnboardingStatus(raw: unknown): OdysseyOnboardingStatus {
  const data = unwrap<unknown>(raw);
  if (!data || typeof data !== 'object') {
    throw new OdysseyIntakeApiError('INVALID_RESPONSE', 'onboarding/status 响应格式无效');
  }
  const record = data as Record<string, unknown>;
  if (typeof record.quizComplete !== 'boolean') {
    throw new OdysseyIntakeApiError(
      'INVALID_RESPONSE',
      'onboarding/status 缺少 quizComplete（可能命中了错误接口）'
    );
  }
  return data as OdysseyOnboardingStatus;
}

function assertQuestionsResponse(raw: unknown): OdysseyQuestionsResponse {
  const data = unwrap<unknown>(raw);
  if (!data || typeof data !== 'object') {
    throw new OdysseyIntakeApiError('INVALID_RESPONSE', 'questions 响应格式无效');
  }
  const questions = (data as OdysseyQuestionsResponse).questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new OdysseyIntakeApiError('INVALID_RESPONSE', 'questions 列表为空');
  }
  return data as OdysseyQuestionsResponse;
}

function toApiError(error: unknown, fallback: string): OdysseyIntakeApiError {
  const err = error as {
    response?: { data?: { error?: { code?: string; message?: string } } };
    code?: string;
    message?: string;
  };
  const code = err.response?.data?.error?.code ?? err.code ?? 'REQUEST_ERROR';
  const message = err.response?.data?.error?.message ?? err.message ?? fallback;
  return new OdysseyIntakeApiError(code, message);
}

function resolveSubmitPath(payload: OdysseySubmitRequest): string {
  return payload.intakeVersion === 'premium_v2'
    ? `${BASE_PATH}/premium-stress-test/submit`
    : `${BASE_PATH}/submit`;
}

export const odysseyIntakeApi = {
  getOnboardingStatus: async (): Promise<OdysseyOnboardingStatus> => {
    try {
      const response = await apiClient.get<SuccessResponse<OdysseyOnboardingStatus>>(
        `${BASE_PATH}/onboarding/status`
      );
      return assertOnboardingStatus(response.data);
    } catch (error) {
      throw toApiError(error, '获取入网状态失败');
    }
  },

  getQuestions: async (): Promise<OdysseyQuestionsResponse> => {
    try {
      const response = await apiClient.get<SuccessResponse<OdysseyQuestionsResponse>>(
        `${BASE_PATH}/questions`
      );
      return assertQuestionsResponse(response.data);
    } catch (error) {
      throw toApiError(error, '获取测评题目失败');
    }
  },

  /** Premium v2 · GET /premium-stress-test/questions */
  getPremiumStressTestQuestions: async (): Promise<PremiumStressQuestionsResponse> => {
    try {
      const response = await apiClient.get<SuccessResponse<PremiumStressQuestionsResponse | unknown>>(
        `${BASE_PATH}/premium-stress-test/questions`
      );
      const questions = extractPremiumStressQuestionsPayload(unwrap(response.data));
      if (!questions.length) {
        throw new OdysseyIntakeApiError('INVALID_RESPONSE', 'premium-stress-test/questions 列表为空');
      }
      return { questions };
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        console.info('[Odyssey] premium-stress-test/questions 未就绪，使用本地 fallback');
        return premiumStressQuestionsToApiResponse();
      }
      throw toApiError(error, '获取 Premium 抗压题失败');
    }
  },

  submit: async (payload: OdysseySubmitRequest): Promise<OdysseySubmitResult> => {
    try {
      const response = await apiClient.post<SuccessResponse<OdysseySubmitResult>>(
        resolveSubmitPath(payload),
        payload
      );
      return reconcilePremiumSubmitResult(payload, unwrap(response.data));
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        console.info('[Odyssey] submit 未就绪，使用 premium mock');
        return odysseyIntakeMockStore.submit(payload);
      }
      throw toApiError(error, '提交测评失败');
    }
  },

  verifyTrust: async (payload: OdysseyTrustVerifyRequest): Promise<OdysseyTrustVerifyResult> => {
    try {
      const response = await apiClient.post<SuccessResponse<OdysseyTrustVerifyResult>>(
        `${BASE_PATH}/trust/verify`,
        payload
      );
      return unwrap(response.data);
    } catch (error) {
      throw toApiError(error, '安全授权失败');
    }
  },

  updateTripMeta: async (payload: OdysseyTripMetaRequest): Promise<OdysseyTripMetaResult> => {
    try {
      const response = await apiClient.patch<SuccessResponse<OdysseyTripMetaResult>>(
        `${BASE_PATH}/trip-meta`,
        payload
      );
      return unwrap(response.data);
    } catch (error) {
      throw toApiError(error, '更新行程信息失败');
    }
  },

  updateTripIntent: async (payload: OdysseyTripIntentRequest): Promise<OdysseyProfileCardView> => {
    try {
      const response = await apiClient.patch<SuccessResponse<OdysseyProfileCardView>>(
        `${BASE_PATH}/trip-intent`,
        payload
      );
      return normalizeProfileCardView(unwrap(response.data));
    } catch (error) {
      throw toApiError(error, '更新出行状态失败');
    }
  },

  match: async (): Promise<OdysseyMatchResult> => {
    try {
      const response = await apiClient.post<SuccessResponse<OdysseyMatchResult | unknown>>(
        `${BASE_PATH}/match`
      );
      return normalizeMatchResult(unwrap(response.data));
    } catch (error) {
      throw toApiError(error, '获取旅伴推荐失败');
    }
  },

  submitAndMatch: async (payload: OdysseySubmitRequest): Promise<OdysseySubmitAndMatchResult> => {
    if (payload.intakeVersion === 'premium_v2') {
      const submitted = await odysseyIntakeApi.submit(payload);
      const matchResult = await odysseyIntakeApi.match();
      return {
        mbtiType: submitted.mbtiType,
        card: submitted.card,
        matches: matchResult.matches,
        onboarding: submitted.onboarding,
      };
    }

    try {
      const response = await apiClient.post<SuccessResponse<OdysseySubmitAndMatchResult>>(
        `${BASE_PATH}/submit-and-match`,
        payload
      );
      return unwrap(response.data);
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        console.info('[Odyssey] submit-and-match 未就绪，使用 premium mock');
        return odysseyIntakeMockStore.submitAndMatch(payload);
      }
      throw toApiError(error, '提交并匹配失败');
    }
  },

  getProfileCard: async (): Promise<OdysseyProfileCardView> => {
    try {
      const response = await apiClient.get<SuccessResponse<OdysseyProfileCardView>>(
        `${BASE_PATH}/profile/card`
      );
      return reconcilePremiumProfileCardView(normalizeProfileCardView(unwrap(response.data)));
    } catch (error) {
      throw toApiError(error, '获取旅行人格卡片失败');
    }
  },

  submitPeerFeedback: async (payload: OdysseyPeerFeedbackRequest): Promise<void> => {
    try {
      await apiClient.post(`${BASE_PATH}/peer-feedback`, payload);
    } catch (error) {
      throw toApiError(error, '提交互评失败');
    }
  },

  ackProfileRefresh: async (): Promise<OdysseyAckRefreshResult> => {
    try {
      const response = await apiClient.post<SuccessResponse<OdysseyAckRefreshResult>>(
        `${BASE_PATH}/profile/ack-refresh`
      );
      return unwrap(response.data);
    } catch (error) {
      throw toApiError(error, '确认画像更新失败');
    }
  },

  /** Identity Hub · 当前用户背书资产（学历/职业/芝麻） */
  getMyCredentials: async (): Promise<VerifiedCredentials | null> => {
    try {
      const response = await apiClient.get<SuccessResponse<OdysseyCredentialsMe | unknown>>(
        `${BASE_PATH}/credentials/me`
      );
      return normalizeOdysseyCredentialsMe(unwrap(response.data));
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        console.info('[Odyssey] credentials/me 未就绪，使用 mock');
        return odysseyCredentialsMockStore.get();
      }
      throw toApiError(error, '获取身份背书失败');
    }
  },

  verifyEducation: async (payload: OdysseyVerifyEducationRequest): Promise<VerifiedCredentials | null> => {
    const verificationCode =
      payload.verificationCode ?? payload.chsiVerificationCode ?? '';
    try {
      const response = await apiClient.post<SuccessResponse<OdysseyCredentialsMe | unknown>>(
        `${BASE_PATH}/credentials/education/verify`,
        { verificationCode }
      );
      return normalizeOdysseyCredentialsMe(unwrap(response.data));
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        return odysseyCredentialsMockStore.verifyEducation(payload);
      }
      throw toApiError(error, '学历认证失败');
    }
  },

  /** PRD 3.1.3 · 企业邮箱 OTP — send-code */
  sendWorkEmailCode: async (workEmail: string): Promise<OdysseySendWorkEmailCodeResponse> => {
    try {
      const response = await apiClient.post<SuccessResponse<OdysseySendWorkEmailCodeResponse>>(
        `${BASE_PATH}/credentials/profession/email/send-code`,
        { workEmail }
      );
      return unwrap(response.data);
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        const devCode = String(Math.floor(100000 + Math.random() * 900000));
        return { sent: true, devCode };
      }
      throw toApiError(error, '验证码发送失败');
    }
  },

  /** PRD 3.1.3 · 企业邮箱 OTP — verify */
  verifyWorkEmail: async (payload: OdysseyVerifyWorkEmailRequest): Promise<VerifiedCredentials | null> => {
    try {
      const response = await apiClient.post<SuccessResponse<OdysseyCredentialsMe | unknown>>(
        `${BASE_PATH}/credentials/profession/email/verify`,
        payload
      );
      return normalizeOdysseyCredentialsMe(unwrap(response.data));
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        return odysseyCredentialsMockStore.verifyProfession({
          channel: 'work_email',
          workEmail: payload.workEmail,
          emailOtp: payload.code,
        });
      }
      throw toApiError(error, '职业邮箱验证失败');
    }
  },

  /** PRD 3.1.3 · 工牌 upload → imageToken */
  uploadProfessionBadge: async (file: File): Promise<OdysseyBadgeUploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await apiClient.post<SuccessResponse<OdysseyBadgeUploadResponse>>(
        `${BASE_PATH}/credentials/profession/badge/upload`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return unwrap(response.data);
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        return odysseyCredentialsMockStore.uploadBadge(file);
      }
      throw toApiError(error, '工牌上传失败');
    }
  },

  /** PRD 3.1.3 · 工牌 OCR verify（原图销毁由后端负责） */
  verifyProfessionBadge: async (payload: OdysseyVerifyBadgeRequest): Promise<VerifiedCredentials | null> => {
    try {
      const response = await apiClient.post<SuccessResponse<OdysseyCredentialsMe | unknown>>(
        `${BASE_PATH}/credentials/profession/badge/verify`,
        payload
      );
      return normalizeOdysseyCredentialsMe(unwrap(response.data));
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        return odysseyCredentialsMockStore.verifyBadge(payload.imageToken);
      }
      throw toApiError(error, '工牌认证失败');
    }
  },

  /** PRD 3.1.3 · 脉脉 / LinkedIn OAuth exchange */
  verifyProfessionOAuth: async (payload: OdysseyVerifyOAuthRequest): Promise<VerifiedCredentials | null> => {
    try {
      const response = await apiClient.post<SuccessResponse<OdysseyCredentialsMe | unknown>>(
        `${BASE_PATH}/credentials/profession/oauth/verify`,
        payload
      );
      return normalizeOdysseyCredentialsMe(unwrap(response.data));
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        return odysseyCredentialsMockStore.verifyOAuth(payload.provider, payload.authToken);
      }
      throw toApiError(error, '职场平台授权失败');
    }
  },
};
