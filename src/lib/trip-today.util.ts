import { format, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import type { TripDay, TripDetail } from '@/types/trip';

export interface TodayTripDayView {
  dayNumber: number;
  day: TripDay;
  dateLabel: string;
  isInTripWindow: boolean;
}

function parseTripDate(value: string | undefined): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value.includes('T') ? value : `${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  } catch {
    return null;
  }
}

/** 从行程日期推断「今天」对应的 TripDay（无 tripState 时的轻量 fallback） */
export function resolveTodayTripDay(
  trip: TripDetail,
  referenceDate: Date = new Date(),
): TodayTripDayView | null {
  const days = trip.TripDay ?? [];
  if (!days.length) return null;

  const ref = startOfDay(referenceDate);
  const tripStart = parseTripDate(trip.startDate);
  const tripEnd = parseTripDate(trip.endDate);

  const isInTripWindow =
    tripStart && tripEnd
      ? isWithinInterval(ref, { start: tripStart, end: tripEnd })
      : trip.status === 'IN_PROGRESS';

  const exact = days.find((day) => {
    const dayDate = parseTripDate(day.date);
    return dayDate && dayDate.getTime() === ref.getTime();
  });

  if (exact) {
    const dayNumber = days.findIndex((d) => d.id === exact.id) + 1;
    return {
      dayNumber,
      day: exact,
      dateLabel: format(ref, 'MM-dd'),
      isInTripWindow,
    };
  }

  if (trip.status === 'IN_PROGRESS' && tripStart) {
    const elapsed = Math.floor((ref.getTime() - tripStart.getTime()) / 86400000);
    if (elapsed >= 0 && elapsed < days.length) {
      const day = days[elapsed];
      const dayDate = parseTripDate(day.date) ?? ref;
      return {
        dayNumber: elapsed + 1,
        day,
        dateLabel: format(dayDate, 'MM-dd'),
        isInTripWindow,
      };
    }
  }

  return null;
}

export function formatTodayHeadline(view: TodayTripDayView): string {
  return `第 ${view.dayNumber} 天 · ${view.dateLabel}`;
}
