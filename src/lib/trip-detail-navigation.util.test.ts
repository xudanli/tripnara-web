import { describe, expect, it } from 'vitest';
import {
  buildTripDetailTimelineItemPath,
  buildTripExecutePath,
  parseTripDetailHighlightItemId,
  tripDetailExecuteTabRedirectAllowed,
} from './trip-detail-navigation.util';

describe('trip-detail-navigation.util', () => {
  it('builds execute path', () => {
    expect(buildTripExecutePath('abc')).toBe('/dashboard/execute?tripId=abc');
  });

  it('builds timeline highlight path', () => {
    expect(buildTripDetailTimelineItemPath('trip-1', 'item-9')).toBe(
      '/dashboard/trips/trip-1?tab=timeline&highlightItem=item-9',
    );
  });

  it('parses highlight item id', () => {
    const params = new URLSearchParams('tab=timeline&highlightItem=item-9');
    expect(parseTripDetailHighlightItemId(params)).toBe('item-9');
  });

  it('allows execute redirect for in-progress trips', () => {
    expect(tripDetailExecuteTabRedirectAllowed('IN_PROGRESS')).toBe(true);
    expect(tripDetailExecuteTabRedirectAllowed('PLANNING')).toBe(false);
  });
});
