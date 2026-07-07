import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { arrangeItineraryApi } from '@/api/arrange-itinerary';
import { attractionExploreApi } from '@/api/attraction-explore';
import { usePlanningWorkbenchSnapshot } from '../arrange-itinerary/usePlanningWorkbenchSnapshot';
import type {
  AttractionExploreAddCandidateRequest,
  AttractionExploreCompiledIntent,
  AttractionExploreCopilotNextAction,
  AttractionExploreItem,
  AttractionExploreMapPoint,
  AttractionExplorePriority,
  AttractionExploreViewTab,
} from '@/types/attraction-explore';
import type { PlanProposal } from '@/types/arrange-itinerary';
import { isLiveRoutesAvailable } from '@/lib/attraction-explore-route-options.util';

export const attractionExploreKeys = {
  all: ['attraction-explore'] as const,
  context: (tripId: string) => [...attractionExploreKeys.all, 'context', tripId] as const,
  recommendations: (tripId: string, filters: string) =>
    [...attractionExploreKeys.all, 'recommendations', tripId, filters] as const,
  candidates: (tripId: string) => [...attractionExploreKeys.all, 'candidates', tripId] as const,
  map: (tripId: string, viewTab: AttractionExploreViewTab, insertHints: boolean, live: boolean) =>
    [...attractionExploreKeys.all, 'map', tripId, viewTab, insertHints ? 'hints' : 'plain', live ? 'live' : 'heuristic'] as const,
};

