import { describe, expect, it } from 'vitest';
import {
  formatIsoDateTimesInDisplayText,
  formatIsoInstantForWorkbench,
  resolveWorkbenchTimelineItemTitle,
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

describe('resolveWorkbenchTimelineItemTitle', () => {
  it('prefers placeName then Place.displayName', () => {
    expect(
      resolveWorkbenchTimelineItemTitle({
        id: '1',
        type: 'ACTIVITY',
        startTime: '',
        endTime: '',
        placeName: '凯夫拉维克机场',
        Place: { id: 1, displayName: 'Keflavík Airport', nameCN: '凯夫拉维克', nameEN: 'Keflavík', category: 'ATTRACTION', address: '' },
      } as import('@/types/trip').ItineraryItemDetail),
    ).toBe('凯夫拉维克机场');

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
});
