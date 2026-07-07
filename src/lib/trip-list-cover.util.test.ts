import { describe, expect, it } from 'vitest';
import { resolveTripCoverImageUrl } from './trip-list.util';

describe('resolveTripCoverImageUrl', () => {
  it('prefers listSummary.coverImageUrl including auto mode', () => {
    expect(
      resolveTripCoverImageUrl({
        id: 'trip-1',
        metadata: { coverImageSource: 'auto', coverImageUrl: 'stale.jpg' },
        listSummary: { coverImageUrl: 'https://bff.example.com/auto.jpg' },
      } as any),
    ).toBe('https://bff.example.com/auto.jpg');
  });

  it('uses country profile cover when listSummary cover is missing', () => {
    expect(
      resolveTripCoverImageUrl(
        {
          id: 'trip-1',
          destination: 'IS',
          metadata: { coverImageSource: 'auto' },
          listSummary: { coverImageUrl: null },
        } as any,
        { countryCoverImageUrl: 'https://cdn.example.com/iceland.jpg' },
      ),
    ).toBe('https://cdn.example.com/iceland.jpg');
  });

  it('falls back to metadata URL for poi mode without listSummary', () => {
    expect(
      resolveTripCoverImageUrl({
        id: 'trip-1',
        metadata: {
          coverImageSource: 'poi',
          coverPlaceId: 12,
          coverImageUrl: 'https://cdn.example.com/poi.jpg',
        },
      } as any),
    ).toBe('https://cdn.example.com/poi.jpg');
  });
});
