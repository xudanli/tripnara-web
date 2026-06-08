import type { OnTrailLiveStateDto, GpsTrackSummary } from '@/types/hike-plan';
import type { OnTrailState, TrailEvent } from '@/types/trail';

const ROUTE_DEVIATION_EVENT_ID = 'route-deviation';

/** 服务端自动维护的偏航事件（勿当作用户手录事件展示在剖面钉子上） */
export function isRouteDeviationEvent(ev: TrailEvent): boolean {
  return ev.type === 'route' || ev.id === ROUTE_DEVIATION_EVENT_ID;
}

/** 归一化 live-state.events（`at` → `timestamp`，文案字段对齐） */
export function normalizeLiveEvents(
  events: Array<TrailEvent | Record<string, unknown>> | undefined
): TrailEvent[] {
  if (!events?.length) return [];
  return events.map((raw) => {
    const e = raw as TrailEvent & { at?: string };
    const timestamp =
      e.timestamp ??
      (typeof e.at === 'string' ? e.at : new Date().toISOString());
    const message =
      typeof e.message === 'string'
        ? e.message
        : typeof (raw as { message?: string }).message === 'string'
          ? (raw as { message: string }).message
          : undefined;
    const noteZh =
      typeof e.noteZh === 'string'
        ? e.noteZh
        : typeof (raw as { noteZh?: string }).noteZh === 'string'
          ? (raw as { noteZh: string }).noteZh
          : undefined;
    return {
      ...e,
      id: String(e.id ?? ''),
      type: e.type as TrailEvent['type'],
      timestamp,
      message,
      noteZh,
      notes: e.notes ?? noteZh ?? message,
      threshold: e.threshold,
    };
  });
}

export function userRecordedTrailEvents(events: TrailEvent[]): TrailEvent[] {
  return events.filter((e) => !isRouteDeviationEvent(e));
}

export function normalizeGpsTrackSummary(
  summary?: Partial<GpsTrackSummary> | null
): GpsTrackSummary {
  return {
    pointCount: summary?.pointCount ?? 0,
    distanceKm: summary?.distanceKm ?? 0,
    durationMin: summary?.durationMin ?? 0,
    elevationGainM: summary?.elevationGainM,
    startedAt: summary?.startedAt,
    lastRecordedAt: summary?.lastRecordedAt,
  };
}

/** API live-state 可能缺数字字段，避免 UI 上 toFixed 崩溃 */
export function normalizeOnTrailState(
  live: Partial<OnTrailLiveStateDto> & { hikePlanId: string }
): OnTrailState {
  const rawPace = live.paceStatus;
  const hasPace =
    rawPace &&
    (rawPace.currentPace != null ||
      rawPace.plannedPace != null ||
      rawPace.bufferRemainingMin != null);

  return {
    hikePlanId: live.hikePlanId,
    currentLocation: live.currentLocation,
    currentElevation: live.currentElevationM,
    currentSegmentId: live.currentSegmentId,
    distanceCompletedKm: Number(live.distanceCompletedKm) || 0,
    elevationGainedM: Number(live.elevationGainedM) || 0,
    timeElapsedMin: Number(live.timeElapsedMin) || 0,
    estimatedArrivalTime: live.estimatedArrivalTime,
    sunsetCountdownMin: live.sunsetCountdownMin,
    isOffline: live.isOffline,
    activeRisks: live.activeRisks,
    paceStatus: hasPace
      ? {
          currentPace: Number(rawPace!.currentPace) || 0,
          plannedPace: Number(rawPace!.plannedPace) || 0,
          bufferRemainingMin: Number(rawPace!.bufferRemainingMin) || 0,
          latestTurnaroundTime: rawPace!.latestTurnaroundTime,
        }
      : undefined,
    repairSuggestions: live.repairSuggestions,
    events: normalizeLiveEvents(live.events),
  };
}

export function formatKm(value: number | undefined | null, digits = 1): string {
  return `${(Number(value) || 0).toFixed(digits)} km`;
}

export function formatPaceKmh(value: number | undefined | null, digits = 1): string {
  return `${(Number(value) || 0).toFixed(digits)} km/h`;
}
