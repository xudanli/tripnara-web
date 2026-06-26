import type { AxiosError } from 'axios';

export function resolveQuickPlanErrorMessage(error: unknown): string {
  const axiosErr = error as AxiosError<{ error?: { message?: string; code?: string }; message?: string }>;
  const status = axiosErr.response?.status;
  const body = axiosErr.response?.data;

  if (status === 400) {
    return body?.error?.message || body?.message || '请求参数错误';
  }
  if (status === 404) {
    return '快速规划已过期，请重新生成';
  }
  if (status === 500) {
    return '服务器错误，请稍后重试';
  }
  if (axiosErr.message) {
    return axiosErr.message;
  }
  return '未知错误，请重试';
}
