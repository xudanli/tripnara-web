import type { LngLat } from '@/lib/map-geo';

export interface NormalizedMapPoint {
  lng: number;
  lat: number;
}

type RawMapPoint =
  | {
      lng?: number;
      lat?: number;
      lon?: number;
      latitude?: number;
      longitude?: number;
      coordinates?: [number, number] | number[];
    }
  | [number, number]
  | null
  | undefined;

/** 纠正 lat/lng 颠倒、别名键名等常见坐标错误 */
export function normalizeRouteMapPoint(raw: RawMapPoint): NormalizedMapPoint | undefined {
  if (!raw) return undefined;

  let lng: number | undefined;
  let lat: number | undefined;

  if (Array.isArray(raw)) {
    [lng, lat] = raw;
  } else if (Array.isArray(raw.coordinates) && raw.coordinates.length >= 2) {
    [lng, lat] = raw.coordinates as [number, number];
  } else {
    lng = raw.lng ?? raw.lon ?? raw.longitude;
    lat = raw.lat ?? raw.latitude;
  }

  if (lng == null || lat == null || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    return undefined;
  }

  const looksLikeLatLngSwap =
    Math.abs(lng) >= 50 && Math.abs(lng) <= 70 && Math.abs(lat) <= 30 && lat < 0;

  if (looksLikeLatLngSwap) {
    [lng, lat] = [lat, lng];
  }

  // 冰岛：纬度误写为负（如 lat: -63.4）
  if (lat < 0 && lng >= -25 && lng <= -13 && Math.abs(lat) >= 63 && Math.abs(lat) <= 67) {
    lat = Math.abs(lat);
  }

  // 冰岛：经度字段误存为正纬度（如 lng: 64.15, lat: -19）
  if (lng > 0 && lng >= 63 && lng <= 67 && lat < 0 && lat >= -25) {
    [lng, lat] = [lat, lng];
  }

  return { lng, lat };
}

export function mapPointToLngLat(point?: RawMapPoint): LngLat | undefined {
  const normalized = normalizeRouteMapPoint(point);
  if (!normalized) return undefined;
  return [normalized.lng, normalized.lat];
}

/** 冰岛探索路线 mock / API 坐标合理范围 */
export function isReasonableIcelandMapPoint(point: NormalizedMapPoint): boolean {
  return point.lat >= 63 && point.lat <= 67 && point.lng >= -25 && point.lng <= -13;
}
