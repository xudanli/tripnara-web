/**
 * Planning Assistant V2 - 推荐 Hook
 * 
 * 提供目的地推荐查询功能
 */

import { useQuery } from '@tanstack/react-query';
import {
  recommendationsApi,
  type RecommendationParams,
  type RecommendationsResponse,
} from '@/api/planning-assistant-v2';

export interface UseRecommendationsV2Return {
  recommendations: RecommendationsResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Planning Assistant V2 推荐 Hook
 */
export function useRecommendationsV2(
  params: RecommendationParams | null
): UseRecommendationsV2Return {
  const {
    data: recommendations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['planning-recommendations-v2', params],
    queryFn: () => recommendationsApi.getRecommendations(params!),
    enabled: !!params && (!!params.q || !!params.budget || !!params.duration),
    staleTime: 60000, // 1分钟内不重新获取
  });

  return {
    recommendations,
    isLoading,
    error: (error as Error) || null,
    refetch,
  };
}
