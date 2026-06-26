import { IntentTravelMode, type TripDetail } from '@/types/trip';
import { isCarRentalItineraryItem } from '@/lib/trip-car-rental-status';

const SELF_DRIVE_DESTINATION_HINTS = ['IS', 'ICELAND', '冰岛', 'NZ', 'NEW ZEALAND', '新西兰'];

/** 规划工作台是否应展示路线覆盖地图（自驾 / 混合自驾为主） */
export function isSelfDrivePlanningTrip(trip: TripDetail | null | undefined): boolean {
  if (!trip) return false;

  const mode = trip.pacingConfig?.travelMode;
  if (mode === IntentTravelMode.DRIVING) return true;
  if (mode === IntentTravelMode.MIXED) return true;

  const dest = (trip.destination || '').trim().toUpperCase();
  if (SELF_DRIVE_DESTINATION_HINTS.some((hint) => dest.includes(hint))) return true;

  const metadata = trip.metadata as { needsCarRental?: boolean; travelMode?: string } | null | undefined;
  if (metadata?.needsCarRental === true) return true;
  if (metadata?.travelMode === 'self_drive' || metadata?.travelMode === 'DRIVING') return true;

  if (tripHasCarRentalItinerary(trip)) return true;

  return false;
}

/** 行程已明确选择自驾（不含仅按目的地启发式推断） */
export function isExplicitSelfDriveTrip(trip: TripDetail | null | undefined): boolean {
  if (!trip) return false;

  const mode = trip.pacingConfig?.travelMode;
  if (mode === IntentTravelMode.DRIVING) return true;

  const metadata = trip.metadata as {
    needsCarRental?: boolean;
    travelMode?: string;
  } | null | undefined;
  if (metadata?.needsCarRental === true) return true;
  if (metadata?.travelMode === 'self_drive' || metadata?.travelMode === 'DRIVING') {
    return true;
  }

  if (tripHasCarRentalItinerary(trip)) return true;

  return false;
}

/** 行程时间轴上是否已有租车项（取车/还车） */
export function tripHasCarRentalItinerary(trip: TripDetail | null | undefined): boolean {
  if (!trip?.TripDay?.length) return false;
  for (const day of trip.TripDay) {
    for (const item of day.ItineraryItem ?? []) {
      if (isCarRentalItineraryItem(item)) return true;
    }
  }
  return false;
}

/** 可执行性修复建议过滤：自驾 / 已租车语境 */
export function isSelfDriveTripContext(trip: TripDetail | null | undefined): boolean {
  return isSelfDrivePlanningTrip(trip) || isExplicitSelfDriveTrip(trip);
}
