/**
 * 体能时间线 Hook
 * 
 * @module hooks/useFitnessTimeline
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { fitnessAnalyticsApi } from '@/api/fitness-analytics';
import type { TimelineEvent, TimelineEventType } from '@/types/fitness-analytics';

/** 查询 Key */
export const fitnessTimelineKeys = {
  all: ['fitness', 'timeline'] as const,
  byLimit: (limit: number) => [...fitnessTimelineKeys.all, limit] as const,
};

/**
 * 获取体能时间线
 * 
 * @param limit - 返回数量，默认20
 * @param enabled - 是否启用查询
 * 
 * @example
 * ```tsx
 * function Timeline() {
 *   const { data: events, isLoading } = useFitnessTimeline(10);
 *   
 *   if (isLoading) return <Spinner />;
 *   
 *   return (
 *     <ul>
 *       {events.map((event, index) => (
 *         <li key={index}>
 *           {event.event} - {event.date}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useFitnessTimeline(limit = 20, enabled = true) {
  return useQuery<TimelineEvent[], Error>({
    queryKey: fitnessTimelineKeys.byLimit(limit),
    queryFn: () => fitnessAnalyticsApi.getTimeline(limit),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 按事件类型筛选时间线
 */
export function useTimelineByEventType(
  eventType: TimelineEventType,
  limit = 20,
  enabled = true
) {
  const { data, ...rest } = useFitnessTimeline(limit, enabled);
  
  return {
    ...rest,
    data: data?.filter((event) => event.event === eventType) ?? [],
  };
}

/**
 * 获取最近的校准事件
 */
export function useRecentCalibrations(limit = 5, enabled = true) {
  return useTimelineByEventType('CALIBRATION', limit, enabled);
}

/**
 * 获取最近的反馈事件
 */
export function useRecentFeedbacks(limit = 10, enabled = true) {
  return useTimelineByEventType('TRIP_FEEDBACK', limit, enabled);
}

export default useFitnessTimeline;
