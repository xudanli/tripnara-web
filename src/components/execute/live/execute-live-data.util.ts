import type { TripDetail, TripState, ScheduleResponse } from '@/types/trip';
import type { ExecuteRouteMapPoint } from '@/components/execute/live';

function extractPlaceCoords(place: unknown): { lat: number; lng: number } | null {
  if (!place || typeof place !== 'object') return null;
  const p = place as Record<string, unknown>;
  const lat =
    (typeof p.latitude === 'number' ? p.latitude : null) ??
    (typeof p.lat === 'number' ? p.lat : null) ??
    (typeof (p.metadata as Record<string, unknown> | undefined)?.location === 'object'
      ? ((p.metadata as { location?: { lat?: number } }).location?.lat ?? null)
      : null) ??
    (typeof (p.location as { lat?: number } | undefined)?.lat === 'number'
      ? (p.location as { lat: number }).lat
      : null);
  const lng =
    (typeof p.longitude === 'number' ? p.longitude : null) ??
    (typeof p.lng === 'number' ? p.lng : null) ??
    (typeof (p.metadata as Record<string, unknown> | undefined)?.location === 'object'
      ? ((p.metadata as { location?: { lng?: number } }).location?.lng ?? null)
      : null) ??
    (typeof (p.location as { lng?: number } | undefined)?.lng === 'number'
      ? (p.location as { lng: number }).lng
      : null);
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return { lat, lng };
  }
  return null;
}

/** 从今日行程项构建地图点位与路线坐标 */
export function buildExecuteMapData(
  trip: TripDetail,
  tripState: TripState | null,
  todaySchedule: ScheduleResponse | null,
  userLocation?: { lat: number; lng: number } | null,
): {
  mapPoints: ExecuteRouteMapPoint[];
  routeCoordinates: [number, number][];
} {
  const points: ExecuteRouteMapPoint[] = [];
  const routeCoordinates: [number, number][] = [];

  const currentDay = trip.TripDay?.find((d) => d.id === tripState?.currentDayId);
  const items = todaySchedule?.schedule?.items?.length
    ? todaySchedule.schedule.items
    : currentDay?.ItineraryItem?.map((item) => ({
        placeId: item.placeId,
        placeName: item.Place?.nameCN ?? item.note ?? '地点',
        Place: item.Place,
      })) ?? [];

  for (const item of items) {
    const place = 'Place' in item ? item.Place : undefined;
    const coords = extractPlaceCoords(place);
    if (!coords) continue;
    routeCoordinates.push([coords.lng, coords.lat]);
    points.push({
      lat: coords.lat,
      lng: coords.lng,
      label: 'placeName' in item ? String(item.placeName) : undefined,
      kind: 'stop',
    });
  }

  if (userLocation) {
    points.unshift({
      lat: userLocation.lat,
      lng: userLocation.lng,
      kind: 'current',
      label: '当前位置',
    });
  } else if (tripState?.nextStop?.Place) {
    const coords = extractPlaceCoords(tripState.nextStop.Place);
    if (coords) {
      const idx = points.findIndex(
        (p) => Math.abs(p.lat - coords.lat) < 0.001 && Math.abs(p.lng - coords.lng) < 0.001,
      );
      if (idx >= 0) points[idx].kind = 'current';
    }
  }

  return { mapPoints: points, routeCoordinates };
}
