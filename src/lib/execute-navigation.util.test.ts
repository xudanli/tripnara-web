import { describe, expect, it } from 'vitest';
import { buildGoogleMapsDirectionsUrl, resolveNextStopCoordinates } from './execute-navigation.util';

describe('execute-navigation.util', () => {
  it('reads latitude/longitude from nextStop.Place', () => {
    const coords = resolveNextStopCoordinates({
      itemId: 'item-1',
      placeId: 381090,
      placeName: '蓝湖温泉',
      startTime: '2026-07-16T11:30:00.000+00:00',
      Place: {
        id: 381090,
        latitude: 63.8804,
        longitude: -22.4495,
      },
    });
    expect(coords).toEqual({ lat: 63.8804, lng: -22.4495 });
  });

  it('returns null when coordinates missing', () => {
    expect(
      resolveNextStopCoordinates({
        itemId: 'item-1',
        placeId: 1,
        placeName: 'X',
        startTime: '10:00',
        Place: { id: 1 },
      }),
    ).toBeNull();
  });

  it('builds Google Maps url', () => {
    expect(buildGoogleMapsDirectionsUrl({ lat: 63.88, lng: -22.45 })).toContain('63.88,-22.45');
  });
});
