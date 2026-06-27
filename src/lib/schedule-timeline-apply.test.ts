import { describe, expect, it } from 'vitest';
import {
  applyScheduleTimelineToMaps,
  buildTripDetailFromTimeline,
  countCalendarDaysBetween,
  isScheduleTimelineUnavailable,
  mergeScheduleTimelineIntoMaps,
  mergeTripDaysFromTimeline,
  resolveExecuteScheduleRevision,
  resolveTripScheduleRevision,
  shouldUseTimelineWindowedLoad,
  timelineIncludes,
} from '@/lib/schedule-timeline-apply';
import type { ScheduleTimelineResponse } from '@/types/schedule-timeline';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';

describe('schedule-timeline-apply', () => {
  it('detects unavailable endpoint errors', () => {
    expect(isScheduleTimelineUnavailable({ code: 'NOT_FOUND' })).toBe(true);
    expect(isScheduleTimelineUnavailable({ response: { status: 404 } })).toBe(true);
    expect(isScheduleTimelineUnavailable(new Error('fail'))).toBe(false);
  });

  it('resolves schedule revision from trip fields', () => {
    expect(resolveTripScheduleRevision({ revision: 5, metadata: {} })).toBe(5);
    expect(resolveTripScheduleRevision({ metadata: { revision: 3 } })).toBe(3);
    expect(resolveExecuteScheduleRevision({ revision: 2 }, { metadata: { revision: 4 } })).toBe(4);
  });

  it('parses include query parts', () => {
    expect(timelineIncludes('items,schedule,metrics', 'metrics')).toBe(true);
    expect(timelineIncludes('items,schedule', 'travelInfo')).toBe(false);
  });

  it('builds TripDetail from timeline without getById', () => {
    const timeline: ScheduleTimelineResponse = {
      tripId: 't1',
      trip: {
        id: 't1',
        destination: 'IS',
        startDate: '2026-07-01',
        endDate: '2026-07-10',
      } as TripDetail,
      days: [
        { dayId: 'day-1', date: '2026-07-01', dayIndex: 0 },
        { dayId: 'day-2', date: '2026-07-02', dayIndex: 1 },
      ],
    };
    const detail = buildTripDetailFromTimeline(timeline);
    expect(detail.id).toBe('t1');
    expect(detail.destination).toBe('IS');
    expect(detail.TripDay).toHaveLength(10);
    expect(detail.TripDay?.[0]?.id).toBe('day-1');
    expect(detail.TripDay?.[1]?.id).toBe('day-2');
    expect(detail.TripDay?.[2]?.id).toBe('pending-2026-07-03');
  });

  it('merges incremental timeline pages into maps', () => {
    const existing = applyScheduleTimelineToMaps(
      {
        tripId: 't1',
        trip: { id: 't1' } as TripDetail,
        days: [{ dayId: 'd1', date: '2026-07-01', dayIndex: 0, itineraryItems: [] }],
      },
      () => [],
    );
    const merged = mergeScheduleTimelineIntoMaps(
      existing,
      {
        tripId: 't1',
        trip: { id: 't1' } as TripDetail,
        days: [{ dayId: 'd2', date: '2026-07-02', dayIndex: 1, itineraryItems: [] }],
      },
      () => [],
    );
    expect(merged.scheduleMap.has('2026-07-01')).toBe(true);
    expect(merged.scheduleMap.has('2026-07-02')).toBe(true);
  });

  it('counts inclusive calendar days', () => {
    expect(countCalendarDaysBetween('2026-07-01', '2026-07-10')).toBe(10);
    expect(shouldUseTimelineWindowedLoad(14)).toBe(false);
    expect(shouldUseTimelineWindowedLoad(15)).toBe(true);
  });

  it('merges day ids from timeline into trip', () => {
    const trip = {
      id: 't1',
      TripDay: [{ id: 'old', date: '2026-07-01' }],
    } as TripDetail;
    const merged = mergeTripDaysFromTimeline(trip, [
      { dayId: 'day-1', date: '2026-07-01', dayIndex: 0 },
    ]);
    expect(merged.TripDay?.[0]?.id).toBe('day-1');
  });

  it('builds schedule from items when persisted schedule empty', () => {
    const items = [
      {
        id: 'i1',
        startTime: '2026-07-01T09:00:00.000Z',
        endTime: '2026-07-01T10:00:00.000Z',
        placeId: 1,
        type: 'ACTIVITY',
        Place: { nameEN: 'Test POI' },
      },
    ] as ItineraryItemDetail[];

    const timeline: ScheduleTimelineResponse = {
      tripId: 't1',
      trip: { id: 't1' } as TripDetail,
      days: [
        {
          dayId: 'd1',
          date: '2026-07-01',
          dayIndex: 0,
          itineraryItems: items,
          schedule: { date: '2026-07-01', schedule: null, persisted: false },
        },
      ],
    };

    const convert = (list: ItineraryItemDetail[]) =>
      list.map((item) => ({
        startTime: '09:00',
        endTime: '10:00',
        placeId: item.placeId || 0,
        placeName: 'Test',
        type: item.type,
      }));

    const { itemsMap, scheduleMap } = applyScheduleTimelineToMaps(timeline, convert);
    expect(itemsMap.get('2026-07-01')).toHaveLength(1);
    expect(scheduleMap.get('2026-07-01')?.schedule?.items).toHaveLength(1);
  });
});
