import type { TripDetail } from '@/types/trip';

/** 从 trip.metadata 读取 constraintsVersion（写接口乐观锁） */
export function readTripConstraintsVersion(trip: TripDetail | null | undefined): number | undefined {
  const meta = trip?.metadata as Record<string, unknown> | null | undefined;
  const version = meta?.constraintsVersion;
  return typeof version === 'number' && Number.isFinite(version) ? version : undefined;
}

export function applyTripConstraintsVersion(
  trip: TripDetail | null | undefined,
  nextVersion: number | undefined,
): TripDetail | null | undefined {
  if (!trip || nextVersion == null) return trip;
  return {
    ...trip,
    metadata: {
      ...(trip.metadata ?? {}),
      constraintsVersion: nextVersion,
    },
  };
}
