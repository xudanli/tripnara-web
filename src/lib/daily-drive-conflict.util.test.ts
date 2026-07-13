import { describe, expect, it } from 'vitest';
import {
  detectDailyDriveViolations,
  readDailyDriveLimitHours,
} from '@/lib/daily-drive-conflict.util';
import type { TripDetail } from '@/types/trip';

describe('daily-drive-conflict.util', () => {
  const trip = {
    TripDay: [{ date: '2026-07-01' }, { date: '2026-07-02' }],
    metadata: { maxDailyDrivingHours: 5 },
  } as TripDetail;

  it('reads limit hours from trip metadata.constraints', () => {
    expect(
      readDailyDriveLimitHours({
        metadata: { constraints: { maxDailyDrivingHours: 5 } },
      } as TripDetail),
    ).toBe(5);
    expect(readDailyDriveLimitHours(trip)).toBe(5);
    expect(readDailyDriveLimitHours({ metadata: {} } as TripDetail)).toBe(4.5);
  });

  it('prefers API c_max_daily_drive over trip metadata default', () => {
    expect(
      readDailyDriveLimitHours({ metadata: {} } as TripDetail, {
        id: 'c_max_daily_drive',
        value: { maxHours: 6 },
      } as import('@/types/trip-constraints').TripConstraint),
    ).toBe(6);
  });

  it('detects per-day violations from travel info', () => {
    const travelInfoMap = new Map([
      ['2026-07-01', { summary: { totalDuration: 586 } }],
      ['2026-07-02', { summary: { totalDuration: 200 } }],
    ]);
    const violations = detectDailyDriveViolations(trip, travelInfoMap, new Map());
    expect(violations).toHaveLength(1);
    expect(violations[0]?.dayNumber).toBe(1);
    expect(violations[0]?.overMinutes).toBe(286);
  });
});
