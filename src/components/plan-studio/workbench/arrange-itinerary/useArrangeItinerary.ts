import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { arrangeItineraryApi } from '@/api/arrange-itinerary';
import { getPlanProposal } from '@/dto/frontend-arrange-itinerary-api-client';
import { tripsApi } from '@/api/trips';
import { attractionExploreApi } from '@/api/attraction-explore';
import type { TripDetail } from '@/types/trip';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { AttractionExploreCandidatesResponse } from '@/types/attraction-explore';
import type {
  ArrangeItineraryAiActionType,
  ArrangeItineraryInsertGapRequest,
  ArrangePlanningMode,
  CopilotActionRequest,
  PlaceCandidateRequest,
  PlanProposal,
} from '@/types/arrange-itinerary';
import type { PlanningDecisionExecutionStep } from '@/types/planning-decision-pack';
import type { AttractionExploreMapPoint } from '@/types/attraction-explore';
import { isArrangeProposalWriteResponse } from '@/types/arrange-itinerary';
import { settleArrangeWriteResult } from '@/lib/arrange-proposal-auto-apply.util';
import {
  attractionExploreKeys,
  useAttractionExplore,
} from '../attraction-explore/useAttractionExplore';
import { useWorkbenchItineraryData } from '../useWorkbenchItineraryData';
import type { ArrangeItineraryViewMode } from './types';
import {
  planningWorkbenchSnapshotKeys,
  usePlanningWorkbenchSnapshot,
} from './usePlanningWorkbenchSnapshot';
import { useProposalMonitorPolling } from './useProposalMonitorPolling';
import {
  buildArrangeLodgingCoverageSummary,
  type ArrangeLodgingCoverageSummary,
} from '@/lib/arrange-itinerary-lodging-coverage.util';
import {
  buildLodgingMapPointsFromItinerary,
  mergeLodgingCopilotSuggestions,
  mergeMapPointsWithLodging,
  resolveArrangeLodgingSuggestionsBundle,
} from '@/lib/arrange-itinerary-lodging-suggestions.util';
import type { ArrangeLodgingSuggestionsBundle, CopilotSuggestion } from '@/types/arrange-itinerary';
import type { AttractionExploreMapLodgingLeg } from '@/types/attraction-explore';

export const arrangeItineraryKeys = {
  all: ['arrange-itinerary'] as const,
  overview: (tripId: string) => [...arrangeItineraryKeys.all, 'overview', tripId] as const,
  orchestration: (tripId: string) =>
    [...arrangeItineraryKeys.all, 'orchestration', tripId] as const,
  planningMode: (tripId: string) => [...arrangeItineraryKeys.all, 'planning-mode', tripId] as const,
  itemLocks: (tripId: string) => [...arrangeItineraryKeys.all, 'item-locks', tripId] as const,
  copilot: (tripId: string) => [...arrangeItineraryKeys.all, 'copilot-suggestions', tripId] as const,
  snapshot: (tripId: string) => planningWorkbenchSnapshotKeys.trip(tripId),
  map: (tripId: string, dayIndex: number | null, sync: boolean, live: boolean) =>
    [...arrangeItineraryKeys.all, 'map', tripId, sync ? dayIndex : 'all', live ? 'live' : 'heuristic'] as const,
};

function toApiDayIndex(dayIndexZeroBased: number): number {
  return dayIndexZeroBased + 1;
}

function readUserLockedItemIds(trip: TripDetail | null): Set<string> {
  const raw = (trip?.metadata as { userLockedItemIds?: unknown } | undefined)?.userLockedItemIds;
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.map((item) => String(item)));
}

