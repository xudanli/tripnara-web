import { useMemo } from 'react';
import { buildPreferenceProfileForRouteRun } from '@/lib/route-run-preference-profile';

/**
 * route_and_run 请求用的 preference_profile（敏感度）。
 * 人数与行程预算口径由后端根据 trip_id 解析；此处仅合并本地偏好（见 localStorage key）。
 *
 * @param _activeTripId 保留参数便于调用侧表达「已绑定行程」，无额外请求。
 */
export function useRouteRunPreferenceProfile(_activeTripId?: string | null | undefined) {
  return useMemo(() => buildPreferenceProfileForRouteRun(), []);
}
