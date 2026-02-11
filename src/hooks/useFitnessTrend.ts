/**
 * 体能趋势分析 Hook
 * 
 * @module hooks/useFitnessTrend
 */

import { useQuery } from '@tanstack/react-query';
import { fitnessAnalyticsApi } from '@/api/fitness-analytics';
import type { FitnessTrend } from '@/types/fitness-analytics';

/** 查询 Key */
export const fitnessTrendKeys = {
  all: ['fitness', 'trend'] as const,
  byPeriod: (periodDays: number) => [...fitnessTrendKeys.all, periodDays] as const,
};

/**
 * 获取体能趋势分析
 * 
 * @param periodDays - 分析周期（天），默认90
 * @param enabled - 是否启用查询
 * 
 * @example
 * ```tsx
 * function TrendDisplay() {
 *   const { data: trend, isLoading, error } = useFitnessTrend(90);
 *   
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorMessage />;
 *   
 *   return (
 *     <div>
 *       <span>{trend.trend}</span>
 *       <span>置信度: {trend.confidence * 100}%</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFitnessTrend(periodDays = 90, enabled = true) {
  return useQuery<FitnessTrend, Error>({
    queryKey: fitnessTrendKeys.byPeriod(periodDays),
    queryFn: () => fitnessAnalyticsApi.getTrend(periodDays),
    enabled,
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
    gcTime: 30 * 60 * 1000,   // 缓存30分钟
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 获取默认趋势（90天）
 */
export function useDefaultFitnessTrend(enabled = true) {
  return useFitnessTrend(90, enabled);
}

export default useFitnessTrend;
