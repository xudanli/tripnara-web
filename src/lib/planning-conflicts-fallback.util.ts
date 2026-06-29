/** planning-conflicts BFF 首包软超时：超时后走 /conflicts + /decision-checker fallback */
export const PLANNING_CONFLICTS_BFF_SOFT_TIMEOUT_MS = 20_000;

/** 与后端一致：pending 超过此时长的 taskId 视为过期，需重新 includeDecisionChecker=1 */
export const DEFERRED_TASK_STALE_MS = 90_000;

/** deferred 长期 pending 的兜底：仅在过期窗口之后并行 GET /decision-checker */
export const DEFERRED_DEDICATED_PARALLEL_MS = DEFERRED_TASK_STALE_MS + 5_000;

function isBffEndpointMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  if (code === 'NOT_FOUND' || code === 'ENDPOINT_NOT_FOUND') return true;
  const axiosStatus = (error as { response?: { status?: number } }).response?.status;
  return axiosStatus === 404 || axiosStatus === 501;
}

function isRequestTimeout(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  if (code === 'ECONNABORTED' || code === 'ERR_NETWORK' || code === 'ETIMEDOUT') return true;
  const message = error instanceof Error ? error.message : String(error);
  return /超时|timeout/i.test(message);
}

/** BFF 不可用 / 失败 / 超时时启用 legacy fallback */
export function shouldUsePlanningConflictsLegacyFallback(error: unknown): boolean {
  if (!error) return false;
  if (isBffEndpointMissing(error)) return true;
  if (isRequestTimeout(error)) return true;
  const axiosStatus = (error as { response?: { status?: number } }).response?.status;
  if (axiosStatus != null && axiosStatus >= 500) return true;
  return false;
}

export function isPlanningConflictsBffSlowLoading(
  isFetching: boolean,
  fetchStartedAtMs: number | null,
  nowMs = Date.now(),
): boolean {
  if (!isFetching || fetchStartedAtMs == null) return false;
  return nowMs - fetchStartedAtMs >= PLANNING_CONFLICTS_BFF_SOFT_TIMEOUT_MS;
}
