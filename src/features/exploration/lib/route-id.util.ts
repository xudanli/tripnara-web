import { resolveRouteLookupKey } from './route-map.util';
import type { RouteStrategyId } from '../types';

/** Consumer mock id → 后端 routeId */
const MOCK_TO_API_ROUTE_ID: Record<RouteStrategyId, string> = {
  'highland-south': 'route_remote-highlands-south',
  'south-depth': 'route_south-depth',
  'ring-compressed': 'route_ring-compressed',
};

const STRATEGY_TO_API_ROUTE_ID: Record<string, string> = {
  'remote-highlands-south': 'route_remote-highlands-south',
  'south-depth': 'route_south-depth',
  'ring-compressed': 'route_ring-compressed',
};

/** URL / 选路 API 应使用的 routeId（如 route_remote-highlands-south） */
export function toApiRouteId(routeIdOrStrategyId: string): string {
  const id = routeIdOrStrategyId.trim();
  if (!id) return id;
  if (id.startsWith('route_') || id.startsWith('route-')) return id;

  const lookup = resolveRouteLookupKey(id) as RouteStrategyId;
  return (
    MOCK_TO_API_ROUTE_ID[lookup as RouteStrategyId] ??
    STRATEGY_TO_API_ROUTE_ID[id] ??
    STRATEGY_TO_API_ROUTE_ID[lookup] ??
    id
  );
}

/** 地图 mock / 比较维度查找用短 id */
export function toMockRouteId(routeIdOrStrategyId: string): RouteStrategyId {
  return resolveRouteLookupKey(routeIdOrStrategyId) as RouteStrategyId;
}
