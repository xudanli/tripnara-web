import apiClient from './client';
import type {
  AutomationAuthorizationView,
  PatchAutomationAuthorizationBody,
  PatchAutomationAuthorizationResponse,
  PauseAutomationAuthorizationBody,
  PutUserAutomationAuthorizationTemplateBody,
  UndoAiCompletedWorkResponse,
  UserAutomationAuthorizationTemplate,
} from './automation-authorization.types';
import { normalizeAutomationAuthorizationView } from '@/lib/automation-authorization-normalize.util';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code?: string; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的 API 响应');
  }
  if (!response.data.success) {
    const err = response.data.error;
    const message = err?.message || err?.code || '请求失败';
    const error = new Error(message) as Error & {
      code?: string;
      details?: unknown;
      response?: { status?: number };
    };
    error.code = err?.code;
    error.details = err?.details;
    throw error;
  }
  if (response.data.data === undefined || response.data.data === null) {
    throw new Error('API 响应数据为空');
  }
  return response.data.data;
}

export function isAutomationAuthorizationUnavailable(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === 'NOT_FOUND' || code === 'ENDPOINT_NOT_FOUND') return true;
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
}

export function isConstraintsStaleError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === 'CONSTRAINTS_STALE') return true;
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 409;
}

/** GET /trips/:tripId/automation-authorization */
export async function getAutomationAuthorization(
  tripId: string,
): Promise<AutomationAuthorizationView> {
  const response = await apiClient.get<ApiResponseWrapper<unknown>>(
    `/trips/${tripId}/automation-authorization`,
  );
  return normalizeAutomationAuthorizationView(handleResponse(response));
}

/** PATCH /trips/:tripId/automation-authorization */
export async function patchAutomationAuthorization(
  tripId: string,
  body: PatchAutomationAuthorizationBody,
): Promise<PatchAutomationAuthorizationResponse> {
  const response = await apiClient.patch<ApiResponseWrapper<PatchAutomationAuthorizationResponse>>(
    `/trips/${tripId}/automation-authorization`,
    body,
  );
  return handleResponse(response);
}

/** POST /trips/:tripId/automation-authorization/pause */
export async function pauseAutomationAuthorization(
  tripId: string,
  body: PauseAutomationAuthorizationBody,
): Promise<PatchAutomationAuthorizationResponse> {
  const response = await apiClient.post<ApiResponseWrapper<PatchAutomationAuthorizationResponse>>(
    `/trips/${tripId}/automation-authorization/pause`,
    body,
  );
  return handleResponse(response);
}

/** POST /trips/:tripId/automation-authorization/reset-defaults */
export async function resetAutomationAuthorizationDefaults(
  tripId: string,
): Promise<PatchAutomationAuthorizationResponse> {
  const response = await apiClient.post<ApiResponseWrapper<PatchAutomationAuthorizationResponse>>(
    `/trips/${tripId}/automation-authorization/reset-defaults`,
    {},
  );
  return handleResponse(response);
}

/** POST /trips/:tripId/ai-completed-work/:logId/undo */
export async function undoAiCompletedWork(
  tripId: string,
  logId: string,
): Promise<UndoAiCompletedWorkResponse> {
  const response = await apiClient.post<ApiResponseWrapper<UndoAiCompletedWorkResponse>>(
    `/trips/${tripId}/ai-completed-work/${encodeURIComponent(logId)}/undo`,
    {},
  );
  return handleResponse(response);
}

/** GET /users/me/automation-authorization-template */
export async function getUserAutomationAuthorizationTemplate(): Promise<UserAutomationAuthorizationTemplate> {
  const response = await apiClient.get<ApiResponseWrapper<UserAutomationAuthorizationTemplate>>(
    '/users/me/automation-authorization-template',
  );
  return handleResponse(response);
}

/** PUT /users/me/automation-authorization-template */
export async function putUserAutomationAuthorizationTemplate(
  body: PutUserAutomationAuthorizationTemplateBody,
): Promise<UserAutomationAuthorizationTemplate> {
  const response = await apiClient.put<ApiResponseWrapper<UserAutomationAuthorizationTemplate>>(
    '/users/me/automation-authorization-template',
    body,
  );
  return handleResponse(response);
}

/** POST /users/me/automation-authorization-template/reset-defaults */
export async function resetUserAutomationAuthorizationTemplateDefaults(): Promise<UserAutomationAuthorizationTemplate> {
  const response = await apiClient.post<ApiResponseWrapper<UserAutomationAuthorizationTemplate>>(
    '/users/me/automation-authorization-template/reset-defaults',
    {},
  );
  return handleResponse(response);
}

export const automationAuthorizationApi = {
  get: getAutomationAuthorization,
  patch: patchAutomationAuthorization,
  pause: pauseAutomationAuthorization,
  resetDefaults: resetAutomationAuthorizationDefaults,
  undoWork: undoAiCompletedWork,
  getUserTemplate: getUserAutomationAuthorizationTemplate,
  putUserTemplate: putUserAutomationAuthorizationTemplate,
  resetUserTemplateDefaults: resetUserAutomationAuthorizationTemplateDefaults,
};
