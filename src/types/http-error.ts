/**
 * Axios 拦截器增强后的可诊断错误（Agent / Decision 分层）
 */
export interface TripnaraHttpError extends Error {
  /** 业务错误码（通用或网关） */
  code?: string;
  /** 与请求头 X-Request-Id 对齐，便于排障 */
  requestId?: string;
  /** /decision-engine/ 路径下 success:false 时的后端错误码 */
  decisionEngineCode?: string;
  /** Axios 错误携带的响应（与现有拦截器行为一致） */
  response?: { status?: number; data?: unknown };
  config?: unknown;
}

export function isTripnaraHttpError(e: unknown): e is TripnaraHttpError {
  return e instanceof Error && ('requestId' in e || 'decisionEngineCode' in e || 'code' in e);
}

export type LocalizedErrorPayload = {
  code?: string | number;
  message?: string;
  messageCN?: string;
};

function isLocalizedErrorPayload(v: unknown): v is LocalizedErrorPayload {
  return (
    v != null &&
    typeof v === 'object' &&
    ('message' in v || 'messageCN' in v || 'code' in v)
  );
}

/** 从后端错误体或 Error.message 中提取可展示文案（优先中文） */
export function resolveLocalizedErrorMessage(
  payload: unknown,
  preferZh = true
): string | undefined {
  if (typeof payload === 'string' && payload.trim()) return payload.trim();
  if (!isLocalizedErrorPayload(payload)) return undefined;
  const zh = payload.messageCN?.trim();
  const en = payload.message?.trim();
  if (preferZh) return zh || en;
  return en || zh;
}

/** 从 Axios 响应体或 Error 中归一化用户可见错误文案 */
export function resolveHttpErrorUserMessage(
  source: unknown,
  fallback = '请求失败'
): string {
  if (source instanceof Error) {
    const fromMessage = resolveLocalizedErrorMessage(source.message);
    if (fromMessage) return fromMessage;
    if (typeof source.message === 'string' && source.message.trim()) {
      return source.message.trim();
    }
    const tripnara = source as TripnaraHttpError;
    const fromResponse = resolveHttpErrorUserMessage(tripnara.response?.data, '');
    if (fromResponse) return fromResponse;
    return fallback;
  }

  if (source == null) return fallback;

  const fromDirect = resolveLocalizedErrorMessage(source);
  if (fromDirect) return fromDirect;

  if (typeof source === 'object') {
    const data = source as Record<string, unknown>;
    const fromNestedMessage = resolveLocalizedErrorMessage(data.message);
    if (fromNestedMessage) return fromNestedMessage;
    const fromNestedError = resolveLocalizedErrorMessage(data.error);
    if (fromNestedError) return fromNestedError;
    if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
  }

  return fallback;
}
