import type { CostCategory, ItineraryItemType, TripDay } from '@/types/trip';
import { localTimeToUTC } from '@/utils/timezone';

export function normalizeTripDayDate(date: string): string {
  return date.includes('T') ? date.split('T')[0] : date;
}

/** 交通、酒店/住宿类行程项支持选择跨天结束 */
export function itineraryItemSupportsCrossDay(
  itemType: ItineraryItemType,
  placeCategory?: string | null,
  costCategory?: CostCategory | '' | null,
  displayRole?: import('@/lib/itinerary-special-display').ItinerarySpecialDisplayRole,
): boolean {
  if (displayRole === 'hotel' || displayRole === 'car_rental') return true;
  if (displayRole === 'landing_point' || displayRole === 'departure_point' || displayRole === 'normal') return false;
  if (itemType === 'TRANSIT') return true;
  if (placeCategory === 'HOTEL') return true;
  if (costCategory === 'ACCOMMODATION') return true;
  return false;
}

export function getEndDayOptions(tripDays: TripDay[], startTripDayId: string): TripDay[] {
  const idx = tripDays.findIndex((d) => d.id === startTripDayId);
  if (idx < 0) return tripDays.length ? [tripDays[0]] : [];
  return tripDays.slice(idx);
}

export function nextTripDay(tripDays: TripDay[], currentId: string): TripDay | undefined {
  const idx = tripDays.findIndex((d) => d.id === currentId);
  if (idx < 0 || idx >= tripDays.length - 1) return undefined;
  return tripDays[idx + 1];
}

export function buildItineraryItemUtcTimes(
  startDayDate: string,
  endDayDate: string,
  startTimeHm: string,
  endTimeHm: string,
  timezone: string,
): { startTimeUTC: string; endTimeUTC: string; startMs: number; endMs: number } {
  const startDate = normalizeTripDayDate(startDayDate);
  const endDate = normalizeTripDayDate(endDayDate);
  const startTimeUTC = localTimeToUTC(startDate, startTimeHm, timezone);
  const endTimeUTC = localTimeToUTC(endDate, endTimeHm, timezone);
  return {
    startTimeUTC,
    endTimeUTC,
    startMs: new Date(startTimeUTC).getTime(),
    endMs: new Date(endTimeUTC).getTime(),
  };
}

export function applyHotelCrossDayDefaults(
  tripDays: TripDay[],
  startTripDayId: string,
): { startTime: string; endTime: string; endTripDayId: string } {
  const next = nextTripDay(tripDays, startTripDayId);
  return {
    startTime: '20:00',
    endTime: '08:00',
    endTripDayId: next?.id ?? startTripDayId,
  };
}

const AIRPORT_NAME_RE = /机场|国际机场|airport|terminal|航站|aerodrome/i;

/** 机场 / 航站类 POI（仅需填写落地时间） */
export function isAirportHubPlace(place?: {
  category?: string | null;
  nameCN?: string | null;
  nameEN?: string | null;
}): boolean {
  if (!place) return false;
  const name = `${place.nameCN ?? ''} ${place.nameEN ?? ''}`.trim();
  if (AIRPORT_NAME_RE.test(name)) return true;
  if (place.category === 'TRANSIT_HUB' && /国际|枢纽|hub/i.test(name)) return true;
  return false;
}

export function addMinutesToTimeHm(hm: string, minutes: number): string {
  const [h, m] = hm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hm;
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/**
 * 机场落地：用户只填落地时刻，start 可为空语义；写入 start=落地、end=落地+缓冲（离站/出发）。
 */
export function buildAirportLandingUtcTimes(
  landingDayDate: string,
  landingHm: string,
  timezone: string,
  bufferMinutes = 30,
): { startTimeUTC: string; endTimeUTC: string; startMs: number; endMs: number } {
  const day = normalizeTripDayDate(landingDayDate);
  const startTimeUTC = localTimeToUTC(day, landingHm, timezone);
  const endHm = addMinutesToTimeHm(landingHm, bufferMinutes);
  const endTimeUTC = localTimeToUTC(day, endHm, timezone);
  return {
    startTimeUTC,
    endTimeUTC,
    startMs: new Date(startTimeUTC).getTime(),
    endMs: new Date(endTimeUTC).getTime(),
  };
}
