import {
  buildAccommodationNights,
  buildAccommodationReminders,
  buildBookingDocuments,
  buildRouteOverviewSegments,
  resolveRouteImpactStatus,
  type AccommodationAlternativeView,
  type AccommodationNightView,
  type AccommodationReminderView,
  type BookingDocumentView,
  type RouteImpactView,
  type RouteOverviewSegmentView,
} from '@/lib/trip-accommodation.util';
import type {
  AccommodationAlternative,
  AccommodationNightCard,
  AccommodationOverviewResponse,
  AccommodationReminder,
  AccommodationTravelImpact,
} from '@/types/accommodation-overview';
import type { BookingStatus, ItineraryItem, ItineraryItemType, Place, TripDay, TripDetail } from '@/types/trip';

export interface AdaptedAccommodationTabData {
  nights: AccommodationNightView[];
  reminders: AccommodationReminderView[];
  routeSegments: RouteOverviewSegmentView[];
  documents: BookingDocumentView[];
  stats: AccommodationOverviewResponse['stats'] | null;
  fromOverview: boolean;
}

function resolveDayIndex(card: AccommodationNightCard): number {
  if (card.dayNumber != null && card.dayNumber > 0) return card.dayNumber - 1;
  return 0;
}

function resolvePlaceName(card: AccommodationNightCard): string {
  return (
    card.place?.nameCN?.trim() ||
    card.place?.nameEN?.trim() ||
    card.name?.trim() ||
    '住宿'
  );
}

function mapAlternatives(alts?: AccommodationAlternative[]): AccommodationAlternativeView[] {
  if (!alts?.length) return [];
  return alts.map((alt) => ({
    id: alt.id,
    name: alt.name,
    rating: alt.rating,
    reason: alt.reason ?? undefined,
    priceDelta: alt.priceDelta ?? undefined,
    travelDeltaMinutes: alt.travelDeltaMinutes ?? undefined,
    imageUrl: alt.imageUrl ?? undefined,
    currency: alt.currency ?? undefined,
  }));
}

function mapTravelImpact(travel?: AccommodationTravelImpact | null): RouteImpactView | undefined {
  if (!travel) return undefined;
  const status = travel.isLongSegment
    ? 'caution'
    : resolveRouteImpactStatus(travel.durationMinutes, travel.distanceMeters);
  return {
    label: travel.label?.trim() || '至下一目的地',
    durationMinutes: travel.durationMinutes,
    distanceMeters: travel.distanceMeters,
    status,
  };
}

