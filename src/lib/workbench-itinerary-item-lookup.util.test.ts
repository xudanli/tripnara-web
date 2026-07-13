import { describe, expect, it } from 'vitest';
import {
  findItineraryItemById,
  findItineraryItemContext,
} from '@/lib/workbench-itinerary-item-lookup.util';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';

describe('workbench-itinerary-item-lookup', () => {
  it('finds item by id across days', () => {
    const map = new Map<string, ItineraryItemDetail[]>([
      ['2026-08-01', [{ id: 'a1', type: 'ACTIVITY' } as ItineraryItemDetail]],
      ['2026-08-02', [{ id: 'b1', type: 'HOTEL' } as ItineraryItemDetail]],
    ]);
    expect(findItineraryItemById(map, 'b1')?.id).toBe('b1');
  });

  it('resolves day index from trip days', () => {
    const trip = {
      TripDay: [
        { id: 'd1', date: '2026-08-01', ItineraryItem: [] },
        { id: 'd2', date: '2026-08-02', ItineraryItem: [] },
      ],
    } as TripDetail;
    const map = new Map<string, ItineraryItemDetail[]>([
      ['2026-08-02', [{ id: 'b1', type: 'HOTEL' } as ItineraryItemDetail]],
    ]);
    const ctx = findItineraryItemContext({ trip, itineraryByDay: map, itemId: 'b1' });
    expect(ctx?.dayIndex).toBe(1);
  });
});
