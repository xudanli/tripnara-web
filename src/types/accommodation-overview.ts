import type { BookingStatus } from '@/types/trip';

export interface AccommodationOverviewStats {
  totalNights: number;
  bookedCount: number;
  needBookingCount: number;
  missingDocumentCount: number;
  checkoutDaysCount: number;
}

export interface AccommodationNightPlace {
  nameCN?: string | null;
  nameEN?: string | null;
  category?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  rating?: number | null;
}

export interface AccommodationNightBooking {
  status?: BookingStatus | null;
  confirmation?: string | null;
  url?: string | null;
  bookedAt?: string | null;
}

export interface AccommodationTravelImpact {
  label?: string | null;
  durationMinutes?: number | null;
  distanceMeters?: number | null;
  isLongSegment?: boolean;
}

export interface AccommodationAlternative {
  id: string;
  name: string;
  rating?: number | null;
  reason?: string | null;
  priceDelta?: number | null;
  travelDeltaMinutes?: number | null;
  imageUrl?: string | null;
  currency?: string | null;
}

export interface AccommodationBookingDocument {
  id: string;
  name: string;
  url?: string | null;
  status?: BookingStatus | string | null;
  source?: string | null;
  dayIndex?: number;
}

/** 后端 BFF 实际字段（20260702） */
export interface AccommodationNightCard {
  id: string;
  tripDayId: string;
  date: string;
  dayNumber: number;
  displayMode?: string;
  name?: string | null;
  placeId?: number | null;
  place?: AccommodationNightPlace | null;
  booking?: AccommodationNightBooking | null;
  roomType?: string | null;
  roomCount?: number | null;
  crossDayInfo?: {
    crossDays?: number;
    isCrossDay?: boolean;
    isCheckoutItem?: boolean;
    displayMode?: string;
    displaySortIndex?: number;
    timeLabels?: { start: string; end: string };
  } | null;
  alternatives?: AccommodationAlternative[];
  bookingDocuments?: AccommodationBookingDocument[];
  linkedTripFileIds?: string[];
  travelToAccommodation?: AccommodationTravelImpact | null;
  estimatedCost?: number | null;
  currency?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
  type?: string;
  participantIds?: string[];
}

export interface AccommodationReminder {
  type?: string;
  severity?: 'warning' | 'info' | 'success' | string;
  title?: string;
  message?: string;
  itineraryItemId?: string;
  tripDayId?: string;
  date?: string;
  /** 文档契约兼容字段 */
  id?: string;
  text?: string;
  tone?: 'warning' | 'info' | 'success';
}

export interface AccommodationTravelSummary {
  totalDistance: number;
  totalDuration: number;
  longSegmentCount: number;
}

export interface AccommodationOverviewQuery {
  include?: string;
}

export interface AccommodationOverviewResponse {
  tripId: string;
  stats: AccommodationOverviewStats;
  nights: AccommodationNightCard[];
  reminders: AccommodationReminder[];
  travelSummary?: AccommodationTravelSummary;
  generatedAt: string;
}
