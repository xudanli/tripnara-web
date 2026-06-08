/**
 * 徒步 Demo / 行前审计 React Query
 */

import { useQuery } from '@tanstack/react-query';
import { hikingApi } from '@/api/hiking';
import { resolveLongestHikeForPreview } from '@/lib/hiking-longest-hike';
import type { RouteDirectionReadinessResponse } from '@/types/route-readiness';

export const hikingKeys = {
  all: ['hiking'] as const,
  snapshot: () => [...hikingKeys.all, 'laugavegur-snapshot'] as const,
  preview: (longestHike: number) =>
    [...hikingKeys.all, 'laugavegur-preview', longestHike] as const,
  tripAudit: (tripId: string, longestHike?: number) =>
    [...hikingKeys.all, 'trip-audit', tripId, longestHike ?? 'jwt'] as const,
  routeReadiness: (
    routeDirectionId: number,
    longestHike?: number,
    plannedDate?: string,
    hikePlanId?: string
  ) =>
    [
      ...hikingKeys.all,
      'route-readiness',
      routeDirectionId,
      longestHike ?? 'jwt',
      plannedDate ?? '',
      hikePlanId ?? '',
    ] as const,
};

export function useLaugavegurSnapshot(enabled = true) {
  return useQuery({
    queryKey: hikingKeys.snapshot(),
    queryFn: () => hikingApi.getLaugavegurSnapshot(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLaugavegurPreview(longestHike?: number, enabled = true) {
  const hike = longestHike ?? resolveLongestHikeForPreview();
  return useQuery({
    queryKey: hikingKeys.preview(hike),
    queryFn: () => hikingApi.getLaugavegurPreview(hike),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRouteDirectionReadiness(
  routeDirectionId: number | undefined,
  options?: {
    longestHike?: number;
    plannedDate?: string;
    hikePlanId?: string;
    enabled?: boolean;
  }
) {
  const longestHike = options?.longestHike;
  const plannedDate = options?.plannedDate;
  const hikePlanId = options?.hikePlanId;
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: hikingKeys.routeReadiness(
      routeDirectionId ?? 0,
      longestHike,
      plannedDate,
      hikePlanId
    ),
    queryFn: () =>
      hikingApi.getRouteDirectionReadiness(routeDirectionId!, {
        longestHike,
        plannedDate,
        hikePlanId,
      }),
    enabled: routeDirectionId != null && Number.isFinite(routeDirectionId) && enabled,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export type { RouteDirectionReadinessResponse };

export function useTripHikingAudit(
  tripId: string | undefined,
  options?: { longestHike?: number; enabled?: boolean }
) {
  const longestHike = options?.longestHike;
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: hikingKeys.tripAudit(tripId ?? '', longestHike),
    queryFn: () =>
      hikingApi.getTripHikingAudit(tripId!, {
        longestHike,
      }),
    enabled: Boolean(tripId) && enabled,
    retry: 1,
  });
}
