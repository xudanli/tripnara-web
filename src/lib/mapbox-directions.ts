import type { LngLat } from '@/lib/map-geo';
import { getMapboxAccessToken } from '@/lib/mapbox-token';

export type MapboxDirectionsProfile = 'driving' | 'driving-traffic';

interface MapboxDirectionsResponse {
  routes?: Array<{
    geometry?: {
      type?: string;
      coordinates?: LngLat[];
    };
  }>;
  code?: string;
  message?: string;
}

export interface MapboxDrivingRouteResult {
  line: LngLat[];
  /** 与请求 waypoints 顺序一致的吸附后坐标 */
  waypointLocations: LngLat[];
}

/** Mapbox Directions · 驾车路线贴路网（waypoints 按顺序途经，最多 25 点） */
export async function fetchMapboxDrivingRoute(
  waypoints: LngLat[],
  options: { profile?: MapboxDirectionsProfile; signal?: AbortSignal } = {},
): Promise<MapboxDrivingRouteResult | null> {
  const token = getMapboxAccessToken();
  if (!token || waypoints.length < 2) return null;

  const profile = options.profile ?? 'driving';
  const coords = waypoints
    .slice(0, 25)
    .map(([lng, lat]) => `${lng},${lat}`)
    .join(';');

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}`,
  );
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('access_token', token);

  try {
    const res = await fetch(url.toString(), { signal: options.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as MapboxDirectionsResponse & {
      waypoints?: Array<{ location?: LngLat }>;
    };
    const line = data.routes?.[0]?.geometry?.coordinates;
    if (!line || line.length < 2) return null;

    const waypointLocations =
      data.waypoints
        ?.map((w) => w.location)
        .filter((loc): loc is LngLat => Boolean(loc && loc.length >= 2)) ?? [];

    return { line, waypointLocations };
  } catch {
    return null;
  }
}

/** 是否仅为 day 锚点直连（未贴路网） */
export function isStraightDayAnchorLine(mainLine: LngLat[], dayWaypoints: LngLat[]): boolean {
  if (mainLine.length !== dayWaypoints.length || mainLine.length < 2) return false;
  return mainLine.every(
    (p, i) =>
      Math.abs(p[0] - dayWaypoints[i]![0]) < 1e-6 &&
      Math.abs(p[1] - dayWaypoints[i]![1]) < 1e-6,
  );
}

/** 已有折线是否含足够中间点（视为已手工/后端贴路） */
export function hasRichRouteGeometry(mainLine: LngLat[], dayCount: number): boolean {
  return mainLine.length > Math.max(dayCount + 1, 3);
}
