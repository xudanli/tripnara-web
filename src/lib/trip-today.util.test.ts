import { describe, expect, it } from 'vitest';
import { resolveTodayTripDay } from './trip-today.util';
import type { TripDetail } from '@/types/trip';

const trip: TripDetail = {
  id: 't1',
  status: 'IN_PROGRESS',
  startDate: '2026-07-01',
  endDate: '2026-07-05',
  TripDay: [
    { id: 'd1', date: '2026-07-01', ItineraryItem: [] },
    { id: 'd2', date: '2026-07-02', ItineraryItem: [{ id: 'i1', startTime: '2026-07-02T09:00:00', note: '博物馆' }] },
    { id: 'd3', date: '2026-07-03', ItineraryItem: [] },
  ],
} as TripDetail;

describe('resolveTodayTripDay', () => {
  it('matches exact calendar day', () => {
    const view = resolveTodayTripDay(trip, new Date('2026-07-02T10:00:00'));
    expect(view?.dayNumber).toBe(2);
    expect(view?.day.id).toBe('d2');
    expect(view?.isInTripWindow).toBe(true);
  });

  it('returns null when no days', () => {
    expect(resolveTodayTripDay({ ...trip, TripDay: [] } as TripDetail)).toBeNull();
  });
});
