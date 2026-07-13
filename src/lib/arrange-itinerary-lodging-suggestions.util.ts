import type {
  ArrangeLodgingCoverageSummary,
  ArrangeLodgingNightStatus,
} from '@/lib/arrange-itinerary-lodging-coverage.util';
import type {
  ArrangeLodgingSuggestion,
  ArrangeLodgingSuggestionCandidate,
  ArrangeLodgingSuggestionsBundle,
  CopilotSuggestion,
} from '@/types/arrange-itinerary';
import type {
  AttractionExploreMapLodgingLeg,
  AttractionExploreMapPoint,
} from '@/types/attraction-explore';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import { isAccommodationItineraryItem } from '@/lib/itinerary-item-sort';
import {
  normalizeArrangeLodgingSuggestions,
  readLodgingStandardFromRecord,
} from '@/api/normalize-arrange-itinerary-lodging';

export function readTripAccommodationStandard(trip: TripDetail | null | undefined): {
  stars?: number;
  label: string;
} {
  const meta = trip?.metadata as Record<string, unknown> | undefined;
  const fromMeta = readLodgingStandardFromRecord(meta ?? null);
  if (fromMeta.label) {
    return { stars: fromMeta.stars, label: fromMeta.label };
  }
  return { stars: fromMeta.stars, label: '3 星或以上' };
}

export function resolveArrangeLodgingSuggestionsBundle(input: {
  trip: TripDetail | null;
  lodgingCoverage: ArrangeLodgingCoverageSummary;
  bffSuggestions?: ArrangeLodgingSuggestion[] | null;
  bffStandard?: { stars?: number; label?: string };
}): ArrangeLodgingSuggestionsBundle {
  const standard = input.bffStandard ?? readTripAccommodationStandard(input.trip);
  const bffList = enrichLodgingSuggestionsWithCoverage(
    input.bffSuggestions ?? [],
    input.lodgingCoverage,
  );
  const hasBffData = (input.bffSuggestions ?? []).length > 0;

  if (hasBffData) {
    return {
      suggestions: bffList,
      accommodationStandardStars: standard.stars,
      accommodationStandardLabel: standard.label,
      source: 'bff',
    };
  }

  return {
    suggestions: buildClientLodgingSuggestions(input.lodgingCoverage, standard.label),
    accommodationStandardStars: standard.stars,
    accommodationStandardLabel: standard.label,
    source: 'client_projection',
  };
}

function enrichLodgingSuggestionsWithCoverage(
  bffSuggestions: ArrangeLodgingSuggestion[],
  coverage: ArrangeLodgingCoverageSummary,
): ArrangeLodgingSuggestion[] {
  if (bffSuggestions.length === 0) return [];

  const byDay = new Map(
    bffSuggestions.map((item) => [item.dayIndex, item]),
  );

  return coverage.nights.map((night) => {
    const existing = byDay.get(night.dayNumber);
    if (existing) {
      return {
        ...existing,
        dayNumber: night.dayNumber,
        dateLabel: existing.dateLabel ?? night.dateLabel,
        status:
          existing.status === 'booked' || night.hasAccommodation
            ? 'booked'
            : existing.candidates.length > 0
              ? 'suggested'
              : existing.status,
        currentLabel: existing.currentLabel ?? night.accommodationLabel,
        currentItemId: existing.currentItemId ?? night.accommodationItemId,
      };
    }
    if (night.hasAccommodation) {
      return {
        dayIndex: night.dayNumber,
        dayNumber: night.dayNumber,
        dateLabel: night.dateLabel,
        status: 'booked' as const,
        currentLabel: night.accommodationLabel,
        currentItemId: night.accommodationItemId,
        candidates: [],
      };
    }
    return {
      dayIndex: night.dayNumber,
      dayNumber: night.dayNumber,
      dateLabel: night.dateLabel,
      status: 'missing' as const,
      candidates: [],
    };
  });
}

function buildClientLodgingSuggestions(
  coverage: ArrangeLodgingCoverageSummary,
  standardLabel: string,
): ArrangeLodgingSuggestion[] {
  return coverage.nights.map((night) => {
    if (night.hasAccommodation) {
      return {
        dayIndex: night.dayNumber,
        dayNumber: night.dayNumber,
        dateLabel: night.dateLabel,
        status: 'booked',
        currentLabel: night.accommodationLabel,
        currentItemId: night.accommodationItemId,
        candidates: [],
        accommodationStandardHint: standardLabel,
      };
    }
    return {
      dayIndex: night.dayNumber,
      dayNumber: night.dayNumber,
      dateLabel: night.dateLabel,
      status: 'missing',
      candidates: [],
      recommendationReason: '根据已排景点与次日出发路线推荐当晚住宿',
      accommodationStandardHint: standardLabel,
    };
  });
}

export function mergeLodgingCopilotSuggestions(
  existing: CopilotSuggestion[],
  coverage: ArrangeLodgingCoverageSummary,
  bundle: ArrangeLodgingSuggestionsBundle,
): CopilotSuggestion[] {
  const hasLodgingKind = existing.some((item) => item.kind === 'suggest_lodging_for_day');
  if (hasLodgingKind || coverage.isComplete) return existing;

  const missing = bundle.suggestions.filter((item) => item.status === 'missing');
  if (missing.length === 0) return existing;

  const synthesized: CopilotSuggestion[] = missing.slice(0, 3).map((night) => ({
    id: `client-lodging-day-${night.dayIndex}`,
    kind: 'suggest_lodging_for_day',
    title: `Day ${night.dayNumber} 待安排住宿`,
    message:
      night.candidates[0]?.name != null
        ? `推荐 ${night.candidates[0].name} 等 ${night.candidates.length} 个选项，符合${bundle.accommodationStandardLabel ?? '住宿标准'}`
        : `当晚尚未安排住宿。建议结合已排景点补齐，符合${bundle.accommodationStandardLabel ?? '住宿标准'}`,
    severity: 'action',
    actionHint: {
      type: 'suggest_lodging',
      label: '补齐当晚住宿',
      dayIndex: night.dayIndex,
    },
  }));

  return [...synthesized, ...existing];
}

