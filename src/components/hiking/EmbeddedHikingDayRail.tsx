import type { TripDay, TripDetail } from '@/types/trip';
import type { HikePlanRecord } from '@/types/hike-plan';
import { segmentCoversDay } from '@/lib/hiking-segments';
import {
  getHardTrekTrailPlanForTrip,
  resolveTrailSegmentForDay,
} from '@/lib/hard-trek-trail-plan';
import {
  hikingDayCardDayLabel,
  readTripDayHikingDayCard,
  resolveHikingDayCardForTripDay,
  tripHasHikingDayCardsApi,
} from '@/lib/hiking-day-card';
import { HikingSegmentDayCard } from './HikingSegmentDayCard';
import type { HikingSegment } from '@/types/hiking-embedded';

type Props = {
  trip: TripDetail;
  tripDay: TripDay;
  dayDate: string;
  dayIndex: number;
  segments: HikingSegment[];
  plans: HikePlanRecord[];
  resolvePlan?: (segment: HikingSegment) => HikePlanRecord | undefined;
};

function resolvePlanForDayCard(
  plans: HikePlanRecord[],
  card: NonNullable<ReturnType<typeof readTripDayHikingDayCard>>,
  segment?: HikingSegment,
  resolvePlan?: (segment: HikingSegment) => HikePlanRecord | undefined
): HikePlanRecord | undefined {
  if (card.hikePlanId) {
    const byId = plans.find((p) => p.id === card.hikePlanId);
    if (byId) return byId;
  }
  if (segment && resolvePlan) return resolvePlan(segment);
  if (segment) {
    return plans.find(
      (p) =>
        p.id === segment.hikePlanId ||
        (segment.routeDirectionId &&
          p.routeDirectionId === segment.routeDirectionId &&
          p.plannedDate?.split('T')[0] === segment.startDate.split('T')[0])
    );
  }
  if (card.routeDirectionId) {
    return plans.find((p) => p.routeDirectionId === card.routeDirectionId);
  }
  return undefined;
}

export function EmbeddedHikingDayRail({
  trip,
  tripDay,
  dayDate,
  dayIndex,
  segments,
  plans,
  resolvePlan,
}: Props) {
  const hikingDayCard = resolveHikingDayCardForTripDay(trip, tripDay, dayIndex);

  if (tripHasHikingDayCardsApi(trip)) {
    if (!hikingDayCard) return null;

    const segment = segmentCoversDay(segments, dayDate);
    const hikePlan = resolvePlanForDayCard(plans, hikingDayCard, segment, resolvePlan);

    return (
      <HikingSegmentDayCard
        hikingDayCard={hikingDayCard}
        tripId={trip.id}
        segment={segment}
        plan={hikePlan ? { ...hikePlan, tripId: hikePlan.tripId ?? trip.id } : undefined}
        dayLabel={hikingDayCardDayLabel(hikingDayCard)}
      />
    );
  }

  // 旧数据回退：按片段日期 + hardTrekTrailPlan 解析，不再对所有天复用 segment.label
  const segment = segmentCoversDay(segments, dayDate);
  if (!segment) return null;

  const hikePlan =
    resolvePlan?.(segment) ??
    plans.find(
      (p) =>
        p.id === segment.hikePlanId ||
        (segment.routeDirectionId &&
          p.routeDirectionId === segment.routeDirectionId &&
          p.plannedDate?.split('T')[0] === segment.startDate.split('T')[0])
    );
  const trailPlan = getHardTrekTrailPlanForTrip(trip, trip.id);
  const trailDay = resolveTrailSegmentForDay(dayDate, segment, trailPlan);
  const dayLabel = trailDay ? `Day${trailDay.day}` : `Day${dayIndex + 1}`;

  return (
    <HikingSegmentDayCard
      segment={segment}
      plan={hikePlan ? { ...hikePlan, tripId: hikePlan.tripId ?? trip.id } : undefined}
      dayLabel={dayLabel}
      trailDay={trailDay}
      trailPlanSummary={trailPlan?.summary}
    />
  );
}
