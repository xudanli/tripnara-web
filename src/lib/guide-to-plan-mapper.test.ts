import { describe, expect, it } from 'vitest';
import type { ItineraryDraftAccommodation } from '@/types/guide-to-plan-api';
import {
  formatItineraryDraftAccommodation,
  itineraryDraftToTableRows,
  routeStopsFromDraft,
  validateGuideLinkUrl,
} from '@/lib/guide-to-plan-mapper';

describe('formatItineraryDraftAccommodation', () => {
  it('formats hotel with name', () => {
    const acc: ItineraryDraftAccommodation = {
      name: '雷克雅未克中心酒店',
      type: 'hotel',
      source: 'guide',
    };
    expect(formatItineraryDraftAccommodation(acc)).toBe('雷克雅未克中心酒店');
  });

  it('formats area with areaHint', () => {
    const acc: ItineraryDraftAccommodation = {
      name: '冰岛南岸',
      type: 'area',
      source: 'inferred',
      areaHint: '建议住在维克镇附近',
    };
    expect(formatItineraryDraftAccommodation(acc)).toBe('建议住在维克镇附近');
  });

  it('supports legacy string accommodation', () => {
    expect(formatItineraryDraftAccommodation('霍芬镇')).toBe('霍芬镇');
  });
});

describe('itineraryDraftToTableRows', () => {
  it('uses structured accommodation and excludes hotel from route', () => {
    const rows = itineraryDraftToTableRows({
      days: [
        {
          day: 1,
          date: '2026-08-01',
          drivingMinutesEstimate: 120,
          drivingKm: 180,
          accommodation: {
            name: '维克镇',
            type: 'hotel',
            source: 'guide',
          },
          items: [
            { name: '塞里雅兰瀑布', type: 'poi', travelMinutesFromPrev: 60 },
            { name: '斯科加瀑布', type: 'poi', travelMinutesFromPrev: 60, travelDistanceKm: 90 },
            { name: '维克镇', type: 'hotel', startTime: '2026-08-01T20:00:00.000Z', endTime: '2026-08-02T08:00:00.000Z' },
          ],
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.route).toBe('塞里雅兰瀑布 → 斯科加瀑布');
    expect(rows[0]?.stay).toBe('维克镇');
    expect(rows[0]?.driveKm).toBe('180 km');
    expect(rows[0]?.driveHours).toBe('2h');
  });

  it('estimates km from driving minutes when km missing', () => {
    const rows = itineraryDraftToTableRows({
      days: [
        {
          day: 2,
          drivingMinutesEstimate: 60,
          accommodation: {
            name: '霍芬镇',
            type: 'area',
            source: 'inferred',
            areaHint: '霍芬镇',
          },
          items: [{ name: '冰河湖', type: 'poi' }],
        },
      ],
    });

    expect(rows[0]?.driveKm).toBe('50 km');
    expect(rows[0]?.stay).toBe('霍芬镇');
  });

  it('falls back to overnight item when accommodation object missing', () => {
    const rows = itineraryDraftToTableRows({
      days: [
        {
          day: 3,
          items: [
            { name: '黑沙滩', type: 'poi' },
            { name: '塞济斯菲厄泽', type: 'hotel', startTime: '2026-08-03T20:00:00.000Z', endTime: '2026-08-04T08:00:00.000Z' },
          ],
        },
      ],
    });

    expect(rows[0]?.route).toBe('黑沙滩');
    expect(rows[0]?.stay).toBe('塞济斯菲厄泽');
  });
});

describe('routeStopsFromDraft', () => {
  it('collects daytime items only', () => {
    const stops = routeStopsFromDraft({
      days: [
        {
          items: [
            { name: '蓝湖温泉', type: 'poi' },
            { name: '雷克雅未克', type: 'hotel' },
          ],
        },
      ],
    });

    expect(stops).toEqual(['蓝湖温泉']);
  });
});

describe('validateGuideLinkUrl', () => {
  it('accepts https URL', () => {
    expect(validateGuideLinkUrl('https://www.xiaohongshu.com/explore/abc')).toBeNull();
  });

  it('accepts URL without scheme', () => {
    expect(validateGuideLinkUrl('www.example.com/path')).toBeNull();
  });

  it('rejects empty', () => {
    expect(validateGuideLinkUrl('   ')).toBeTruthy();
  });

  it('rejects invalid URL', () => {
    expect(validateGuideLinkUrl('not a url')).toBeTruthy();
  });
});
