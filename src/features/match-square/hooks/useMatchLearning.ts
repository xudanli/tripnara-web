import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { matchLearningApi } from '@/api/match-learning';

export function useMatchLearningWeights() {
  return useQuery({
    queryKey: ['match-learning', 'weights'],
    queryFn: () => matchLearningApi.getWeights(),
    staleTime: 60_000,
  });
}

export function useMatchLearningRuns(enabled = true) {
  return useQuery({
    queryKey: ['match-learning', 'runs'],
    queryFn: () => matchLearningApi.getRuns(),
    enabled,
    staleTime: 30_000,
  });
}

export function useRunMatchLearningWeekly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => matchLearningApi.runWeekly(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match-learning'] });
    },
  });
}