export function useArrangeItinerary(
  tripId: string,
  trip: TripDetail | null,
  conflictItems: PlanningConflictItem[],
  refreshKey = 0,
) {
  const queryClient = useQueryClient();
  const explore = useAttractionExplore(tripId);
  const itinerary = useWorkbenchItineraryData(tripId, trip, conflictItems, refreshKey);
  const [viewMode, setViewMode] = useState<ArrangeItineraryViewMode>('timeline');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [mapSyncEnabled, setMapSyncEnabled] = useState(true);
  const [selectedTimelineEntryId, setSelectedTimelineEntryId] = useState<string | null>(null);
  const [activeProposal, setActiveProposal] = useState<PlanProposal | null>(null);
  const [proposalAiAnswer, setProposalAiAnswer] = useState<string | null>(null);
  const [proposalApplyComplete, setProposalApplyComplete] = useState(false);
  const [proposalExecutionSteps, setProposalExecutionSteps] = useState<
    PlanningDecisionExecutionStep[] | undefined
  >(undefined);
  const [proposalValidUntil, setProposalValidUntil] = useState<string | null>(null);

  const workbenchSnapshotQuery = usePlanningWorkbenchSnapshot(tripId);

  const overviewQuery = useQuery({
    queryKey: arrangeItineraryKeys.overview(tripId),
    queryFn: () => arrangeItineraryApi.getOverview(tripId),
    enabled: Boolean(tripId),
  });

  const orchestrationQuery = useQuery({
    queryKey: arrangeItineraryKeys.orchestration(tripId),
    queryFn: () => arrangeItineraryApi.getOrchestrationState(tripId),
    enabled: false,
  });

  const planningModeQuery = useQuery({
    queryKey: arrangeItineraryKeys.planningMode(tripId),
    queryFn: () => arrangeItineraryApi.getPlanningMode(tripId),
    enabled: false,
  });

  const itemLocksQuery = useQuery({
    queryKey: arrangeItineraryKeys.itemLocks(tripId),
    queryFn: () => arrangeItineraryApi.getItemLocks(tripId),
    enabled: Boolean(tripId),
  });

  const userLockedItemIds = useMemo(() => readUserLockedItemIds(trip), [trip]);

  const mapDayIndex = mapSyncEnabled ? toApiDayIndex(selectedDayIndex) : null;

  const mapQuery = useQuery({
    queryKey: arrangeItineraryKeys.map(tripId, mapDayIndex, mapSyncEnabled, explore.useLiveRoutes),
    queryFn: () =>
      attractionExploreApi.getMap(tripId, {
        viewTab: 'along_route',
        dayIndex: mapDayIndex ?? undefined,
        highlightItemId: selectedTimelineEntryId ?? undefined,
        includeInsertHints: true,
        useLiveRoutes: explore.useLiveRoutes || undefined,
      }),
    enabled: Boolean(tripId),
  });

  const copilotSuggestionsQuery = useQuery({
    queryKey: arrangeItineraryKeys.copilot(tripId),
    queryFn: () => arrangeItineraryApi.getCopilotSuggestions(tripId),
    enabled: false,
  });

  const workbenchSnapshot = workbenchSnapshotQuery.data;
  const orchestrationState =
    workbenchSnapshot?.orchestrationState ?? orchestrationQuery.data;
  const snapshotOverview = workbenchSnapshot?.overview;

  const invalidateWorkbenchSnapshot = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: arrangeItineraryKeys.snapshot(tripId) });
  }, [queryClient, tripId]);

  const applyDirectSideEffects = useCallback(
    async (candidates?: AttractionExploreCandidatesResponse) => {
      if (candidates) {
        queryClient.setQueryData(attractionExploreKeys.candidates(tripId), candidates);
      } else {
        explore.invalidateCandidates();
      }
      void queryClient.invalidateQueries({ queryKey: arrangeItineraryKeys.overview(tripId) });
      void queryClient.invalidateQueries({ queryKey: arrangeItineraryKeys.orchestration(tripId) });
      invalidateWorkbenchSnapshot();
      void queryClient.invalidateQueries({
        queryKey: [...arrangeItineraryKeys.all, 'map', tripId],
      });
      await itinerary.reload();
      window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
    },
    [explore, invalidateWorkbenchSnapshot, itinerary, queryClient, tripId],
  );

  const captureProposalResult = useCallback(
    (result: unknown): boolean => {
      if (!isArrangeProposalWriteResponse(result)) return false;
      setActiveProposal(result.proposal);
      setProposalAiAnswer(result.answer ?? null);
      void queryClient.invalidateQueries({ queryKey: arrangeItineraryKeys.orchestration(tripId) });
      invalidateWorkbenchSnapshot();
      return true;
    },
    [invalidateWorkbenchSnapshot, queryClient, tripId],
  );

  const applySettledArrangeWrite = useCallback(
    async <T,>(data: T, directMessage = '已写入行程') => {
      const settled = await settleArrangeWriteResult(data, (proposalId, contextVersion) =>
        arrangeItineraryApi.applyProposal(tripId, proposalId, { contextVersion }),
      );
      if (settled.status === 'auto_applied') {
        return {
          mode: 'direct' as const,
          tripId,
          message: directMessage,
          candidates: settled.candidates,
        };
      }
      return settled.result;
    },
    [tripId],
  );

  const placeCandidateMutation = useMutation({
    mutationFn: async (input: { candidateId: string; payload: PlaceCandidateRequest }) => {
      const data = await arrangeItineraryApi.placeCandidate(
        tripId,
        input.candidateId,
        input.payload,
      );
      return applySettledArrangeWrite(data, '已加入日程');
    },
    onSuccess: (data) => {
      if (captureProposalResult(data)) return;
      if (data.mode === 'direct') {
        void applyDirectSideEffects(
          'candidates' in data ? data.candidates : undefined,
        );
      }
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (payload: Parameters<typeof arrangeItineraryApi.addItem>[1]) => {
      const data = await arrangeItineraryApi.addItem(tripId, payload);
      return applySettledArrangeWrite(data, '已添加活动');
    },
    onSuccess: (data) => {
      if (captureProposalResult(data)) return;
      if (data.mode === 'direct') {
        void applyDirectSideEffects();
      }
    },
  });

  const insertGapMutation = useMutation({
    mutationFn: async (payload: ArrangeItineraryInsertGapRequest) => {
      const data = await arrangeItineraryApi.insertGap(tripId, payload);
      return applySettledArrangeWrite(data, '已插入空档');
    },
    onSuccess: (data) => {
      if (captureProposalResult(data)) return;
      if (data.mode === 'direct') {
        void applyDirectSideEffects();
      }
    },
  });

  const aiActionMutation = useMutation({
    mutationFn: (payload: {
      action: ArrangeItineraryAiActionType;
      dayIndex?: number;
      candidateIds?: string[];
    }) => arrangeItineraryApi.runAiAction(tripId, payload),
    onSuccess: (data) => {
      if (captureProposalResult(data)) return;
      if (data.mode === 'direct') {
        setProposalAiAnswer(data.answer);
      }
    },
  });

  const autoArrangeMutation = useMutation({
    mutationFn: async () => {
      const data = await arrangeItineraryApi.autoArrange(tripId);
      return applySettledArrangeWrite(data, '自动编排已完成');
    },
    onSuccess: (data) => {
      if (captureProposalResult(data)) return;
      if (data.mode === 'direct') {
        void applyDirectSideEffects(
          'candidates' in data ? data.candidates : undefined,
        );
      }
    },
  });

  const analyzeMoveMutation = useMutation({
    mutationFn: (input: { itemId: string; dayIndex: number; startTime: string; endTime: string }) =>
      arrangeItineraryApi.analyzeMove(tripId, input.itemId, {
        dayIndex: input.dayIndex,
        startTime: input.startTime,
        endTime: input.endTime,
      }),
    onSuccess: (data) => {
      captureProposalResult(data);
    },
  });

  const setPlanningModeMutation = useMutation({
    mutationFn: (mode: ArrangePlanningMode) => arrangeItineraryApi.setPlanningMode(tripId, mode),
    onSuccess: (data) => {
      queryClient.setQueryData(arrangeItineraryKeys.planningMode(tripId), data);
      invalidateWorkbenchSnapshot();
    },
  });

  const copilotActionMutation = useMutation({
    mutationFn: (payload: CopilotActionRequest) =>
      arrangeItineraryApi.runCopilotAction(tripId, payload),
    onSuccess: (data) => {
      captureProposalResult(data);
    },
  });

  const toggleUserLockMutation = useMutation({
    mutationFn: async (input: { itemId: string; locked: boolean }) => {
      if (!trip) throw new Error('行程未加载');
      const metadata = { ...(trip.metadata ?? {}) } as Record<string, unknown>;
      const current = readUserLockedItemIds(trip);
      if (input.locked) current.add(input.itemId);
      else current.delete(input.itemId);
      metadata.userLockedItemIds = [...current];
      await tripsApi.update(tripId, { metadata });
      return [...current];
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: arrangeItineraryKeys.itemLocks(tripId) });
    },
  });

  const applyProposalMutation = useMutation({
    mutationFn: (input: { proposalId: string; contextVersion: number; force?: boolean }) =>
      arrangeItineraryApi.applyProposal(tripId, input.proposalId, {
        contextVersion: input.contextVersion,
        force: input.force,
      }),
    onSuccess: (data) => {
      setProposalApplyComplete(true);
      setProposalExecutionSteps(data.executionSteps);
      setProposalValidUntil(data.validUntil ?? null);
      void applyDirectSideEffects(data.candidates);
    },
  });

  const discardProposalMutation = useMutation({
    mutationFn: (proposalId: string) => arrangeItineraryApi.discardProposal(tripId, proposalId),
    onSuccess: () => {
      setActiveProposal(null);
      setProposalAiAnswer(null);
      void queryClient.invalidateQueries({ queryKey: arrangeItineraryKeys.orchestration(tripId) });
      invalidateWorkbenchSnapshot();
    },
  });

  const dayCount = trip?.TripDay?.length ?? 0;

  const daySnapshots = useMemo(() => {
    const snapshots = [];
    for (let i = 0; i < dayCount; i += 1) {
      const snapshot = itinerary.buildDaySnapshot(i);
      if (snapshot) snapshots.push(snapshot);
    }
    return snapshots;
  }, [dayCount, itinerary.buildDaySnapshot]);

  const overview = overviewQuery.data ?? (snapshotOverview ? { ...snapshotOverview, tripId } : undefined);

  const activityCount =
    overview?.activityCount ??
    snapshotOverview?.activityCount ??
    daySnapshots.reduce((sum, day) => sum + day.timeline.length, 0);

  const nights =
    overview?.nights ?? snapshotOverview?.nights ?? Math.max(0, dayCount - 1);

  const lodgingCoverage: ArrangeLodgingCoverageSummary = useMemo(
    () => buildArrangeLodgingCoverageSummary(trip, itinerary.itineraryByDay),
    [trip, itinerary.itineraryByDay],
  );

  const lodgingSuggestionsBundle: ArrangeLodgingSuggestionsBundle = useMemo(() => {
    const bffSuggestions =
      workbenchSnapshot?.lodgingSuggestions ??
      workbenchSnapshot?.overview?.lodgingSuggestions ??
      overviewQuery.data?.lodgingSuggestions ??
      snapshotOverview?.lodgingSuggestions;
    const bffStandard = {
      stars:
        workbenchSnapshot?.accommodationStandardStars ??
        workbenchSnapshot?.overview?.accommodationStandardStars ??
        overviewQuery.data?.accommodationStandardStars ??
        snapshotOverview?.accommodationStandardStars,
      label:
        workbenchSnapshot?.accommodationStandardLabel ??
        workbenchSnapshot?.overview?.accommodationStandardLabel ??
        overviewQuery.data?.accommodationStandardLabel ??
        snapshotOverview?.accommodationStandardLabel,
    };
    return resolveArrangeLodgingSuggestionsBundle({
      trip,
      lodgingCoverage,
      bffSuggestions,
      bffStandard,
    });
  }, [
    lodgingCoverage,
    overviewQuery.data?.accommodationStandardLabel,
    overviewQuery.data?.accommodationStandardStars,
    overviewQuery.data?.lodgingSuggestions,
    snapshotOverview?.accommodationStandardLabel,
    snapshotOverview?.accommodationStandardStars,
    snapshotOverview?.lodgingSuggestions,
    trip,
    workbenchSnapshot?.accommodationStandardLabel,
    workbenchSnapshot?.accommodationStandardStars,
    workbenchSnapshot?.lodgingSuggestions,
    workbenchSnapshot?.overview?.accommodationStandardLabel,
    workbenchSnapshot?.overview?.accommodationStandardStars,
    workbenchSnapshot?.overview?.lodgingSuggestions,
  ]);

  const baseMapPoints = mapQuery.data?.points ?? [];

  const lodgingMapPoints = useMemo(
    () =>
      buildLodgingMapPointsFromItinerary({
        trip,
        itineraryByDay: itinerary.itineraryByDay,
        bundle: lodgingSuggestionsBundle,
      }),
    [itinerary.itineraryByDay, lodgingSuggestionsBundle, trip],
  );

  const mapPoints = useMemo(
    () => mergeMapPointsWithLodging(baseMapPoints, lodgingMapPoints),
    [baseMapPoints, lodgingMapPoints],
  );

  const mapLodgingLegs: AttractionExploreMapLodgingLeg[] = useMemo(
    () => mapQuery.data?.lodgingLegs ?? [],
    [mapQuery.data?.lodgingLegs],
  );

  const rawCopilotSuggestions: CopilotSuggestion[] =
    workbenchSnapshot?.copilotSuggestions ?? copilotSuggestionsQuery.data?.suggestions ?? [];

  const copilotSuggestions = useMemo(
    () =>
      mergeLodgingCopilotSuggestions(
        rawCopilotSuggestions,
        lodgingCoverage,
        lodgingSuggestionsBundle,
      ),
    [lodgingCoverage, lodgingSuggestionsBundle, rawCopilotSuggestions],
  );

  const reloadAll = useCallback(async () => {
    await itinerary.reload();
    explore.invalidateCandidates();
    void queryClient.invalidateQueries({ queryKey: arrangeItineraryKeys.overview(tripId) });
    void queryClient.invalidateQueries({ queryKey: arrangeItineraryKeys.orchestration(tripId) });
    invalidateWorkbenchSnapshot();
    void queryClient.invalidateQueries({
      queryKey: [...arrangeItineraryKeys.all, 'map', tripId],
    });
  }, [explore, invalidateWorkbenchSnapshot, itinerary, queryClient, tripId]);

  const placeCandidate = useCallback(
    (candidateId: string, dayIndexZeroBased: number, options?: Partial<PlaceCandidateRequest>) =>
      placeCandidateMutation.mutateAsync({
        candidateId,
        payload: {
          dayIndex: toApiDayIndex(dayIndexZeroBased),
          insertMode: 'append',
          removeFromCandidates: true,
          ...options,
        },
      }),
    [placeCandidateMutation],
  );

  const applyActiveProposal = useCallback(
    async (force = false) => {
      if (!activeProposal) return;
      await applyProposalMutation.mutateAsync({
        proposalId: activeProposal.proposalId,
        contextVersion: activeProposal.contextVersion,
        force,
      });
    },
    [activeProposal, applyProposalMutation],
  );

  const discardActiveProposal = useCallback(async () => {
    if (!activeProposal) return;
    await discardProposalMutation.mutateAsync(activeProposal.proposalId);
  }, [activeProposal, discardProposalMutation]);

  const loadActiveProposal = useCallback(async () => {
    const proposalId = orchestrationState?.activeProposalId;
    if (!proposalId) return;
    const proposal = await getPlanProposal(tripId, proposalId);
    setActiveProposal(proposal);
    setProposalApplyComplete(false);
    setProposalExecutionSteps(undefined);
    setProposalValidUntil(null);
    setProposalAiAnswer(null);
  }, [orchestrationState?.activeProposalId, tripId]);

  const tripConflictDiagnostics = useMemo(
    () =>
      conflictItems.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        dayIndex: item.affectedDays?.[0],
        priority: item.priority,
      })),
    [conflictItems],
  );

  const monitorProposalId =
    proposalApplyComplete && activeProposal?.proposalId ? activeProposal.proposalId : null;
  const monitorEnabled = Boolean(
    monitorProposalId &&
      (proposalValidUntil ?? activeProposal?.decisionPack?.validUntil),
  );

  const proposalMonitor = useProposalMonitorPolling(tripId, monitorProposalId, {
    enabled: monitorEnabled,
    onStale: () => {
      setProposalApplyComplete(false);
      void loadActiveProposal();
    },
  });

  const planningMode = workbenchSnapshot?.planningMode ?? planningModeQuery.data?.mode ?? 'copilot';
  const copilotEnabled = planningMode === 'copilot';

  const runCopilotAction = useCallback(
    (payload: CopilotActionRequest) => copilotActionMutation.mutateAsync(payload),
    [copilotActionMutation],
  );

  const analyzeMove = useCallback(
    (itemId: string, dayIndexZeroBased: number, startTime: string, endTime: string) =>
      analyzeMoveMutation.mutateAsync({
        itemId,
        dayIndex: toApiDayIndex(dayIndexZeroBased),
        startTime,
        endTime,
      }),
    [analyzeMoveMutation],
  );

  const toggleUserLock = useCallback(
    (itemId: string, locked: boolean) => toggleUserLockMutation.mutateAsync({ itemId, locked }),
    [toggleUserLockMutation],
  );

  const setPlanningMode = useCallback(
    (mode: ArrangePlanningMode) => setPlanningModeMutation.mutateAsync(mode),
    [setPlanningModeMutation],
  );

  const writePending =
    placeCandidateMutation.isPending ||
    addItemMutation.isPending ||
    insertGapMutation.isPending ||
    aiActionMutation.isPending ||
    autoArrangeMutation.isPending ||
    analyzeMoveMutation.isPending ||
    copilotActionMutation.isPending;

  const placeMapPointProposal = useCallback(
    async (point: AttractionExploreMapPoint) => {
      const result = await explore.requestMapPlaceProposal(point);
      if (result.suggestions.length <= 1) {
        captureProposalResult({
          mode: 'proposal',
          tripId,
          proposal: result.proposal,
          orchestrationState: result.orchestrationState,
          answer: result.answer,
        });
        explore.clearActiveMapProposal();
      }
      return result;
    },
    [captureProposalResult, explore, tripId],
  );

  const selectMapPlaceSuggestionForArrange = useCallback(
    async (index: number) => {
      const result = await explore.selectMapPlaceSuggestion(index);
      captureProposalResult({
        mode: 'proposal',
        tripId,
        proposal: result.proposal,
        orchestrationState: result.orchestrationState,
        answer: result.answer,
      });
      explore.clearActiveMapProposal();
      return result;
    },
    [captureProposalResult, explore, tripId],
  );

  return {
    ...explore,
    viewMode,
    setViewMode,
    selectedDayIndex,
    setSelectedDayIndex,
    selectedTimelineEntryId,
    setSelectedTimelineEntryId,
    mapSyncEnabled,
    setMapSyncEnabled,
    overview,
    overviewLoading: overviewQuery.isLoading,
    workbenchSnapshot,
    workbenchSnapshotLoading: workbenchSnapshotQuery.isLoading,
    orchestrationState,
    orchestrationLoading: workbenchSnapshotQuery.isLoading,
    planningMode,
    copilotEnabled,
    setPlanningMode,
    planningModePending: setPlanningModeMutation.isPending,
    copilotSuggestions,
    copilotSuggestionsLoading: workbenchSnapshotQuery.isLoading,
    pendingProposalCount: workbenchSnapshot?.pendingProposalCount ?? 0,
    workbenchConflictCount: workbenchSnapshot?.conflictCount,
    itemLocksSummary: workbenchSnapshot?.itemLocksSummary,
    reloadCopilotSuggestions: invalidateWorkbenchSnapshot,
    runCopilotAction,
    copilotActionPending: copilotActionMutation.isPending,
    itemLocks: itemLocksQuery.data,
    itemLocksLoading: itemLocksQuery.isLoading,
    userLockedItemIds,
    toggleUserLock,
    userLockPending: toggleUserLockMutation.isPending,
    analyzeMove,
    analyzeMovePending: analyzeMoveMutation.isPending,
    activeProposal,
    proposalAiAnswer,
    proposalApplyComplete,
    proposalExecutionSteps,
    proposalValidUntil,
    workbenchDecisionClusters: workbenchSnapshotQuery.data?.decisionClusters,
    tripConflictDiagnostics,
    loadActiveProposal,
    proposalMonitorStale: proposalMonitor.isStale,
    proposalMonitorStaleReason: proposalMonitor.staleReason,
    clearActiveProposal: () => {
      setActiveProposal(null);
      setProposalAiAnswer(null);
      setProposalApplyComplete(false);
      setProposalExecutionSteps(undefined);
      setProposalValidUntil(null);
    },
    itineraryLoading: itinerary.loading,
    itineraryLoadingPhase: itinerary.loadingPhase,
    itineraryByDay: itinerary.itineraryByDay,
    lodgingCoverage,
    lodgingSuggestionsBundle,
    routeStops: itinerary.routeStops,
    routeStats: itinerary.routeStats,
    daySnapshots,
    activityCount,
    nights,
    mapPoints,
    mapLodgingLegs,
    mapRoutePolyline: mapQuery.data?.routePolyline,
    mapLoading: mapQuery.isLoading,
    reloadAll,
    placeCandidate,
    placeCandidatePending: placeCandidateMutation.isPending,
    addItem: addItemMutation.mutateAsync,
    addItemPending: addItemMutation.isPending,
    insertGap: insertGapMutation.mutateAsync,
    insertGapPending: insertGapMutation.isPending,
    runAiAction: aiActionMutation.mutateAsync,
    aiActionPending: aiActionMutation.isPending,
    aiActionResult: aiActionMutation.data,
    autoArrange: autoArrangeMutation.mutateAsync,
    autoArrangePending: autoArrangeMutation.isPending,
    applyActiveProposal,
    applyProposalPending: applyProposalMutation.isPending,
    discardActiveProposal,
    discardProposalPending: discardProposalMutation.isPending,
    writePending,
    captureProposalResult,
    applyDirectSideEffects,
    placeMapPointProposal,
    selectMapPlaceSuggestionForArrange,
  };
}

export type UseArrangeItineraryResult = ReturnType<typeof useArrangeItinerary>;
