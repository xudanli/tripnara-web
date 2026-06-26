import apiClient from './client';
import type {
  InterventionAckAction,
  MemberStateVector,
  MicroFeedbackInput,
  MoodCheckInput,
  MotionSignalInput,
  PulseIntervention,
  TeamThermometerData,
} from '@/types/in-trip-pulse';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class InTripPulseApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InTripPulseApiError';
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback = '请求失败'): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new InTripPulseApiError(err.error?.code ?? 'REQUEST_ERROR', err.error?.message ?? fallback);
  }
  return response.data.data;
}

function pulsePath(tripId: string): string {
  return `/trips/${tripId}/in-trip/pulse`;
}

export const inTripPulseApi = {
  moodCheck: async (tripId: string, body: MoodCheckInput): Promise<MemberStateVector> => {
    const response = await apiClient.post<ApiResponseWrapper<MemberStateVector>>(
      `${pulsePath(tripId)}/mood-check`,
      body,
    );
    return handleResponse(response, '签到失败');
  },

  microFeedback: async (tripId: string, body: MicroFeedbackInput): Promise<MemberStateVector> => {
    const response = await apiClient.post<ApiResponseWrapper<MemberStateVector>>(
      `${pulsePath(tripId)}/micro-feedback`,
      body,
    );
    return handleResponse(response, '反馈提交失败');
  },

  syncMotion: async (tripId: string, body: MotionSignalInput): Promise<MemberStateVector> => {
    const response = await apiClient.post<ApiResponseWrapper<MemberStateVector>>(
      `${pulsePath(tripId)}/signals/motion`,
      body,
    );
    return handleResponse(response, '运动数据同步失败');
  },

  getMyState: async (tripId: string): Promise<MemberStateVector> => {
    const response = await apiClient.get<ApiResponseWrapper<MemberStateVector>>(
      `${pulsePath(tripId)}/my-state`,
    );
    return handleResponse(response, '获取我的状态失败');
  },

  getTeamThermometer: async (tripId: string): Promise<TeamThermometerData> => {
    const response = await apiClient.get<ApiResponseWrapper<TeamThermometerData>>(
      `${pulsePath(tripId)}/team-thermometer`,
    );
    return handleResponse(response, '获取团队温度计失败');
  },

  listInterventions: async (tripId: string): Promise<PulseIntervention[]> => {
    const response = await apiClient.get<ApiResponseWrapper<PulseIntervention[]>>(
      `${pulsePath(tripId)}/interventions`,
    );
    return handleResponse(response, '获取干预建议失败');
  },

  ackIntervention: async (
    tripId: string,
    interventionId: string,
    action: InterventionAckAction,
  ): Promise<PulseIntervention> => {
    const response = await apiClient.post<ApiResponseWrapper<PulseIntervention>>(
      `${pulsePath(tripId)}/interventions/${interventionId}/ack`,
      { action },
    );
    return handleResponse(response, '处理干预失败');
  },
};
