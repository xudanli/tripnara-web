import { describe, expect, it } from 'vitest';
import {
  filterProductFeasibilityIssues,
  parseItineraryProductNote,
  resolveItineraryProductBindView,
} from './itinerary-product-bind.util';
import type { ItineraryItem } from '@/types/trip';

function baseItem(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: 'item-1',
    type: 'ACTIVITY',
    startTime: '2026-07-18T09:00:00.000Z',
    endTime: '2026-07-18T12:00:00.000Z',
    placeName: 'Sólheimajökull',
    ...overrides,
  };
}

describe('itinerary-product-bind.util', () => {
  it('parses arriveLocal / hasFallbackPlan from note JSON', () => {
    expect(
      parseItineraryProductNote('{"arriveLocal":"08:30","hasFallbackPlan":true}'),
    ).toEqual({
      arriveLocal: '08:30',
      hasFallbackPlan: true,
      userNote: undefined,
    });
  });

  it('returns null when item has no product bind ids', () => {
    expect(resolveItineraryProductBindView(baseItem())).toBeNull();
  });

  it('prefers session meetTimeLocal for glacier walk card', () => {
    const view = resolveItineraryProductBindView(
      baseItem({
        productOfferingId: 'offer_demo_solheim_glacier_discovery',
        productSessionId: 'sess_demo_solheim_20260718_0900',
        experienceDefinitionId: 'exp_glacier',
        note: '{"arriveLocal":"08:30","hasFallbackPlan":true}',
        ProductSession: {
          meetTimeLocal: '08:00',
          meetingPointName: '停车场集合点',
          meetingPointAddress: 'Sólheimajökull parking',
          cancelDeadlineLocal: '07:00',
          requiredGear: ['冰爪', '头盔'],
          weatherDependency: 'HIGH',
          status: 'OPEN',
        },
        ExperienceDefinition: {
          name: '冰川徒步',
          categoryHint: 'GLACIER_HIKING',
        },
        ProductOffering: {
          title: 'Sólheimajökull Glacier Discovery',
        },
      }),
    );

    expect(view).not.toBeNull();
    expect(view!.bound).toBe(true);
    expect(view!.timeLabelOverride).toBe('集合 08:00');
    expect(view!.typeLabel).toBe('冰川徒步');
    expect(view!.productTitle).toBe('Sólheimajökull Glacier Discovery');
    expect(view!.subtitleLines.some((line) => line.includes('集合点'))).toBe(true);
    expect(view!.subtitleLines.some((line) => line.includes('冰爪'))).toBe(true);
    expect(view!.subtitleLines.some((line) => line.includes('Plan B'))).toBe(true);
    expect(view!.subtitleLines.some((line) => line.includes('取消截止'))).toBe(true);
  });

  it('filters product feasibility issue kinds', () => {
    const filtered = filterProductFeasibilityIssues([
      { issueKind: 'meeting_point_buffer' },
      { issueKind: 'same_day_travel' },
      { issueKind: 'product_weather_dependency' },
    ]);
    expect(filtered.map((i) => i.issueKind)).toEqual([
      'meeting_point_buffer',
      'product_weather_dependency',
    ]);
  });
});
