import {
  analyzePoiBookingRequirement,
  collectTripBookingContexts,
  type PoiBookingProofContext,
} from '@/lib/feasibility-booking-proofs';
import {
  isCarRentalItineraryItem,
  resolveCarRentalBookingFromItems,
} from '@/lib/trip-car-rental-status';
import type { ItineraryItem, TripDetail } from '@/types/trip';

export type PreDepartureBookingStatus = 'confirmed' | 'pending' | 'required' | 'not_needed';

export interface PreDepartureBookingRow {
  id: string;
  kind: 'poi' | 'car_rental' | 'transport';
  dayNumber?: number;
  title: string;
  subtitle?: string;
  status: PreDepartureBookingStatus;
  confirmation?: string;
  bookingUrl?: string;
  itemId?: string;
}

function mapPoiStatus(status: PoiBookingProofContext['status']): PreDepartureBookingStatus {
  if (status === 'booked') return 'confirmed';
  if (status === 'pending') return 'pending';
  return 'required';
}

function mapCarRentalStatus(
  status: ReturnType<typeof resolveCarRentalBookingFromItems>['status'],
): PreDepartureBookingStatus {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'need_booking' || status === 'pending' || status === 'quoted') return 'pending';
  return 'required';
}

function flattenItineraryItems(trip: TripDetail): ItineraryItem[] {
  return (trip.TripDay ?? []).flatMap((day) => day.ItineraryItem ?? []);
}

/** 从行程项投影行前预订确认列表（POI + 租车 + 显式标记项） */
export function collectPreDepartureBookings(trip: TripDetail | null | undefined): PreDepartureBookingRow[] {
  if (!trip) return [];

  const rows: PreDepartureBookingRow[] = [];
  const seenItemIds = new Set<string>();

  for (const ctx of collectTripBookingContexts(trip)) {
    seenItemIds.add(ctx.item.id);
    rows.push({
      id: ctx.item.id,
      kind: isCarRentalItineraryItem(ctx.item) ? 'car_rental' : 'poi',
      dayNumber: ctx.dayNumber,
      title: ctx.placeLabel,
      subtitle: ctx.reason,
      status: mapPoiStatus(ctx.status),
      confirmation: ctx.confirmation,
      bookingUrl: ctx.bookingUrl,
      itemId: ctx.item.id,
    });
  }

  const allItems = flattenItineraryItems(trip);
  const carSnapshot = resolveCarRentalBookingFromItems(allItems);
  if (carSnapshot.item && !seenItemIds.has(carSnapshot.item.id)) {
    const label =
      carSnapshot.item.Place?.nameCN ||
      carSnapshot.item.Place?.nameEN ||
      carSnapshot.item.note?.split('\n')[0] ||
      '租车';
    rows.unshift({
      id: carSnapshot.item.id,
      kind: 'car_rental',
      title: label,
      subtitle: '全程租车',
      status: mapCarRentalStatus(carSnapshot.status),
      confirmation: carSnapshot.confirmation,
      bookingUrl: carSnapshot.bookingUrl,
      itemId: carSnapshot.item.id,
    });
    seenItemIds.add(carSnapshot.item.id);
  }

  for (const day of trip.TripDay ?? []) {
    for (const item of day.ItineraryItem ?? []) {
      if (seenItemIds.has(item.id)) continue;
      if (!item.bookingStatus && !item.bookingConfirmation) continue;

      const analysis = analyzePoiBookingRequirement(item);
      let status: PreDepartureBookingStatus = 'not_needed';
      if (item.bookingStatus === 'BOOKED' || item.bookingConfirmation) status = 'confirmed';
      else if (item.bookingStatus === 'NEED_BOOKING') status = 'pending';
      else if (item.bookingStatus === 'NO_BOOKING') status = 'not_needed';
      else status = mapPoiStatus(analysis.status);

      if (status === 'not_needed' && !item.bookingConfirmation) continue;

      const dayNumber = trip.TripDay?.indexOf(day);
      rows.push({
        id: item.id,
        kind: item.type === 'TRANSIT' || item.type === 'FLIGHT' || item.type === 'RAIL'
          ? 'transport'
          : isCarRentalItineraryItem(item)
            ? 'car_rental'
            : 'poi',
        dayNumber: dayNumber != null && dayNumber >= 0 ? dayNumber + 1 : undefined,
        title:
          item.Place?.nameCN ||
          item.Place?.nameEN ||
          item.note?.split('\n')[0] ||
          '行程项',
        subtitle: analysis.reason,
        status,
        confirmation: item.bookingConfirmation ?? undefined,
        bookingUrl: item.bookingUrl ?? undefined,
        itemId: item.id,
      });
    }
  }

  const rank: Record<PreDepartureBookingStatus, number> = {
    pending: 0,
    required: 1,
    confirmed: 2,
    not_needed: 3,
  };

  return rows.sort((a, b) => {
    const byStatus = rank[a.status] - rank[b.status];
    if (byStatus !== 0) return byStatus;
    return (a.dayNumber ?? 99) - (b.dayNumber ?? 99);
  });
}

export function summarizePreDepartureBookings(rows: PreDepartureBookingRow[]): {
  total: number;
  confirmed: number;
  pending: number;
  progressPct: number;
} {
  const actionable = rows.filter((r) => r.status !== 'not_needed');
  const total = actionable.length;
  const confirmed = actionable.filter((r) => r.status === 'confirmed').length;
  const pending = actionable.filter((r) => r.status === 'pending' || r.status === 'required').length;
  const progressPct = total > 0 ? Math.round((confirmed / total) * 100) : 100;
  return { total, confirmed, pending, progressPct };
}
