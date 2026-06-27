/** execute 语义校验 errorCode → 用户可读文案 */
const PLANNING_WORKBENCH_USER_MESSAGES: Record<string, string> = {
  MISSING_PACE_FEEDBACK: '调整方案需要先选择节奏反馈（太赶 / 太累 / 想微调）。',
  MISSING_SKELETON_OPTIONS: '对比或提交需要至少 2 个骨架方案，请先生成或对比方案。',
  MISSING_SELECTED_OPTION: '提交前请先选择一个方案。',
  SELECTED_OPTION_NOT_FOUND: '所选方案已失效，请重新对比后再提交。',
  INTERNAL_ERROR: '规划服务暂时不可用，请稍后重试。',
};

const KNOWN_PLANNING_WORKBENCH_ERROR_CODES = new Set(
  Object.keys(PLANNING_WORKBENCH_USER_MESSAGES),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function readErrorCode(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function extractSemanticPlanningWorkbenchError(
  data: unknown,
): { errorCode?: string; serverMessage?: string } | null {
  if (!isRecord(data)) return null;

  const topLevelCode = readErrorCode(data.errorCode);
  if (topLevelCode) {
    return {
      errorCode: topLevelCode,
      serverMessage: readErrorCode(data.message),
    };
  }

  const nestedMessage = data.message;
  if (isRecord(nestedMessage)) {
    const nestedCode = readErrorCode(nestedMessage.errorCode);
    if (nestedCode) {
      return {
        errorCode: nestedCode,
        serverMessage: readErrorCode(nestedMessage.message),
      };
    }
  }

  if (typeof nestedMessage === 'string') {
    const trimmed = nestedMessage.trim();
    if (KNOWN_PLANNING_WORKBENCH_ERROR_CODES.has(trimmed)) {
      return { errorCode: trimmed };
    }
  }

  const wrappedError = data.error;
  if (isRecord(wrappedError)) {
    const wrappedCode =
      readErrorCode(wrappedError.errorCode) ?? readErrorCode(wrappedError.code);
    if (wrappedCode) {
      return {
        errorCode: wrappedCode,
        serverMessage: readErrorCode(wrappedError.message),
      };
    }
  }

  const legacyCode = readErrorCode(data.code);
  if (legacyCode && KNOWN_PLANNING_WORKBENCH_ERROR_CODES.has(legacyCode)) {
    return {
      errorCode: legacyCode,
      serverMessage: readErrorCode(data.message),
    };
  }

  return null;
}

export function mapPlanningWorkbenchUserMessage(
  code: string | undefined,
  serverMessage?: string,
): string {
  if (code && PLANNING_WORKBENCH_USER_MESSAGES[code]) {
    return PLANNING_WORKBENCH_USER_MESSAGES[code];
  }
  if (serverMessage && PLANNING_WORKBENCH_USER_MESSAGES[serverMessage]) {
    return PLANNING_WORKBENCH_USER_MESSAGES[serverMessage];
  }
  if (serverMessage?.trim()) return serverMessage.trim();
  if (code) return `请求失败（${code}）`;
  return '规划工作台请求失败，请稍后重试';
}

/** 400 语义错误：展示友好文案 + errorCode，避免与「服务不可用」混淆 */
export function formatPlanningWorkbenchErrorForDisplay(parsed: {
  code?: string;
  message: string;
  status?: number;
}): string {
  const { code, message, status } = parsed;
  if (status === 400 && code) {
    if (message.includes(code)) return message;
    return `${message}（${code}）`;
  }
  return message;
}

/** 从 axios / fetch 错误体解析 execute 语义错误 */
export function parsePlanningWorkbenchError(error: unknown): {
  code?: string;
  message: string;
  status?: number;
} {
  const err = error as {
    message?: string;
    code?: string;
    response?: { status?: number; data?: unknown };
  };
  const status = err.response?.status ?? (typeof (error as { status?: number }).status === 'number'
    ? (error as { status?: number }).status
    : undefined);
  const data = err.response?.data;

  const semanticFromBody = extractSemanticPlanningWorkbenchError(data);
  if (semanticFromBody?.errorCode || semanticFromBody?.serverMessage) {
    return {
      code: semanticFromBody.errorCode ?? err.code,
      message: mapPlanningWorkbenchUserMessage(
        semanticFromBody.errorCode,
        semanticFromBody.serverMessage,
      ),
      status,
    };
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const nestedMessage = record.message;

    if (Array.isArray(nestedMessage) && nestedMessage.length > 0) {
      return {
        message: nestedMessage.map(String).join('；'),
        status,
      };
    }

    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      const trimmed = nestedMessage.trim();
      if (KNOWN_PLANNING_WORKBENCH_ERROR_CODES.has(trimmed)) {
        return {
          code: trimmed,
          message: mapPlanningWorkbenchUserMessage(trimmed),
          status,
        };
      }
      return { message: trimmed, status };
    }
  }

  if (err.code && KNOWN_PLANNING_WORKBENCH_ERROR_CODES.has(err.code)) {
    return {
      code: err.code,
      message: mapPlanningWorkbenchUserMessage(err.code, err.message),
      status,
    };
  }

  if (err.message?.includes('timeout') || err.message?.includes('超时')) {
    return { message: '请求超时，规划处理时间较长，请稍后重试', status };
  }

  return {
    message: mapPlanningWorkbenchUserMessage(undefined, err.message),
    status,
  };
}

export function isPlanningWorkbenchAsyncUnavailable(error: unknown): boolean {
  const { status } = parsePlanningWorkbenchError(error);
  return status === 404 || status === 501;
}

export function planningWorkbenchErrorToUserMessage(error: unknown): string {
  const parsed = parsePlanningWorkbenchError(error);
  return formatPlanningWorkbenchErrorForDisplay(parsed);
}
