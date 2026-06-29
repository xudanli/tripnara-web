import apiClient from './client';

export interface ApplySplitPlanRequest {
  constraintsVersion?: number;
  confirm?: boolean;
}

export interface ApplySplitPlanResponse {
  applied: boolean;
  scheduleVersion?: string;
  affectedDays?: number[];
}

export interface PatchSplitPlanRequest {
  constraintsVersion?: number;
  logistics?: {
    meetupPoint?: string;
    meetupTime?: string;
    emergencyContact?: string;
    transport?: string;
  };
  groups?: Array<{ id: string; label: string }>;
  daySplit?: {
    title?: string;
    stats?: { meetupTime?: string };
    rejoin?: { placeName?: string; startTime?: string };
  };
  emergencyNote?: string;
}

export interface PatchSplitPlanResponse {
  splitPlanId: string;
  constraintsVersion?: number;
  overrides?: Record<string, unknown>;
  splitPlan?: Record<string, unknown>;
  daySplit?: Record<string, unknown>;
}

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code: string; message: string };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data?.success) {
    const message = !response?.data?.success
      ? response.data.error?.message ?? '应用分流方案失败'
      : '无效的 API 响应';
    throw new Error(message);
  }
  return response.data.data;
}

function isSplitPlanWriteUnavailable(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
}

/** PATCH /trips/:tripId/split-plans/:splitPlanId — Inspector「编辑分流」 */
export async function patchSplitPlan(
  tripId: string,
  splitPlanId: string,
  body: PatchSplitPlanRequest,
): Promise<PatchSplitPlanResponse> {
  try {
    const response = await apiClient.patch<ApiResponseWrapper<PatchSplitPlanResponse>>(
      `/trips/${tripId}/split-plans/${splitPlanId}`,
      body,
    );
    return handleResponse(response);
  } catch (error) {
    if (isSplitPlanWriteUnavailable(error)) {
      throw new Error('分流方案编辑接口尚未就绪');
    }
    throw error;
  }
}

/** POST /trips/:tripId/split-plans/:splitPlanId/apply — 见 planning-workbench-split-plan-api.md §5 */
export async function applySplitPlan(
  tripId: string,
  splitPlanId: string,
  body: ApplySplitPlanRequest = { confirm: true },
): Promise<ApplySplitPlanResponse> {
  try {
    const response = await apiClient.post<ApiResponseWrapper<ApplySplitPlanResponse>>(
      `/trips/${tripId}/split-plans/${splitPlanId}/apply`,
      body,
    );
    return handleResponse(response);
  } catch (error) {
    if (isSplitPlanWriteUnavailable(error)) {
      throw new Error('分流方案应用接口尚未就绪');
    }
    throw error;
  }
}
