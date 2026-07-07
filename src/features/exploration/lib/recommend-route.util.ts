import type { CompareRouteCard } from '../types';

/** 优先 badge.recommended，否则 matchScore 最高 */
export function pickRecommendedCompareRoute(
  routes: CompareRouteCard[],
): CompareRouteCard | undefined {
  if (!routes.length) return undefined;
  const flagged = routes.find((route) => route.badge?.tone === 'recommended');
  if (flagged) return flagged;
  return [...routes].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))[0];
}
