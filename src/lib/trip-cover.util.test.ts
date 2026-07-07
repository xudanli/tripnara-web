import { describe, expect, it } from 'vitest';
import {
  buildTripCoverMetadataPatch,
  hashTripId,
  pickDeterministicCoverCandidate,
  readTripCoverConfig,
} from './trip-cover.util';

describe('trip-cover.util', () => {
  it('reads cover config from metadata', () => {
    expect(
      readTripCoverConfig({
        id: 'trip-1',
        metadata: {
          coverImageSource: 'poi',
          coverPlaceId: 42,
          coverImageUrl: 'https://cdn.example.com/a.jpg',
        },
      } as any),
    ).toEqual({
      coverImageSource: 'poi',
      coverPlaceId: 42,
      coverImageUrl: 'https://cdn.example.com/a.jpg',
    });
  });

  it('builds metadata patch for auto mode', () => {
    expect(
      buildTripCoverMetadataPatch(
        { teamId: 't1', coverImageUrl: 'old.jpg', coverPlaceId: 1 },
        { coverImageSource: 'auto', coverImageUrl: null, coverPlaceId: null },
      ),
    ).toEqual({
      teamId: 't1',
      coverImageSource: 'auto',
    });
  });

  it('picks deterministic cover by trip id', () => {
    const candidates = [
      { placeId: 1, placeName: 'A', imageUrl: 'a.jpg' },
      { placeId: 2, placeName: 'B', imageUrl: 'b.jpg' },
      { placeId: 3, placeName: 'C', imageUrl: 'c.jpg' },
    ];

    const first = pickDeterministicCoverCandidate('trip-stable', candidates);
    const second = pickDeterministicCoverCandidate('trip-stable', candidates);

    expect(first).toEqual(second);
    expect(candidates).toContainEqual(first);
  });

  it('hashTripId is stable', () => {
    expect(hashTripId('abc')).toBe(hashTripId('abc'));
    expect(hashTripId('abc')).not.toBe(hashTripId('abd'));
  });
});