export function buildLodgingMapPointsFromItinerary(input: {
  trip: TripDetail | null;
  itineraryByDay: Map<string, ItineraryItemDetail[]>;
  bundle: ArrangeLodgingSuggestionsBundle;
}): AttractionExploreMapPoint[] {
  const points: AttractionExploreMapPoint[] = [];
  const days = input.trip?.TripDay ?? [];

  for (const night of input.bundle.suggestions) {
    const dayIndexZero = (night.dayNumber ?? night.dayIndex) - 1;
    const day = days[dayIndexZero];
    if (!day) continue;

    const norm = day.date.includes('T') ? day.date.split('T')[0]! : day.date;
    const items =
      input.itineraryByDay.get(day.date) ?? input.itineraryByDay.get(norm) ?? [];

    const booked = items.find(isAccommodationItineraryItem);
    if (booked) {
      const lat = booked.Place?.lat ?? booked.Place?.latitude;
      const lng = booked.Place?.lng ?? booked.Place?.longitude;
      if (lat != null && lng != null) {
        points.push({
          id: `lodging-booked-${booked.id}`,
          placeId: booked.placeId ?? booked.Place?.id,
          name: booked.Place?.nameCN ?? booked.Place?.nameEN ?? night.currentLabel ?? '住宿',
          lat: Number(lat),
          lng: Number(lng),
          kind: 'lodging',
          dayIndex: night.dayIndex,
          lodgingRole: 'overnight',
          highlighted: true,
        });
      }
      continue;
    }

    for (const candidate of night.candidates) {
      if (candidate.lat == null || candidate.lng == null) continue;
      points.push({
        id: `lodging-suggestion-${night.dayIndex}-${candidate.id}`,
        placeId: candidate.placeId,
        name: candidate.name,
        lat: candidate.lat,
        lng: candidate.lng,
        kind: 'lodging_suggestion',
        dayIndex: night.dayIndex,
        lodgingRole: 'suggestion',
        highlighted: candidate.recommended === true,
      });
    }
  }

  return points;
}

export function mergeMapPointsWithLodging(
  basePoints: AttractionExploreMapPoint[],
  lodgingPoints: AttractionExploreMapPoint[],
): AttractionExploreMapPoint[] {
  const seen = new Set(basePoints.map((point) => point.id));
  const merged = [...basePoints];
  for (const point of lodgingPoints) {
    if (seen.has(point.id)) continue;
    seen.add(point.id);
    merged.push(point);
  }
  return merged;
}

export function formatLodgingLegLabel(leg: AttractionExploreMapLodgingLeg): string {
  const drive = leg.driveMinutes != null ? ` · 约 ${leg.driveMinutes} 分钟` : '';
  const distance =
    leg.distanceKm != null ? ` · ${leg.distanceKm.toFixed(1)} km` : '';
  if (leg.label) return `${leg.label}${distance}${drive}`;
  if (leg.from?.label && leg.to?.label) {
    const prefix = leg.legKind === 'relocation' ? '搬迁' : '末段';
    return `${prefix} ${leg.from.label} → ${leg.to.label}${distance}${drive}`;
  }
  return `Day ${leg.dayIndex} 末 → 当晚住宿${drive}`;
}

export function pickNightSuggestionForDay(
  bundle: ArrangeLodgingSuggestionsBundle,
  dayIndexZeroBased: number,
): ArrangeLodgingSuggestion | undefined {
  const dayNumber = dayIndexZeroBased + 1;
  return bundle.suggestions.find(
    (item) => item.dayIndex === dayNumber || item.dayNumber === dayNumber,
  );
}

export function pickRecommendedLodgingCandidate(
  suggestion: ArrangeLodgingSuggestion,
): ArrangeLodgingSuggestionCandidate | undefined {
  return (
    suggestion.candidates.find((item) => item.recommended) ?? suggestion.candidates[0]
  );
}

export function buildLodgingCandidateAssistantPrompt(
  night: ArrangeLodgingNightStatus,
  candidate: ArrangeLodgingSuggestionCandidate,
  standardLabel: string,
): string {
  const driveHint =
    candidate.driveMinutesEstimate != null
      ? `（距当日锚点约 ${candidate.driveMinutesEstimate} 分钟车程）`
      : candidate.nextDayDriveMinutesDelta != null
        ? `（次日车程${candidate.nextDayDriveMinutesDelta <= 0 ? '减少' : '增加'} ${Math.abs(candidate.nextDayDriveMinutesDelta)} 分钟）`
        : '';
  const reasonHint = candidate.reason ? `。${candidate.reason}` : '';
  return `请将「${candidate.name}」作为 Day ${night.dayNumber}（${night.dateLabel}）当晚住宿加入行程。住宿标准：${standardLabel}${driveHint}${reasonHint}`;
}

export { normalizeArrangeLodgingSuggestions };
