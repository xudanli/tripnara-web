import { describe, expect, it } from 'vitest';
import {
  formatTripDisplayTitle,
  formatTripStructuredTitle,
  resolveTripDayCount,
} from './trip-display-title.util';

describe('trip-display-title.util', () => {
  it('prefers editable trip.name for distinguishing trips', () => {
    expect(
      formatTripDisplayTitle(
        {
          name: '冰岛南岸',
          destination: 'IS',
          days: Array.from({ length: 9 }, (_, i) => ({ id: String(i) })),
        },
        { resolveCountryName: (code) => (code === 'IS' ? '冰岛' : code) },
      ),
    ).toBe('冰岛南岸');
  });

  it('falls back to destination · N天行程 when name is empty', () => {
    expect(
      formatTripDisplayTitle(
        {
          name: '  ',
          destination: 'IS',
          days: Array.from({ length: 9 }, (_, i) => ({ id: String(i) })),
        },
        { resolveCountryName: (code) => (code === 'IS' ? '冰岛' : code) },
      ),
    ).toBe('冰岛 · 9天行程');
  });

  it('structured helper ignores name', () => {
    expect(
      formatTripStructuredTitle({
        name: '冰岛联调 Fixture',
        destination: '冰岛',
        TripDay: Array.from({ length: 9 }, () => ({})),
      }),
    ).toBe('冰岛 · 9天行程');
  });

  it('resolves day count from date range', () => {
    expect(
      resolveTripDayCount({
        startDate: '2026-07-13',
        endDate: '2026-07-21',
      }),
    ).toBe(9);
  });
});
