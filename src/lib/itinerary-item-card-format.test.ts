import { describe, expect, it } from 'vitest';
import { formatItineraryItemTimeRangeLabel } from './itinerary-item-card-format';

describe('formatItineraryItemTimeRangeLabel', () => {
  it('formats overnight lodging as check-in through next-morning checkout', () => {
    const label = formatItineraryItemTimeRangeLabel(
      {
        type: 'REST',
        costCategory: 'ACCOMMODATION',
        startTime: '2026-07-15T20:00:00.000Z',
        endTime: '2026-07-16T08:00:00.000Z',
        Place: { category: 'HOTEL', nameCN: '黑沙滩套房酒店' } as never,
      },
      'Atlantic/Reykjavik',
    );

    expect(label).toBe('入住 20:00 → 次日 08:00');
  });

  it('formats checkout-only lodging item', () => {
    const label = formatItineraryItemTimeRangeLabel({
      type: 'REST',
      costCategory: 'ACCOMMODATION',
      endTime: '2026-07-16T08:00:00.000Z',
      crossDayInfo: {
        isCrossDay: true,
        displayMode: 'checkout',
        isCheckoutItem: true,
      },
      Place: { category: 'HOTEL' } as never,
    });

    expect(label).toBe('退房 08:00');
  });

  it('formats same-day activity range with spaced dash', () => {
    const label = formatItineraryItemTimeRangeLabel({
      type: 'ACTIVITY',
      startTime: '2026-07-15T10:00:00.000Z',
      endTime: '2026-07-15T12:30:00.000Z',
    });

    expect(label).toBe('10:00 - 12:30');
  });
});
