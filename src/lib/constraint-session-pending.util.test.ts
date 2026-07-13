import { describe, expect, it } from 'vitest';
import { resolveApiManagedHardConstraintApiId } from '@/components/plan-studio/workbench/constraint-console-view.util';
import { TRIP_CONSTRAINT_LEGACY_IDS } from '@/types/trip-constraints';

describe('constraint-session-pending.util helpers', () => {
  it('maps api-managed draft ids to correct legacy constraint ids', () => {
    expect(resolveApiManagedHardConstraintApiId('max_segment_distance')).toBe(
      TRIP_CONSTRAINT_LEGACY_IDS.MAX_SEGMENT_DISTANCE,
    );
    expect(resolveApiManagedHardConstraintApiId('no_night_drive')).toBe(
      TRIP_CONSTRAINT_LEGACY_IDS.NO_NIGHT_DRIVE,
    );
    expect(resolveApiManagedHardConstraintApiId('c_no_night_drive')).toBe(
      TRIP_CONSTRAINT_LEGACY_IDS.NO_NIGHT_DRIVE,
    );
  });
});
