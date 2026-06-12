/** localStorage：可选写入 cost_sensitivity / effort_sensitivity / time_sensitivity（刻度以后端为准） */
const STORAGE_KEY = 'tripnara_route_preference_profile';

export type RouteRunPreferenceProfilePatch = Record<string, unknown>;

const OFFBEAT_INTEREST_TAGS = new Set([
  'off_beaten',
  'offbeat',
  'off_beaten_path',
  'photography',
  '摄影',
]);

/**
 * L0 用户画像 → route_and_run.preference_profile 补丁。
 * 与后端 Hydrator / travel_preference_snapshot 对齐；显式下发可减少冷启动误判。
 */
export function buildUserPreferenceProfilePatch(
  preferences?: import('@/api/user').UserPreferences | null
): RouteRunPreferenceProfilePatch | undefined {
  if (!preferences) return undefined;

  const out: RouteRunPreferenceProfilePatch = {};
  if (preferences.preferOffbeatAttractions === true) {
    out.preferOffbeatAttractions = true;
  }

  const tags = preferences.tags ?? [];
  const hasPhotographyStyle =
    tags.some((t) => String(t).toLowerCase() === 'photography' || t === '摄影');
  if (hasPhotographyStyle) {
    out.travel_style_tags = Array.from(
      new Set([...(Array.isArray(out.travel_style_tags) ? (out.travel_style_tags as string[]) : []), 'photography'])
    );
  }

  const interests = preferences.preferredAttractionTypes ?? [];
  if (interests.some((t) => OFFBEAT_INTEREST_TAGS.has(String(t)))) {
    out.preferOffbeatAttractions = true;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * 组装 route_and_run.preference_profile 中由前端持有的部分：**成本 / 省力 / 时间**等敏感度。
 * **团队人数、budgetConfig 等由后端根据 request.trip_id 关联行程读取**，此处不再重复下发。
 */
export function buildPreferenceProfileForRouteRun(
  userPreferences?: import('@/api/user').UserPreferences | null
): RouteRunPreferenceProfilePatch | undefined {
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

  const userPatch = buildUserPreferenceProfilePatch(userPreferences);
  if (userPatch) {
    Object.assign(out, userPatch);
    if (userPatch.travel_style_tags && out.travel_style_tags) {
      out.travel_style_tags = userPatch.travel_style_tags;
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}
