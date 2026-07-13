import { buildEmotionalRealtimeSignals } from '@/lib/emotional-realtime-signals';
import type { RouteAndRunRequest } from '@/api/agent';
import type { RouteRunEmotionalMetadata } from '@/types/route-run-emotional-metadata';

function resolveTimezoneFromRequest(request: RouteAndRunRequest): string | undefined {
  const tz = request.conversation_context?.timezone?.trim();
  return tz || undefined;
}

export function buildRouteRunEmotionalMetadataSync(
  request?: RouteAndRunRequest
): RouteRunEmotionalMetadata {
  return {
    emotional_realtime_signals: buildEmotionalRealtimeSignals({
      timezone: request ? resolveTimezoneFromRequest(request) : undefined,
    }),
  };
}

export async function buildRouteRunEmotionalMetadataAsync(
  request?: RouteAndRunRequest
): Promise<RouteRunEmotionalMetadata> {
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
  if (!hasSignals) return request;

  return {
    ...request,
    metadata: mergeMetadata(request.metadata, emotional),
  };
}

/** 异步版 */
export async function enrichRouteAndRunRequestWithEmotionalMetadataAsync(
  request: RouteAndRunRequest
): Promise<RouteAndRunRequest> {
  const emotional = await buildRouteRunEmotionalMetadataAsync(request);
  return {
    ...request,
    metadata: mergeMetadata(request.metadata, emotional),
  };
}
