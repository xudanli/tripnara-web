import type { LngLat } from '@/lib/map-geo';
import type { RouteStrategyId } from '../types';

export interface IcelandRouteMapData {
  mainLine: LngLat[];
  /** F 路 / 高地路段（虚线） */
  fRoadLine?: LngLat[];
}

/** 冰岛探索路线示意坐标（演示 / mock） */
export const ICELAND_ROUTE_MAPS: Record<RouteStrategyId, IcelandRouteMapData> = {
  'south-depth': {
    mainLine: [
      [-21.9426, 64.1466],
      [-20.3, 64.25],
      [-19.7, 63.85],
      [-19.0083, 63.4186],
      [-17.2, 63.95],
      [-16.1781, 64.0477],
      [-15.2083, 64.2539],
      [-18.5, 64.0],
      [-21.9426, 64.1466],
    ],
  },
  'ring-compressed': {
    mainLine: [
      [-21.9426, 64.1466],
      [-19.0083, 63.4186],
      [-15.5, 64.1],
      [-14.4014, 65.2637],
      [-17.5, 65.4],
      [-18.1059, 65.6835],
      [-21.5, 64.8],
      [-21.9426, 64.1466],
    ],
  },
  'highland-south': {
    mainLine: [
      [-21.9426, 64.1466],
      [-19.0083, 63.4186],
      [-19.5, 63.75],
      [-19.0618, 63.9839],
      [-18.2, 64.15],
      [-16.5, 64.25],
      [-15.2083, 64.2539],
    ],
    fRoadLine: [
      [-19.0618, 63.9839],
      [-18.6, 64.35],
      [-17.8, 64.85],
      [-16.7283, 65.0467],
    ],
  },
};

export function getRouteMapData(routeId: string): IcelandRouteMapData | undefined {
  const aliases: Record<string, RouteStrategyId> = {
    'route_remote-highlands-south': 'highland-south',
    'route_south-depth': 'south-depth',
    'route_ring-compressed': 'ring-compressed',
  };
  const normalized = (aliases[routeId] ?? routeId) as RouteStrategyId;
  return ICELAND_ROUTE_MAPS[normalized];
}
