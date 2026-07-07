import { describe, expect, it } from 'vitest';
import {
  isReasonableIcelandMapPoint,
  normalizeRouteMapPoint,
} from './normalize-route-map-point';

describe('normalizeRouteMapPoint', () => {
  it('keeps valid Iceland coordinates', () => {
    expect(normalizeRouteMapPoint({ lng: -19.0083, lat: 63.4186 })).toEqual({
      lng: -19.0083,
      lat: 63.4186,
    });
  });

  it('swaps lat/lng when values are reversed', () => {
    expect(normalizeRouteMapPoint({ lng: 63.4186, lat: -19.0083 })).toEqual({
      lng: -19.0083,
      lat: 63.4186,
    });
  });

  it('fixes negative latitude for Iceland', () => {
    expect(normalizeRouteMapPoint({ lng: -19.0083, lat: -63.4186 })).toEqual({
      lng: -19.0083,
      lat: 63.4186,
    });
  });

  it('reads GeoJSON coordinates array', () => {
    expect(normalizeRouteMapPoint({ coordinates: [-21.9426, 64.1466] })).toEqual({
      lng: -21.9426,
      lat: 64.1466,
    });
  });

  it('validates Iceland bounds', () => {
    expect(
      isReasonableIcelandMapPoint({ lng: -19.0083, lat: 63.4186 }),
    ).toBe(true);
    expect(
      isReasonableIcelandMapPoint({ lng: -19, lat: 61.5 }),
    ).toBe(false);
  });
});
