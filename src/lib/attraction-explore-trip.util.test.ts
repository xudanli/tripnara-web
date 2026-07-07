import { describe, expect, it } from 'vitest';
import {
  readTripAttractionExploreSuggest,
  shouldShowAttractionExploreSuggest,
} from './attraction-explore-trip.util';
import type { TripDetail } from '@/types/trip';

describe('attraction-explore-trip.util', () => {
  it('reads suggest flag from trip metadata', () => {
    const trip = {
      metadata: { attractionExplore: { suggestAttractionExplore: true } },
    } as TripDetail;
    expect(readTripAttractionExploreSuggest(trip)).toBe(true);
  });

  it('shows suggest from metadata when URL param absent', () => {
    expect(
      shouldShowAttractionExploreSuggest({
        tripId: 'trip_1',
        trip: { metadata: { attractionExplore: { suggestAttractionExplore: true } } } as TripDetail,
        searchParams: new URLSearchParams(),
      }),
    ).toBe(true);
  });
});
