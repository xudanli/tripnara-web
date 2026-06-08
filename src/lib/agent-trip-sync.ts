import type { QueryClient } from '@tanstack/react-query';
import { realtimeKeys } from '@/hooks/useOptimizationV2';

/** 自定义事件：行程相关缓存可能已过期，其他页面可监听后自行 refetch */
export const TRIP_DATA_UPDATED_EVENT = 'tripnara:trip-data-updated';

export type TripDataUpdatedDetail = {
  tripId?: string | null;
  source?: string;
};

export function notifyTripDataUpdated(detail: TripDataUpdatedDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TRIP_DATA_UPDATED_EVENT, { detail }));
}

/**
 * 失效与 Agent / 行程相关的 React Query 缓存，并广播全局事件。
 */
export async function syncTripDataAfterAgentMutation(queryClient: QueryClient, tripId?: string | null, source = 'agent') {
  await queryClient.invalidateQueries({ queryKey: ['agent'] });
  if (tripId) {
    await queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    await queryClient.invalidateQueries({ queryKey: ['trips', tripId] });
    await queryClient.invalidateQueries({ queryKey: ['agent', 'itinerary_revision_timeline', tripId] });
    await queryClient.invalidateQueries({ queryKey: realtimeKeys.state(tripId) });
    await queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey as unknown[];
        return key[0] === 'realtime' && key[1] === 'prediction' && key[2] === tripId;
      },
    });
  }
  notifyTripDataUpdated({ tripId: tripId ?? undefined, source });
}
