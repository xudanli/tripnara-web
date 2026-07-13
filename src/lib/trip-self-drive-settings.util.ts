import type { TripDetail } from '@/types/trip';
import type { SelfDriveProfile } from '@/types/trip-executability';
import type {
  DriverExperienceLevel,
  PutTripSelfDriveMetadata,
  SelfDriveVehicleType,
} from '@/types/tep-item-note';

export interface SelfDriveSettingsFormValues {
  vehicleType: SelfDriveVehicleType;
  avoidNightDriving: boolean;
  maxDailyDriveMinutes: string;
  driverExperienceLevel: DriverExperienceLevel;
}

export const VEHICLE_TYPE_OPTIONS: Array<{ value: SelfDriveVehicleType; label: string }> = [
  { value: '2WD', label: '2WD' },
  { value: '4WD', label: '4WD' },
  { value: 'AWD', label: 'AWD' },
  { value: 'CAMPERVAN', label: '房车' },
];

export const DRIVER_EXPERIENCE_OPTIONS: Array<{ value: DriverExperienceLevel; label: string }> = [
  { value: 'NOVICE_ABROAD', label: '新手（海外）' },
  { value: 'INTERMEDIATE', label: '中级' },
  { value: 'EXPERIENCED', label: '老手' },
];

export function vehicleSourceHint(source?: string | null): string | null {
  switch (source) {
    case 'PACK_DEFAULT':
      return '当前按默认 2WD 评估，请确认租车车型';
    case 'EXPLORATION':
      return '来自探索条件';
    default:
      return null;
  }
}

function readMetadataConstraints(trip?: TripDetail | null): Record<string, unknown> {
  const meta = trip?.metadata as { constraints?: Record<string, unknown> } | undefined;
  return meta?.constraints ?? {};
}

function readMetadataRoot(trip?: TripDetail | null): Record<string, unknown> {
  const meta = trip?.metadata;
  return meta && typeof meta === 'object' && !Array.isArray(meta)
    ? (meta as Record<string, unknown>)
    : {};
}

export function readSelfDriveSettingsFormValues(
  trip?: TripDetail | null,
  profile?: SelfDriveProfile | null,
): SelfDriveSettingsFormValues {
  const meta = readMetadataRoot(trip);
  const constraints = readMetadataConstraints(trip);
  const noNight = constraints.noNightDrive as { enabled?: boolean } | undefined;

  const vehicleFromMeta = constraints.vehicle_type as SelfDriveVehicleType | undefined;
  const vehicleFromProfile = profile?.vehicle.vehicleType;
  const vehicleType =
    vehicleFromMeta ??
    (vehicleFromProfile && vehicleFromProfile !== 'OTHER'
      ? (vehicleFromProfile as SelfDriveVehicleType)
      : '2WD');

  const maxMinutes =
    (constraints.maxDailyDriveMinutes as number | undefined) ??
    profile?.drivingPolicy.maxDailyDriveMinutes;

  const avoidNightDriving =
    noNight?.enabled === true ||
    profile?.drivingPolicy.nightDrivingPreference === 'AVOID' ||
    profile?.drivingPolicy.nightDrivingAllowed === false;

  const driverExperienceLevel =
    (meta.driverExperienceLevel as DriverExperienceLevel | undefined) ?? 'INTERMEDIATE';

  return {
    vehicleType,
    avoidNightDriving,
    maxDailyDriveMinutes: maxMinutes != null && maxMinutes > 0 ? String(maxMinutes) : '',
    driverExperienceLevel,
  };
}

export function buildSelfDriveMetadataPatch(
  form: SelfDriveSettingsFormValues,
): PutTripSelfDriveMetadata {
  const maxDailyDriveMinutes = form.maxDailyDriveMinutes.trim()
    ? Number.parseInt(form.maxDailyDriveMinutes, 10)
    : undefined;

  return {
    metadata: {
      vehicleDeclaredByUser: true,
      driverExperienceLevel: form.driverExperienceLevel,
      constraints: {
        vehicle_type: form.vehicleType,
        noNightDrive: { enabled: form.avoidNightDriving },
        ...(maxDailyDriveMinutes != null && Number.isFinite(maxDailyDriveMinutes)
          ? { maxDailyDriveMinutes }
          : {}),
      },
    },
  };
}
