/**
 * 体能异常检测 Hook
 * 
 * @module hooks/useFitnessAnomalies
 */

import { useQuery } from '@tanstack/react-query';
import { fitnessAnalyticsApi } from '@/api/fitness-analytics';
import type { AnomalyDetectionResult, AnomalySeverity } from '@/types/fitness-analytics';

/** 查询 Key */
export const fitnessAnomaliesKeys = {
  all: ['fitness', 'anomalies'] as const,
};

/**
 * 获取体能异常检测结果
 * 
 * @param enabled - 是否启用查询
 * 
 * @example
 * ```tsx
 * function AnomalyAlert() {
 *   const { data, isLoading } = useFitnessAnomalies();
 *   
 *   if (isLoading || !data?.hasAnomaly) return null;
 *   
 *   return (
 *     <AlertBanner anomalies={data.anomalies} />
 *   );
 * }
 * ```
 */
export function useFitnessAnomalies(enabled = true) {
  return useQuery<AnomalyDetectionResult, Error>({
    queryKey: fitnessAnomaliesKeys.all,
    queryFn: () => fitnessAnalyticsApi.getAnomalies(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 检查是否有高严重度异常
 */
export function useHasHighSeverityAnomaly(enabled = true) {
  const { data, ...rest } = useFitnessAnomalies(enabled);
  
  const hasHighSeverity = data?.anomalies.some(
    (anomaly) => anomaly.severity === 'HIGH'
  ) ?? false;
  
  return {
    ...rest,
    hasHighSeverity,
    highSeverityAnomalies: data?.anomalies.filter(
      (anomaly) => anomaly.severity === 'HIGH'
    ) ?? [],
  };
}

/**
 * 按严重度筛选异常
 */
export function useAnomaliesBySeverity(severity: AnomalySeverity, enabled = true) {
  const { data, ...rest } = useFitnessAnomalies(enabled);
  
  return {
    ...rest,
    anomalies: data?.anomalies.filter(
      (anomaly) => anomaly.severity === severity
    ) ?? [],
  };
}

export default useFitnessAnomalies;
