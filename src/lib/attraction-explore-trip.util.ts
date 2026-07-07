import type { TripDetail } from '@/types/trip';

export interface TripAttractionExploreMetadata {
  suggestAttractionExplore?: boolean;
  selectedThemeIds?: string[];
  selectedSuitabilityIds?: string[];
}

const SUGGEST_SEEN_PREFIX = 'tripnara:attraction-explore-suggest-seen:';

export function readTripAttractionExploreMetadata(
  trip?: TripDetail | null,
): TripAttractionExploreMetadata | null {
  const raw = trip?.metadata as { attractionExplore?: TripAttractionExploreMetadata } | undefined;
  return raw?.attractionExplore ?? null;
}

export function readTripAttractionExploreSuggest(trip?: TripDetail | null): boolean {
  return readTripAttractionExploreMetadata(trip)?.suggestAttractionExplore === true;
}

export function clearAttractionExploreSuggestSearchParams(params: URLSearchParams): void {
  params.delete('suggestAttractionExplore');
}

function suggestSeenStorageKey(tripId: string): string {
  return `${SUGGEST_SEEN_PREFIX}${tripId}`;
}

export function markAttractionExploreSuggestSeen(tripId: string): void {
  if (!tripId) return;
  try {
    sessionStorage.setItem(suggestSeenStorageKey(tripId), '1');
  } catch {
    // ignore
  }
}

export function shouldShowAttractionExploreSuggest(input: {
  tripId: string;
  trip?: TripDetail | null;
  searchParams: URLSearchParams;
}): boolean {
  if (!input.tripId) return false;
  try {
    if (sessionStorage.getItem(suggestSeenStorageKey(input.tripId)) === '1') {
      return false;
    }
  } catch {
    // ignore
  }
  if (input.searchParams.get('suggestAttractionExplore') === '1') return true;
  return readTripAttractionExploreSuggest(input.trip);
}
