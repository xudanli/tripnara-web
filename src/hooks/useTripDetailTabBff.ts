import { useCallback, useEffect, useRef, useState } from 'react';
import {
  tripDetailTabApi,
  tripTimelineApi,
} from '@/api/trip-detail-tab-client';
import {
  mergeCollabOverview,
  mergeTimelineOverview,
} from '@/lib/trip-detail-tab-merge.util';
import type { AccommodationOverviewResponse } from '@/types/accommodation-overview';
import type { CollabOverviewResponse } from '@/types/collab-overview';
import type { TimelineOverviewResponse } from '@/types/timeline-overview';
import type { TripFilesTabData } from '@/api/trip-detail-tab.types';

export interface UseTripDetailTabBffResult {
  timeline: TimelineOverviewResponse | null;
  collab: CollabOverviewResponse | null;
  files: TripFilesTabData | null;
  accommodation: AccommodationOverviewResponse | null;
  /** Phase1 进行中或尚无 shell 数据 */
  shellLoading: boolean;
  /** Phase2 进行中 */
  phase2Loading: boolean;
  phase: 'idle' | 'shell' | 'phase2' | 'done';
  reload: () => Promise<void>;
  loadTimelineWithSuggestions: () => Promise<TimelineOverviewResponse | null>;
}

/** 行程详情页 Tab BFF 三段加载（v1.7） */
export function useTripDetailTabBff(tripId: string | undefined): UseTripDetailTabBffResult {
  const [timeline, setTimeline] = useState<TimelineOverviewResponse | null>(null);
  const [collab, setCollab] = useState<CollabOverviewResponse | null>(null);
  const [files, setFiles] = useState<TripFilesTabData | null>(null);
  const [accommodation, setAccommodation] = useState<AccommodationOverviewResponse | null>(null);
  const [shellLoading, setShellLoading] = useState(false);
  const [phase2Loading, setPhase2Loading] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'shell' | 'phase2' | 'done'>('idle');
  const runIdRef = useRef(0);

  const loadShell = useCallback(async (targetTripId: string) => {
    const runId = ++runIdRef.current;
    setShellLoading(true);
    setPhase('shell');
    try {
      const firstPaint = await tripDetailTabApi.loadFirstPaint(targetTripId);
      if (runId !== runIdRef.current) return;
      setTimeline(firstPaint.timeline);
      setCollab(firstPaint.collab);
      setFiles(firstPaint.files);
      setAccommodation(firstPaint.accommodation);
    } catch (err) {
      if (runId !== runIdRef.current) return;
      console.warn('[useTripDetailTabBff] loadFirstPaint failed', err);
      setTimeline(null);
      setCollab(null);
      setFiles(null);
      setAccommodation(null);
    } finally {
      if (runId === runIdRef.current) setShellLoading(false);
    }
  }, []);

  const loadPhase2 = useCallback(async (targetTripId: string) => {
    const runId = runIdRef.current;
    setPhase2Loading(true);
    setPhase('phase2');
    try {
      const phase2 = await tripDetailTabApi.loadPhase2(targetTripId);
      if (runId !== runIdRef.current) return;
      setTimeline((prev) => mergeTimelineOverview(prev, phase2.timeline));
      setCollab((prev) => mergeCollabOverview(prev, phase2.collab));
      setPhase('done');
    } catch (err) {
      if (runId !== runIdRef.current) return;
      console.warn('[useTripDetailTabBff] loadPhase2 failed', err);
    } finally {
      if (runId === runIdRef.current) setPhase2Loading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    if (!tripId) return;
    runIdRef.current += 1;
    setPhase('idle');
    await loadShell(tripId);
    await loadPhase2(tripId);
  }, [tripId, loadShell, loadPhase2]);

  const loadTimelineWithSuggestions = useCallback(async () => {
    if (!tripId) return null;
    try {
      const withSuggestions = await tripTimelineApi.getOverviewWithSuggestions(tripId);
      setTimeline((prev) => mergeTimelineOverview(prev, withSuggestions));
      return withSuggestions;
    } catch (err) {
      console.warn('[useTripDetailTabBff] loadTimelineWithSuggestions failed', err);
      return null;
    }
  }, [tripId]);

  useEffect(() => {
    if (!tripId) {
      runIdRef.current += 1;
      setTimeline(null);
      setCollab(null);
      setFiles(null);
      setAccommodation(null);
      setShellLoading(false);
      setPhase2Loading(false);
      setPhase('idle');
      return;
    }

    let cancelled = false;

    (async () => {
      await loadShell(tripId);
      if (cancelled) return;
      void loadPhase2(tripId);
    })();

    return () => {
      cancelled = true;
      runIdRef.current += 1;
    };
  }, [tripId, loadShell, loadPhase2]);

  return {
    timeline,
    collab,
    files,
    accommodation,
    shellLoading,
    phase2Loading,
    phase,
    reload,
    loadTimelineWithSuggestions,
  };
}
