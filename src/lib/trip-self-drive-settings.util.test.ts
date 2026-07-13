import { describe, expect, it } from 'vitest';
import {
  buildSelfDriveMetadataPatch,
  readSelfDriveSettingsFormValues,
  vehicleSourceHint,
} from '@/lib/trip-self-drive-settings.util';
import type { TripDetail } from '@/types/trip';

describe('trip-self-drive-settings.util', () => {
  it('shows pack default hint', () => {
    expect(vehicleSourceHint('PACK_DEFAULT')).toContain('2WD');
  });

  it('reads form values from trip metadata and profile', () => {
    const trip = {
      metadata: {
        driverExperienceLevel: 'EXPERIENCED',
        constraints: {
          vehicle_type: '4WD',
          noNightDrive: { enabled: true },
          maxDailyDriveMinutes: 480,
        },
      },
    } as TripDetail;

    const form = readSelfDriveSettingsFormValues(trip, null);
    expect(form.vehicleType).toBe('4WD');
    expect(form.avoidNightDriving).toBe(true);
    expect(form.maxDailyDriveMinutes).toBe('480');
    expect(form.driverExperienceLevel).toBe('EXPERIENCED');
  });

  it('builds metadata patch for PUT /trips', () => {
    const patch = buildSelfDriveMetadataPatch({
      vehicleType: 'AWD',
      avoidNightDriving: true,
      maxDailyDriveMinutes: '360',
      driverExperienceLevel: 'INTERMEDIATE',
    });
    expect(patch.metadata.vehicleDeclaredByUser).toBe(true);
    expect(patch.metadata.constraints?.vehicle_type).toBe('AWD');
    expect(patch.metadata.constraints?.maxDailyDriveMinutes).toBe(360);
  });
});
