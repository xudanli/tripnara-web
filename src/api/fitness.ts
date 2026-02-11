/**
 * 体能评估 API
 * @module api/fitness
 * @see 接口文档: docs/FITNESS_API.md
 */

import apiClient from './client';
import type {
  QuestionnaireResponse,
  QuestionnaireSubmitData,
  QuestionnaireSubmitResult,
  FitnessProfile,
  FeedbackSubmitData,
  FeedbackSubmitResult,
  FeedbackStats,
  CalibrationResult,
} from '@/types/fitness';

const BASE_PATH = '/api/v1/fitness';

/**
 * 体能 API 错误类
 */
export class FitnessApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'FitnessApiError';
  }
}

/**
 * 体能评估 API
 */
export const fitnessApi = {
  /**
   * 获取体能评估问卷
   * GET /api/v1/fitness/questionnaire
   * 
   * @param locale - 语言，默认 'zh'
   * @returns 问卷数据
   */
  getQuestionnaire: async (locale: 'zh' | 'en' = 'zh'): Promise<QuestionnaireResponse> => {
    try {
      const response = await apiClient.get<QuestionnaireResponse>(
        `${BASE_PATH}/questionnaire`,
        { params: { locale } }
      );
      return response.data;
    } catch (error: any) {
      console.error('[FitnessAPI] 获取问卷失败:', error);
      throw new FitnessApiError(
        error.code || 'FETCH_ERROR',
        error.message || '获取问卷失败'
      );
    }
  },

  /**
   * 提交问卷答案
   * POST /api/v1/fitness/questionnaire/submit
   * 
   * @param data - 问卷答案数据
   * @returns 提交结果，包含生成的体能模型和画像
   */
  submitQuestionnaire: async (
    data: QuestionnaireSubmitData
  ): Promise<QuestionnaireSubmitResult> => {
    try {
      const response = await apiClient.post<QuestionnaireSubmitResult>(
        `${BASE_PATH}/questionnaire/submit`,
        data
      );
      return response.data;
    } catch (error: any) {
      console.error('[FitnessAPI] 提交问卷失败:', error);
      
      // 处理验证错误
      if (error.response?.status === 400) {
        throw new FitnessApiError(
          'VALIDATION_ERROR',
          error.response.data?.message || '问卷答案无效'
        );
      }
      
      throw new FitnessApiError(
        error.code || 'SUBMIT_ERROR',
        error.message || '提交问卷失败'
      );
    }
  },

  /**
   * 获取用户体能画像
   * GET /api/v1/fitness/profile/{userId}
   * 
   * @param userId - 用户 ID
   * @returns 体能画像数据
   * @throws 404 - 用户未完成体能评估
   */
  getProfile: async (userId: string): Promise<FitnessProfile> => {
    try {
      const response = await apiClient.get<FitnessProfile>(
        `${BASE_PATH}/profile/${userId}`
      );
      return response.data;
    } catch (error: any) {
      // 404 表示用户未完成评估，这是正常情况
      if (error.response?.status === 404) {
        throw new FitnessApiError(
          'NOT_FOUND',
          '用户尚未完成体能评估'
        );
      }
      
      console.error('[FitnessAPI] 获取体能画像失败:', error);
      throw new FitnessApiError(
        error.code || 'FETCH_ERROR',
        error.message || '获取体能画像失败'
      );
    }
  },

  /**
   * 提交行程后体能反馈
   * POST /api/v1/fitness/feedback
   * 
   * @param userId - 用户 ID
   * @param data - 反馈数据
   * @returns 提交结果
   */
  submitFeedback: async (
    userId: string, 
    data: FeedbackSubmitData
  ): Promise<FeedbackSubmitResult> => {
    try {
      const response = await apiClient.post<FeedbackSubmitResult>(
        `${BASE_PATH}/feedback`,
        data,
        { params: { userId } }
      );
      return response.data;
    } catch (error: any) {
      console.error('[FitnessAPI] 提交反馈失败:', error);
      
      // 处理验证错误
      if (error.response?.status === 400) {
        throw new FitnessApiError(
          'VALIDATION_ERROR',
          error.response.data?.message || '反馈数据无效'
        );
      }
      
      // 处理行程不存在
      if (error.response?.status === 404) {
        throw new FitnessApiError(
          'TRIP_NOT_FOUND',
          '行程不存在或无权访问'
        );
      }
      
      throw new FitnessApiError(
        error.code || 'SUBMIT_ERROR',
        error.message || '提交反馈失败'
      );
    }
  },

  /**
   * 获取用户反馈统计
   * GET /api/v1/fitness/feedback/stats/{userId}
   * 
   * @param userId - 用户 ID
   * @returns 反馈统计数据
   */
  getFeedbackStats: async (userId: string): Promise<FeedbackStats> => {
    try {
      const response = await apiClient.get<FeedbackStats>(
        `${BASE_PATH}/feedback/stats/${userId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('[FitnessAPI] 获取反馈统计失败:', error);
      throw new FitnessApiError(
        error.code || 'FETCH_ERROR',
        error.message || '获取反馈统计失败'
      );
    }
  },

  /**
   * 手动触发体能模型校准
   * POST /api/v1/fitness/calibrate
   * 
   * @param userId - 用户 ID
   * @returns 校准结果
   */
  calibrate: async (userId: string): Promise<CalibrationResult> => {
    try {
      const response = await apiClient.post<CalibrationResult>(
        `${BASE_PATH}/calibrate`,
        { userId }
      );
      return response.data;
    } catch (error: any) {
      console.error('[FitnessAPI] 校准失败:', error);
      throw new FitnessApiError(
        error.code || 'CALIBRATE_ERROR',
        error.message || '校准失败'
      );
    }
  },
};
