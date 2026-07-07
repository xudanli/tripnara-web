import type { CompareRouteCard } from '../types';
import { pickRecommendedCompareRoute } from './recommend-route.util';

function findCompareRouteById(
  routes: CompareRouteCard[],
  routeId: string,
): CompareRouteCard | undefined {
  return routes.find((route) => route.id === routeId || route.apiRouteId === routeId);
}

export function resolveUserCompareFocusRouteId(
  routes: CompareRouteCard[],
  focusRouteId?: string | null,
): string | undefined {
  if (!focusRouteId) return undefined;
  return findCompareRouteById(routes, focusRouteId)?.id;
}

/** Compare 页高亮列：优先用户在路线方向页的选择，否则算法推荐 */
export function resolveCompareHighlightRouteId(
  routes: CompareRouteCard[],
  focusRouteId?: string | null,
): string | undefined {
  if (!routes.length) return undefined;
  if (focusRouteId) {
    const matched = findCompareRouteById(routes, focusRouteId);
    if (matched) return matched.id;
  }
  return pickRecommendedCompareRoute(routes)?.id;
}

export function isCompareRouteFocused(
  route: CompareRouteCard,
  focusRouteId?: string | null,
): boolean {
  if (!focusRouteId) return false;
  return route.id === focusRouteId || route.apiRouteId === focusRouteId;
}
