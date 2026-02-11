/**
 * V2 优化系统 React Query Hooks
 * 
 * @module hooks/useOptimizationV2
 * @description 计划优化、团队协作、实时状态的 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { optimizationApi, teamApi, realtimeApi } from '@/api/optimization-v2';
import type {
  EvaluatePlanRequest,
  ComparePlansRequest,
  OptimizePlanRequest,
  RiskAssessmentRequest,
  NegotiationRequest,
  SubmitFeedbackRequest,
  CreateTeamRequest,
  TeamMember,
  SubscribeRequest,
  FieldReportRequest,
  RoutePlanDraft,
} from '@/types/optimization-v2';
import type { WorldModelContext } from '@/types/strategy';
import { useCallback, useEffect, useRef, useState } from 'react';

// ==================== Query Keys ====================

export const optimizationKeys = {
  all: ['optimization-v2'] as const,
  preferences: (userId: string) => [...optimizationKeys.all, 'preferences', userId] as const,
};

export const teamKeys = {
  all: ['team'] as const,
  detail: (teamId: string) => [...teamKeys.all, teamId] as const,
  weights: (teamId: string) => [...teamKeys.all, teamId, 'weights'] as const,
  constraints: (teamId: string) => [...teamKeys.all, teamId, 'constraints'] as const,
};

export const realtimeKeys = {
  all: ['realtime'] as const,
  state: (tripId: string) => [...realtimeKeys.all, 'state', tripId] as const,
  prediction: (tripId: string, hours: number) => 
    [...realtimeKeys.all, 'prediction', tripId, hours] as const,
};

// ==================== 计划优化 Hooks ====================

/**
 * 评估计划得分
 */
export function useEvaluatePlan() {
  return useMutation({
    mutationFn: (request: EvaluatePlanRequest) => optimizationApi.evaluate(request),
  });
}

/**
 * 比较两个计划
 */
export function useComparePlans() {
  return useMutation({
    mutationFn: (request: ComparePlansRequest) => optimizationApi.compare(request),
  });
}

/**
 * 一键优化计划
 */
export function useOptimizePlan() {
  return useMutation({
    mutationFn: (request: OptimizePlanRequest) => optimizationApi.optimize(request),
  });
}

/**
 * 风险评估
 */
export function useRiskAssessment() {
  return useMutation({
    mutationFn: (request: RiskAssessmentRequest) => optimizationApi.assessRisk(request),
  });
}

/**
 * 三守护者协商
 */
export function useNegotiation() {
  return useMutation({
    mutationFn: (request: NegotiationRequest) => optimizationApi.negotiate(request),
  });
}

/**
 * 提交反馈
 */
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (request: SubmitFeedbackRequest) => optimizationApi.submitFeedback(request),
  });
}

/**
 * 获取用户偏好
 */
export function useUserPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: optimizationKeys.preferences(userId ?? ''),
    queryFn: () => optimizationApi.getPreferences(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 分钟
  });
}

// ==================== 团队协作 Hooks ====================

/**
 * 获取团队信息
 */
export function useTeam(teamId: string | undefined) {
  return useQuery({
    queryKey: teamKeys.detail(teamId ?? ''),
    queryFn: () => teamApi.get(teamId!),
    enabled: !!teamId,
  });
}

/**
 * 创建团队
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CreateTeamRequest) => teamApi.create(request),
    onSuccess: (data) => {
      queryClient.setQueryData(teamKeys.detail(data.teamId), data);
    },
  });
}

/**
 * 更新团队
 */
export function useUpdateTeam(teamId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: Partial<CreateTeamRequest>) => teamApi.update(teamId, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(teamKeys.detail(teamId), data);
    },
  });
}

/**
 * 删除团队
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (teamId: string) => teamApi.delete(teamId),
    onSuccess: (_, teamId) => {
      queryClient.removeQueries({ queryKey: teamKeys.detail(teamId) });
    },
  });
}

/**
 * 添加团队成员
 */
export function useAddTeamMember(teamId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (member: TeamMember) => teamApi.addMember(teamId, member),
    onSuccess: (data) => {
      queryClient.setQueryData(teamKeys.detail(teamId), data);
    },
  });
}

/**
 * 移除团队成员
 */
export function useRemoveTeamMember(teamId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => teamApi.removeMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(teamId) });
    },
  });
}

/**
 * 团队协商
 */
export function useTeamNegotiation(teamId: string) {
  return useMutation({
    mutationFn: (params: { plan: RoutePlanDraft; world: WorldModelContext }) =>
      teamApi.negotiate(teamId, params.plan, params.world),
  });
}

/**
 * 获取团队综合权重
 */
export function useTeamWeights(teamId: string | undefined) {
  return useQuery({
    queryKey: teamKeys.weights(teamId ?? ''),
    queryFn: () => teamApi.getWeights(teamId!),
    enabled: !!teamId,
  });
}

/**
 * 获取团队约束（最弱链）
 */
