import { describe, expect, it } from 'vitest';
import {
  buildExecuteMemberStatusItems,
  buildExecuteResourceItems,
  buildExecuteTransportSnapshot,
} from './execute-status-sidebar.util';

describe('execute-status-sidebar.util', () => {
  it('buildExecuteMemberStatusItems maps thermometer cards', () => {
    const members = buildExecuteMemberStatusItems({
      thermometer: {
        tripId: 't1',
        dayNumber: 1,
        level: 'green',
        score: 0.8,
        factors: [],
        visible: true,
        computedAt: '',
        memberCards: [
          { userId: '1', displayName: 'Abu', level: 'green' },
          { userId: '2', displayName: 'Dr.Dre', level: 'orange' },
        ],
      },
    });

    expect(members[0]?.conditionLabel).toBe('状态良好');
    expect(members[0]?.activityLabel).toBe('驾驶中');
    expect(members[1]?.conditionLabel).toBe('轻微疲劳');
    expect(members[1]?.activityLabel).toBe('休息中');
  });

  it('buildExecuteTransportSnapshot includes delay and road badge', () => {
    const transport = buildExecuteTransportSnapshot({
      trip: { destination: 'IS', metadata: { vehicleName: '丰田 HiAce 4WD' } } as never,
      tripState: { nextStop: { placeId: 1, placeName: '冰川营地停车场', startTime: '' } } as never,
      executionAdvisory: {
        currentState: { currentTime: '', delayMinutes: 25 },
        realtimeRisks: { road: 'F570 部分路段强风' },
      } as never,
      nextStopPlaceName: '冰川营地停车场',
      arrivalTimeLabel: '12:05',
    });

    expect(transport.vehicleLabel).toBe('丰田 HiAce 4WD');
    expect(transport.vehicleStatus).toBe('行驶中');
    expect(transport.arrivalDelayMinutes).toBe(25);
    expect(transport.roadConditionBadge).toBe('谨慎驾驶');
  });

  it('buildExecuteResourceItems infers categories and booking tone', () => {
    const resources = buildExecuteResourceItems({
      todaySchedule: {
        date: '2026-07-16',
        persisted: true,
        schedule: {
          items: [
            {
              placeId: 1,
              placeName: '冰川徒步 (IceFlow)',
              type: 'ACTIVITY',
              startTime: '',
              endTime: '',
              metadata: { bookingStatus: 'NEED_BOOKING' },
            },
            {
              placeId: 2,
              placeName: 'Hotel Breidavik',
              type: 'ACCOMMODATION',
              startTime: '',
              endTime: '',
              metadata: { bookingStatus: 'BOOKED' },
            },
          ],
        },
      },
    });

    expect(resources[0]?.statusLabel).toBe('待确认');
    expect(resources[0]?.statusTone).toBe('warning');
    expect(resources[1]?.statusLabel).toBe('今晚入住');
    expect(resources[1]?.category).toBe('hotel');
  });
});
