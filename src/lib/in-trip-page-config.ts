import type { TripDetail } from '@/types/trip';
import { getTripHikingProfile } from '@/lib/trip-hiking';
import { resolveTripContentMode } from '@/lib/trip-content-mode';

/** 行中模块展示所依据的行程形态 */
export type InTripTripKind = 'hiking' | 'multi_party' | 'poi_drive' | 'default';

export type InTripModuleKey =
  | 'today'
  | 'experience'
  | 'money'
  | 'pulse'
  | 'split'
  | 'environment'
  | 'realtime'
  | 'postTripSummary';

export type InTripModuleVisibility = Record<InTripModuleKey, boolean>;

function countTravelers(trip: TripDetail | null | undefined): number {
  if (!trip) return 1;
  const fromMeta = trip.metadata?.teamMemberCount ?? trip.metadata?.memberCount;
  if (typeof fromMeta === 'number' && fromMeta > 0) return fromMeta;
  if (trip.travelers?.length) return trip.travelers.length;
  return 1;
}

/** 按行程类型决定 M7–M11 模块默认是否启用 */
export function resolveInTripTripKind(trip: TripDetail | null | undefined): InTripTripKind {
  if (!trip) return 'default';

  const hikingProfile = getTripHikingProfile(trip);
  if (hikingProfile === 'primary' || hikingProfile === 'embedded') {
    return 'hiking';
  }

  if (countTravelers(trip) > 1) {
    return 'multi_party';
  }

  const mode = resolveTripContentMode(trip);
  if (mode === 'poi_timeline') {
    const transport =
      (trip.metadata?.transport as string | undefined) ??
      (trip.metadata?.travelMode as string | undefined);
    if (transport === 'car' || transport === 'drive' || transport === '自驾') {
      return 'poi_drive';
    }
    return 'poi_drive';
  }

  return 'default';
}

const MODULE_MATRIX: Record<InTripTripKind, InTripModuleVisibility> = {
  hiking: {
    today: true,
    experience: true,
    money: true,
    pulse: true,
    split: false,
    environment: true,
    realtime: true,
    postTripSummary: true,
  },
  multi_party: {
    today: true,
    experience: true,
    money: true,
    pulse: true,
    split: true,
    environment: true,
    realtime: true,
    postTripSummary: true,
  },
  poi_drive: {
    today: true,
    experience: true,
    money: true,
    pulse: false,
    split: false,
    environment: true,
    realtime: true,
    postTripSummary: true,
  },
  default: {
    today: true,
    experience: true,
    money: true,
    pulse: true,
    split: true,
    environment: true,
    realtime: true,
    postTripSummary: true,
  },
};

export function getInTripModuleVisibility(
  trip: TripDetail | null | undefined
): InTripModuleVisibility {
  const kind = resolveInTripTripKind(trip);
  return MODULE_MATRIX[kind];
}
