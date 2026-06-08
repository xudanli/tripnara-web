/** localStorage：可选写入 cost_sensitivity / effort_sensitivity / time_sensitivity（刻度以后端为准） */
const STORAGE_KEY = 'tripnara_route_preference_profile';

export type RouteRunPreferenceProfilePatch = Record<string, unknown>;

/**
 * 组装 route_and_run.preference_profile 中由前端持有的部分：**成本 / 省力 / 时间**等敏感度。
 * **团队人数、budgetConfig 等由后端根据 request.trip_id 关联行程读取**，此处不再重复下发。
 */
export function buildPreferenceProfileForRouteRun(): RouteRunPreferenceProfilePatch | undefined {
  const out: RouteRunPreferenceProfilePatch = {};

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const cs = parsed.cost_sensitivity;
        const es = parsed.effort_sensitivity;
        const ts = parsed.time_sensitivity;
        if (typeof cs === 'number') out.cost_sensitivity = cs;
        if (typeof es === 'number') out.effort_sensitivity = es;
        if (typeof ts === 'number') out.time_sensitivity = ts;
      }
    } catch {
      /* ignore */
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}
