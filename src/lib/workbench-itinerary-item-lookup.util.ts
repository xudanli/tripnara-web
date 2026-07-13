import type { ItineraryItemDetail, TripDetail } from '@/types/trip';

function normalizeDayDate(date: string): string {
  return date.includes('T') ? date.split('T')[0]! : date;
}

export function findItineraryItemById(
  itineraryByDay: Map<string, ItineraryItemDetail[]>,
  itemId: string,
): ItineraryItemDetail | null {
  for (const items of itineraryByDay.values()) {
    const found = items.find((item) => item.id === itemId);
    if (found) return found;
  }
  return null;
}

export function findItineraryItemContext(input: {
  trip: TripDetail | null;
  itineraryByDay: Map<string, ItineraryItemDetail[]>;
  itemId: string;
}): { item: ItineraryItemDetail; dayIndex: number } | null {
  const days = input.trip?.TripDay ?? [];
  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const day = days[dayIndex]!;
    const norm = normalizeDayDate(day.date);
    const items =
      input.itineraryByDay.get(day.date) ??
      input.itineraryByDay.get(norm) ??
      day.ItineraryItem ??
      [];
    const item = items.find((entry) => entry.id === input.itemId);
    if (item) return { item, dayIndex };
  }

  const fallback = findItineraryItemById(input.itineraryByDay, input.itemId);
  if (!fallback) return null;
  return { item: fallback, dayIndex: 0 };
}

export function resolveWorkbenchDefaultWeatherLocation(
  trip: TripDetail | null | undefined,
): { lat: number; lng: number } | null {
  const coords: Record<string, { lat: number; lng: number }> = {
    IS: { lat: 64.1466, lng: -21.9426 },
    JP: { lat: 35.6762, lng: 139.6503 },
    TH: { lat: 13.7563, lng: 100.5018 },
    KR: { lat: 37.5665, lng: 126.9780 },
    US: { lat: 40.7128, lng: -74.0060 },
    GB: { lat: 51.5074, lng: -0.1278 },
    FR: { lat: 48.8566, lng: 2.3522 },
    CN: { lat: 39.9042, lng: 116.4074 },
    SG: { lat: 1.3521, lng: 103.8198 },
    AU: { lat: -33.8688, lng: 151.2093 },
    NZ: { lat: -36.8485, lng: 174.7633 },
    DE: { lat: 52.52, lng: 13.405 },
    IT: { lat: 41.9028, lng: 12.4964 },
    ES: { lat: 40.4168, lng: -3.7038 },
  };
  if (!trip?.destination) return null;
  const countryCode = trip.destination.split(',')[0]?.trim().toUpperCase();
  return countryCode ? coords[countryCode] ?? null : null;
}
