import { describe, expect, it } from 'vitest';
import {
  computeTimeWindowScheduleViolations,
  enrichConstraintImpactPreviewWithSchedule,
} from './constraint-preview-schedule.util';
import { EMPTY_CONSTRAINT_IMPACT_PREVIEW } from '@/components/plan-studio/workbench/constraint-console-types';
import type { TripDetail } from '@/types/trip';

const trip = {
  TripDay: Array.from({ length: 10 }, (_, index) => ({
    id: `day-${index + 1}`,
    date: `2026-07-${20 + index}`,
    ItineraryItem: [
      {
        id: `item-${index + 1}`,
        type: 'ACTIVITY',
        startTime: `2026-07-${20 + index}T09:00:00.000Z`,
        Place: { nameCN: `活动 ${index + 1}` },
      },
    ],
  })),
} as TripDetail;

describe('constraint-preview-schedule.util', () => {
  it('flags days whose first activity starts before earliest departure', () => {
    const result = computeTimeWindowScheduleViolations(
      {
        id: 'earliest_departure',
        name: '最早出发时间',
        enabled: true,
        type: 'HARD',
        scope: 'TRIP',
        targetValue: 10,
        targetUnit: 'hour',
        toleranceMode: 'none',
        toleranceMinutes: 0,
        priority: 7,
        locked: false,
        reason: '',
      },
      trip,
    );

    expect(result?.violatingDays).toHaveLength(10);
    expect(result?.violatingDays[0]?.items[0]?.startTimeLabel).toBe('09:00');
  });

  it('supplements weak backend preview with schedule violations', () => {
    const enriched = enrichConstraintImpactPreviewWithSchedule(
      {
        ...EMPTY_CONSTRAINT_IMPACT_PREVIEW,
        refreshType: 'quick',
        diffBullets: ['变更影响较小，建议确认后刷新可行性验证'],
        recommendations: ['变更影响较小，建议确认后刷新可行性验证'],
      },
      {
        id: 'earliest_departure',
        name: '最早出发时间',
        enabled: true,
        type: 'HARD',
        scope: 'TRIP',
        targetValue: 10,
        targetUnit: 'hour',
        toleranceMode: 'none',
        toleranceMinutes: 0,
        priority: 7,
        locked: false,
        reason: '',
      },
      trip,
    );

    expect(enriched.affectedDays).toHaveLength(10);
    expect(enriched.affectedDayDetails).toHaveLength(10);
    expect(enriched.affectedDayDetails?.[0]?.items[0]?.label).toBe('活动 1');
    expect(enriched.planNeedsAdjust).toBe(true);
    expect(enriched.diffBullets.some((line) => line.includes('整趟'))).toBe(false);
    expect(enriched.recommendations?.[0]).toContain('10:00');
  });
});
