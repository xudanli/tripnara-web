import { describe, expect, it } from 'vitest';
import {
  buildArrangeLodgingCoverageSummary,
} from '@/lib/arrange-itinerary-lodging-coverage.util';
import {
  buildLodgingMapPointsFromItinerary,
  formatLodgingLegLabel,
  mergeLodgingCopilotSuggestions,
  mergeMapPointsWithLodging,
  resolveArrangeLodgingSuggestionsBundle,
} from '@/lib/arrange-itinerary-lodging-suggestions.util';
import {
  groupLodgingWorkbenchItems,
  normalizeArrangeLodgingSuggestions,
  normalizeLodgingWorkbenchItem,
} from '@/api/normalize-arrange-itinerary-lodging';
import { normalizeAttractionExploreMap } from '@/api/normalize-attraction-explore';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import type { AttractionExploreMapPoint } from '@/types/attraction-explore';

function makeTrip(dayCount: number): TripDetail {
  return {
    id: 'trip-1',
    TripDay: Array.from({ length: dayCount }, (_, index) => ({
      id: `day-${index + 1}`,
      date: `2026-08-${String(index + 1).padStart(2, '0')}`,
      ItineraryItem: [],
    })),
  } as TripDetail;
}

const FLAT_WORKBENCH_ITEM = {
  id: 'lodging-rec-1-381119',
  nightIndex: 1,
  dayIndex: 1,
  placeId: 381119,
  name: '尼达鲁尔山屋',
  kind: 'recommended',
  priority: 'primary',
  coordinates: { lat: 64.73, lng: -18.1 },
  reason: '距 斯普伦吉桑杜尔 约 14.2 km',
  meta: {
    distanceFromAnchorKm: 14.16,
    anchorPlaceName: '斯普伦吉桑杜尔',
    driveMinutesEstimate: 17,
  },
};

describe('normalizeLodgingWorkbenchItem', () => {
  it('parses flat snapshot lodging item', () => {
    const item = normalizeLodgingWorkbenchItem(FLAT_WORKBENCH_ITEM);
    expect(item?.id).toBe('lodging-rec-1-381119');
    expect(item?.coordinates?.lat).toBe(64.73);
    expect(item?.meta?.driveMinutesEstimate).toBe(17);
  });
});

