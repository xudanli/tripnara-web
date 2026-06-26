import type { CreateTripRequest } from '@/types/trip';
import type { TrustedProjectListing } from '@/types/trusted-projects';

const DESTINATION_COUNTRY_CODES: Record<string, string> = {
  iceland: 'IS',
  italy: 'IT',
  japan: 'JP',
  china: 'CN',
  norway: 'NO',
  france: 'FR',
  spain: 'ES',
  switzerland: 'CH',
  'united states': 'US',
  usa: 'US',
};

export function normalizeTrustedProjectDestinationCountryCode(destination: string): string {
  const trimmed = destination.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const mapped = DESTINATION_COUNTRY_CODES[trimmed.toLowerCase()];
  if (mapped) {
    return mapped;
  }

  return trimmed.slice(0, 2).toUpperCase();
}

export function buildPlanStudioUrl(tripId: string): string {
  return `/dashboard/plan-studio?tripId=${encodeURIComponent(tripId)}`;
}

export function buildCreateTripRequestFromListing(
  listing: TrustedProjectListing
): CreateTripRequest {
  const budgetCents = listing.budgetMaxCents ?? listing.budgetMinCents ?? 1_000_000;

  return {
    name: listing.title,
    destination: normalizeTrustedProjectDestinationCountryCode(listing.destination),
    startDate: listing.startDate.slice(0, 10),
    endDate: listing.endDate.slice(0, 10),
    totalBudget: Math.max(1, Math.round(budgetCents / 100)),
    travelers: [{ type: 'ADULT', mobilityTag: 'CITY_POTATO' }],
    metadata: {
      trustedProjectListingId: listing.id,
      source: 'trusted_project',
      publisherSubjectType: listing.publisherSubjectType,
      organizationId: listing.organizationId ?? null,
    },
  };
}