function mapNightCardToItem(card: AccommodationNightCard): ItineraryItem {
  const photoUrl = card.place?.photoUrl ?? card.place?.imageUrl ?? undefined;
  const place: Place | null = card.place
    ? ({
        id: card.placeId ?? 0,
        nameCN: resolvePlaceName(card),
        address: card.place.address ?? '',
        rating: card.place.rating ?? undefined,
        metadata: {
          photoUrl,
          imageUrl: card.place.imageUrl,
          tags: card.place.tags,
        },
      } as Place)
    : null;

  const metadata: Record<string, unknown> = {};
  if (card.roomType) metadata.roomType = card.roomType;
  if (card.roomCount != null) metadata.roomCount = card.roomCount;
  if (card.alternatives?.length) metadata.accommodationAlternatives = card.alternatives;

  const crossDays = card.crossDayInfo?.crossDays ?? 0;

  return {
    id: card.id,
    type: (card.type as ItineraryItemType) ?? 'ACCOMMODATION',
    startTime: card.startTime ?? card.date,
    endTime: card.endTime ?? card.date,
    note: card.note ?? card.name,
    placeName: resolvePlaceName(card),
    tripDayId: card.tripDayId,
    Place: place,
    bookingStatus: card.booking?.status ?? undefined,
    bookingConfirmation: card.booking?.confirmation ?? undefined,
    bookingUrl: card.booking?.url ?? undefined,
    crossDayInfo:
      card.crossDayInfo && (card.crossDayInfo.crossDays ?? 0) > 0
        ? {
            isCrossDay: card.crossDayInfo.isCrossDay ?? crossDays > 1,
            crossDays,
            isCheckoutItem: card.crossDayInfo.isCheckoutItem ?? false,
            displayMode:
              (card.crossDayInfo.displayMode as 'checkin' | 'checkout' | 'normal') ?? 'checkin',
            timeLabels: card.crossDayInfo.timeLabels ?? { start: '入住时间', end: '退房时间' },
            displaySortIndex: card.crossDayInfo.displaySortIndex,
          }
        : undefined,
    estimatedCost: card.estimatedCost,
    currency: card.currency,
    participantIds: card.participantIds,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

function mapNightCardToView(card: AccommodationNightCard): AccommodationNightView {
  const dayIndex = resolveDayIndex(card);
  const item = mapNightCardToItem(card);
  const day: TripDay = {
    id: card.tripDayId,
    date: card.date,
    theme: card.name,
    ItineraryItem: [item],
  };

  return {
    day,
    dayIndex,
    item,
    alternatives: mapAlternatives(card.alternatives),
    routeImpact: mapTravelImpact(card.travelToAccommodation),
  };
}

function mapReminder(reminder: AccommodationReminder): AccommodationReminderView {
  if (reminder.text && reminder.tone) {
    return {
      id: reminder.id ?? reminder.text,
      text: reminder.text,
      tone: reminder.tone,
    };
  }
  const tone =
    reminder.severity === 'warning'
      ? 'warning'
      : reminder.severity === 'success'
        ? 'success'
        : 'info';
  return {
    id:
      reminder.id ??
      `${reminder.type ?? 'reminder'}-${reminder.itineraryItemId ?? reminder.tripDayId ?? reminder.title}`,
    text: reminder.message ?? reminder.title ?? '',
    tone,
  };
}

function mapOverviewDocuments(nights: AccommodationNightCard[]): BookingDocumentView[] {
  const docs: BookingDocumentView[] = [];

  for (const night of nights) {
    const dayIndex = resolveDayIndex(night);
    const title = resolvePlaceName(night);

    for (const doc of night.bookingDocuments ?? []) {
      docs.push({
        id: doc.id,
        name: doc.name,
        status: (doc.status as BookingStatus) ?? 'pending',
        url: doc.url,
        dayIndex: doc.dayIndex ?? dayIndex,
      });
    }

    const confirmation = night.booking?.confirmation;
    const url = night.booking?.url;
    if (confirmation) {
      docs.push({
        id: `${night.id}-confirmation`,
        name: `${title} 预订确认`,
        status: 'BOOKED',
        url,
        dayIndex,
      });
    } else if (url) {
      docs.push({
        id: `${night.id}-url`,
        name: `${title} 预订链接`,
        status: night.booking?.status ?? 'pending',
        url,
        dayIndex,
      });
    }
  }

  return docs;
}

export function adaptAccommodationOverview(
  overview: AccommodationOverviewResponse,
): AdaptedAccommodationTabData {
  const nights = overview.nights.map(mapNightCardToView);
  const documents = mapOverviewDocuments(overview.nights);
  const routeSegments: RouteOverviewSegmentView[] = nights
    .filter((night) => night.routeImpact)
    .map((night) => ({
      id: night.day.id,
      label: `Day ${night.dayIndex + 1} → Day ${night.dayIndex + 2}`,
      durationMinutes: night.routeImpact?.durationMinutes,
      distanceMeters: night.routeImpact?.distanceMeters,
      status: night.routeImpact?.status ?? 'unknown',
    }));

  return {
    nights,
    reminders: overview.reminders.map(mapReminder),
    routeSegments,
    documents,
    stats: overview.stats,
    fromOverview: true,
  };
}

export function adaptAccommodationFromTrip(trip: TripDetail): AdaptedAccommodationTabData {
  const nights = buildAccommodationNights(trip);
  return {
    nights,
    reminders: buildAccommodationReminders(nights),
    routeSegments: buildRouteOverviewSegments(nights),
    documents: buildBookingDocuments(trip),
    stats: null,
    fromOverview: false,
  };
}
