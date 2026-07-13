import { describe, expect, it } from 'vitest';
import {
  isSelfDriveOnlyTransportContext,
  resolveConstraintTransportOptions,
  resolveConstraintTransportValue,
} from '@/lib/planning-constraint-edit-meta';
import { IntentTravelMode } from '@/types/trip';

describe('planning-constraint-edit-meta transport', () => {
  it('locks Iceland trips to self-drive only', () => {
    expect(isSelfDriveOnlyTransportContext('IS')).toBe(true);
    expect(isSelfDriveOnlyTransportContext('IS', 'self_drive_only')).toBe(true);
    expect(isSelfDriveOnlyTransportContext('JP')).toBe(false);
    expect(isSelfDriveOnlyTransportContext('IS', 'mixed')).toBe(false);
  });

  it('returns only driving option for Iceland', () => {
    expect(resolveConstraintTransportOptions({ destination: 'IS' })).toEqual([
      { value: IntentTravelMode.DRIVING, label: '自驾' },
    ]);
  });

  it('defaults Iceland transport to driving', () => {
    expect(
      resolveConstraintTransportValue({ destination: 'IS', pacingConfig: { travelers: [] } }),
    ).toBe(IntentTravelMode.DRIVING);
  });
});
