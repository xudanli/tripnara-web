/**
 * 顾问代客创建行程 API
 * POST /api/trips/advisor-create（需登录）
 */

import apiClient from './client';
import { tripsApi } from './trips';
import { isApiNotReadyError } from '@/lib/api-fallback-mode';
import {
  buildCreateAdvisorTripRequest,
  buildMockRoleInviteCodes,
} from '@/lib/advisor-trip-create.util';
import { normalizeCreateAdvisorTripResponse } from '@/lib/normalize-advisor-trip-create.util';
import type {
  AdvisorTripCreateFormState,
  CreateAdvisorTripRequest,
  CreateAdvisorTripResponse,
} from '@/types/advisor-trip-create';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new Error(err.error?.message ?? '请求失败');
  }
  return response.data.data;
}

async function createAdvisorTripFallback(
  body: CreateAdvisorTripRequest,
  formSnapshot?: AdvisorTripCreateFormState,
): Promise<CreateAdvisorTripResponse> {
  const memberInviteCodes = formSnapshot ? buildMockRoleInviteCodes(formSnapshot) : [];
  const trip = await tripsApi.create({
    destination: body.destination,
    startDate: body.startDate,
    endDate: body.endDate,
    totalBudget: body.totalBudget,
    name: body.name,
    travelers: Array.from({ length: 1 }, () => ({
      type: 'ADULT' as const,
      mobilityTag: 'IRON_LEGS' as const,
    })),
    metadata: {
      creationMode: 'ADVISOR',
      memberInviteCodes,
      ...body,
    },
  });

  return {
    tripId: trip.id,
    memberInviteCodes,
    message: trip.message,
  };
}

export const advisorTripCreateApi = {
  create: async (
    body: CreateAdvisorTripRequest,
    options?: { formSnapshot?: AdvisorTripCreateFormState },
  ): Promise<CreateAdvisorTripResponse> => {
    try {
      const response = await apiClient.post<ApiResponseWrapper<unknown>>(
        '/trips/advisor-create',
        body,
      );
      return normalizeCreateAdvisorTripResponse(handleResponse(response));
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        console.info('[AdvisorTripCreate] 后端接口未就绪，降级为 POST /trips + mock 角色邀请码');
        return createAdvisorTripFallback(body, options?.formSnapshot);
      }
      throw error;
    }
  },

  buildRequest: buildCreateAdvisorTripRequest,
};

export type { CreateAdvisorTripRequest, CreateAdvisorTripResponse };
