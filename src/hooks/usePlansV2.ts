/**
 * Planning Assistant V2 - 方案管理 Hook
 * 
 * 提供方案生成、对比、优化、确认等功能
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  plansApi,
  type GeneratePlanRequest,
  type ComparePlansParams,
  type OptimizePlanRequest,
  type ConfirmPlanRequest,
} from '@/api/planning-assistant-v2';

export interface UsePlansV2Return {
  // 生成方案（同步）
  generatePlan: (data: GeneratePlanRequest) => Promise<void>;
  isGenerating: boolean;
  
  // 生成方案（异步）
  generatePlanAsync: (data: GeneratePlanRequest) => Promise<string>;
  isGeneratingAsync: boolean;
  
  // 对比方案
  comparePlans: (params: ComparePlansParams) => Promise<void>;
  isComparing: boolean;
  comparisonResult: any;
  
  // 优化方案
  optimizePlan: (planId: string, data: OptimizePlanRequest) => Promise<void>;
  isOptimizing: boolean;
  
  // 确认方案
  confirmPlan: (planId: string, data: ConfirmPlanRequest) => Promise<string>;
  isConfirming: boolean;
  
  // 错误
  error: Error | null;
}

/**
 * Planning Assistant V2 方案管理 Hook
 */
export function usePlansV2(): UsePlansV2Return {
  const queryClient = useQueryClient();

  // 生成方案（同步）
  const generateMutation = useMutation({
    mutationFn: plansApi.generate,
    onSuccess: (data) => {
      queryClient.setQueryData(['planning-plans-v2', data.sessionId], data);
    },
  });

  // 生成方案（异步）
  const generateAsyncMutation = useMutation({
    mutationFn: plansApi.generateAsync,
  });

  // 对比方案 - 使用 mutation 而不是 query，因为对比是主动触发的操作
  // 移除这个未使用的 query，避免错误
  
  const compareMutation = useMutation({
    mutationFn: plansApi.compare,
    onSuccess: (data) => {
      queryClient.setQueryData(['planning-compare-v2'], data);
    },
  });

  // 优化方案
  const optimizeMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: OptimizePlanRequest }) =>
      plansApi.optimize(planId, data),
  });

  // 确认方案
  const confirmMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: ConfirmPlanRequest }) =>
      plansApi.confirm(planId, data),
    onSuccess: (data) => {
      // 确认成功后，可以跳转到行程页面
      queryClient.invalidateQueries({ queryKey: ['planning-session-v2'] });
    },
  });

  const generatePlan = async (data: GeneratePlanRequest) => {
    await generateMutation.mutateAsync(data);
  };

  const generatePlanAsync = async (data: GeneratePlanRequest): Promise<string> => {
    const result = await generateAsyncMutation.mutateAsync(data);
    return result.taskId;
  };

  const comparePlans = async (params: ComparePlansParams) => {
    await compareMutation.mutateAsync(params);
  };

  const optimizePlan = async (planId: string, data: OptimizePlanRequest) => {
    await optimizeMutation.mutateAsync({ planId, data });
  };

  const confirmPlan = async (
    planId: string,
    data: ConfirmPlanRequest
  ): Promise<string> => {
    const result = await confirmMutation.mutateAsync({ planId, data });
    return result.tripId;
  };

  return {
    generatePlan,
    isGenerating: generateMutation.isPending,
    generatePlanAsync,
    isGeneratingAsync: generateAsyncMutation.isPending,
    comparePlans,
    isComparing: compareMutation.isPending,
    comparisonResult: compareMutation.data,
    optimizePlan,
    isOptimizing: optimizeMutation.isPending,
    confirmPlan,
    isConfirming: confirmMutation.isPending,
    error:
      (generateMutation.error ||
        generateAsyncMutation.error ||
        compareMutation.error ||
        optimizeMutation.error ||
        confirmMutation.error) as Error | null,
  };
}
