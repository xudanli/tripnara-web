import { describe, expect, it } from 'vitest';
import {
  buildTravelProductActivityNote,
  buildTravelProductActivityWindow,
  isBookableTravelProductSession,
  pickMeetingPointPlaceId,
  travelProductLocalHmToUtcIso,
} from './travel-product-catalog.util';
import type { TravelProductOffering, TravelProductSession } from '@/types/travel-products';

describe('travel-product-catalog.util', () => {
  it('converts Reykjavik local meet time to UTC ISO', () => {
    const iso = travelProductLocalHmToUtcIso({
      localDate: '2026-07-18T00:00:00.000Z',
      hm: '08:30',
      timezone: 'Atlantic/Reykjavik',
    });
    // 夏季冰岛 UTC+0
    expect(iso).toBe('2026-07-18T08:30:00.000Z');
  });

  it('builds activity window from session locals', () => {
    const session: TravelProductSession = {
      id: 'sess_1',
      offeringId: 'offer_1',
      localDate: '2026-07-18T00:00:00.000Z',
      meetTimeLocal: '08:30',
      startTimeLocal: '09:00',
      endTimeLocal: '12:00',
      timezone: 'Atlantic/Reykjavik',
      status: 'SCHEDULED',
    };
    const window = buildTravelProductActivityWindow(session);
    expect(window.startTimeIso).toBe('2026-07-18T09:00:00.000Z');
    expect(window.endTimeIso).toBe('2026-07-18T12:00:00.000Z');
    expect(window.meetTimeLocal).toBe('08:30');
  });

  it('filters blocked session statuses', () => {
    expect(
      isBookableTravelProductSession({
        id: 'a',
        offeringId: 'o',
        localDate: '2026-07-18',
        status: 'WEATHER_HOLD',
      }),
    ).toBe(false);
    expect(
      isBookableTravelProductSession({
        id: 'b',
        offeringId: 'o',
        localDate: '2026-07-18',
        status: 'SCHEDULED',
        capacityRemaining: 3,
      }),
    ).toBe(true);
  });

  it('picks MEETING_POINT placeId', () => {
    const offering: TravelProductOffering = {
      id: 'offer',
      experienceDefinitionId: 'exp',
      placeLinks: [
        { placeId: 1, role: 'PARKING' },
        { placeId: 381081, role: 'MEETING_POINT' },
      ],
    };
    expect(pickMeetingPointPlaceId(offering)).toBe(381081);
  });

  it('lists experiences from place rows', async () => {
    const { resolvePlaceExperienceRow } = await import('./travel-product-catalog.util');
    const row = resolvePlaceExperienceRow({
      displayNameZh: '冰川徒步',
      isFeatured: true,
      experience: {
        id: 'exp_1',
        typicalDurationMin: 180,
      },
    });
    expect(row).toEqual({
      experienceDefinitionId: 'exp_1',
      displayNameZh: '冰川徒步',
      typicalDurationMin: 180,
      isFeatured: true,
    });
  });
});
