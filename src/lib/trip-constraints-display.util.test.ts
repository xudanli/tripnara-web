import { describe, expect, it } from 'vitest';
import {
  readMaxSegmentDistanceKmFromConstraint,
  refreshRoadClassTransportMessage,
  syncUltraLongDriveThresholdInText,
} from '@/lib/trip-constraints.adapter';
import type { TripConstraint } from '@/types/trip-constraints';

describe('syncUltraLongDriveThresholdInText', () => {
  it('replaces embedded km threshold with current max segment distance', () => {
    const text =
      '第5天 · 米湖 → 迪尔餐厅 (约 462 km) · 超长距离行驶 (>250km)，强烈建议分段或中途住宿';
    expect(syncUltraLongDriveThresholdInText(text, 380)).toContain('(>380km)');
    expect(syncUltraLongDriveThresholdInText(text, 380)).not.toContain('250km');
  });

  it('leaves unrelated text unchanged', () => {
    expect(syncUltraLongDriveThresholdInText('第1天行程较满', 380)).toBe('第1天行程较满');
  });
});

describe('refreshRoadClassTransportMessage', () => {
  it('aliases syncUltraLongDriveThresholdInText', () => {
    const text = '超长距离行驶 (>250km)';
    expect(refreshRoadClassTransportMessage(text, 380)).toBe(
      syncUltraLongDriveThresholdInText(text, 380),
    );
  });
});

describe('readMaxSegmentDistanceKmFromConstraint', () => {
  it('returns null when constraint missing', () => {
    expect(readMaxSegmentDistanceKmFromConstraint(null)).toBeNull();
    expect(readMaxSegmentDistanceKmFromConstraint(undefined)).toBeNull();
  });

  it('reads explicit km without defaulting to 250', () => {
    const constraint = {
      id: 'c_max_segment_distance',
      value: { maxSegmentDistanceKm: 380 },
    } as TripConstraint;
    expect(readMaxSegmentDistanceKmFromConstraint(constraint)).toBe(380);
  });
});
