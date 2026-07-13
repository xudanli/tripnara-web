import { describe, expect, it } from 'vitest';
import {
  buildArrangeLodgingAssistantPrompt,
  buildArrangeLodgingCoverageSummary,
} from '@/lib/arrange-itinerary-lodging-coverage.util';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';

function makeTrip(dayCount: number): TripDetail {
  return {
    id: 'trip-1',
    TripDay: Array.from({ length: dayCount }, (_, index) => ({
      id: `day-${index + 1}`,
      date: `2026-08-${String(index + 1).padStart(2, '0')}`,
      ItineraryItem: [],
    })),
  } as TripDetail;
}

function hotelItem(id: string, dayId: string): ItineraryItemDetail {
  return {
    id,
    tripDayId: dayId,
    type: 'HOTEL',
    costCategory: 'ACCOMMODATION',
    Place: { nameCN: `酒店 ${id}` },
  } as ItineraryItemDetail;
}

describe('buildArrangeLodgingCoverageSummary', () => {
  it('counts missing nights except the last day', () => {
    const trip = makeTrip(3);
    const map = new Map<string, ItineraryItemDetail[]>();

    const summary = buildArrangeLodgingCoverageSummary(trip, map);

    expect(summary.totalNights).toBe(2);
    expect(summary.missingNights).toBe(2);
    expect(summary.missingNightDayIndices).toEqual([0, 1]);
  });

  it('marks covered nights when accommodation exists', () => {
    const trip = makeTrip(3);
    const map = new Map<string, ItineraryItemDetail[]>([
      [trip.TripDay![0]!.date, [hotelItem('h1', trip.TripDay![0]!.id)]],
    ]);

    const summary = buildArrangeLodgingCoverageSummary(trip, map);

    expect(summary.coveredNights).toBe(1);
    expect(summary.missingNights).toBe(1);
    expect(summary.nights[0]?.hasAccommodation).toBe(true);
    expect(summary.nights[1]?.hasAccommodation).toBe(false);
  });
});

describe('buildArrangeLodgingAssistantPrompt', () => {
  it('lists missing day labels in the prompt', () => {
    const trip = makeTrip(2);
    const summary = buildArrangeLodgingCoverageSummary(trip, new Map());
    const prompt = buildArrangeLodgingAssistantPrompt(summary);

    expect(prompt).toContain('Day 1');
    expect(prompt).toContain('加入行程');
    expect(prompt).toContain('3 星或以上');
  });

  it('uses custom accommodation standard label', () => {
    const trip = makeTrip(2);
    const summary = buildArrangeLodgingCoverageSummary(trip, new Map());
    const prompt = buildArrangeLodgingAssistantPrompt(summary, '4 星或以上');

    expect(prompt).toContain('4 星或以上');
  });
});
