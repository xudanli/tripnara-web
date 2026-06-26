/**
 * Axios 拦截器增强后的可诊断错误（Agent / Decision 分层）
 */
import {
  isLlmMarkdownJsonParseError,
  mapLlmMarkdownJsonParseErrorUserMessage,
} from '@/lib/parse-json-from-llm';
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
  message?: unknown;
  messageCN?: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function isLocalizedErrorPayload(v: unknown): v is LocalizedErrorPayload {
  return isRecord(v) && ('message' in v || 'messageCN' in v || 'code' in v);
}

/** 将后端各类 message 形态归一为可展示字符串 */
function coerceErrorText(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map(coerceErrorText).filter(Boolean) as string[];
    return parts.length > 0 ? parts.join('；') : undefined;
  }
  if (isRecord(value)) {
    return (
      coerceErrorText(value.messageCN) ||
      coerceErrorText(value.message) ||
      coerceErrorText(value.msg) ||
      coerceErrorText(value.error)
    );
  }
  return undefined;
}

/** 从后端错误体或 Error.message 中提取可展示文案（优先中文） */
export function resolveLocalizedErrorMessage(
  payload: unknown,
  preferZh = true
): string | undefined {
  const direct = coerceErrorText(payload);
  if (direct && !isLocalizedErrorPayload(payload)) return direct;
  if (!isLocalizedErrorPayload(payload)) return direct;

  const zh = coerceErrorText(payload.messageCN);
  const en = coerceErrorText(payload.message);
  if (preferZh) return zh || en || direct;
  return en || zh || direct;
}

/** 从 Axios 响应体或 Error 中归一化用户可见错误文案 */
export function resolveHttpErrorUserMessage(
  source: unknown,
  fallback = '请求失败'
): string {
  if (source instanceof Error) {
    const fromMessage = resolveLocalizedErrorMessage(source.message);
    if (fromMessage) {
      if (isLlmMarkdownJsonParseError(fromMessage)) {
        return mapLlmMarkdownJsonParseErrorUserMessage();
      }
      return fromMessage;
    }
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
  if (fromDirect) {
    if (isLlmMarkdownJsonParseError(fromDirect)) {
      return mapLlmMarkdownJsonParseErrorUserMessage();
    }
    return fromDirect;
  }

  if (isRecord(source)) {
    const fromNestedMessage = resolveLocalizedErrorMessage(source.message);
    if (fromNestedMessage) return fromNestedMessage;
    const fromNestedError = resolveLocalizedErrorMessage(source.error);
    if (fromNestedError) return fromNestedError;
    if (typeof source.error === 'string' && source.error.trim()) return source.error.trim();
  }

  return fallback;
}
