import { describe, expect, it } from 'vitest';
import { resolveDestinationCoverImageUrl } from './destination-cover.util';

describe('destination-cover.util', () => {
  it('reads country profile coverImageUrl', () => {
    expect(
      resolveDestinationCoverImageUrl({
        countryCoverImageUrl: 'https://cdn.example.com/iceland.jpg',
      }),
    ).toBe('https://cdn.example.com/iceland.jpg');
  });

  it('returns undefined when profile cover is empty', () => {
    expect(resolveDestinationCoverImageUrl({ countryCoverImageUrl: null })).toBeUndefined();
    expect(resolveDestinationCoverImageUrl({ countryCoverImageUrl: '  ' })).toBeUndefined();
  });
});
