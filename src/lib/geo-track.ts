import type { GpsTrackPointDto, GpsTrackSummary } from '@/types/hike-plan';

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 两点球面距离（米） */
export function haversineDistanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function summarizeTrackPoints(points: GpsTrackPointDto[]): GpsTrackSummary {
  if (points.length === 0) {
    return { pointCount: 0, distanceKm: 0, durationMin: 0 };
  }
  const sorted = [...points].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  let distanceM = 0;
  let elevationGainM = 0;
  for (let i = 1; i < sorted.length; i++) {
    distanceM += haversineDistanceM(sorted[i - 1], sorted[i]);
    const prevAlt = sorted[i - 1].altitudeM;
    const curAlt = sorted[i].altitudeM;
    if (prevAlt != null && curAlt != null && curAlt > prevAlt) {
      elevationGainM += curAlt - prevAlt;
    }
  }
  const startedAt = sorted[0].recordedAt;
  const lastRecordedAt = sorted[sorted.length - 1].recordedAt;
  const durationMin = Math.max(
    0,
    (new Date(lastRecordedAt).getTime() - new Date(startedAt).getTime()) / 60_000
  );
  return {
    pointCount: sorted.length,
    distanceKm: distanceM / 1000,
    durationMin: Math.round(durationMin),
    elevationGainM: Math.round(elevationGainM),
    startedAt,
    lastRecordedAt,
  };
}

export function pointsToLineCoordinates(
  points: GpsTrackPointDto[]
): Array<[number, number]> {
  return [...points]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((p) => [p.lng, p.lat] as [number, number]);
}

export function positionToTrackPoint(
  position: GeolocationPosition
): GpsTrackPointDto {
  const c = position.coords;
  return {
    lat: c.latitude,
    lng: c.longitude,
    altitudeM: c.altitude ?? undefined,
    accuracyM: c.accuracy,
    speedMps: c.speed ?? undefined,
    headingDeg: c.heading ?? undefined,
    recordedAt: new Date(position.timestamp).toISOString(),
  };
}
