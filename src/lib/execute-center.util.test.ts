import { describe, expect, it } from 'vitest';
import {
  formatExecuteDayHeader,
  resolveExecuteTimelineRail,
  resolveGatheringSplitNote,
  resolveRouteProgressLabel,
  resolveWindWarningLabel,
} from './execute-center.util';

describe('execute-center.util', () => {
  it('formatExecuteDayHeader formats Chinese weekday', () => {
    expect(formatExecuteDayHeader(3, '2026-06-29T00:00:00.000Z')).toContain('Day 3');
  });

  it('resolveWindWarningLabel prefers weather badge', () => {
    expect(
      resolveWindWarningLabel({
        todayStatus: {
          currentTime: '11:32',
          weatherRisks: { badges: [{ label: '强风预警', variant: 'destructive' }] },
        },
      }),
    ).toBe('强风预警影响中');
  });

  it('resolveRouteProgressLabel joins origin and destination', () => {
    const label = resolveRouteProgressLabel({
      trip: {
        TripDay: [
          {
            id: 'd1',
            date: '2026-07-16T00:00:00.000Z',
            ItineraryItem: [
              {
                id: 'i1',
                placeId: 1,
                Place: { id: 1, nameCN: '丁基达尔斯村' },
              },
            ],
          },
        ],
      } as never,
      tripState: {
        currentItemId: 'i1',
        nextStop: { placeId: 2, placeName: '冰川营地停车场', startTime: '' },
      } as never,
      todaySchedule: { date: '2026-07-16T00:00:00.000Z', persisted: true, schedule: { items: [] } },
    });
    expect(label).toContain('丁基达尔斯村');
    expect(label).toContain('冰川营地停车场');
  });

  it('resolveGatheringSplitNote finds future split-like item', () => {
    const note = resolveGatheringSplitNote({
      todaySchedule: {
        date: '2026-07-16',
        persisted: true,
        schedule: {
          items: [
            {
              placeId: 1,
              placeName: '集合点 · 丁基达尔斯村',
              type: 'ACTIVITY',
              startTime: '2026-07-16T16:30:00.000Z',
              endTime: '2026-07-16T17:00:00.000Z',
            },
          ],
        },
      },
    });
    expect(note).toContain('集合');
  });

  it('resolveExecuteTimelineRail uses placeholders when schedule is empty', () => {
    const rail = resolveExecuteTimelineRail({
      trip: null,
      tripState: null,
      todaySchedule: null,
    });
    expect(rail.current.routeLabel).toBe('当前路段待同步');
    expect(rail.current.isPlaceholder).toBe(true);
    expect(rail.next.activityLabel).toBe('下一项活动待确认');
    expect(rail.next.isPlaceholder).toBe(true);
    expect(rail.gathering.isPlaceholder).toBe(true);
  });

  it('resolveExecuteTimelineRail derives next activity after next stop', () => {
    const rail = resolveExecuteTimelineRail({
      todaySchedule: {
        date: '2026-07-16',
        persisted: true,
        schedule: {
          items: [
            { placeId: 1, placeName: '丁基达尔斯村', type: 'ACTIVITY', startTime: '2026-07-16T08:00:00.000Z', endTime: '' },
            { placeId: 2, placeName: '冰川营地', type: 'ACTIVITY', startTime: '2026-07-16T11:00:00.000Z', endTime: '' },
            { placeId: 3, placeName: '冰川徒步体验', type: 'ACTIVITY', startTime: '2026-07-16T12:30:00.000Z', endTime: '' },
            { placeId: 4, placeName: '丁基达尔斯村', type: 'ACTIVITY', startTime: '2026-07-16T16:30:00.000Z', endTime: '' },
            { placeId: 5, placeName: '布迪尔温泉', type: 'ACTIVITY', startTime: '2026-07-16T17:30:00.000Z', endTime: '' },
          ],
        },
      },
      tripState: {
        nextStop: { placeId: 2, placeName: '冰川营地', startTime: '' },
      } as never,
      arrivalEta: '12:05',
    });
    expect(rail.current.routeLabel).toContain('冰川营地');
    expect(rail.next.activityLabel).toBe('冰川徒步体验');
    expect(rail.gathering.destination).toContain('布迪尔温泉');
  });
});
