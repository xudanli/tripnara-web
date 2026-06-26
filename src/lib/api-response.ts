/** 统一 API 响应解包 · { success, data } | { success, error } */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function unwrapApiData<T>(payload: ApiResponse<T> | T): T {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const wrapped = payload as ApiResponse<T>;
    if (wrapped.success === false) {
      throw new Error(wrapped.error?.message ?? wrapped.error?.code ?? '请求失败');
    }
    return wrapped.data;
  }
  return payload as T;
}

export function isApiNotFoundError(error: unknown): boolean {
  const err = error as { response?: { status?: number } };
  return err.response?.status === 404;
}
