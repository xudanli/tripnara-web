/**
 * 体能分析 Phase 2 API
 * 趋势分析、异常检测、报告、可穿戴设备集成
 * 
 * @module api/fitness-analytics
 */

import apiClient from './client';
import type {
  FitnessTrend,
  AnomalyDetectionResult,
  FitnessReport,
  TimelineEvent,
  Experiment,
  ExperimentResult,
  ExperimentStatus,
  CalibrationStats,
  UserCalibrationResult,
  WearableConnection,
  WearableActivity,
  WearableEstimate,
  StravaAuthResponse,
  SyncRequestParams,
} from '@/types/fitness-analytics';

/** API 基础路径 */
const BASE_PATH = '/api/v1/fitness/analytics';

/** API 错误类 */
export class FitnessAnalyticsApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'FitnessAnalyticsApiError';
  }
}

/**
 * 处理 API 响应
 */
async function handleResponse<T>(response: Promise<{ data: T }>): Promise<T> {
  try {
    const result = await response;
    return result.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; data?: { message?: string; code?: string } } };
      const status = axiosError.response?.status;
      const message = axiosError.response?.data?.message || '请求失败';
      const code = axiosError.response?.data?.code;
      throw new FitnessAnalyticsApiError(message, status, code);
    }
    throw new FitnessAnalyticsApiError('网络请求失败');
  }
}

// ==================== 趋势分析 ====================

/**
 * 获取用户体能趋势
 * 
 * @param periodDays - 分析周期（天），默认90，范围7-365
 * @returns 趋势分析结果
 */
export async function getTrend(periodDays = 90): Promise<FitnessTrend> {
  return handleResponse(
    apiClient.get(`${BASE_PATH}/trend`, {
      params: { periodDays },
    })
  );
}

// ==================== 异常检测 ====================

/**
 * 检测体能异常
 * 
 * @returns 异常检测结果
 */
export async function getAnomalies(): Promise<AnomalyDetectionResult> {
  return handleResponse(
    apiClient.get(`${BASE_PATH}/anomalies`)
  );
}

// ==================== 体能报告 ====================

/**
 * 生成体能报告
 * 
 * @param periodDays - 报告周期（天），默认30，范围7-90
 * @returns 完整体能报告
 */
export async function getReport(periodDays = 30): Promise<FitnessReport> {
  return handleResponse(
    apiClient.get(`${BASE_PATH}/report`, {
      params: { periodDays },
    })
  );
}

// ==================== 时间线 ====================

/**
 * 获取体能时间线
 * 
 * @param limit - 返回数量，默认20，范围1-50
 * @returns 时间线事件列表
 */
export async function getTimeline(limit = 20): Promise<TimelineEvent[]> {
  return handleResponse(
    apiClient.get(`${BASE_PATH}/timeline`, {
      params: { limit },
    })
  );
}

// ==================== A/B 测试（内部接口） ====================

/**
 * 获取所有实验
 * 
 * @returns 实验配置列表
 */
export async function getExperiments(): Promise<Experiment[]> {
  return handleResponse(
    apiClient.get(`${BASE_PATH}/experiments`)
  );
}

/**
 * 获取实验结果
 * 
 * @param experimentId - 实验ID
 * @returns 实验结果
 */
export async function getExperimentResults(experimentId: string): Promise<ExperimentResult> {
  return handleResponse(
    apiClient.get(`${BASE_PATH}/experiments/${experimentId}/results`)
  );
}

/**
 * 更新实验状态
 * 
 * @param experimentId - 实验ID
 * @param status - 新状态
 */
export async function updateExperimentStatus(
  experimentId: string,
  status: ExperimentStatus
): Promise<void> {
  return handleResponse(
    apiClient.post(`${BASE_PATH}/experiments/${experimentId}/status`, null, {
      params: { status },
    })
  );
}

// ==================== 校准管理（内部接口） ====================

/**
 * 获取校准统计
 * 
 * @returns 校准统计数据
 */
export async function getCalibrationStats(): Promise<CalibrationStats> {
  return handleResponse(
    apiClient.get(`${BASE_PATH}/calibration/stats`)
  );
}

/**
 * 手动运行校准周期
 * 
 * @returns 所有用户的校准结果
 */
export async function runCalibrationCycle(): Promise<UserCalibrationResult[]> {
  return handleResponse(
    apiClient.post(`${BASE_PATH}/calibration/run`)
  );
}

/**
 * 校准单个用户
 * 
 * @param userId - 用户ID
 * @returns 校准结果
 */
export async function calibrateUser(userId: string): Promise<UserCalibrationResult> {
  return handleResponse(
    apiClient.post(`${BASE_PATH}/calibration/user/${userId}`)
  );
}

// ==================== 可穿戴设备集成 ====================

/**
 * 获取设备连接状态
 * 
 * @returns 设备连接列表
 */
export async function getWearableConnections(): Promise<WearableConnection[]> {
  return handleResponse(
    apiClient.get(`${BASE_PATH}/wearable/connections`)
  );
}

/**
 * 获取 Strava 授权链接
 * 
 * @returns 授权 URL
 */
export async function getStravaAuthUrl(): Promise<StravaAuthResponse> {
  return handleResponse(
    apiClient.get(`${BASE_PATH}/wearable/strava/auth`)
  );
}

/**
 * 断开 Strava 连接
 */
export async function disconnectStrava(): Promise<void> {
  return handleResponse(
    apiClient.delete(`${BASE_PATH}/wearable/strava/disconnect`)
  );
}

/**
 * 同步 Strava 数据
 * 
 * @param params - 同步参数
 * @returns 同步的活动列表
 */
export async function syncStravaData(params?: SyncRequestParams): Promise<WearableActivity[]> {
  return handleResponse(
    apiClient.post(`${BASE_PATH}/wearable/strava/sync`, params)
  );
}

/**
 * 基于可穿戴数据评估体能
 * 
 * @returns 体能评估结果
 */
export async function getWearableEstimate(): Promise<WearableEstimate> {
  return handleResponse(
    apiClient.get(`${BASE_PATH}/wearable/estimate`)
  );
}

// ==================== 导出统一 API 对象 ====================

export const fitnessAnalyticsApi = {
  // 趋势分析
  getTrend,
  
  // 异常检测
  getAnomalies,
  
  // 体能报告
  getReport,
  
  // 时间线
  getTimeline,
  
  // A/B 测试
  getExperiments,
  getExperimentResults,
  updateExperimentStatus,
  
  // 校准管理
  getCalibrationStats,
  runCalibrationCycle,
  calibrateUser,
  
  // 可穿戴设备
  getWearableConnections,
  getStravaAuthUrl,
  disconnectStrava,
  syncStravaData,
  getWearableEstimate,
};

export default fitnessAnalyticsApi;
