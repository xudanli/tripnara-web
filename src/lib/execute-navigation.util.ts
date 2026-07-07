import type { TripState } from '@/types/trip';

/** GET /trips/:id/state · nextStop.Place 坐标（导航 SSOT，无需 STATE_NOW） */
export function resolveNextStopCoordinates(
  nextStop: TripState['nextStop'] | null | undefined,
): { lat: number; lng: number } | null {
  const place = nextStop?.Place;
  if (!place) return null;

  const lat = place.latitude ?? place.lat ?? place.location?.lat;
  const lng = place.longitude ?? place.lng ?? place.location?.lng;

  if (lat == null || lng == null) return null;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;

  return { lat: latNum, lng: lngNum };
}

export function buildGoogleMapsDirectionsUrl(coords: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
}
