import { haversineDistanceM } from '@/lib/geo-track';
import type { GpsTrackPointDto } from '@/types/hike-plan';
import type { ElevationProfilePoint } from '@/types/hiking';

/** 将 GPS 轨迹转为海拔剖面点（用于复盘页） */
export function gpsTrackToElevationProfile(
  points: GpsTrackPointDto[]
): ElevationProfilePoint[] {
  const sorted = [...points].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  let cumulativeDist = 0;
  let cumulativeAscent = 0;
  const out: ElevationProfilePoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (i > 0) {
      cumulativeDist += haversineDistanceM(sorted[i - 1], sorted[i]);
      const prevAlt = sorted[i - 1].altitudeM;
      const curAlt = p.altitudeM;
      if (prevAlt != null && curAlt != null && curAlt > prevAlt) {
        cumulativeAscent += curAlt - prevAlt;
      }
    }
    const prev = sorted[i - 1];
    const slope =
      i > 0 && prev.altitudeM != null && p.altitudeM != null
        ? ((p.altitudeM - prev.altitudeM) /
            Math.max(haversineDistanceM(prev, p), 1)) *
          100
        : 0;

    out.push({
      distance: cumulativeDist,
      lat: p.lat,
      lng: p.lng,
      elevation: p.altitudeM ?? 0,
      slope,
      cumulativeAscent,
    });
  }
  return out;
}