describe('normalizeArrangeLodgingSuggestions', () => {
  it('groups flat workbench items by night', () => {
    const parsed = normalizeArrangeLodgingSuggestions([
      FLAT_WORKBENCH_ITEM,
      {
        ...FLAT_WORKBENCH_ITEM,
        id: 'lodging-alt-1-999',
        placeId: 999,
        name: '备选酒店',
        kind: 'alternative',
        priority: 'alternative',
      },
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.status).toBe('suggested');
    expect(parsed[0]?.candidates).toHaveLength(2);
    expect(parsed[0]?.candidates[0]?.recommended).toBe(true);
    expect(parsed[0]?.candidates[0]?.reason).toContain('斯普伦吉桑杜尔');
  });

  it('parses legacy per-night payload', () => {
    const parsed = normalizeArrangeLodgingSuggestions([
      {
        day_index: 1,
        status: 'missing',
        candidates: [
          {
            id: 'c1',
            name: 'Hotel A',
            lat: 64.1,
            lng: -21.9,
            recommended: true,
            next_day_drive_minutes_delta: -12,
          },
        ],
      },
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.candidates[0]?.nextDayDriveMinutesDelta).toBe(-12);
  });
});

describe('groupLodgingWorkbenchItems', () => {
  it('marks current item as booked night', () => {
    const item = normalizeLodgingWorkbenchItem({
      ...FLAT_WORKBENCH_ITEM,
      kind: 'current',
      priority: 'primary',
    });
    const grouped = groupLodgingWorkbenchItems([item!]);
    expect(grouped[0]?.status).toBe('booked');
    expect(grouped[0]?.currentLabel).toBe('尼达鲁尔山屋');
  });
});

describe('resolveArrangeLodgingSuggestionsBundle', () => {
  it('falls back to client projection when BFF has no candidates', () => {
    const trip = makeTrip(2);
    const coverage = buildArrangeLodgingCoverageSummary(trip, new Map());
    const bundle = resolveArrangeLodgingSuggestionsBundle({
      trip,
      lodgingCoverage: coverage,
      bffSuggestions: [],
    });

    expect(bundle.source).toBe('client_projection');
    expect(bundle.suggestions).toHaveLength(1);
    expect(bundle.suggestions[0]?.status).toBe('missing');
  });

  it('enriches flat BFF suggestions with all coverage nights', () => {
    const trip = makeTrip(3);
    const coverage = buildArrangeLodgingCoverageSummary(trip, new Map());
    const bffSuggestions = normalizeArrangeLodgingSuggestions([FLAT_WORKBENCH_ITEM]);
    const bundle = resolveArrangeLodgingSuggestionsBundle({
      trip,
      lodgingCoverage: coverage,
      bffSuggestions,
      bffStandard: { label: '4 星或以上', stars: 4 },
    });

    expect(bundle.source).toBe('bff');
    expect(bundle.suggestions).toHaveLength(2);
    expect(bundle.suggestions[0]?.candidates[0]?.name).toBe('尼达鲁尔山屋');
    expect(bundle.suggestions[1]?.status).toBe('missing');
  });
});

describe('normalizeAttractionExploreMap lodgingLegs', () => {
  it('parses approach leg without polyline', () => {
    const map = normalizeAttractionExploreMap({
      points: [],
      lodgingLegs: [
        {
          id: 'lodging-leg-1-381119',
          nightIndex: 1,
          from: { kind: 'day_anchor', placeId: 381388, label: '斯普伦吉桑杜尔' },
          to: { kind: 'suggested_lodging', placeId: 381119, label: '尼达鲁尔山屋' },
          distanceKm: 14.16,
          driveMinutesEstimate: 17,
          kind: 'approach',
        },
      ],
    });

    expect(map.lodgingLegs).toHaveLength(1);
    expect(map.lodgingLegs?.[0]?.from?.label).toBe('斯普伦吉桑杜尔');
    expect(map.lodgingLegs?.[0]?.driveMinutes).toBe(17);
    expect(formatLodgingLegLabel(map.lodgingLegs![0]!)).toContain('斯普伦吉桑杜尔');
  });
});

describe('mergeLodgingCopilotSuggestions', () => {
  it('adds lodging suggestions when nights are missing', () => {
    const trip = makeTrip(2);
    const coverage = buildArrangeLodgingCoverageSummary(trip, new Map());
    const bundle = resolveArrangeLodgingSuggestionsBundle({ trip, lodgingCoverage: coverage });
    const merged = mergeLodgingCopilotSuggestions([], coverage, bundle);

    expect(merged.some((item) => item.kind === 'suggest_lodging_for_day')).toBe(true);
  });
});

describe('buildLodgingMapPointsFromItinerary', () => {
  it('projects booked lodging onto the map', () => {
    const trip = makeTrip(2);
    const day = trip.TripDay![0]!;
    const map = new Map<string, ItineraryItemDetail[]>([
      [
        day.date,
        [
          {
            id: 'h1',
            tripDayId: day.id,
            type: 'HOTEL',
            costCategory: 'ACCOMMODATION',
            Place: { nameCN: 'Test Hotel', lat: 64.1, lng: -21.9 },
          } as ItineraryItemDetail,
        ],
      ],
    ]);
    const coverage = buildArrangeLodgingCoverageSummary(trip, map);
    const bundle = resolveArrangeLodgingSuggestionsBundle({ trip, lodgingCoverage: coverage });
    const points = buildLodgingMapPointsFromItinerary({
      trip,
      itineraryByDay: map,
      bundle,
    });

    expect(points).toHaveLength(1);
    expect(points[0]?.kind).toBe('lodging');
    expect(points[0]?.name).toBe('Test Hotel');
  });
});

describe('mergeMapPointsWithLodging', () => {
  it('deduplicates by point id', () => {
    const base: AttractionExploreMapPoint[] = [
      { id: 'a', name: 'A', lat: 1, lng: 2, kind: 'candidate' },
    ];
    const lodging: AttractionExploreMapPoint[] = [
      { id: 'a', name: 'dup', lat: 1, lng: 2, kind: 'lodging' },
      { id: 'b', name: 'Hotel', lat: 3, lng: 4, kind: 'lodging' },
    ];
    const merged = mergeMapPointsWithLodging(base, lodging);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.name).toBe('A');
    expect(merged[1]?.id).toBe('b');
  });
});
