import type {
  SpawnTrekTripPreview,
  SpawnTrekTripResult,
  SpawnTrekTripRouteCandidate,
  PreferenceEvolutionReason,
} from '@/types/spawn-trek-trip';
import type { TrekkingVibeOrchestrationPlan } from '@/types/trekking-vibe-orchestration';
import { resolveLiveRouteDirectionId } from './route-direction-keys';

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

function asString(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  return t || undefined;
}

function asBool(raw: unknown, fallback = false): boolean {
  return typeof raw === 'boolean' ? raw : fallback;
}

function asNumber(raw: unknown): number | undefined {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function normalizeCandidate(raw: unknown): SpawnTrekTripRouteCandidate | null {
  const r = asRecord(raw);
  if (!r) return null;
  const key = asString(r.routeDirectionKey ?? r.route_direction_key);
  const label = asString(r.label);
  if (!key || !label) return null;
  const availability = asString(r.availability) === 'planned' ? 'planned' : 'live';
  return {
    routeDirectionKey: key,
    label,
    availability,
    routeDirectionId: asNumber(r.routeDirectionId ?? r.route_direction_id),
    recommended: asBool(r.recommended, false) || undefined,
  };
}

function normalizeReasons(raw: unknown): PreferenceEvolutionReason[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const allowed = new Set<PreferenceEvolutionReason>([
    'TREK_VIBE_CONFIRMED',
    'TREK_READINESS_ACK',
    'TREK_POST_RATING_FIVE_STAR',
  ]);
  const items = raw
    .map((x) => String(x))
    .filter((x): x is PreferenceEvolutionReason => allowed.has(x as PreferenceEvolutionReason));
  return items.length ? items : undefined;
}

export function normalizeSpawnTrekTripPreview(raw: unknown): SpawnTrekTripPreview {
  const r = asRecord(raw);
  if (!r) {
    return { canSpawn: false, liveCandidates: [], plannedCandidates: [] };
  }

  const liveRaw = r.liveCandidates ?? r.live_candidates ?? [];
  const plannedRaw = r.plannedCandidates ?? r.planned_candidates ?? [];

  const liveCandidates = (Array.isArray(liveRaw) ? liveRaw : [])
    .map(normalizeCandidate)
    .filter((x): x is SpawnTrekTripRouteCandidate => x != null && x.availability === 'live');

  const plannedCandidates = (Array.isArray(plannedRaw) ? plannedRaw : [])
    .map(normalizeCandidate)
    .filter((x): x is SpawnTrekTripRouteCandidate => x != null && x.availability === 'planned');

  return {
    canSpawn: asBool(r.canSpawn ?? r.can_spawn, false),
    blockReason: asString(r.blockReason ?? r.block_reason) ?? null,
    liveCandidates,
    plannedCandidates,
    selectedRouteDirectionKey: asString(r.selectedRouteDirectionKey ?? r.selected_route_direction_key),
    offlineDataPreloadRequired: asBool(
      r.offlineDataPreloadRequired ?? r.offline_data_preload_required,
      false
    ),
    demGridMetres: asNumber(r.demGridMetres ?? r.dem_grid_metres) ?? null,
    preferenceEvolutionReasonsPlanned: normalizeReasons(
      r.preferenceEvolutionReasonsPlanned ?? r.preference_evolution_reasons_planned
    ),
    alreadySpawned: asBool(r.alreadySpawned ?? r.already_spawned, false),
    existingHikePlanId: asString(r.existingHikePlanId ?? r.existing_hike_plan_id) ?? null,
    existingTripId: asString(r.existingTripId ?? r.existing_trip_id) ?? null,
  };
}

export function normalizeSpawnTrekTripResult(raw: unknown): SpawnTrekTripResult {
  const r = asRecord(raw);
  if (!r) return { success: false, message: '无效响应' };

  const offlineRaw = asRecord(r.offlinePackMeta ?? r.offline_pack_meta);

  return {
    success: asBool(r.success, false),
    message: asString(r.message) ?? null,
    hikePlanId: asString(r.hikePlanId ?? r.hike_plan_id) ?? null,
    tripId: asString(r.tripId ?? r.trip_id) ?? null,
    routeDirectionId: asNumber(r.routeDirectionId ?? r.route_direction_id) ?? null,
    routeDirectionName: asString(r.routeDirectionName ?? r.route_direction_name) ?? null,
    hardTrekTrailPlanAttached: asBool(
      r.hardTrekTrailPlanAttached ?? r.hard_trek_trail_plan_attached,
      false
    ),
    offlinePackMeta: offlineRaw
      ? {
          routeDirectionId: asNumber(offlineRaw.routeDirectionId ?? offlineRaw.route_direction_id) ?? 0,
          demGridMetres: asNumber(offlineRaw.demGridMetres ?? offlineRaw.dem_grid_metres) ?? null,
          preloadRequired: asBool(
            offlineRaw.preloadRequired ?? offlineRaw.preload_required,
            false
          ),
        }
      : null,
    dnaSyncScheduled: asBool(r.dnaSyncScheduled ?? r.dna_sync_scheduled, false),
    preferenceEvolutionReasons: normalizeReasons(
      r.preferenceEvolutionReasons ?? r.preference_evolution_reasons
    ),
  };
}

/** 从编排计划构建 mock 预览（后端未就绪时） */
export function buildSpawnPreviewFromOrchestration(
  orchestration: TrekkingVibeOrchestrationPlan,
  opts: {
    canSpawn: boolean;
    blockReason?: string | null;
    alreadySpawned?: boolean;
    existingHikePlanId?: string | null;
    postRouteDirectionId?: number | null;
  }
): SpawnTrekTripPreview {
  const liveCandidates: SpawnTrekTripRouteCandidate[] = [];
  const plannedCandidates: SpawnTrekTripRouteCandidate[] = [];

  for (const c of orchestration.worldModel.routeDirectionCandidates) {
    const routeDirectionId =
      c.routeDirectionId ??
      (c.availability === 'live'
        ? resolveLiveRouteDirectionId(c.routeDirectionKey, opts.postRouteDirectionId)
        : undefined);

    const row: SpawnTrekTripRouteCandidate = {
      routeDirectionKey: c.routeDirectionKey,
      label: c.label,
      availability: c.availability,
      routeDirectionId,
      recommended: c.availability === 'live' && liveCandidates.length === 0,
    };

    if (c.availability === 'live') liveCandidates.push(row);
    else plannedCandidates.push(row);
  }

  if (
    opts.postRouteDirectionId != null &&
    !liveCandidates.some((c) => c.routeDirectionId === opts.postRouteDirectionId)
  ) {
    liveCandidates.unshift({
      routeDirectionKey: 'POST_BOUND_ROUTE',
      label: '招募绑定路线',
      availability: 'live',
      routeDirectionId: opts.postRouteDirectionId,
      recommended: true,
    });
  }

  return {
    canSpawn: opts.canSpawn && liveCandidates.length > 0 && !opts.alreadySpawned,
    blockReason: opts.blockReason ?? null,
    liveCandidates,
    plannedCandidates,
    selectedRouteDirectionKey: liveCandidates.find((c) => c.recommended)?.routeDirectionKey ?? null,
    orchestration,
    offlineDataPreloadRequired: orchestration.worldModel.offlineDataPreloadRequired,
    demGridMetres: orchestration.worldModel.demGridMetres ?? null,
    preferenceEvolutionReasonsPlanned:
      orchestration.dnaEvolution?.preferenceEvolutionReasons,
    alreadySpawned: opts.alreadySpawned,
    existingHikePlanId: opts.existingHikePlanId ?? null,
  };
}
