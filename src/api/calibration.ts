/**
 * Round 3 · Match Square Calibration API
 * POST/GET /match-square/calibration/*
 */

import apiClient from './client';
import { withMatchSquareFallback } from '@/features/match-square/lib/match-square-api-mode';
import { selfEvolutionMockStore } from '@/features/self-evolution/lib/mock-store';
import {
  normalizeCalibrationCurve,
  normalizeCalibrationCurves,
  normalizeCalibrationRecord,
  normalizeCalibrationRecords,
  normalizeColdStartConfig,
  normalizeColdStartStatus,
} from '@/features/self-evolution/lib/normalize-self-evolution-response';
import {
  serializeCalibrationRecordBatch,
  serializeCalibrationRecordRequest,
  serializeColdStartConfig,
} from '@/features/self-evolution/lib/serialize-calibration-request';
import type {
  CalibrationCurve,
  CalibrationRecordRequest,
  ColdStartConfig,
  ColdStartStatus,
  CompanionCalibrationRecord,
  CompatibilityDimension,
} from '@/types/self-evolution';

const BASE_PATH = '/match-square/calibration';

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

export class CalibrationApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'CalibrationApiError';
  }
}

function toApiError(error: unknown, fallback: string): CalibrationApiError {
  const err = error as {
    response?: { data?: { error?: { code?: string; message?: string } } };
    message?: string;
  };
  const code = err.response?.data?.error?.code ?? 'REQUEST_ERROR';
  const message = err.response?.data?.error?.message ?? err.message ?? fallback;
  return new CalibrationApiError(code, message);
}

async function live<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toApiError(error, fallback);
  }
}

export const calibrationApi = {
  recordCalibration: (data: CalibrationRecordRequest) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<CompanionCalibrationRecord>>(
            BASE_PATH,
            serializeCalibrationRecordRequest(data)
          );
          return normalizeCalibrationRecord(unwrap(response.data));
        }, '记录校准数据失败'),
      async () => selfEvolutionMockStore.recordCalibration(data)
    ),

  recordCalibrationBatch: (requests: CalibrationRecordRequest[]) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<CompanionCalibrationRecord[]>>(
            `${BASE_PATH}/batch`,
            serializeCalibrationRecordBatch(requests)
          );
          return normalizeCalibrationRecords(unwrap(response.data));
        }, '批量记录校准数据失败'),
      async () => selfEvolutionMockStore.recordCalibrationBatch(requests)
    ),

  getCalibrationCurve: (dimension: CompatibilityDimension | string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<CalibrationCurve>>(
            `${BASE_PATH}/curve/${dimension}`
          );
          return normalizeCalibrationCurve(unwrap(response.data));
        }, '获取校准曲线失败'),
      async () => selfEvolutionMockStore.getCalibrationCurve(dimension)
    ),

  getAllCalibrationCurves: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<
            SuccessResponse<Record<string, CalibrationCurve> | CalibrationCurve[]>
          >(`${BASE_PATH}/curves`);
          return normalizeCalibrationCurves(unwrap(response.data));
        }, '获取校准曲线失败'),
      async () => selfEvolutionMockStore.getAllCalibrationCurves()
    ),

  applyCalibration: (dimension: CompatibilityDimension | string, prediction: number) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<number>>(
            `${BASE_PATH}/apply`,
            { dimension, prediction }
          );
          return unwrap(response.data);
        }, '应用校准失败'),
      async () => selfEvolutionMockStore.applyCalibration(dimension, prediction)
    ),

  getTripCalibrationRecords: (tripId: string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<CompanionCalibrationRecord[]>>(
            `${BASE_PATH}/trip/${tripId}`
          );
          return normalizeCalibrationRecords(unwrap(response.data));
        }, '获取旅行校准记录失败'),
      async () => selfEvolutionMockStore.getTripCalibrationRecords(tripId)
    ),

  getAllCalibrationRecords: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<CompanionCalibrationRecord[]>>(
            `${BASE_PATH}/records`
          );
          return normalizeCalibrationRecords(unwrap(response.data));
        }, '获取校准记录失败'),
      async () => selfEvolutionMockStore.getAllCalibrationRecords()
    ),

  getColdStartPhase: (userId: string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<ColdStartStatus>>(
            `${BASE_PATH}/cold-start/${userId}`
          );
          return normalizeColdStartStatus(unwrap(response.data));
        }, '获取冷启动阶段失败'),
      async () => selfEvolutionMockStore.getColdStartPhase(userId)
    ),

  updateUserTripCount: (userId: string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<{ userId: string; tripCount: number }>>(
            `${BASE_PATH}/trip-count/${userId}`
          );
          return unwrap(response.data);
        }, '更新旅行计数失败'),
      async () => selfEvolutionMockStore.updateUserTripCount(userId)
    ),

  resetCalibrationCurves: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          await apiClient.post(`${BASE_PATH}/reset`);
        }, '重置校准曲线失败'),
      async () => selfEvolutionMockStore.resetCalibrationCurves()
    ),

  updateColdStartConfig: (config: Partial<ColdStartConfig>) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<ColdStartConfig>>(
            `${BASE_PATH}/config`,
            serializeColdStartConfig(config)
          );
          return normalizeColdStartConfig(unwrap(response.data));
        }, '更新冷启动配置失败'),
      async () => selfEvolutionMockStore.updateColdStartConfig(config)
    ),

  getColdStartConfig: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<ColdStartConfig>>(
            `${BASE_PATH}/config`
          );
          return normalizeColdStartConfig(unwrap(response.data));
        }, '获取冷启动配置失败'),
      async () => selfEvolutionMockStore.getColdStartConfig()
    ),
};
