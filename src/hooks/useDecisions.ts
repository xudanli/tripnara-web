/**
 * 决策引擎 API - React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decisionsApi, userDecisionsApi } from '@/api/decisions';
import type {
  CreateDecisionRequest,
  CreateDecisionResponse,
  DecisionDetail,
  SelectPlanRequest,
  DecisionFeedbackRequest,
  DecisionHistoryQuery,
  DecisionHistoryResponse,
  LearningProgress,
  DetailedExplanation,
  NaturalLanguageExplanation,
  ExplanationDetailLevel,
  ExplanationLanguage,
  SelectedPlan,
} from '@/types/decision-engine';

const QUERY_KEYS = {
  decision: (id: string) => ['decision', id] as const,
  decisions: ['decisions'] as const,
  decisionHistory: (query?: DecisionHistoryQuery) => ['decisionHistory', query] as const,
  explanation: (id: string) => ['decision', id, 'explanation'] as const,
  naturalExplanation: (id: string) => ['decision', id, 'naturalExplanation'] as const,
  alternative: (decisionId: string, planId: string) => ['decision', decisionId, 'alternative', planId] as const,
  learningProgress: ['learningProgress'] as const,
};

export interface UseCreateDecisionReturn {
  createDecision: (data: CreateDecisionRequest) => Promise<CreateDecisionResponse>;
  isCreating: boolean;
  error: Error | null;
  data: CreateDecisionResponse | undefined;
  reset: () => void;
}

export function useCreateDecision(): UseCreateDecisionReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: decisionsApi.create,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.decision(data.decisionId), data);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decisionHistory() });
    },
  });

  return {
    createDecision: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

export interface UseDecisionReturn {
  decision: DecisionDetail | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDecision(decisionId: string | undefined): UseDecisionReturn {
  const query = useQuery({
    queryKey: QUERY_KEYS.decision(decisionId || ''),
    queryFn: () => decisionsApi.getById(decisionId!),
    enabled: !!decisionId,
  });

  return {
    decision: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export interface UseDecisionExplanationReturn {
  explanation: DetailedExplanation | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDecisionExplanation(
  decisionId: string | undefined,
  options?: {
    language?: ExplanationLanguage;
    detailLevel?: ExplanationDetailLevel;
    enabled?: boolean;
  }
): UseDecisionExplanationReturn {
  const query = useQuery({
    queryKey: [...QUERY_KEYS.explanation(decisionId || ''), options],
    queryFn: () => decisionsApi.getExplanation(decisionId!, {
      language: options?.language,
      detailLevel: options?.detailLevel,
    }),
    enabled: !!decisionId && (options?.enabled !== false),
  });

  return {
    explanation: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export interface UseNaturalExplanationReturn {
  explanation: NaturalLanguageExplanation | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useNaturalExplanation(
  decisionId: string | undefined,
  language?: ExplanationLanguage
): UseNaturalExplanationReturn {
  const query = useQuery({
    queryKey: [...QUERY_KEYS.naturalExplanation(decisionId || ''), language],
    queryFn: () => decisionsApi.getNaturalExplanation(decisionId!, language),
    enabled: !!decisionId,
  });

  return {
    explanation: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export interface UseAlternativePlanReturn {
  plan: SelectedPlan | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useAlternativePlan(
  decisionId: string | undefined,
  planId: string | undefined
): UseAlternativePlanReturn {
  const query = useQuery({
    queryKey: QUERY_KEYS.alternative(decisionId || '', planId || ''),
    queryFn: () => decisionsApi.getAlternative(decisionId!, planId!),
    enabled: !!decisionId && !!planId,
  });

  return {
    plan: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export interface UseSelectPlanReturn {
  selectPlan: (decisionId: string, data: SelectPlanRequest) => Promise<void>;
  isSelecting: boolean;
  error: Error | null;
}

export function useSelectPlan(): UseSelectPlanReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ decisionId, data }: { decisionId: string; data: SelectPlanRequest }) =>
      decisionsApi.selectPlan(decisionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decision(variables.decisionId) });
    },
  });

  return {
    selectPlan: (decisionId, data) => mutation.mutateAsync({ decisionId, data }).then(() => {}),
    isSelecting: mutation.isPending,
    error: mutation.error,
  };
}

export interface UseSubmitFeedbackReturn {
  submitFeedback: (decisionId: string, data: DecisionFeedbackRequest) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export function useSubmitFeedback(): UseSubmitFeedbackReturn {
  const mutation = useMutation({
    mutationFn: ({ decisionId, data }: { decisionId: string; data: DecisionFeedbackRequest }) =>
      decisionsApi.submitFeedback(decisionId, data),
  });

  return {
    submitFeedback: (decisionId, data) => mutation.mutateAsync({ decisionId, data }).then(() => {}),
    isSubmitting: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

export interface UseDecisionHistoryReturn {
  history: DecisionHistoryResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDecisionHistory(query?: DecisionHistoryQuery): UseDecisionHistoryReturn {
  const result = useQuery({
    queryKey: QUERY_KEYS.decisionHistory(query),
    queryFn: () => userDecisionsApi.getHistory(query),
  });

  return {
    history: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}

export interface UseLearningProgressReturn {
  progress: LearningProgress | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLearningProgress(): UseLearningProgressReturn {
  const query = useQuery({
    queryKey: QUERY_KEYS.learningProgress,
    queryFn: userDecisionsApi.getLearningProgress,
  });

  return {
    progress: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export interface UsePreferenceFeedbackReturn {
  submitFeedback: (action: string, attractionId?: string, tripId?: string) => Promise<void>;
  isSubmitting: boolean;
}

export function usePreferenceFeedback(): UsePreferenceFeedbackReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: userDecisionsApi.submitPreferenceFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.learningProgress });
    },
  });

  return {
    submitFeedback: (action, attractionId, tripId) =>
      mutation.mutateAsync({
        type: 'implicit',
        action,
        attractionId,
        tripId,
        timestamp: new Date().toISOString(),
      }),
    isSubmitting: mutation.isPending,
  };
}
