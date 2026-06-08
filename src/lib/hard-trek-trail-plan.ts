import type { HardTrekTrailPlan, HardTrekTrailSegment } from '@/types/hiking';
import type { HikingSegment } from '@/types/hiking-embedded';
import type { TripDetail } from '@/types/trip';
import { dateInSegment } from '@/lib/hiking-segments';
import { loadHikingGenerateLog } from '@/lib/hiking-generate-plan';

export function extractHardTrekTrailPlan(
  log: Record<string, unknown> | null | undefined
): HardTrekTrailPlan | undefined {
  if (!log) return undefined;
  const plan = log.hardTrekTrailPlan;
  if (!plan || typeof plan !== 'object') return undefined;
  return plan as HardTrekTrailPlan;
}

/** 行程 metadata / 本地 generate-plan log 中的按日 Trail 计划 */
export function getHardTrekTrailPlanForTrip(
  trip: TripDetail | null | undefined,
  tripId?: string
): HardTrekTrailPlan | undefined {
  if (!trip) return undefined;

  const md = trip.metadata ?? {};
  const fromMeta = extractHardTrekTrailPlan({
    hardTrekTrailPlan: md.hardTrekTrailPlan,
  });
  if (fromMeta?.mode === 'trail_segments' && fromMeta.segments.length > 0) {
    return fromMeta;
  }

  const log = tripId ? loadHikingGenerateLog(tripId) : null;
  const fromLog = extractHardTrekTrailPlan(log ?? undefined);
  if (fromLog?.mode === 'trail_segments' && fromLog.segments.length > 0) {
    return fromLog;
  }

  return fromMeta ?? fromLog;
}

/** 日历日 → 片段内第 N 天 → hardTrekTrailPlan.segments[day] */
export function resolveTrailSegmentForDay(
  dayDate: string,
  segment: HikingSegment,
  trailPlan: HardTrekTrailPlan | undefined
): HardTrekTrailSegment | undefined {
  if (!trailPlan || trailPlan.mode !== 'trail_segments' || trailPlan.segments.length === 0) {
    return undefined;
  }
  if (!dateInSegment(dayDate, segment)) return undefined;

  const d = dayDate.split('T')[0];
  const start = segment.startDate.split('T')[0];
  const startMs = new Date(`${start}T00:00:00`).getTime();
  const dayMs = new Date(`${d}T00:00:00`).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(dayMs) || dayMs < startMs) return undefined;

  const offsetDays = Math.round((dayMs - startMs) / 86400000);
  const trailDayNum = offsetDays + 1;
  return trailPlan.segments.find((s) => s.day === trailDayNum);
}
