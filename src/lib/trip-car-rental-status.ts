import type { CarRentalItem } from '@/api/booking-com';
import type { Coordinates, CoverageMapResponse } from '@/api/readiness';
import type { ItineraryItem, TripDetail } from '@/types/trip';
import { getExplicitItinerarySpecialDisplayRole } from '@/lib/itinerary-special-display';

export type CarRentalBarStatus =
  | 'confirmed'
  | 'need_booking'
  | 'quoted'
  | 'pending'
  | 'missing_dates'
  | 'unavailable';

export interface CarRentalBookingSnapshot {
  status: CarRentalBarStatus;
  item?: ItineraryItem;
  confirmation?: string;
  bookingUrl?: string;
}

const CAR_RENTAL_HINT_RE =
  /租车|租\s*车|car\s*rental|rental\s*car|hire\s*car|取车|还车/i;

const DESTINATION_COORDS: Array<{
  match: (dest: string) => boolean;
  coords: Coordinates;
  location: string;
}> = [
  {
    match: (d) => /IS|ICELAND|冰岛/.test(d),
    coords: { lat: 64.128288, lng: -21.827774 },
    location: 'IS',
  },
  {
    match: (d) => /NZ|NEW\s*ZEALAND|新西兰/.test(d),
    coords: { lat: -36.848461, lng: 174.763336 },
    location: 'NZ',
  },
  {
    match: (d) => /JP|JAPAN|日本/.test(d),
    coords: { lat: 35.676422, lng: 139.650027 },
    location: 'JP',
  },
  {
    match: (d) => /US|USA|美国/.test(d),
    coords: { lat: 40.712776, lng: -74.005974 },
    location: 'US',
  },
];

function normalizeDate(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.includes('T') ? trimmed.split('T')[0] : trimmed;
}

function itemLabel(item: ItineraryItem): string {
  const place =
    item.Place?.nameCN?.trim() ||
    item.Place?.nameEN?.trim() ||
    '';
  return `${place} ${item.note ?? ''}`.trim();
}

export function isCarRentalItineraryItem(item: ItineraryItem): boolean {
  const explicit = getExplicitItinerarySpecialDisplayRole(item);
  if (explicit === 'car_rental') return true;
  if (explicit) return false;

  const label = itemLabel(item);
  if (CAR_RENTAL_HINT_RE.test(label)) return true;
  if (item.costCategory === 'TRANSPORTATION' && item.travelMode === 'DRIVING') {
    return CAR_RENTAL_HINT_RE.test(label);
  }
  const url = (item.bookingUrl ?? '').toLowerCase();
  return /rental|hire|car/.test(url);
}

/** 租车项展示名（取车点 / 供应商） */
export function getCarRentalDisplayLabel(item: ItineraryItem): string {
  const label = itemLabel(item);
  return label || '租车取车点';
}

/** 当日行程中的租车项（含取车时间） */
export function findCarRentalItemsWithPickupTime(items: ItineraryItem[]): ItineraryItem[] {
  return items.filter(
    (item) => isCarRentalItineraryItem(item) && Boolean(item.startTime?.trim()),
  );
}

/**
 * 自驾出发锚点：取不晚于目标活动的最近一次取车时间。
 */
