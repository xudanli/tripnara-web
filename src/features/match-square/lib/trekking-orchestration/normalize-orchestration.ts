import type {
  TrekkingDnaEvolution,
  TrekkingEventStreamMilestone,
  TrekkingRecruitmentScriptId,
  TrekkingRouteDirectionCandidate,
  TrekkingSharedGearDeficit,
  TrekkingToolchainItem,
  TrekkingVibeOrchestrationPlan,
  TrekkingWorldModel,
} from '@/types/trekking-vibe-orchestration';

const SCRIPT_IDS: TrekkingRecruitmentScriptId[] = [
  'chuanxi_heavy_trek',
  'light_trek_dyl_retreat',
  'weekend_fast_light_trek',
];

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

function normalizeScriptId(raw: unknown): TrekkingRecruitmentScriptId | null {
  const s = asString(raw);
  if (s && SCRIPT_IDS.includes(s as TrekkingRecruitmentScriptId)) {
    return s as TrekkingRecruitmentScriptId;
  }
  return null;
}

function normalizeRouteCandidates(raw: unknown): TrekkingRouteDirectionCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = asRecord(row);
      if (!r) return null;
      const key = asString(r.routeDirectionKey ?? r.route_direction_key);
      const label = asString(r.label);
      const availability = asString(r.availability);
      if (!key || !label) return null;
      return {
        routeDirectionKey: key,
        label,
        availability: availability === 'live' ? 'live' : 'planned',
        routeDirectionId: asNumber(r.routeDirectionId ?? r.route_direction_id),
      } satisfies TrekkingRouteDirectionCandidate;
    })
    .filter((x): x is TrekkingRouteDirectionCandidate => x != null);
}

function normalizeWorldModel(raw: unknown): TrekkingWorldModel | null {
  const r = asRecord(raw);
  if (!r) return null;
  const profile = asString(r.profile);
  if (!profile) return null;
  const candidates = normalizeRouteCandidates(
    r.routeDirectionCandidates ?? r.route_direction_candidates
  );
  const excluded = r.excludedConstraints ?? r.excluded_constraints;
  const physical = r.physicalConstraints ?? r.physical_constraints;

  return {
    profile: profile as TrekkingWorldModel['profile'],
    offlineDataPreloadRequired: asBool(
      r.offlineDataPreloadRequired ?? r.offline_data_preload_required
    ),
    demGridMetres: asNumber(r.demGridMetres ?? r.dem_grid_metres),
    routeDirectionCandidates: candidates,
    excludedConstraints: Array.isArray(excluded)
      ? excluded.filter((x): x is string => typeof x === 'string')
      : undefined,
    physicalConstraints: Array.isArray(physical)
      ? physical.filter((x): x is string => typeof x === 'string')
      : undefined,
  };
}

function normalizeGearDeficits(raw: unknown): TrekkingSharedGearDeficit[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map((row) => {
      const r = asRecord(row);
      const item = asString(r?.item);
      const reason = asString(r?.reason);
      if (!item) return null;
      return { item, reason: reason ?? '' };
    })
    .filter((x): x is TrekkingSharedGearDeficit => x != null);
  return items.length ? items : undefined;
}

function normalizeMilestones(raw: unknown): TrekkingEventStreamMilestone[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map((row) => {
      const r = asRecord(row);
      const id = asString(r?.id);
      const label = asString(r?.label);
      const trigger = asString(r?.trigger);
      if (!id || !label) return null;
      return { id, label, trigger: trigger ?? '' };
    })
    .filter((x): x is TrekkingEventStreamMilestone => x != null);
  return items.length ? items : undefined;
}

function normalizeToolchain(raw: unknown): TrekkingToolchainItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map((row) => {
      const r = asRecord(row);
      const id = asString(r?.id);
      const label = asString(r?.label);
      if (!id || !label) return null;
      return { id, label };
    })
    .filter((x): x is TrekkingToolchainItem => x != null);
  return items.length ? items : undefined;
}

function normalizeDnaEvolution(raw: unknown): TrekkingDnaEvolution | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const hint = asString(r.ambiguityToleranceHint ?? r.ambiguity_tolerance_hint);
  const tags = r.filterPersonalityTags ?? r.filter_personality_tags;
  const reasons = r.preferenceEvolutionReasons ?? r.preference_evolution_reasons;

  return {
    ambiguityToleranceHint:
      hint === 'minimize' || hint === 'embrace' || hint === 'neutral' ? hint : undefined,
    silentFlow: asBool(r.silentFlow ?? r.silent_flow, false) || undefined,
    filterPersonalityTags: Array.isArray(tags)
      ? tags.filter((x): x is string => typeof x === 'string')
      : undefined,
    preferenceEvolutionReasons: Array.isArray(reasons)
      ? (reasons.filter((x) =>
          ['TREK_VIBE_CONFIRMED', 'TREK_READINESS_ACK', 'TREK_POST_RATING_FIVE_STAR'].includes(
            String(x)
          )
        ) as TrekkingDnaEvolution['preferenceEvolutionReasons'])
      : undefined,
  };
}

/** 归一化 API `trekkingOrchestration` / `trekking_orchestration` */
export function normalizeTrekkingOrchestration(
  raw: unknown
): TrekkingVibeOrchestrationPlan | null {
  const record = asRecord(raw);
  if (!record) return null;

  const scriptId =
    normalizeScriptId(record.scriptId ?? record.script_id ?? record.recruitmentScriptId) ??
    normalizeScriptId(record.recruitment_script_id);
  const worldModel = normalizeWorldModel(record.worldModel ?? record.world_model);
  if (!scriptId || !worldModel) return null;

  return {
    version: 'trekking_orchestration_v1',
    scriptId,
    sceneCategory: 'premium_trekking',
    recruitmentScriptId: scriptId,
    recruitmentSceneCategory: 'premium_trekking',
    regionFocus: asString(record.regionFocus ?? record.region_focus) as TrekkingVibeOrchestrationPlan['regionFocus'],
    displayHeadline: asString(record.displayHeadline ?? record.display_headline),
    worldModel,
    sharedGearDeficits: normalizeGearDeficits(
      record.sharedGearDeficits ?? record.shared_gear_deficits
    ),
    eventStreamMilestones: normalizeMilestones(
      record.eventStreamMilestones ?? record.event_stream_milestones
    ),
    toolchain: normalizeToolchain(record.toolchain),
    dnaEvolution: normalizeDnaEvolution(record.dnaEvolution ?? record.dna_evolution),
  };
}
