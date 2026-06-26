import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripOutcomeApi, TripOutcomeApiError } from '@/api/trip-outcome';
import { selfEvolutionMemoryApi } from '@/api/self-evolution-memory';
import { calibrationApi } from '@/api/calibration';
import type {
  CalibrationRecordRequest,
  EpisodicMemoryRequest,
  LifeEventType,
  TripOutcomeRequest,
} from '@/types/self-evolution';
import { onTripCompleted, type TripCompletedContext } from '../lib/on-trip-completed';

const QUERY_ROOT = ['self-evolution'] as const;

export function useEpisodicMemories(
  userId: string | undefined,
  params?: { topK?: number; minActivationScore?: number; season?: string }
) {
  return useQuery({
    queryKey: [...QUERY_ROOT, 'episodic', userId, params],
    queryFn: () => selfEvolutionMemoryApi.retrieveEpisodicMemories(userId!, params),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useSemanticMemories(
  userId: string | undefined,
  params?: { topK?: number; minConfidence?: number; pattern?: string }
) {
  return useQuery({
    queryKey: [...QUERY_ROOT, 'semantic', userId, params],
    queryFn: () => selfEvolutionMemoryApi.retrieveSemanticMemories(userId!, params),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useColdStartStatus(userId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_ROOT, 'cold-start', userId],
    queryFn: () => calibrationApi.getColdStartPhase(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useCalibrationCurves() {
  return useQuery({
    queryKey: [...QUERY_ROOT, 'calibration-curves'],
    queryFn: () => calibrationApi.getAllCalibrationCurves(),
    staleTime: 120_000,
  });
}

export function useTripCalibrationRecords(tripId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_ROOT, 'calibration-trip', tripId],
    queryFn: () => calibrationApi.getTripCalibrationRecords(tripId!),
    enabled: Boolean(tripId),
    staleTime: 60_000,
  });
}

export function useTripOutcome(tripId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_ROOT, 'trip-outcome', tripId],
    queryFn: () => tripOutcomeApi.getOutcome(tripId!),
    enabled: Boolean(tripId),
    staleTime: 60_000,
    retry: (count, error) => {
      if (error instanceof TripOutcomeApiError && error.code === 'NOT_FOUND') return false;
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) return false;
      return count < 2;
    },
  });
}

export function useCalculateTripOutcome() {
  return useMutation({
    mutationFn: ({
      tripId,
      data,
    }: {
      tripId: string;
      data: Omit<TripOutcomeRequest, 'tripId'>;
    }) => tripOutcomeApi.calculateOutcome(tripId, data),
  });
}

export function useTripCompletedFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ctx: TripCompletedContext) => onTripCompleted(ctx),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_ROOT });
      qc.invalidateQueries({ queryKey: [...QUERY_ROOT, 'trip-outcome', variables.tripId] });
      if (variables.userIds[0]) {
        qc.invalidateQueries({ queryKey: [...QUERY_ROOT, 'episodic', variables.userIds[0]] });
        qc.invalidateQueries({ queryKey: [...QUERY_ROOT, 'semantic', variables.userIds[0]] });
        qc.invalidateQueries({ queryKey: [...QUERY_ROOT, 'cold-start', variables.userIds[0]] });
      }
    },
  });
}

export function useResetLifeEventMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, eventType }: { userId: string; eventType: LifeEventType }) =>
      selfEvolutionMemoryApi.resetOnLifeEvent(userId, eventType),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...QUERY_ROOT, 'episodic', variables.userId] });
      qc.invalidateQueries({ queryKey: [...QUERY_ROOT, 'semantic', variables.userId] });
    },
  });
}

export function useRecordCalibration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CalibrationRecordRequest) => calibrationApi.recordCalibration(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_ROOT });
    },
  });
}

export function useGenerateEpisodicMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EpisodicMemoryRequest) =>
      selfEvolutionMemoryApi.generateEpisodicMemory(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...QUERY_ROOT, 'episodic', variables.userId] });
    },
  });
}

export function getColdStartPhaseLabel(phase: string): string {
  switch (phase) {
    case 'questionnaire':
      return '问卷阶段';
    case 'heuristic':
      return '启发式归因';
    case 'offline_shapley':
      return '离线 Shapley';
    case 'realtime_calibration':
      return '实时校准';
    default:
      return phase;
  }
}

export const TRIP_OUTCOME_DIMENSION_LABELS: Record<string, string> = {
  overallSatisfaction: '整体满意度',
  companionSatisfaction: '搭子关系',
  budgetAccuracy: '预算准确度',
  completionQuality: '行程完成质量',
  safety: '安全性',
  repurchase: '复购意愿',
};