export function resolveCarRentalPickupAnchor(
  dayItems: ItineraryItem[],
  beforeActivity?: ItineraryItem | null,
): ItineraryItem | null {
  const rentals = findCarRentalItemsWithPickupTime(dayItems);
  if (rentals.length === 0) return null;

  const sorted = [...rentals].sort(
    (a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime(),
  );

  if (beforeActivity?.startTime) {
    const actMs = new Date(beforeActivity.startTime).getTime();
    const eligible = sorted.filter(
      (item) => new Date(item.startTime!).getTime() <= actMs,
    );
    if (eligible.length > 0) return eligible[eligible.length - 1];
  }

  return sorted[0];
}

export function resolveCarRentalBookingFromItems(
  items: ItineraryItem[],
): CarRentalBookingSnapshot {
  const rentalItems = items.filter(isCarRentalItineraryItem);
  const booked = rentalItems.find((item) => item.bookingStatus === 'BOOKED');
  if (booked) {
    return {
      status: 'confirmed',
      item: booked,
      confirmation: booked.bookingConfirmation ?? undefined,
      bookingUrl: booked.bookingUrl ?? undefined,
    };
  }

  const needBooking = rentalItems.find((item) => item.bookingStatus === 'NEED_BOOKING');
  if (needBooking) {
    return {
      status: 'need_booking',
      item: needBooking,
      bookingUrl: needBooking.bookingUrl ?? undefined,
    };
  }

  if (rentalItems.length > 0) {
    return {
      status: 'need_booking',
      item: rentalItems[0],
      bookingUrl: rentalItems[0].bookingUrl ?? undefined,
    };
  }

  return { status: 'pending' };
}

export function resolveCarRentalSearchContext(
  trip: TripDetail,
  coverageMap?: CoverageMapResponse | null,
): {
  pickUpDate: string | null;
  dropOffDate: string | null;
  pickUpLatitude: number;
  pickUpLongitude: number;
  dropOffLatitude: number;
  dropOffLongitude: number;
  location: string;
} | null {
  const pickUpDate = normalizeDate(trip.startDate);
  const dropOffDate = normalizeDate(trip.endDate);
  if (!pickUpDate || !dropOffDate) return null;

  const firstPoi = coverageMap?.pois?.find(
    (poi) => poi.coordinates?.lat != null && poi.coordinates?.lng != null,
  );
  if (firstPoi?.coordinates) {
    const { lat, lng } = firstPoi.coordinates;
    const dest = (trip.destination || '').trim().toUpperCase();
    const hint = DESTINATION_COORDS.find((entry) => entry.match(dest));
    return {
      pickUpDate,
      dropOffDate,
      pickUpLatitude: lat,
      pickUpLongitude: lng,
      dropOffLatitude: lat,
      dropOffLongitude: lng,
      location: hint?.location ?? 'US',
    };
  }

  if (coverageMap?.center?.lat != null && coverageMap?.center?.lng != null) {
    const { lat, lng } = coverageMap.center;
    const dest = (trip.destination || '').trim().toUpperCase();
    const hint = DESTINATION_COORDS.find((entry) => entry.match(dest));
    return {
      pickUpDate,
      dropOffDate,
      pickUpLatitude: lat,
      pickUpLongitude: lng,
      dropOffLatitude: lat,
      dropOffLongitude: lng,
      location: hint?.location ?? 'US',
    };
  }

  const dest = (trip.destination || '').trim().toUpperCase();
  const hint = DESTINATION_COORDS.find((entry) => entry.match(dest));
  if (!hint) return null;

  return {
    pickUpDate,
    dropOffDate,
    pickUpLatitude: hint.coords.lat,
    pickUpLongitude: hint.coords.lng,
    dropOffLatitude: hint.coords.lat,
    dropOffLongitude: hint.coords.lng,
    location: hint.location,
  };
}

function mapRawRental(item: Record<string, unknown>, index: number): CarRentalItem {
  const priceObj =
    item.price && typeof item.price === 'object' && !Array.isArray(item.price)
      ? (item.price as Record<string, unknown>)
      : undefined;
  const amount =
    typeof priceObj?.amount === 'number'
      ? priceObj.amount
      : typeof item.totalPrice === 'number'
        ? item.totalPrice
        : undefined;
  const currency =
    typeof priceObj?.currency === 'string'
      ? priceObj.currency
      : typeof item.currency === 'string'
        ? item.currency
        : undefined;

  return {
    id: typeof item.id === 'string' ? item.id : `rental-${index}`,
    vehicleName:
      typeof item.vehicleName === 'string'
        ? item.vehicleName
        : typeof item.vehicle_type === 'string'
          ? item.vehicle_type
          : undefined,
    vehicleType:
      typeof item.vehicleType === 'string'
        ? item.vehicleType
        : typeof item.vehicle_type === 'string'
          ? item.vehicle_type
          : undefined,
    supplierName:
      typeof item.supplierName === 'string'
        ? item.supplierName
        : typeof item.company === 'string'
          ? item.company
          : undefined,
    price: amount != null ? { amount, currency: currency ?? 'USD' } : undefined,
    totalPrice: amount,
    currency,
    bookingUrl:
      typeof item.bookingUrl === 'string'
        ? item.bookingUrl
        : typeof item.booking_url === 'string'
          ? item.booking_url
          : undefined,
  };
}

/** 解析 Booking.com search 响应中的租车列表 */
export function extractCarRentalsFromSearchPayload(payload: unknown): CarRentalItem[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;

  const candidates: unknown[] = [];
  if (Array.isArray(root.data)) candidates.push(root.data);
  if (Array.isArray(root.carRentals)) candidates.push(root.carRentals);
  if (Array.isArray(root.results)) candidates.push(root.results);

  const nested = root.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const nestedObj = nested as Record<string, unknown>;
    if (Array.isArray(nestedObj.data)) candidates.push(nestedObj.data);
    if (Array.isArray(nestedObj.carRentals)) candidates.push(nestedObj.carRentals);
  }

  for (const list of candidates) {
    if (!Array.isArray(list) || list.length === 0) continue;
    return list
      .filter((item) => item && typeof item === 'object')
      .map((item, index) => mapRawRental(item as Record<string, unknown>, index));
  }

  return [];
}

export function getCheapestRental(rentals: CarRentalItem[]): CarRentalItem | null {
  if (rentals.length === 0) return null;
  return rentals.reduce<CarRentalItem | null>((best, current) => {
    const currentPrice = current.price?.amount ?? current.totalPrice;
    if (currentPrice == null) return best;
    const bestPrice = best?.price?.amount ?? best?.totalPrice;
    if (best == null || bestPrice == null || currentPrice < bestPrice) return current;
    return best;
  }, null);
}

export const CAR_RENTAL_STATUS_LABELS: Record<
  CarRentalBarStatus,
  { label: string; hint: string }
> = {
  confirmed: {
    label: '已确认',
    hint: '行程中已登记租车预订',
  },
  need_booking: {
    label: '待预订',
    hint: '已有租车意向，请完成预订或登记确认号',
  },
  quoted: {
    label: '有报价',
    hint: '已查到可用车型，可对比后预订',
  },
  pending: {
    label: '待查价',
    hint: '尚未查询租车报价',
  },
  missing_dates: {
    label: '待完善',
    hint: '请先设置行程出发与返程日期',
  },
  unavailable: {
    label: '暂不可用',
    hint: '租车查询服务未配置或暂时不可用',
  },
};
