import { haversineDistanceM } from '@/lib/geo-track';
import type { GpsTrackPointDto } from '@/types/hike-plan';
import type { ElevationProfilePoint } from '@/types/hiking';
import type { ElevationEvent, ElevationPoint, TrailEvent } from '@/types/trail';
import { isRouteDeviationEvent } from '@/lib/on-trail-state';
import type { TrailRiskAlert } from '@/types/trail';

/** GPS 轨迹 → 行中/复盘用海拔剖面点 */
export function gpsToElevationPoints(points: GpsTrackPointDto[]): ElevationPoint[] {
  if (!points.length) return [];
  const sorted = [...points].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  let distM = 0;
  const out: ElevationPoint[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (i > 0) distM += haversineDistanceM(sorted[i - 1], sorted[i]);
    if (p.altitudeM == null) continue;
    out.push({
      distanceKm: distM / 1000,
      elevationM: p.altitudeM,
      coordinates: { lat: p.lat, lng: p.lng },
    });
  }
  return out;
}

/** 离线包 / hikingDetail 海拔剖面 */
export function hikingElevationToPoints(
  profile: ElevationProfilePoint[] | undefined
): ElevationPoint[] {
  if (!profile?.length) return [];
  return profile.map((p) => ({
    distanceKm: p.distance / 1000,
    elevationM: p.elevation,
    coordinates: { lat: p.lat, lng: p.lng },
  }));
}

const EVENT_TYPE_MAP: Partial<Record<TrailEvent['type'], ElevationEvent['type']>> = {
  rest: 'fatigue',
  risk: 'wind',
  turnaround: 'turnaround',
  skip: 'skip',
};

/** 将行中事件映射到剖面钉子（按时间对齐最近 GPS 距离） */
export function trailEventsToElevationEvents(
  events: TrailEvent[],
  gpsPoints: GpsTrackPointDto[],
  fallbackDistanceKm = 0
): ElevationEvent[] {
  const sorted = [...gpsPoints].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  return events.filter((ev) => !isRouteDeviationEvent(ev)).map((ev) => {
    const t = new Date(ev.timestamp).getTime();
    let distanceKm = fallbackDistanceKm;
    let elevationM = 0;

    if (sorted.length > 0) {
      let best = sorted[0];
      let bestDelta = Math.abs(new Date(best.recordedAt).getTime() - t);
      let cumM = 0;
      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        const delta = Math.abs(new Date(p.recordedAt).getTime() - t);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = p;
          distanceKm = cumM / 1000;
          elevationM = p.altitudeM ?? 0;
        }
        if (i > 0) cumM += haversineDistanceM(sorted[i - 1], sorted[i]);
      }
    }

    return {
      id: ev.id,
      type: EVENT_TYPE_MAP[ev.type] ?? 'delay',
      distanceKm,
      elevationM,
      timestamp: ev.timestamp,
      description: ev.notes ?? ev.type,
      impact: 'neutral',
    };
  });
}

function thresholdDistanceM(
  threshold?: { metric: string; current: number }
): number | undefined {
  if (!threshold?.metric || !/m|meter|米/i.test(threshold.metric)) return undefined;
  return threshold.current;
}

/** 偏航提示：优先 live-state.events 中 type=route，其次 activeRisks */
export function pickOffRouteAlert(options?: {
  events?: TrailEvent[];
  risks?: TrailRiskAlert[];
}): { message: string; distanceM?: number } | null {
  const events = options?.events;
  const routeEv = events?.find(
    (e) =>
      e.type === 'route' ||
      e.id === 'route-deviation' ||
      /偏航|偏离|off.?route/i.test(e.message ?? e.noteZh ?? e.notes ?? '')
  );
  if (routeEv) {
    const message =
      routeEv.message ?? routeEv.noteZh ?? routeEv.notes ?? '您已偏离路线，建议回到轨迹';
    return {
      message,
      distanceM: thresholdDistanceM(routeEv.threshold),
    };
  }

  const risks = options?.risks;
  if (!risks?.length) return null;
  const hit = risks.find(
    (r) =>
      r.type === 'route' ||
      /偏航|偏离|off.?route/i.test(r.message)
  );
  if (!hit) return null;
  return {
    message: hit.message,
    distanceM: thresholdDistanceM(hit.threshold),
  };
}
