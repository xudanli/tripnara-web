import type { DayMetricsResponse, DayTravelInfoResponse, TripDetail } from '@/types/trip';
import { TRIP_CONSTRAINT_LEGACY_IDS, type TripConstraint } from '@/types/trip-constraints';

export function readMaxDailyDriveHoursFromConstraint(
  constraint?: TripConstraint | null,
): number | null {
  const raw = constraint?.value;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    for (const key of ['maxHours', 'maxHoursPerDay', 'hours', 'value'] as const) {
      const n = record[key];
      if (typeof n === 'number' && Number.isFinite(n)) return n;
    }
  }
  return null;
}

export function readDailyDriveLimitHours(
  trip: TripDetail | null | undefined,
  apiConstraint?: TripConstraint | null,
): number {
  const fromApi =
    apiConstraint?.id === TRIP_CONSTRAINT_LEGACY_IDS.MAX_DAILY_DRIVE
      ? readMaxDailyDriveHoursFromConstraint(apiConstraint)
      : null;
  if (fromApi != null) return fromApi;

  const meta = trip?.metadata as Record<string, unknown> | undefined;
  const nested = meta?.constraints as Record<string, unknown> | undefined;
  const raw =
    nested?.maxDailyDrivingHours ?? meta?.maxDailyDrivingHours ?? meta?.dailyDrivingLimitHours;
  if (typeof raw === 'number' && raw > 0) return raw;
  return 4.5;
}

export interface DailyDriveViolation {
  dayNumber: number;
  dayIndex: number;
  driveMinutes: number;
  limitMinutes: number;
  overMinutes: number;
}

function normalizeDayDate(date: string): string {
  return date.includes('T') ? date.split('T')[0]! : date;
}

/** 按天检测「预计驾驶时长 > 每日驾驶上限」（仅工具/测试；决策检查器由 BFF daily_drive 投影） */
export function detectDailyDriveViolations(
  trip: TripDetail | null | undefined,
  travelInfoMap: Map<string, DayTravelInfoResponse>,
  metricsByDay: Map<string, DayMetricsResponse>,
  limitHours?: number,
): DailyDriveViolation[] {
  if (!trip?.TripDay?.length) return [];

  const limitMinutes = (limitHours ?? readDailyDriveLimitHours(trip)) * 60;
  const violations: DailyDriveViolation[] = [];

  trip.TripDay.forEach((day, dayIndex) => {
    const norm = normalizeDayDate(day.date);
    const travelInfo = travelInfoMap.get(norm) ?? travelInfoMap.get(day.date);
    const metrics = metricsByDay.get(norm) ?? metricsByDay.get(day.date);
    const dayDriveMinutes = travelInfo?.summary?.totalDuration ?? metrics?.metrics?.drive ?? 0;
    if (dayDriveMinutes <= limitMinutes) return;

    violations.push({
      dayNumber: dayIndex + 1,
      dayIndex,
      driveMinutes: dayDriveMinutes,
      limitMinutes,
      overMinutes: dayDriveMinutes - limitMinutes,
    });
  });

  return violations;
}
