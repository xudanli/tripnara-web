import { useEffect, useMemo, useState } from 'react';
import { tripsApi } from '@/api/trips';
import type { ItineraryItemDetail, TripDetail, TravelSegment } from '@/types/trip';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';
import {
  buildTravelTimingViewModel,
  isInterDayTravelIssue,
  parseTravelRouteFromMessage,
  findItineraryItemsForTravelLabels,
} from '@/lib/feasibility-travel-timing';

export function useFeasibilityTravelTiming(
  tripId: string,
  issue: FeasibilityIssueDto | undefined,
  dayNumber: number | null,
) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [dayItems, setDayItems] = useState<ItineraryItemDetail[]>([]);
  const [nextDayItems, setNextDayItems] = useState<ItineraryItemDetail[]>([]);
  const [segment, setSegment] = useState<TravelSegment | null>(null);
  const [loading, setLoading] = useState(false);

  const enabled = Boolean(tripId && issue && isInterDayTravelIssue(issue));

  useEffect(() => {
    if (!enabled || !issue) {
      setTrip(null);
      setDayItems([]);
      setNextDayItems([]);
      setSegment(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const tripDetail = await tripsApi.getById(tripId);
        if (cancelled) return;
        setTrip(tripDetail);

        const days = tripDetail.TripDay ?? [];
        const dayNum =
          dayNumber ??
          issue.affectedDays?.[0] ??
          1;
        const dayIdx = Math.max(0, dayNum - 1);
        const day = days[dayIdx];
        const prevDay = dayIdx > 0 ? days[dayIdx - 1] : undefined;
        const nextDay = days[dayIdx + 1];

        let items: ItineraryItemDetail[] = [];
        let prevItems: ItineraryItemDetail[] = [];
        let nextItems: ItineraryItemDetail[] = [];

        if (prevDay) {
          prevItems =
            prevDay.ItineraryItem?.length
              ? prevDay.ItineraryItem
              : await tripsApi.getAll(prevDay.id);
        }
        if (day) {
          items =
            day.ItineraryItem?.length
              ? day.ItineraryItem
              : await tripsApi.getAll(day.id);
        }
        if (nextDay) {
          nextItems =
            nextDay.ItineraryItem?.length
              ? nextDay.ItineraryItem
              : await tripsApi.getAll(nextDay.id);
        }

        if (cancelled) return;
        setDayItems([...prevItems, ...items]);
        setNextDayItems(nextItems);

        const allItems = [...prevItems, ...items, ...nextItems];
        const fromId =
          issue.anchors?.fromItemId ??
          (() => {
            const parsed = parseTravelRouteFromMessage(issue.message);
            if (!parsed) return undefined;
            const { fromItem } = findItineraryItemsForTravelLabels(
              allItems,
              parsed.fromPlaceLabel,
              parsed.toPlaceLabel,
            );
            return fromItem?.id;
          })();
        const toId =
          issue.anchors?.toItemId ??
          (() => {
            const parsed = parseTravelRouteFromMessage(issue.message);
            if (!parsed) return undefined;
            const { toItem } = findItineraryItemsForTravelLabels(
              allItems,
              parsed.fromPlaceLabel,
              parsed.toPlaceLabel,
            );
            return toItem?.id;
          })();
        const targetDayId = day?.id;

        const pickSegment = (travelInfo: { segments?: TravelSegment[] } | null | undefined) => {
          if (!travelInfo?.segments?.length) return null;
          if (fromId && toId) {
            const exact = travelInfo.segments.find(
              (s) => s.fromItemId === fromId && s.toItemId === toId,
            );
            if (exact) return exact;
          }
          if (toId) {
            return travelInfo.segments.find((s) => s.toItemId === toId) ?? null;
          }
          return null;
        };

        if (targetDayId && (fromId || toId)) {
          try {
            const travelInfo = await tripsApi.getDayTravelInfo(tripId, targetDayId);
            const found = pickSegment(travelInfo);
            if (!cancelled && found) setSegment(found);
          } catch {
            if (!cancelled) setSegment(null);
          }
        }
      } catch {
        if (!cancelled) {
          setTrip(null);
          setDayItems([]);
          setNextDayItems([]);
          setSegment(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tripId, issue?.id, dayNumber, enabled]);

  const viewModel = useMemo(() => {
    if (!issue || !enabled) return null;
    return buildTravelTimingViewModel({
      issue,
      dayNumber: dayNumber ?? undefined,
      trip,
      dayItems,
      nextDayItems,
      segment,
    });
  }, [issue, enabled, dayNumber, trip, dayItems, nextDayItems, segment]);

  return { viewModel, trip, dayItems, nextDayItems, loading, enabled };
}
