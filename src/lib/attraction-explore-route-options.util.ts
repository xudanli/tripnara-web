import type { AttractionExploreDetourMethod } from '@/types/attraction-explore';

/** 前端是否可向 BFF 请求实时路由绕路（与后端 ATTRACTION_EXPLORE_LIVE_ROUTES / ENABLE_GOOGLE_ROUTE_DETOUR 对齐） */
export function isLiveRoutesAvailable(): boolean {
  return (
    import.meta.env.VITE_ATTRACTION_EXPLORE_LIVE_ROUTES === '1' ||
    import.meta.env.VITE_ENABLE_GOOGLE_ROUTE_DETOUR === '1'
  );
}

export function liveRoutesQueryParam(useLiveRoutes?: boolean): Record<string, string> {
  return useLiveRoutes ? { useLiveRoutes: 'true' } : {};
}

export const DETOUR_METHOD_LABELS: Record<AttractionExploreDetourMethod, string> = {
  iceland_heuristic: '冰岛估算',
  generic_driving: '驾车估算',
  live_route_api: '实时路况',
};

export function formatDetourMethodLabel(method?: AttractionExploreDetourMethod): string | undefined {
  if (!method) return undefined;
  return DETOUR_METHOD_LABELS[method] ?? method;
}
