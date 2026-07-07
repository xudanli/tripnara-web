import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { isAccommodationItineraryItem } from '@/lib/itinerary-item-sort';
import { resolveItineraryItemPlaceDisplayName } from '@/lib/itinerary-place-display.util';
import { resolveTravelerCount } from '@/lib/planning-constraints.util';
import type { BookingStatus, ItineraryItem, Place, TripDay, TripDetail } from '@/types/trip';

export type RouteImpactStatus = 'smooth' | 'caution' | 'unknown';

export interface AccommodationAlternativeView {
  id: string;
  name: string;
  rating?: number | null;
  reason?: string;
  priceDelta?: number;
  travelDeltaMinutes?: number;
  imageUrl?: string;
  currency?: string;
}

export interface RouteImpactView {
  label: string;
  durationMinutes?: number | null;
  distanceMeters?: number | null;
  status: RouteImpactStatus;
}

export interface AccommodationNightView {
  day: TripDay;
  dayIndex: number;
  item?: ItineraryItem;
  alternatives: AccommodationAlternativeView[];
  routeImpact?: RouteImpactView;
}

export interface AccommodationReminderView {
  id: string;
  text: string;
  tone: 'warning' | 'info' | 'success';
}

export interface RouteOverviewSegmentView {
  id: string;
  label: string;
  durationMinutes?: number | null;
  distanceMeters?: number | null;
  status: RouteImpactStatus;
}

export interface BookingDocumentView {
  id: string;
  name: string;
  status: BookingStatus | 'pending';
  url?: string | null;
  dayIndex?: number;
}

export function formatTravelDuration(minutes?: number | null): string | undefined {
  if (minutes == null || minutes <= 0) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTravelDistance(meters?: number | null): string | undefined {
  if (meters == null || meters <= 0) return undefined;
  if (meters >= 1000) return `${Math.round(meters / 1000)} km`;
  return `${meters} m`;
}

export function resolveRouteImpactStatus(
  durationMinutes?: number | null,
  distanceMeters?: number | null,
): RouteImpactStatus {
  if (durationMinutes == null && distanceMeters == null) return 'unknown';
  if ((durationMinutes ?? 0) > 360 || (distanceMeters ?? 0) > 400_000) return 'caution';
  return 'smooth';
}

export function routeImpactStatusLabel(status: RouteImpactStatus): string {
  if (status === 'smooth') return '路线顺畅';
  if (status === 'caution') return '需注意';
  return '暂无数据';
}

export function resolveBookingStatusMeta(status?: BookingStatus | null): {
  label: string;
  tone: 'verified' | 'confirm' | 'allow';
} {
  if (status === 'BOOKED') return { label: '已预订', tone: 'verified' };
  if (status === 'NO_BOOKING') return { label: '无需预订', tone: 'allow' };
  return { label: '待确认', tone: 'confirm' };
}

export function resolvePlaceImageUrl(place?: Place | null): string | undefined {
  const meta = place?.metadata;
  if (!meta || typeof meta !== 'object') return undefined;
  const candidates = [
    meta.photoUrl,
    meta.imageUrl,
    meta.image,
    meta.photo,
    meta.coverImage,
    meta.thumbnail,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function resolveAccommodationTitle(item?: ItineraryItem): string {
  if (!item) return '住宿';
  return resolveItineraryItemPlaceDisplayName(item) || item.note || '住宿';
}

export function resolveRoomDescription(item?: ItineraryItem, travelerCount?: number): string | undefined {
  if (!item) return undefined;
  const meta = item.metadata;
  if (meta && typeof meta === 'object') {
    const roomType = meta.roomType ?? meta.room_type;
    const roomCount = meta.roomCount ?? meta.room_count;
    if (typeof roomType === 'string' && roomType.trim()) {
      if (typeof roomCount === 'number' && roomCount > 0) {
        return `${roomType.trim()} × ${roomCount}`;
      }
      return roomType.trim();
    }
  }
  const note = item.note?.trim();
  if (note && /房|room|suite|双床|大床/i.test(note)) return note;
  const count = travelerCount ?? 2;
  return `标准双床 × ${Math.max(1, Math.ceil(count / 2))}`;
}

export function resolveAmenityTags(item?: ItineraryItem): string[] {
  if (!item) return [];
  const tags = item.Place?.metadata?.tags;
  if (Array.isArray(tags)) {
    return tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 4);
  }
  const note = item.note ?? '';
  const found: string[] = [];
  if (/早餐|breakfast/i.test(note)) found.push('含早餐');
  if (/免费取消|free cancel/i.test(note)) found.push('免费取消');
  if (/Wi-?Fi|wifi/i.test(note)) found.push('免费 Wi-Fi');
  return found;
}

export function resolveStayNights(item: ItineraryItem): number {
  const crossDays = item.crossDayInfo?.crossDays;
  if (typeof crossDays === 'number' && crossDays > 0) return crossDays;
  try {
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff || 1);
  } catch {
    return 1;
  }
}

export function formatDayLabel(dateStr: string): { short: string; weekday: string } {
  try {
    const date = new Date(dateStr);
    return {
      short: format(date, 'M月d日', { locale: zhCN }),
      weekday: format(date, 'EEE', { locale: zhCN }),
    };
  } catch {
    return { short: dateStr, weekday: '' };
  }
}

export function formatStayDateTime(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  try {
    return format(new Date(iso), 'M月d日 HH:mm', { locale: zhCN });
  } catch {
    return iso;
  }
}

function readAlternatives(item?: ItineraryItem): AccommodationAlternativeView[] {
  if (!item?.metadata || typeof item.metadata !== 'object') return [];
  const raw =
    item.metadata.accommodationAlternatives ??
    item.metadata.alternatives ??
    item.metadata.suggestedAlternatives;
  if (!Array.isArray(raw)) return [];

  const alternatives: AccommodationAlternativeView[] = [];
  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const row = entry as Record<string, unknown>;
    const name =
      (typeof row.name === 'string' && row.name.trim()) ||
      (typeof row.nameCN === 'string' && row.nameCN.trim()) ||
      (typeof row.title === 'string' && row.title.trim());
    if (!name) return;
    alternatives.push({
      id: String(row.id ?? `${item.id}-alt-${index}`),
      name,
      rating: typeof row.rating === 'number' ? row.rating : null,
      reason:
        (typeof row.reason === 'string' && row.reason.trim()) ||
        (typeof row.reasonZh === 'string' && row.reasonZh.trim()) ||
        undefined,
      priceDelta: typeof row.priceDelta === 'number' ? row.priceDelta : undefined,
      travelDeltaMinutes:
        typeof row.travelDeltaMinutes === 'number' ? row.travelDeltaMinutes : undefined,
      imageUrl: typeof row.imageUrl === 'string' ? row.imageUrl : undefined,
      currency: typeof row.currency === 'string' ? row.currency : item.currency ?? 'CNY',
    });
  });
  return alternatives;
}

