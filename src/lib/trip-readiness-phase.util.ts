export const ACTIONABLE_READINESS_HORIZON_DAYS = 14;

export type TripReadinessPhase = 'planning' | 'pre_departure' | 'in_trip' | 'past';

export interface TripReadinessPhaseInput {
  startDate: string | Date;
  endDate?: string | Date | null;
  status?: string | null;
}

function normalizeCalendarDate(value: string | Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getDaysUntilTripStart(startDate: string | Date): number {
  const start = normalizeCalendarDate(startDate);
  const today = normalizeCalendarDate(new Date());
  return Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 结合出发日 / 结束日 / TripStatus 判断准备度阶段。
 * - COMPLETED/CANCELLED → past
 * - TRAVELING/IN_PROGRESS → in_trip（整段行中）
 * - 日历在 [startDate, endDate] → in_trip
 * - 出发前 14 天内 → pre_departure
 * - 其余 → planning
 */
export function getTripReadinessPhase(
  input: string | Date | TripReadinessPhaseInput,
): TripReadinessPhase {
  const opts: TripReadinessPhaseInput =
    typeof input === 'object' && !(input instanceof Date)
      ? input
      : { startDate: input };

  const status = (opts.status ?? '').toUpperCase();
  if (status === 'COMPLETED' || status === 'CANCELLED') return 'past';
  if (status === 'TRAVELING' || status === 'IN_PROGRESS') return 'in_trip';

  const today = normalizeCalendarDate(new Date());
  const start = normalizeCalendarDate(opts.startDate);
  const end = opts.endDate ? normalizeCalendarDate(opts.endDate) : null;

  if (end && today > end) return 'past';
  if (today >= start && (end ? today <= end : true)) return 'in_trip';

  const daysUntilStart = getDaysUntilTripStart(opts.startDate);
  if (daysUntilStart > 0 && daysUntilStart <= ACTIONABLE_READINESS_HORIZON_DAYS) {
    return 'pre_departure';
  }

  return 'planning';
}

export function getTripReadinessPhaseFromTrip(
  trip: {
    startDate?: string | null;
    endDate?: string | null;
    status?: string | null;
  } | null | undefined,
): TripReadinessPhase {
  if (!trip?.startDate) return 'planning';
  return getTripReadinessPhase({
    startDate: trip.startDate,
    endDate: trip.endDate,
    status: trip.status,
  });
}

export function getCapabilityPackPhaseHint(
  phase: TripReadinessPhase,
  daysUntilStart: number,
  lang: 'zh' | 'en' = 'zh',
): string | undefined {
  if (phase !== 'planning') return undefined;
  if (lang === 'zh') {
    return `距离出发还有 ${daysUntilStart} 天。下方是提前准备建议；具体路况/天气请出发前 ${ACTIONABLE_READINESS_HORIZON_DAYS} 天内再查。`;
  }
  return `Departure in ${daysUntilStart} days. Prepare early; check live road/weather within ${ACTIONABLE_READINESS_HORIZON_DAYS} days of departure.`;
}
