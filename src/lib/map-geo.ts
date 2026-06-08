export type LngLat = [number, number];

export function toLngLatPair(
  point: { lng: number; lat: number } | { longitude?: number; latitude?: number }
): LngLat | null {
  const lng = 'lng' in point ? point.lng : point.longitude;
  const lat = 'lat' in point ? point.lat : point.latitude;
  if (lng == null || lat == null || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }
  return [lng, lat];
}

export function polylineToCoordinates(
  points: Array<{ lat: number; lng: number }>
): LngLat[] {
  return points
    .map((p) => toLngLatPair(p))
    .filter((c): c is LngLat => c != null);
}

/** 国家大致中心（徒步列表无坐标时的 fallback） */
export const COUNTRY_MAP_CENTER: Record<string, LngLat> = {
  IS: [-19.02, 64.15],
  JP: [138.25, 36.2],
  NZ: [172.0, -41.5],
  NO: [8.5, 61.5],
  CH: [8.23, 46.82],
};

export function countryCenter(countryCode?: string): LngLat {
  if (!countryCode) return [0, 20];
  return COUNTRY_MAP_CENTER[countryCode.toUpperCase()] ?? [0, 20];
}

/** 同国多条路线时按 id 微偏移，避免 marker 完全重叠 */
export function jitterLngLat(base: LngLat, seed: number, spread = 0.35): LngLat {
  const a = (seed % 360) * (Math.PI / 180);
  return [base[0] + Math.cos(a) * spread, base[1] + Math.sin(a) * spread * 0.5];
}

export function supplyPoiMarkerColor(subCategory: string): string {
  const c = subCategory.toUpperCase();
  if (c.includes('HUT')) return '#2563eb';
  if (c.includes('RIVER')) return '#0891b2';
  if (c.includes('ROUTE_GATE')) return '#64748b';
  return '#0f172a';
}
