/** live 路线 key → RouteDirection 数字 ID（与 trails 详情 :id 一致） */
export const LIVE_ROUTE_DIRECTION_IDS: Record<string, number> = {
  IS_TREKKING_WILDERNESS: 106,
};

export function resolveLiveRouteDirectionId(
  key: string,
  fallback?: number | null
): number | undefined {
  if (LIVE_ROUTE_DIRECTION_IDS[key] != null) return LIVE_ROUTE_DIRECTION_IDS[key];
  if (fallback != null && Number.isFinite(fallback)) return fallback;
  return undefined;
}
