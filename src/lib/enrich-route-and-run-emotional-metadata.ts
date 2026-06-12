import type { RouteAndRunRequest } from '@/api/agent';
import { buildEmotionalRealtimeSignals } from '@/lib/emotional-realtime-signals';
import { trailOfflineStore } from '@/services/trail-offline-store';
import type { RouteRunEmotionalMetadata } from '@/types/route-run-emotional-metadata';

let offlineMapsSyncedCache: boolean | undefined;

function resolveTimezoneFromRequest(request: RouteAndRunRequest): string | undefined {
  const tz = request.conversation_context?.timezone?.trim();
  return tz || undefined;
}

/** 刷新离线地图同步态：至少一个 pack 且 tileCache 已写入 */
export async function refreshOfflineMapsSyncedState(): Promise<boolean> {
  try {
    const packs = await trailOfflineStore.list();
    offlineMapsSyncedCache = packs.some((p) => Boolean(p.tileCache?.packKey));
  } catch {
    offlineMapsSyncedCache = false;
  }
  return offlineMapsSyncedCache === true;
}

export function getOfflineMapsSyncedSnapshot(): boolean | undefined {
  return offlineMapsSyncedCache;
}

export function buildRouteRunEmotionalMetadataSync(
  request?: RouteAndRunRequest
): RouteRunEmotionalMetadata {
  const metadata: RouteRunEmotionalMetadata = {
    emotional_realtime_signals: buildEmotionalRealtimeSignals({
      timezone: request ? resolveTimezoneFromRequest(request) : undefined,
    }),
  };
  if (offlineMapsSyncedCache === true) {
    metadata.offline_maps_synced = true;
  }
  return metadata;
}

export async function buildRouteRunEmotionalMetadataAsync(
  request?: RouteAndRunRequest
): Promise<RouteRunEmotionalMetadata> {
  await refreshOfflineMapsSyncedState();
  return buildRouteRunEmotionalMetadataSync(request);
}

function mergeMetadata(
  existing: RouteRunEmotionalMetadata | undefined,
  emotional: RouteRunEmotionalMetadata
): RouteRunEmotionalMetadata {
  return {
    ...existing,
    ...emotional,
    emotional_realtime_signals: {
      ...existing?.emotional_realtime_signals,
      ...emotional.emotional_realtime_signals,
    },
  };
}

/** 为 route_and_run 注入 metadata.emotional_realtime_signals（同步快照） */
export function enrichRouteAndRunRequestWithEmotionalMetadata(
  request: RouteAndRunRequest
): RouteAndRunRequest {
  const emotional = buildRouteRunEmotionalMetadataSync(request);
  const hasSignals = Boolean(
    emotional.emotional_realtime_signals &&
      Object.keys(emotional.emotional_realtime_signals).length > 0
  );
  const hasOfflineFlag = emotional.offline_maps_synced === true;
  if (!hasSignals && !hasOfflineFlag) return request;

  return {
    ...request,
    metadata: mergeMetadata(request.metadata, emotional),
  };
}

/** 异步版：含 offline_maps_synced 探测 */
export async function enrichRouteAndRunRequestWithEmotionalMetadataAsync(
  request: RouteAndRunRequest
): Promise<RouteAndRunRequest> {
  const emotional = await buildRouteRunEmotionalMetadataAsync(request);
  return {
    ...request,
    metadata: mergeMetadata(request.metadata, emotional),
  };
}