function resolveNextDayRouteImpact(
  days: TripDay[],
  dayIndex: number,
): RouteImpactView | undefined {
  const nextDay = days[dayIndex + 1];
  if (!nextDay) return undefined;

  const nextItems = (nextDay.ItineraryItem ?? []).filter((item) => !isAccommodationItineraryItem(item));
  const anchor =
    nextItems.find((item) => item.travelFromPreviousDuration || item.travelFromPreviousDistance) ??
    nextItems[0];

  const durationMinutes = anchor?.travelFromPreviousDuration ?? null;
  const distanceMeters = anchor?.travelFromPreviousDistance ?? null;
  const destination =
    (anchor ? resolveItineraryItemPlaceDisplayName(anchor) : undefined) ??
    nextDay.theme ??
    `Day ${dayIndex + 2} 目的地`;

  if (durationMinutes == null && distanceMeters == null) {
    return {
      label: `至 ${destination}`,
      durationMinutes,
      distanceMeters,
      status: 'unknown',
    };
  }

  return {
    label: `至 ${destination}`,
    durationMinutes,
    distanceMeters,
    status: resolveRouteImpactStatus(durationMinutes, distanceMeters),
  };
}

export function buildAccommodationNights(trip: TripDetail): AccommodationNightView[] {
  const days = trip.TripDay ?? [];
  const nights = days.slice(0, -1);

  return nights.map((day, dayIndex) => {
    const item = (day.ItineraryItem ?? []).find(isAccommodationItineraryItem);
    return {
      day,
      dayIndex,
      item,
      alternatives: readAlternatives(item),
      routeImpact: resolveNextDayRouteImpact(days, dayIndex),
    };
  });
}

export function buildAccommodationReminders(
  nights: AccommodationNightView[],
): AccommodationReminderView[] {
  const reminders: AccommodationReminderView[] = [];

  for (const night of nights) {
    const dayNum = night.dayIndex + 1;
    const item = night.item;
    if (!item) continue;

    const status = item.bookingStatus;
    if (status !== 'BOOKED' && status !== 'NO_BOOKING') {
      reminders.push({
        id: `${night.day.id}-confirm`,
        text: `Day ${dayNum} 住宿需今日确认`,
        tone: 'warning',
      });
    }

    const checkIn = formatStayDateTime(item.startTime);
    if (checkIn) {
      reminders.push({
        id: `${night.day.id}-checkin`,
        text: `Day ${dayNum} 入住时间为 ${checkIn.split(' ')[1] ?? checkIn}`,
        tone: 'info',
      });
    }

    if (status === 'BOOKED') {
      reminders.push({
        id: `${night.day.id}-booked`,
        text: `Day ${dayNum} 预订已确认`,
        tone: 'success',
      });
    }
  }

  return reminders.slice(0, 6);
}

export function buildRouteOverviewSegments(
  nights: AccommodationNightView[],
): RouteOverviewSegmentView[] {
  const segments: RouteOverviewSegmentView[] = [];
  for (const night of nights) {
    const impact = night.routeImpact;
    if (!impact) continue;
    segments.push({
      id: night.day.id,
      label: `Day ${night.dayIndex + 1} → Day ${night.dayIndex + 2}`,
      durationMinutes: impact.durationMinutes,
      distanceMeters: impact.distanceMeters,
      status: impact.status,
    });
  }
  return segments;
}

export function buildBookingDocuments(trip: TripDetail): BookingDocumentView[] {
  const docs: BookingDocumentView[] = [];
  const nights = buildAccommodationNights(trip);

  for (const night of nights) {
    const item = night.item;
    if (!item) continue;
    const title = resolveAccommodationTitle(item);
    if (item.bookingConfirmation) {
      docs.push({
        id: `${item.id}-confirmation`,
        name: `${title} 预订确认`,
        status: 'BOOKED',
        url: item.bookingUrl,
        dayIndex: night.dayIndex,
      });
    } else if (item.bookingUrl) {
      docs.push({
        id: `${item.id}-url`,
        name: `${title} 预订链接`,
        status: item.bookingStatus ?? 'pending',
        url: item.bookingUrl,
        dayIndex: night.dayIndex,
      });
    }
  }

  return docs;
}

export function resolveAccommodationTravelerCount(trip: TripDetail): number {
  return resolveTravelerCount(trip);
}

export function findFirstMissingNightIndex(nights: AccommodationNightView[]): number | null {
  const idx = nights.findIndex((night) => !night.item);
  return idx >= 0 ? idx : null;
}