export function useAttractionExplore(tripId: string) {
  const queryClient = useQueryClient();
  const [viewTab, setViewTab] = useState<AttractionExploreViewTab>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [selectedSuitabilityIds, setSelectedSuitabilityIds] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [compiledIntent, setCompiledIntent] = useState<AttractionExploreCompiledIntent | null>(null);
  const [activeMapProposal, setActiveMapProposal] = useState<PlanProposal | null>(null);
  const [mapProposalAnswer, setMapProposalAnswer] = useState<string | null>(null);
  const [mapPlaceSuggestions, setMapPlaceSuggestions] = useState<{
    placeName: string;
    placeId: number | string;
    dayIndex: number;
    candidateId?: string;
    suggestions: import('@/types/attraction-explore').AttractionExploreMapPlaceSuggestion[];
  } | null>(null);
  const [useLlmIntent, setUseLlmIntent] = useState(true);
  const [useLiveRoutes, setUseLiveRoutes] = useState(() => isLiveRoutesAvailable());
  const liveRoutesAvailable = isLiveRoutesAvailable();
  const skipContextPersistRef = useRef(true);

  const workbenchSnapshotQuery = usePlanningWorkbenchSnapshot(tripId);
  const copilotModeEnabled = workbenchSnapshotQuery.data?.planningMode !== 'manual';

  const contextQuery = useQuery({
    queryKey: attractionExploreKeys.context(tripId),
    queryFn: () => attractionExploreApi.getContext(tripId),
    enabled: Boolean(tripId),
  });

  useEffect(() => {
    if (!contextQuery.data || filtersInitialized) return;
    setSelectedThemeIds(contextQuery.data.selectedThemeIds);
    setSelectedSuitabilityIds(contextQuery.data.selectedSuitabilityIds);
    if (contextQuery.data.selectedViewTab) {
      setViewTab(contextQuery.data.selectedViewTab);
    }
    setFiltersInitialized(true);
    skipContextPersistRef.current = true;
  }, [contextQuery.data, filtersInitialized]);

  const updateContextMutation = useMutation({
    mutationFn: () =>
      attractionExploreApi.updateContext(tripId, {
        selectedFilters: {
          themeIds: selectedThemeIds,
          suitabilityIds: selectedSuitabilityIds,
          viewTab,
        },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(attractionExploreKeys.context(tripId), data);
    },
  });

  const persistContextRef = useRef(updateContextMutation.mutate);
  persistContextRef.current = updateContextMutation.mutate;

  useEffect(() => {
    if (!tripId || !filtersInitialized) return;
    if (skipContextPersistRef.current) {
      skipContextPersistRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      persistContextRef.current();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [tripId, filtersInitialized, selectedThemeIds, selectedSuitabilityIds, viewTab]);

  const filterKey = `${viewTab}:${selectedThemeIds.join(',')}:${selectedSuitabilityIds.join(',')}:${searchQuery}:${useLlmIntent}:${useLiveRoutes}`;

  const recommendationsQuery = useQuery({
    queryKey: attractionExploreKeys.recommendations(tripId, filterKey),
    queryFn: () => {
      if (searchQuery.trim()) {
        return attractionExploreApi.search({
          tripId,
          query: searchQuery.trim(),
          themeIds: selectedThemeIds,
          suitabilityIds: selectedSuitabilityIds,
          viewTab,
          useLlmIntent: useLlmIntent || undefined,
          useLiveRoutes: useLiveRoutes || undefined,
        });
      }
      return attractionExploreApi.getRecommendations({
        tripId,
        themeIds: selectedThemeIds,
        suitabilityIds: selectedSuitabilityIds,
        viewTab,
        useLiveRoutes: useLiveRoutes || undefined,
      });
    },
    enabled: Boolean(tripId) && filtersInitialized,
  });

  useEffect(() => {
    const fromSearch = recommendationsQuery.data?.compiledIntent;
    if (fromSearch) setCompiledIntent(fromSearch);
  }, [recommendationsQuery.data?.compiledIntent]);

  const candidatesQuery = useQuery({
    queryKey: attractionExploreKeys.candidates(tripId),
    queryFn: () => attractionExploreApi.getCandidates(tripId),
    enabled: Boolean(tripId),
  });

  const mapQuery = useQuery({
    queryKey: attractionExploreKeys.map(tripId, viewTab, true, useLiveRoutes),
    queryFn: () =>
      attractionExploreApi.getMap(tripId, {
        viewTab,
        includeInsertHints: true,
        useLiveRoutes: useLiveRoutes || undefined,
      }),
    enabled: Boolean(tripId) && viewTab === 'map',
  });

  const invalidateRecommendations = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [...attractionExploreKeys.all, 'recommendations', tripId],
    });
  }, [queryClient, tripId]);

  const invalidateCandidates = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: attractionExploreKeys.candidates(tripId) });
  }, [queryClient, tripId]);

  const compileIntentMutation = useMutation({
    mutationFn: (query: string) =>
      attractionExploreApi.compileExploreIntent({ tripId, query, useLlm: useLlmIntent }),
    onSuccess: (data) => {
      setCompiledIntent(data);
      const themeIds = data.themes?.map((item) => item.id) ?? [];
      const suitabilityIds = data.suitableFor?.map((item) => item.id) ?? [];
      if (themeIds.length > 0) setSelectedThemeIds(themeIds);
      if (suitabilityIds.length > 0) setSelectedSuitabilityIds(suitabilityIds);
    },
  });

  const mapPlaceProposalMutation = useMutation({
    mutationFn: (input: {
      placeId: number | string;
      dayIndex: number;
      candidateId?: string;
      suggestionIndex?: number;
    }) =>
      attractionExploreApi.createMapPlaceProposal({
        tripId,
        placeId: input.placeId,
        dayIndex: input.dayIndex,
        candidateId: input.candidateId,
        suggestionIndex: input.suggestionIndex,
        useLiveRoutes: useLiveRoutes || undefined,
      }),
    onSuccess: (data) => {
      if (data.suggestions.length > 1) {
        return;
      }
      setActiveMapProposal(data.proposal);
      setMapProposalAnswer(data.answer ?? null);
      setMapPlaceSuggestions(null);
    },
  });

  const copilotActionMutation = useMutation({
    mutationFn: (payload: import('@/types/arrange-itinerary').CopilotActionRequest) =>
      arrangeItineraryApi.runCopilotAction(tripId, payload),
    onSuccess: (data) => {
      setActiveMapProposal(data.proposal);
      setMapProposalAnswer(data.answer ?? null);
      void workbenchSnapshotQuery.refetch();
    },
  });

  const runCopilotNextAction = useCallback(
    async (nextAction: AttractionExploreCopilotNextAction) => {
      await copilotActionMutation.mutateAsync({
        action: nextAction.action,
        candidateId: nextAction.candidateId,
        suggestionId: nextAction.suggestionId,
      });
    },
    [copilotActionMutation],
  );

  const addCandidateMutation = useMutation({
    mutationFn: (payload: AttractionExploreAddCandidateRequest) =>
      attractionExploreApi.addCandidate(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(attractionExploreKeys.candidates(tripId), data);
      void queryClient.invalidateQueries({
        queryKey: attractionExploreKeys.map(tripId, viewTab, true, useLiveRoutes),
      });
    },
  });

  const removeCandidateMutation = useMutation({
    mutationFn: (candidateId: string) =>
      attractionExploreApi.removeCandidate({ tripId, candidateId }),
    onSuccess: (data) => {
      queryClient.setQueryData(attractionExploreKeys.candidates(tripId), data);
      void queryClient.invalidateQueries({
        queryKey: [...attractionExploreKeys.all, 'map', tripId],
      });
    },
  });

  const autoArrangeMutation = useMutation({
    mutationFn: () => attractionExploreApi.autoArrange({ tripId }),
    onSuccess: () => {
      invalidateCandidates();
      window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
    },
  });

  const consultAiMutation = useMutation({
    mutationFn: (question?: string) =>
      attractionExploreApi.consultAi({ tripId, question }),
  });

  const toggleTheme = useCallback((id: string) => {
    setSelectedThemeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const toggleSuitability = useCallback((id: string) => {
    setSelectedSuitabilityIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const compileAndSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setCompiledIntent(null);
        invalidateRecommendations();
        return;
      }
      await compileIntentMutation.mutateAsync(trimmed);
      invalidateRecommendations();
    },
    [compileIntentMutation, invalidateRecommendations],
  );

  const requestMapPlaceProposal = useCallback(
    async (point: AttractionExploreMapPoint) => {
      if (point.placeId == null) {
        throw new Error('该点位缺少 placeId，无法生成插入草案');
      }
      const dayIndex = point.insertHint?.suggestedDayIndex ?? 1;
      const candidateId = point.kind === 'candidate' ? point.id : undefined;
      const result = await mapPlaceProposalMutation.mutateAsync({
        placeId: point.placeId,
        dayIndex,
        candidateId,
      });
      if (result.suggestions.length > 1) {
        setMapPlaceSuggestions({
          placeName: point.name,
          placeId: point.placeId,
          dayIndex,
          candidateId,
          suggestions: result.suggestions,
        });
      }
      return result;
    },
    [mapPlaceProposalMutation],
  );

  const selectMapPlaceSuggestion = useCallback(
    async (index: number) => {
      if (!mapPlaceSuggestions) {
        throw new Error('无可用插入建议');
      }
      return mapPlaceProposalMutation.mutateAsync({
        placeId: mapPlaceSuggestions.placeId,
        dayIndex: mapPlaceSuggestions.suggestions[index]?.dayIndex ?? mapPlaceSuggestions.dayIndex,
        candidateId: mapPlaceSuggestions.candidateId,
        suggestionIndex: index,
      });
    },
    [mapPlaceProposalMutation, mapPlaceSuggestions],
  );

  const clearActiveMapProposal = useCallback(() => {
    setActiveMapProposal(null);
    setMapProposalAnswer(null);
    setMapPlaceSuggestions(null);
  }, []);

  const handleAddToCandidates = useCallback(
    async (
      item: AttractionExploreItem,
      priority: AttractionExplorePriority = 'very_interested',
    ) => {
      try {
        const data = await addCandidateMutation.mutateAsync({
          tripId,
          placeId: item.placeId,
          attractionId: item.id,
          priority,
          useLiveRoutes: useLiveRoutes || undefined,
        });
        for (const warning of data.precheck?.warnings ?? []) {
          if (warning.severity === 'error') {
            toast.error(warning.message);
          } else {
            toast.warning(warning.message);
          }
        }
        const nextAction = data.copilotNextAction;
        if (nextAction && copilotModeEnabled) {
          toast.success('已加入候选', {
            action: {
              label: nextAction.action === 'draft_for_candidate' ? '生成插入草案' : '执行协同动作',
              onClick: () => {
                void runCopilotNextAction(nextAction)
                  .then(() => toast.message('已生成草案，请确认后写入'))
                  .catch((error) => {
                    toast.error(error instanceof Error ? error.message : '协同动作失败');
                  });
              },
            },
          });
          return;
        }
        toast.success('已加入候选');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加入候选失败');
        throw error;
      }
    },
    [addCandidateMutation, copilotModeEnabled, runCopilotNextAction, tripId, useLiveRoutes],
  );

  const findCandidateIdForItem = useCallback(
    (item: AttractionExploreItem): string | undefined => {
      for (const candidate of candidatesQuery.data?.candidates ?? []) {
        if (candidate.attractionId && candidate.attractionId === item.id) return candidate.id;
        if (item.placeId != null && candidate.placeId != null && String(candidate.placeId) === String(item.placeId)) {
          return candidate.id;
        }
        if (candidate.id === item.id) return candidate.id;
      }
      return undefined;
    },
    [candidatesQuery.data?.candidates],
  );

  const handleRemoveFromCandidates = useCallback(
    (candidateId: string) => removeCandidateMutation.mutateAsync(candidateId),
    [removeCandidateMutation],
  );

  const handleRemoveItemFromCandidates = useCallback(
    (item: AttractionExploreItem) => {
      const candidateId = findCandidateIdForItem(item);
      if (!candidateId) {
        return Promise.reject(new Error('未找到对应候选'));
      }
      return removeCandidateMutation.mutateAsync(candidateId);
    },
    [findCandidateIdForItem, removeCandidateMutation],
  );

  const candidatePlaceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const candidate of candidatesQuery.data?.candidates ?? []) {
      if (candidate.placeId != null) ids.add(String(candidate.placeId));
      if (candidate.attractionId) ids.add(candidate.attractionId);
      ids.add(candidate.id);
    }
    return ids;
  }, [candidatesQuery.data?.candidates]);

  const isInCandidates = useCallback(
    (item: AttractionExploreItem) =>
      candidatePlaceIds.has(item.id) ||
      (item.placeId != null && candidatePlaceIds.has(String(item.placeId))),
    [candidatePlaceIds],
  );

  return {
    viewTab,
    setViewTab,
    searchQuery,
    setSearchQuery,
    selectedThemeIds,
    selectedSuitabilityIds,
    toggleTheme,
    toggleSuitability,
    context: contextQuery.data,
    contextLoading: contextQuery.isLoading,
    recommendations: recommendationsQuery.data?.sections ?? [],
    recommendationsLoading: recommendationsQuery.isLoading,
    compiledIntent,
    compileIntentPending: compileIntentMutation.isPending,
    compileAndSearch,
    useLlmIntent,
    setUseLlmIntent,
    useLiveRoutes,
    setUseLiveRoutes,
    liveRoutesAvailable,
    mapPoints: mapQuery.data?.points ?? [],
    mapRoutePolyline: mapQuery.data?.routePolyline,
    mapLoading: mapQuery.isLoading,
    requestMapPlaceProposal,
    mapPlaceProposalPending: mapPlaceProposalMutation.isPending,
    activeMapProposal,
    mapProposalAnswer,
    mapPlaceSuggestions,
    selectMapPlaceSuggestion,
    clearActiveMapProposal,
    candidates: candidatesQuery.data?.candidates ?? [],
    summary: candidatesQuery.data?.summary,
    candidatesLoading: candidatesQuery.isLoading,
    handleAddToCandidates,
    handleRemoveFromCandidates,
    handleRemoveItemFromCandidates,
    isInCandidates,
    addCandidatePending: addCandidateMutation.isPending,
    removeCandidatePending: removeCandidateMutation.isPending,
    autoArrange: autoArrangeMutation.mutateAsync,
    autoArrangePending: autoArrangeMutation.isPending,
    consultAi: consultAiMutation.mutateAsync,
    consultAiPending: consultAiMutation.isPending,
    consultAiResult: consultAiMutation.data,
    invalidateRecommendations,
    invalidateCandidates,
    workbenchSnapshot: workbenchSnapshotQuery.data,
    workbenchSnapshotLoading: workbenchSnapshotQuery.isLoading,
    copilotModeEnabled,
    runCopilotNextAction,
    copilotActionPending: copilotActionMutation.isPending,
  };
}

export type UseAttractionExploreResult = ReturnType<typeof useAttractionExplore>;
