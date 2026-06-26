import { format, parseISO, isValid } from 'date-fns';
import type { TripDetail, ScheduleResponse, ScheduleItem } from '@/types/trip';

export function normalizeTripDateString(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const d = parseISO(raw.includes('T') ? raw : `${raw}T12:00:00`);
    return isValid(d) ? format(d, 'yyyy-MM-dd') : raw.split('T')[0] ?? null;
  } catch {
    return raw.split('T')[0] ?? null;
  }
}

/** What-If：优先 URL date，否则行程出发日 / 首日 */
export function resolveWhatIfScheduleDate(trip: TripDetail, urlDate: string | null): string {
  if (urlDate?.trim()) return urlDate.trim();
  const fromStart = normalizeTripDateString(trip.startDate);
  if (fromStart) return fromStart;
  const firstDay = trip.TripDay?.[0]?.date;
  return normalizeTripDateString(firstDay) ?? format(new Date(), 'yyyy-MM-dd');
}

export function buildScheduleResponseFromTripDay(
  trip: TripDetail,
  dateStr: string,
): ScheduleResponse | null {
  const day = trip.TripDay?.find((d) => normalizeTripDateString(d.date) === dateStr);
  if (!day?.ItineraryItem?.length) return null;

  const items: ScheduleItem[] = day.ItineraryItem.map((item) => ({
    placeId: item.placeId ?? 0,
    placeName: item.Place?.name ?? item.note?.trim() ?? '行程项',
    type: item.type,
    startTime: item.startTime,
    endTime: item.endTime,
    metadata: {},
  }));

  return {
    date: dateStr,
    schedule: { items, totalDuration: 0 },
    persisted: false,
  };
}

export function hasScheduleItems(schedule: ScheduleResponse | null): boolean {
  return Boolean(schedule?.schedule?.items?.length);
}
