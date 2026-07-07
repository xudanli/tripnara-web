import { describe, expect, it } from 'vitest';
import {
  buildMemberOptionsFromContract,
  buildRouteSegmentOptionsFromTrip,
  resolvePrimaryDriverMemberId,
} from './constraint-scope-options.util';
import type { TripDetail } from '@/types/trip';

describe('constraint-scope-options.util', () => {
  it('builds member options from teamGovernance', () => {
    const options = buildMemberOptionsFromContract(
      {
        members: [
          { id: 'u1', name: 'Alice', role: '主驾驶人' },
          { id: 'u2', name: 'Bob', role: '乘客' },
        ],
      },
      null,
    );
    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({ id: 'u1', label: 'Alice', role: '主驾驶人' });
  });

  it('falls back to trip travelers when governance is empty', () => {
    const trip = {
      travelers: [{ type: 'ADULT' as const, count: 2 }],
    } as TripDetail;
    const options = buildMemberOptionsFromContract(null, trip);
    expect(options).toHaveLength(1);
    expect(options[0]?.label).toContain('成人');
  });

  it('resolves primary driver from role', () => {
    const id = resolvePrimaryDriverMemberId(
      { members: [{ id: 'drv', name: 'Lee', role: '主驾驶人' }] },
      null,
    );
    expect(id).toBe('drv');
  });

  it('builds route segment options from trip days', () => {
    const trip = {
      TripDay: [
        {
          id: 'd1',
          date: '2026-07-01',
          ItineraryItem: [
            { id: 'a', type: 'ACTIVITY', placeName: '雷克雅未克' },
            { id: 'b', type: 'ACTIVITY', placeName: '黄金圈' },
          ],
        },
        {
          id: 'd2',
          date: '2026-07-02',
          ItineraryItem: [
            { id: 'c', type: 'ACTIVITY', placeName: '维克' },
            { id: 'd', type: 'ACTIVITY', placeName: '冰河湖' },
          ],
        },
      ],
    } as TripDetail;

    const options = buildRouteSegmentOptionsFromTrip(trip);
    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({
      segmentId: 'a__b',
      dayNumber: 1,
      fromItemId: 'a',
      toItemId: 'b',
    });
    expect(options[0]?.label).toContain('D1');
    expect(options[1]?.segmentId).toBe('c__d');
  });
});
