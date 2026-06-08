import type { HikingDayCard, HikingTrailSegment } from '@/types/hiking-trail-card';
import type { TripDay, TripDetail } from '@/types/trip';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function normalizeTrailSegment(raw: unknown): HikingTrailSegment | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;
  const day = num(o.day);
  const theme = str(o.theme) ?? str(o.title) ?? str(o.label);
  const distanceKm = num(o.distanceKm ?? o.distance_km);
  const ascentM = num(o.ascentM ?? o.ascent_m);
  if (day == null || !theme) return undefined;
  return {
    day,
    theme,
    distanceKm: distanceKm ?? 0,
    ascentM: ascentM ?? 0,
    suitable: o.suitable === false ? false : o.suitable === true ? true : undefined,
    noteZh: str(o.noteZh ?? o.note_zh),
    trailName: str(o.trailName ?? o.trail_name),
    label: str(o.label),
  };
}

export function normalizeHikingDayCard(raw: unknown): HikingDayCard | undefined {
  if (raw == null) return undefined;
  const base = normalizeTrailSegment(raw);
  if (!base) return undefined;
  const o = asRecord(raw)!;
  const isRestDay =
    o.isRestDay === true ||
    o.is_rest_day === true ||
    o.kind === 'rest' ||
    o.type === 'rest';
  if (isRestDay) return undefined;

  return {
    ...base,
    dayLabel: str(o.dayLabel ?? o.day_label),
    title: str(o.title),
    isRestDay: false,
    kind: str(o.kind) as HikingDayCard['kind'],
    hikePlanId: str(o.hikePlanId ?? o.hike_plan_id),
    routeDirectionId: num(o.routeDirectionId ?? o.route_direction_id),
    segmentId: str(o.segmentId ?? o.segment_id),
    readinessLevel: str(o.readinessLevel ?? o.readiness_level),
  };
}

export function normalizeHikingTrailSegments(raw: unknown): HikingTrailSegment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeTrailSegment)
    .filter((s): s is HikingTrailSegment => s != null)
    .sort((a, b) => a.day - b.day);
}

export function readTripDayHikingDayCard(day: TripDay): HikingDayCard | undefined {
  const raw =
    day.hikingDayCard ??
    (day as TripDay & { hiking_day_card?: unknown }).hiking_day_card;
  return normalizeHikingDayCard(raw);
}

export function getTripHikingTrailSegments(trip: TripDetail | null | undefined): HikingTrailSegment[] {
  if (!trip) return [];
  const top =
    trip.hikingTrailSegments ??
    (trip as TripDetail & { hiking_trail_segments?: unknown }).hiking_trail_segments;
  const fromTop = normalizeHikingTrailSegments(top);
  if (fromTop.length > 0) return fromTop;

  const md = trip.metadata ?? {};
  return normalizeHikingTrailSegments(
    md.hikingTrailSegments ?? md.hiking_trail_segments
  );
}

export function resolveHikingDayCardForTripDay(
  trip: TripDetail,
  tripDay: TripDay,
  dayIndex: number
): HikingDayCard | undefined {
  const direct = readTripDayHikingDayCard(tripDay);
  if (direct) return direct;

  const trailSegments = getTripHikingTrailSegments(trip);
  if (trailSegments.length === 0) return undefined;

  const hasExplicitDayCards = (trip.TripDay ?? []).some(
    (d) => readTripDayHikingDayCard(d) != null
  );
  if (hasExplicitDayCards) return undefined;

  const seg = trailSegments.find((s) => s.day === dayIndex + 1);
  return seg ? { ...seg, isRestDay: false } : undefined;
}

/** 行程已下发按日卡片或 Trail 总览时，走新 API 渲染路径 */
export function tripHasHikingDayCardsApi(trip: TripDetail | null | undefined): boolean {
  if (!trip) return false;
  if (getTripHikingTrailSegments(trip).length > 0) return true;
  return (trip.TripDay ?? []).some((d) => readTripDayHikingDayCard(d) != null);
}

export function hikingDayCardDayLabel(card: HikingDayCard): string {
  if (card.dayLabel?.trim()) return card.dayLabel.trim();
  return `Day${card.day}`;
}
