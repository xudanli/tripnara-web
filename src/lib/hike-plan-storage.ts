/**
 * HikePlan / GPS 存储模式：API（需登录）或本地 IndexedDB
 *
 * - 环境变量 `VITE_HIKE_PLAN_STORAGE=api|local|auto`（默认 auto）
 * - 用户偏好 `localStorage.tripnara_hike_plan_storage` = api | local
 * - auto：已登录 → api，未登录 → local
 */

export type HikePlanStorageMode = 'api' | 'local';

const PREF_KEY = 'tripnara_hike_plan_storage';

export function isUserAuthenticated(): boolean {
  try {
    return Boolean(
      sessionStorage.getItem('accessToken') && localStorage.getItem('user')
    );
  } catch {
    return false;
  }
}

export function getHikePlanStoragePreference(): HikePlanStorageMode | null {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v === 'api' || v === 'local') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function setHikePlanStoragePreference(mode: HikePlanStorageMode | null): void {
  try {
    if (mode) localStorage.setItem(PREF_KEY, mode);
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* ignore */
  }
}

export function resolveHikePlanStorageMode(
  isAuthenticated = isUserAuthenticated()
): HikePlanStorageMode {
  const pref = getHikePlanStoragePreference();
  if (pref) return pref;

  const env = import.meta.env.VITE_HIKE_PLAN_STORAGE as string | undefined;
  if (env === 'api' || env === 'local') return env;

  return isAuthenticated ? 'api' : 'local';
}

export class HikePlanAuthRequiredError extends Error {
  constructor(message = '请先登录后再使用云端徒步计划') {
    super(message);
    this.name = 'HikePlanAuthRequiredError';
  }
}

export function isHikePlanAuthError(err: unknown): boolean {
  if (err instanceof HikePlanAuthRequiredError) return true;
  if (err && typeof err === 'object' && 'response' in err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    return status === 401 || status === 403;
  }
  return false;
}
