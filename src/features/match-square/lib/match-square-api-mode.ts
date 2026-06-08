/** Match Square API 联调模式 */
export type MatchSquareApiMode = 'mock' | 'live' | 'auto';

export function getMatchSquareApiMode(): MatchSquareApiMode {
  const flag = import.meta.env.VITE_MATCH_SQUARE_MOCK;
  if (flag === '1') return 'mock';
  if (flag === '0') return 'live';
  return import.meta.env.DEV ? 'auto' : 'live';
}

/** Vibe LLM parse 联调模式（默认跟随 Match Square；可单独 VITE_VIBE_LLM_MOCK 覆盖） */
export function getVibeLlmApiMode(): MatchSquareApiMode {
  const vibeFlag = import.meta.env.VITE_VIBE_LLM_MOCK;
  if (vibeFlag === '1') return 'mock';
  if (vibeFlag === '0') return 'live';
  return getMatchSquareApiMode();
}

export function isApiNotReadyError(error: unknown): boolean {
  const err = error as { response?: { status?: number }; code?: string };
  const status = err.response?.status;
  return status === 404 || status === 501 || status === 502 || status === 503;
}

/** 401 / 业务错误不应降级为规则 mock */
export function isVibeLlmFallbackError(error: unknown): boolean {
  if (!isApiNotReadyError(error)) return false;
  const err = error as { response?: { status?: number }; code?: string };
  if (err.response?.status === 401 || err.code === 'UNAUTHORIZED') return false;
  return true;
}

export async function withMatchSquareFallback<T>(
  live: () => Promise<T>,
  mock: () => Promise<T>
): Promise<T> {
  const mode = getMatchSquareApiMode();
  if (mode === 'mock') return mock();
  try {
    return await live();
  } catch (error) {
    if (mode === 'auto' && isApiNotReadyError(error)) {
      console.info('[Match Square] 后端接口未就绪，使用 mock 数据');
      return mock();
    }
    throw error;
  }
}

export function isMatchSquareMockActive(): boolean {
  return getMatchSquareApiMode() === 'mock';
}

export function isVibeLlmMockActive(): boolean {
  return getVibeLlmApiMode() === 'mock';
}

export async function withVibeLlmFallback<T>(
  live: () => Promise<T>,
  mock: () => Promise<T>
): Promise<T> {
  const mode = getVibeLlmApiMode();
  if (mode === 'mock') return mock();
  try {
    return await live();
  } catch (error) {
    if (mode === 'auto' && isVibeLlmFallbackError(error)) {
      console.info('[Vibe LLM] 后端 parse 未就绪，使用规则引擎预览');
      return mock();
    }
    throw error;
  }
}
