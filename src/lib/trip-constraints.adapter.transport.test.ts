import { describe, expect, it } from 'vitest';
import { tripConstraintToListEntry } from './trip-constraints.adapter';
import type { TripConstraint } from '@/types/trip-constraints';

describe('tripConstraintToListEntry · transport mode', () => {
  it('formats DRIVING from value.raw as 自驾', () => {
    const constraint: TripConstraint = {
      id: 'c_transport_mode',
      name: '出行方式',
      type: 'HARD',
      scope: 'TRIP',
      category: 'TRANSPORT',
      value: {
        raw: 'DRIVING',
        judgmentRule: '出行方式',
      },
    };

    const entry = tripConstraintToListEntry(constraint);

    expect(entry.label).toBe('基础交通方式');
    expect(entry.value).toBe('自驾');
  });
});
