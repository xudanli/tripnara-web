import type { AxiosError } from 'axios';
import { resolveHttpErrorUserMessage, type TripnaraHttpError } from '@/types/http-error';

export const MEMORY_CONSOLE_ERROR_CODES = {
  L2_NOT_FOUND: '6003',
  ANONYMOUS_USER: '6005',
  CONSOLE_DISABLED: '6009',
} as const;

function readErrorCode(err: unknown): string | undefined {
  const axiosErr = err as AxiosError<{
    code?: string | number;
    error?: { code?: string | number };
    message?: { code?: string | number };
  }>;
  const data = axiosErr.response?.data;
  if (data && typeof data === 'object') {
    const top = (data as { code?: string | number }).code;
    if (top != null) return String(top);
    const nested = (data as { error?: { code?: string | number } }).error?.code;
    if (nested != null) return String(nested);
    const messageObj = (data as { message?: { code?: string | number } }).message;
    if (messageObj && typeof messageObj === 'object' && messageObj.code != null) {
      return String(messageObj.code);
    }
  }

  if (err instanceof Error && err.message && typeof err.message === 'object') {
    const code = (err.message as { code?: string | number }).code;
    if (code != null) return String(code);
  }

  const tripnara = err as TripnaraHttpError;
  if (tripnara.code) return String(tripnara.code);
  return undefined;
}

export type MemoryConsoleErrorUiAction = 'toast' | 'login' | 'hide_console';

export function resolveMemoryConsoleErrorUi(err: unknown): {
  message: string;
  action?: MemoryConsoleErrorUiAction;
} {
  const code = readErrorCode(err);
  switch (code) {
    case MEMORY_CONSOLE_ERROR_CODES.L2_NOT_FOUND:
      return { message: '记录已不存在' };
    case MEMORY_CONSOLE_ERROR_CODES.ANONYMOUS_USER:
      return { message: '请先登录后再管理旅行记忆', action: 'login' };
    case MEMORY_CONSOLE_ERROR_CODES.CONSOLE_DISABLED:
      return { message: '旅行记忆功能未开启', action: 'hide_console' };
    default:
      return {
        message: resolveHttpErrorUserMessage(err, '操作失败，请稍后重试'),
      };
  }
}
