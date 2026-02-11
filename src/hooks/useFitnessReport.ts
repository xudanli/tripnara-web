/**
 * 体能报告 Hook
 * 
 * @module hooks/useFitnessReport
 */

import { useQuery } from '@tanstack/react-query';
import { fitnessAnalyticsApi } from '@/api/fitness-analytics';
import type { FitnessReport } from '@/types/fitness-analytics';

/** 查询 Key */
export const fitnessReportKeys = {
  all: ['fitness', 'report'] as const,
  byPeriod: (periodDays: number) => [...fitnessReportKeys.all, periodDays] as const,
};

/**
 * 获取体能报告
 * 
 * @param periodDays - 报告周期（天），默认30
 * @param enabled - 是否启用查询
 * 
 * @example
 * ```tsx
 * function ReportPage() {
 *   const { data: report, isLoading } = useFitnessReport(30);
 *   
 *   if (isLoading) return <Spinner />;
 *   
 *   return (
 *     <div>
 *       <h1>体能报告</h1>
 *       <p>总行程: {report.summary.totalTrips}</p>
 *       <p>完成率: {report.summary.completionRate * 100}%</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFitnessReport(periodDays = 30, enabled = true) {
  return useQuery<FitnessReport, Error>({
    queryKey: fitnessReportKeys.byPeriod(periodDays),
    queryFn: () => fitnessAnalyticsApi.getReport(periodDays),
    enabled,
    staleTime: 10 * 60 * 1000, // 10分钟内不重新请求
    gcTime: 60 * 60 * 1000,    // 缓存1小时
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 获取月度报告（30天）
 */
export function useMonthlyFitnessReport(enabled = true) {
  return useFitnessReport(30, enabled);
}

/**
 * 获取季度报告（90天）
 */
export function useQuarterlyFitnessReport(enabled = true) {
  return useFitnessReport(90, enabled);
}

export default useFitnessReport;
