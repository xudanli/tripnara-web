/**
 * C 端徒步路线详情 — 只读接口返回的 `hikingDetail`。
 * 禁止读取 `metadata.hikingDetailOverride`（由后端在 GET 时 merge 进 hikingDetail）。
 *
 * @see docs/api/hiking-client-integration.md
 */

import { routeDirectionsApi } from '@/api/route-directions';
import type { RouteDirection } from '@/types/places-routes';
import type { HikingTrailDetail } from '@/types/hiking-trail-detail';
import { trailHasHikingTag } from '@/lib/hiking-trail-detail-ui';

export type LoadHikingRouteDetailOptions = {
  /**
   * 0–4；省略时不传 query，后端在带 JWT 时用 profile 默认 longestHike
   */
  longestHike?: number;
};

export async function loadHikingRouteDirection(
  routeDirectionId: number,
  options: LoadHikingRouteDetailOptions
): Promise<RouteDirection> {
  return routeDirectionsApi.getById(routeDirectionId, {
    longestHike: options.longestHike,
  });
}

export async function loadHikingRouteDetail(
  routeDirectionId: number,
  options: LoadHikingRouteDetailOptions
): Promise<HikingTrailDetail | null> {
  const route = await loadHikingRouteDirection(routeDirectionId, options);
  if (!trailHasHikingTag(route)) return null;
  return route.hikingDetail ?? null;
}

export {
  isHikingRiskSectionEmpty,
  isHikingLogisticsSectionEmpty,
  pickRiskMatrixRows,
  normalizeRiskMatrixRows,
  type HikingRiskMatrixRow,
} from '@/lib/hiking-trail-detail-ui';
