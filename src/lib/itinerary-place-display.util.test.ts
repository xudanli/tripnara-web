import { describe, expect, it } from 'vitest';
import {
  resolveItineraryItemPlaceDisplayName,
  resolvePlaceDisplayName,
} from './itinerary-place-display.util';

describe('itinerary-place-display.util', () => {
  it('resolvePlaceDisplayName prefers nameCN over displayName', () => {
    expect(
      resolvePlaceDisplayName({
        displayName: 'Sólheimajökull 冰川',
        nameCN: '索尔黑马冰川',
        nameEN: 'Sólheimajökull',
      } as never),
    ).toBe('索尔黑马冰川');
    expect(
      resolvePlaceDisplayName({
        displayName: 'Geysir 间歇泉',
        nameEN: 'Geysir',
      } as never),
    ).toBe('Geysir 间歇泉');
    expect(
      resolvePlaceDisplayName({
        nameEN: 'Geysir',
      } as never),
    ).toBe('Geysir');
  });

  it('resolveItineraryItemPlaceDisplayName prefers Place.nameCN over placeName', () => {
    expect(
      resolveItineraryItemPlaceDisplayName({
        placeName: ' 凯夫拉维克机场 ',
        Place: { displayName: 'Keflavík Airport', nameCN: '凯夫拉维克国际机场', nameEN: 'Keflavík' } as never,
      }),
    ).toBe('凯夫拉维克国际机场');

    expect(
      resolveItineraryItemPlaceDisplayName({
        placeName: '间歇泉',
        Place: { displayName: 'Geysir 间歇泉', nameCN: '盖歇尔间歇泉', nameEN: 'Geysir' } as never,
      }),
    ).toBe('盖歇尔间歇泉');

    expect(
      resolveItineraryItemPlaceDisplayName({
        placeName: ' 凯夫拉维克机场 ',
      }),
    ).toBe('凯夫拉维克机场');
  });
});
