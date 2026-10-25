import { describe, expect, it } from 'vitest';
import {
  filterCheckoutDayTimelineItems,
  getOvernightItemsForPriorDayTimeline,
  shouldRelocateOvernightToPriorDay,
} from './itinerary-item-sort';

describe('shouldRelocateOvernightToPriorDay', () => {
  const hotelOnCheckInDay = {
    id: 'hotel-1',
    startTime: '2026-07-16T20:00:00.000Z',
    endTime: '2026-07-17T08:00:00.000Z',
    Place: { category: 'HOTEL' as const, nameCN: '塞尔福斯宾馆' },
    costCategory: 'ACCOMMODATION' as const,
    crossDayInfo: {
      isCrossDay: true,
      crossDays: 1,
      displayMode: 'checkin' as const,
      isCheckoutItem: false,
    },
  };

  const hotelOnCheckoutDay = {
    ...hotelOnCheckInDay,
    id: 'hotel-checkout',
    crossDayInfo: {
      isCrossDay: true,
      crossDays: 1,
      displayMode: 'checkout' as const,
      isCheckoutItem: true,
    },
  };

  it('keeps check-in evening hotel on the check-in day timeline', () => {
    expect(
      shouldRelocateOvernightToPriorDay(
        hotelOnCheckInDay,
        [hotelOnCheckInDay],
        1,
        '2026-07-16',
      ),
    ).toBe(false);
  });

  it('relocates checkout-morning hotel row back to prior (check-in) day', () => {
    expect(
      shouldRelocateOvernightToPriorDay(
        hotelOnCheckoutDay,
        [hotelOnCheckoutDay],
        2,
        '2026-07-17',
      ),
    ).toBe(true);
  });

  it('does not pull a 16th check-in hotel into the 15th timeline', () => {
    const day2Items = [hotelOnCheckInDay];
    expect(filterCheckoutDayTimelineItems(day2Items, 1, '2026-07-16')).toEqual(day2Items);
    expect(getOvernightItemsForPriorDayTimeline(day2Items, 1, '2026-07-16')).toEqual([]);
  });

  it('bridges checkout-day API row onto prior day timeline', () => {
    const day3Items = [hotelOnCheckoutDay];
    expect(filterCheckoutDayTimelineItems(day3Items, 2, '2026-07-17')).toEqual([]);
    expect(getOvernightItemsForPriorDayTimeline(day3Items, 2, '2026-07-17')).toEqual([
      hotelOnCheckoutDay,
    ]);
  });
});
