import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFitnessContext } from '@/contexts/FitnessContext';
import { useAuth } from '@/hooks/useAuth';
import {
  longestHikeFromProfile,
  parseLongestHikeQueryParam,
  resolveLongestHike,
} from '@/lib/longest-hike-resolve';

/**
 * 徒步详情 longestHike：
 * 1. URL `?longestHike=0-4` → 必传 query
 * 2. 已登录且无 URL 覆盖 → 不传 query，后端用 JWT profile
 * 3. 未登录 → 传默认档位 2
 * 展示用 `longestHike` 仍用 resolveLongestHike（含 profile / 默认）
 */
export function useLongestHike() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { profile, hasCompletedAssessment } = useFitnessContext();

  const queryOverride = useMemo(
    () => parseLongestHikeQueryParam(searchParams.get('longestHike')),
    [searchParams]
  );

  const value = useMemo(
    () => resolveLongestHike({ queryOverride, profile }),
    [queryOverride, profile]
  );

  /** 传给 GET /route-directions/:id；undefined = 省略参数 */
  const longestHikeForQuery = useMemo((): number | undefined => {
    if (queryOverride != null) return queryOverride;
    if (isAuthenticated) return undefined;
    return value;
  }, [queryOverride, isAuthenticated, value]);

  return {
    longestHike: value,
    longestHikeForQuery,
    queryOverride,
    fromProfile: queryOverride == null ? longestHikeFromProfile(profile) : null,
    hasQueryOverride: queryOverride != null,
    hasCompletedAssessment,
    omitsQueryForJwtProfile: isAuthenticated && queryOverride == null,
  };
}
