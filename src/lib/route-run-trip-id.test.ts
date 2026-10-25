import { describe, expect, it } from 'vitest';
import { isValidRouteRunTripId, sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';

describe('sanitizeRouteRunTripId', () => {
  it('accepts UUID Trip.id', () => {
    const id = '15c50a69-9318-45ca-8b2a-1234567890ab';
    expect(sanitizeRouteRunTripId(id)).toBe(id);
    expect(isValidRouteRunTripId(id)).toBe(true);
  });

  it('accepts trip_+hex opaque ids from URL/store', () => {
    const id = 'trip_15c50a69931845ca';
    expect(sanitizeRouteRunTripId(id)).toBe(id);
    expect(isValidRouteRunTripId(id)).toBe(true);
  });

  it('rejects human-readable trip_ slug placeholders', () => {
    expect(sanitizeRouteRunTripId('trip_iceland_20260601')).toBeNull();
    expect(sanitizeRouteRunTripId('trip_demo_xxx')).toBeNull();
    expect(isValidRouteRunTripId('trip_iceland_20260601')).toBe(false);
  });

  it('rejects empty / short / non-id values', () => {
    expect(sanitizeRouteRunTripId('')).toBeNull();
    expect(sanitizeRouteRunTripId('  ')).toBeNull();
    expect(sanitizeRouteRunTripId(null)).toBeNull();
    expect(sanitizeRouteRunTripId('trip_abc')).toBeNull();
    expect(sanitizeRouteRunTripId('not-a-trip')).toBeNull();
  });
});
