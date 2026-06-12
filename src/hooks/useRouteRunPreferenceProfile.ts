import { useMemo } from 'react';
import { buildPreferenceProfileForRouteRun } from '@/lib/route-run-preference-profile';
import { useUserPreferences } from '@/hooks/useUserPreferences';

/**
 * route_and_run 请求用的 preference_profile（敏感度 + L0 小众偏好等）。
 * 人数与行程预算口径由后端根据 trip_id 解析；此处合并 localStorage 与 GET /users/profile。
 *
 * @param _activeTripId 保留参数便于调用侧表达「已绑定行程」，无额外请求。
 */
export function useRouteRunPreferenceProfile(_activeTripId?: string | null | undefined) {
  const { preferences } = useUserPreferences(true);

  return useMemo(
    () => buildPreferenceProfileForRouteRun(preferences),
    [preferences]
  );
}
