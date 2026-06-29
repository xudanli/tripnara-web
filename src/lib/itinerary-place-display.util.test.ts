import { describe, expect, it } from 'vitest';
import {
  resolveItineraryItemPlaceDisplayName,
  resolvePlaceDisplayName,
} from './itinerary-place-display.util';

describe('itinerary-place-display.util', () => {
  it('resolvePlaceDisplayName reads displayName only', () => {
    expect(
      resolvePlaceDisplayName({
        displayName: 'Sólheimajökull 冰川',
        nameCN: '索尔黑马冰川',
        nameEN: 'Sólheimajökull',
      } as never),
    ).toBe('Sólheimajökull 冰川');
    expect(
      resolvePlaceDisplayName({
        nameCN: '索尔黑马冰川',
        nameEN: 'Sólheimajökull',
      } as never),
    ).toBeUndefined();
  });

  it('resolveItineraryItemPlaceDisplayName prefers placeName then Place.displayName', () => {
    expect(
      resolveItineraryItemPlaceDisplayName({
        placeName: ' 凯夫拉维克机场 ',
        Place: { displayName: 'Keflavík Airport' } as never,
      }),
    ).toBe('凯夫拉维克机场');

    expect(
      resolveItineraryItemPlaceDisplayName({
        Place: { displayName: 'Geysir 间歇泉', nameEN: 'Geysir' } as never,
      }),
    ).toBe('Geysir 间歇泉');
  });
});
