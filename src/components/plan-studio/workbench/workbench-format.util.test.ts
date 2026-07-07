import { describe, expect, it } from 'vitest';
import {
  formatIsoDateTimesInDisplayText,
  formatIsoInstantForWorkbench,
  normalizeRouteSummaryStopName,
  resolveWorkbenchTimelineItemTitle,
  routeStopsFromTrip,
} from './workbench-format.util';

describe('workbench-format.util ISO display', () => {
  it('formats ISO instant in destination timezone', () => {
    expect(
      formatIsoInstantForWorkbench('2026-06-20T12:21:00.000+00:00', 'Atlantic/Reykjavik'),
    ).toBe('6月20日 12:21');
  });

  it('replaces ISO datetimes embedded in BFF prose', () => {
    const raw =
      '将盖歇尔间歇泉开始时间调整到 2026-06-20T12:21:00.000+00:00，补足交通衔接。';
    expect(formatIsoDateTimesInDisplayText(raw, 'Atlantic/Reykjavik')).toBe(
      '将盖歇尔间歇泉开始时间调整到 6月20日 12:21，补足交通衔接。',
    );
  });

  it('leaves non-ISO text unchanged', () => {
    expect(formatIsoDateTimesInDisplayText('预计操作耗时 1分钟')).toBe('预计操作耗时 1分钟');
  });
});

describe('routeStopsFromTrip', () => {
  it('returns ordered unique POI names across trip days', () => {
    const trip = {
      TripDay: [
        { id: 'd1', date: '2026-07-15', ItineraryItem: [] },
        { id: 'd3', date: '2026-07-17', ItineraryItem: [] },
      ],
    } as import('@/types/trip').TripDetail;

    const map = new Map<string, import('@/types/trip').ItineraryItemDetail[]>([
      [
        '2026-07-15',
        [
          { id: '1', type: 'ACTIVITY', placeName: '蓝湖温泉' } as import('@/types/trip').ItineraryItemDetail,
        ],
      ],
      [
        '2026-07-17',
        [
          { id: '2', type: 'ACTIVITY', placeName: '塞里雅兰瀑布' } as import('@/types/trip').ItineraryItemDetail,
          { id: '3', type: 'ACTIVITY', placeName: '斯科加瀑布' } as import('@/types/trip').ItineraryItemDetail,
        ],
      ],
    ]);

    expect(routeStopsFromTrip(trip, map)).toEqual([
      '蓝湖温泉',
      '塞里雅兰瀑布',
      '斯科加瀑布',
    ]);
  });

  it('strips guide-adjustment prefix from route summary stops', () => {
    const trip = {
      TripDay: [{ id: 'd1', date: '2026-07-15', ItineraryItem: [] }],
    } as import('@/types/trip').TripDetail;
    const map = new Map<string, import('@/types/trip').ItineraryItemDetail[]>([
      [
        '2026-07-15',
        [
          {
            id: '1',
            type: 'ACTIVITY',
            placeName: '[攻略调整] 蓝湖温泉',
          } as import('@/types/trip').ItineraryItemDetail,
          {
            id: '2',
            type: 'ACTIVITY',
            note: '[攻略调整]',
          } as import('@/types/trip').ItineraryItemDetail,
        ],
      ],
    ]);
    expect(routeStopsFromTrip(trip, map)).toEqual(['蓝湖温泉']);
    expect(normalizeRouteSummaryStopName('[攻略调整] 塞里雅兰瀑布')).toBe('塞里雅兰瀑布');
  });
});

describe('resolveWorkbenchTimelineItemTitle', () => {
  it('prefers Place.nameCN over placeName and displayName', () => {
    expect(
      resolveWorkbenchTimelineItemTitle({
        id: '1',
        type: 'ACTIVITY',
        startTime: '',
        endTime: '',
        placeName: '凯夫拉维克机场',
        Place: { id: 1, displayName: 'Keflavík Airport', nameCN: '凯夫拉维克国际机场', nameEN: 'Keflavík', category: 'ATTRACTION', address: '' },
      } as import('@/types/trip').ItineraryItemDetail),
    ).toBe('凯夫拉维克国际机场');

    expect(
      resolveWorkbenchTimelineItemTitle({
        id: '2',
        type: 'ACTIVITY',
        startTime: '',
        endTime: '',
        Place: { id: 2, displayName: 'Seljalandsfoss 瀑布', nameCN: '', nameEN: 'Seljalandsfoss', category: 'ATTRACTION', address: '' },
      } as import('@/types/trip').ItineraryItemDetail),
    ).toBe('Seljalandsfoss 瀑布');
  });

  it('strips guide-adjustment prefix from timeline titles', () => {
    expect(
      resolveWorkbenchTimelineItemTitle({
        id: '3',
        type: 'ACTIVITY',
        startTime: '',
        endTime: '',
        placeName: '[攻略调整] 蓝湖温泉',
      } as import('@/types/trip').ItineraryItemDetail),
    ).toBe('蓝湖温泉');
  });
});
