/**
 * Narrative Engine V1 — React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { narrativeEngineApi } from '@/api/narrative-engine';
import type {
  GenerateCandidatesResult,
  NarrativeIntakeRequest,
  RegenerateThemeRequest,
  SelectThemeRequest,
} from '@/types/narrative-engine';

export const narrativeThemeQueryKey = (tripId: string) =>
  ['narrative-theme', tripId] as const;

export function useNarrativeTheme(tripId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: narrativeThemeQueryKey(tripId ?? ''),
    queryFn: () => narrativeEngineApi.getTheme(tripId!),
    enabled: Boolean(tripId) && enabled,
    staleTime: 30_000,
  });
}

export function useNarrativeThemeMutations(tripId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (tripId) {
      queryClient.invalidateQueries({ queryKey: narrativeThemeQueryKey(tripId) });
    }
  };

  const submitIntake = useMutation({
    mutationFn: (request: NarrativeIntakeRequest) =>
      narrativeEngineApi.submitIntake(tripId!, request),
  });

  const selectTheme = useMutation({
    mutationFn: (request: SelectThemeRequest) =>
      narrativeEngineApi.selectTheme(tripId!, request),
    onSuccess: invalidate,
  });

  const regenerateCandidates = useMutation({
    mutationFn: (request: RegenerateThemeRequest) =>
      narrativeEngineApi.regenerateCandidates(tripId!, request),
  });

  const clearTheme = useMutation({
    mutationFn: () => narrativeEngineApi.clearTheme(tripId!),
    onSuccess: invalidate,
  });

  return {
    submitIntake,
    selectTheme,
    regenerateCandidates,
    clearTheme,
    invalidate,
  };
}

/** 最近一次候选生成结果（intake / regenerate 后由 UI 持有） */
export type NarrativeCandidatesSession = GenerateCandidatesResult;
