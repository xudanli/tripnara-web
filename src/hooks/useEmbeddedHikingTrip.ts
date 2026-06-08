import { useCallback, useEffect, useMemo, useState } from 'react';
import { hikePlansApi } from '@/api/hike-plans';
import { tripsApi } from '@/api/trips';
import type { HikePlanRecord } from '@/types/hike-plan';
import type { TripDetail } from '@/types/trip';
import type { TripHikingSummary } from '@/types/trip-hiking-summary';
import {
  computeHikingPhase,
  isKnownHikingPhase,
} from '@/lib/hiking-phase';
import {
  getTripHikingProfile,
  getTripHikingSegments,
  isEmbeddedHikingTrip,
} from '@/lib/trip-hiking';
import { mergeTripMetadata } from '@/lib/hiking-segments';
import { getEmbeddedHikingErrorMessage } from '@/lib/embedded-hiking-api-errors';
import { hikePlanFromSummaryEmbed } from '@/lib/hike-plan-summary-normalize';
import { useTripEmbeddedSidebarStore } from '@/store/tripEmbeddedSidebarStore';
import type { HikingSegment } from '@/types/hiking-embedded';
import type { HikePlanSummaryEmbed, HikingSegmentSummaryItem } from '@/types/trip-hiking-summary';

function plansFromSummary(summary: TripHikingSummary | null): HikePlanRecord[] {
  if (!summary) return [];
  if (summary.hikePlans?.length) return summary.hikePlans;

  const byId = new Map<string, HikePlanRecord>();
  for (const seg of summary.segments) {
    const hp = seg.hikePlan;
    if (!hp || typeof hp !== 'object' || !('id' in hp)) continue;
    const plan = hikePlanFromSummaryEmbed(hp as HikePlanSummaryEmbed, seg);
    byId.set(plan.id, plan);
  }
  return [...byId.values()];
}

function segmentsFromSummary(summary: TripHikingSummary | null): HikingSegment[] | null {
  if (!summary) return null;
  return summary.segments.map((seg: HikingSegmentSummaryItem) => {
    const { hikePlan: _hp, ...rest } = seg;
    return rest;
  });
}

export function useEmbeddedHikingTrip(trip: TripDetail | null | undefined) {
  const [plans, setPlans] = useState<HikePlanRecord[]>([]);
  const [summary, setSummary] = useState<TripHikingSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const setSidebar = useTripEmbeddedSidebarStore((s) => s.setSubtitle);

  const embedded = isEmbeddedHikingTrip(trip);
  const segments = useMemo(() => {
    const fromSummary = segmentsFromSummary(summary);
    if (fromSummary !== null) return fromSummary;
    return getTripHikingSegments(trip);
  }, [summary, trip?.metadata]);

  const refreshPlans = useCallback(async () => {
    if (!trip?.id || !embedded) {
      setPlans([]);
      setSummary(null);
      setSummaryError(null);
      return;
    }
    setPlansLoading(true);
    setSummaryError(null);
    try {
      const summaryRes = await tripsApi.getHikingSummary(trip.id);
      setSummary(summaryRes);
      const fromSummary = plansFromSummary(summaryRes);
      if (fromSummary.length > 0) {
        setPlans(fromSummary);
      } else {
        const list = await hikePlansApi.list({ tripId: trip.id });
        setPlans(list);
      }
    } catch (e) {
      setSummary(null);
      setSummaryError(getEmbeddedHikingErrorMessage(e));
      try {
        const list = await hikePlansApi.list({ tripId: trip.id });
        setPlans(list);
      } catch {
        setPlans([]);
      }
    } finally {
      setPlansLoading(false);
    }
  }, [trip?.id, embedded]);

  useEffect(() => {
    void refreshPlans();
  }, [refreshPlans]);

  const phase = useMemo(() => {
    if (!embedded) return 'idle' as const;
    if (summary?.hikingPhase && isKnownHikingPhase(summary.hikingPhase)) {
      return summary.hikingPhase;
    }
    return computeHikingPhase(segments, plans);
  }, [embedded, summary?.hikingPhase, segments, plans]);

  const phaseHintZh = summary?.phaseHintZh;

  const profile = useMemo(
    () => summary?.hikingProfile ?? getTripHikingProfile(trip),
    [summary?.hikingProfile, trip]
  );

  useEffect(() => {
    if (!trip?.id || !embedded) return;
    setSidebar(trip.id, {
      phase,
      segmentCount: segments.length,
      travelLabel: '自驾',
      phaseHintZh,
    });
  }, [trip?.id, embedded, phase, segments.length, phaseHintZh, setSidebar]);

  const saveSegments = useCallback(
    async (nextSegments: HikingSegment[]) => {
      if (!trip?.id) return;
      const metadata = mergeTripMetadata(trip.metadata, {
        hikingProfile: 'embedded',
        hikingSegments: nextSegments,
      });
      try {
        await tripsApi.update(trip.id, { metadata });
      } catch (e) {
        throw new Error(getEmbeddedHikingErrorMessage(e));
      }
    },
    [trip?.id, trip?.metadata]
  );

  const planForSegment = useCallback(
    (segment: HikingSegment): HikePlanRecord | undefined => {
      const summarySeg = summary?.segments.find((s) => s.segmentId === segment.segmentId);
      if (summarySeg?.hikePlan && typeof summarySeg.hikePlan === 'object' && 'id' in summarySeg.hikePlan) {
        return hikePlanFromSummaryEmbed(summarySeg.hikePlan as HikePlanSummaryEmbed, summarySeg);
      }
      return plans.find(
        (p) =>
          p.id === segment.hikePlanId ||
          (segment.routeDirectionId &&
            p.routeDirectionId === segment.routeDirectionId &&
            p.plannedDate?.split('T')[0] === segment.startDate.split('T')[0])
      );
    },
    [summary?.segments, plans]
  );

  return {
    embedded,
    profile,
    segments,
    plans,
    summary,
    summaryError,
    plansLoading,
    phase,
    phaseHintZh,
    refreshPlans,
    saveSegments,
    planForSegment,
  };
}