export function useTeamConstraints(teamId: string | undefined) {
  return useQuery({
    queryKey: teamKeys.constraints(teamId ?? ''),
    queryFn: () => teamApi.getConstraints(teamId!),
    enabled: !!teamId,
  });
}

// ==================== 实时状态 Hooks ====================

/**
 * 获取当前状态
 */
export function useRealtimeState(tripId: string | undefined, options?: {
  refetchInterval?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: realtimeKeys.state(tripId ?? ''),
    queryFn: () => realtimeApi.getState(tripId!),
    enabled: !!tripId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval ?? 60_000, // 默认 1 分钟刷新
  });
}

/**
 * 预测未来状态
 */
export function usePredictedState(tripId: string | undefined, hoursAhead: number = 24) {
  return useQuery({
    queryKey: realtimeKeys.prediction(tripId ?? '', hoursAhead),
    queryFn: () => realtimeApi.predictState(tripId!, hoursAhead),
    enabled: !!tripId,
    staleTime: 10 * 60 * 1000, // 10 分钟
  });
}

/**
 * 订阅实时更新
 */
export function useSubscribeRealtime() {
  return useMutation({
    mutationFn: (request: SubscribeRequest) => realtimeApi.subscribe(request),
  });
}

/**
 * 取消订阅
 */
export function useUnsubscribeRealtime() {
  return useMutation({
    mutationFn: (subscriptionId: string) => realtimeApi.unsubscribe(subscriptionId),
  });
}

/**
 * 提交实地报告
 */
export function useSubmitFieldReport() {
  return useMutation({
    mutationFn: (request: FieldReportRequest) => realtimeApi.submitReport(request),
  });
}

/**
 * SSE 实时事件订阅 Hook
 * 自动管理 EventSource 生命周期
 */
export function useRealtimeEvents(
  subscriptionId: string | undefined,
  handlers: {
    onWeatherChange?: (data: unknown) => void;
    onRoadStatusChange?: (data: unknown) => void;
    onHazardDetected?: (data: unknown) => void;
    onHumanStateChange?: (data: unknown) => void;
    onFeasibilityChange?: (data: unknown) => void;
    onError?: (error: Event) => void;
  }
) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef(handlers);
  
  // 保持 handlers 引用更新
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);
  
  const connect = useCallback(() => {
    if (!subscriptionId || eventSourceRef.current) return;
    
    const es = realtimeApi.createEventSource(subscriptionId);
    eventSourceRef.current = es;
    
    es.onopen = () => setConnected(true);
    es.onerror = (e) => {
      setConnected(false);
      handlersRef.current.onError?.(e);
    };
    
    // 注册事件处理器
    es.addEventListener('WEATHER_CHANGE', (e) => {
      handlersRef.current.onWeatherChange?.(JSON.parse(e.data));
    });
    es.addEventListener('ROAD_STATUS_CHANGE', (e) => {
      handlersRef.current.onRoadStatusChange?.(JSON.parse(e.data));
    });
    es.addEventListener('HAZARD_DETECTED', (e) => {
      handlersRef.current.onHazardDetected?.(JSON.parse(e.data));
    });
    es.addEventListener('HUMAN_STATE_CHANGE', (e) => {
      handlersRef.current.onHumanStateChange?.(JSON.parse(e.data));
    });
    es.addEventListener('FEASIBILITY_CHANGE', (e) => {
      handlersRef.current.onFeasibilityChange?.(JSON.parse(e.data));
    });
  }, [subscriptionId]);
  
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
    }
  }, []);
  
  // 自动连接和清理
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);
  
  return { connected, connect, disconnect };
}

// ==================== 组合 Hooks ====================

/**
 * 完整优化流程 Hook
 * 包含评估、优化、风险评估、协商的完整流程
 */
export function useFullOptimizationFlow() {
  const evaluate = useEvaluatePlan();
  const optimize = useOptimizePlan();
  const assessRisk = useRiskAssessment();
  const negotiate = useNegotiation();
  
  const runFullFlow = useCallback(async (
    plan: RoutePlanDraft,
    world: WorldModelContext
  ) => {
    // 1. 评估原计划
    const evaluation = await evaluate.mutateAsync({ plan, world });
    
    // 2. 优化计划
    const optimized = await optimize.mutateAsync({ plan, world });
    
    // 3. 风险评估
    const risk = await assessRisk.mutateAsync({ 
      plan: optimized.optimizedPlan, 
      world 
    });
    
    // 4. 协商决策
    const negotiation = await negotiate.mutateAsync({ 
      plan: optimized.optimizedPlan, 
      world 
    });
    
    return {
      originalEvaluation: evaluation,
      optimization: optimized,
      riskAssessment: risk,
      negotiation,
    };
  }, [evaluate, optimize, assessRisk, negotiate]);
  
  return {
    runFullFlow,
    isLoading: evaluate.isPending || optimize.isPending || 
               assessRisk.isPending || negotiate.isPending,
    error: evaluate.error || optimize.error || 
           assessRisk.error || negotiate.error,
  };
}
