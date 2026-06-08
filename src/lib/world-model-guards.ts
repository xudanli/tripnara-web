/**
 * `explain.world_model_guards` 读取、写入 store 与段编辑器门控。
 * 每次 route_and_run 编排成功（OK）后覆盖；勿解析 DSO checkpoint 作门控真源。
 */

import type { RouteAndRunResponse } from '@/api/agent';
import { applyDsoVersionFromRouteRun } from '@/lib/trip-dso-version';
import type {
  OptimizationAlternative,
  RouteRunDecisionVerdict,
  RouteRunDecisionVerdictFallbackStep,
  RouteRunExplainOptimization,
  RouteRunMonteCarloSummary,
  RouteRunRejectedPlan,
  SegmentEditorMode,
  WorldConstraintMaterialization,
  WorldModelGuards,
} from '@/types/world-model-guards';
import { pickDecisionCockpitFromRouteRun } from '@/lib/decision-cockpit';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';
import { toast } from 'sonner';

export type {
  SegmentEditorMode,
  WorldModelGuards,
  RouteRunOptimizationMethod,
  RouteRunExplainOptimization,
  RouteRunDecisionVerdict,
  RouteRunRejectedPlan,
  RouteRunMonteCarloSummary,
} from '@/types/world-model-guards';

export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

let lastRecommendedPlanRejectedRequestId: string | null = null;

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

function pickSegmentEditorMode(raw: Record<string, unknown>): SegmentEditorMode | undefined {
  const mode = raw.segment_editor_mode ?? raw.segmentEditorMode;
  if (mode === 'full' || mode === 'slot_timing_only' || mode === 'readonly') {
    return mode;
  }
  return undefined;
}

/** 兼容 explain 蛇形 / 驼峰 */
export function normalizeWorldModelGuards(raw: unknown): WorldModelGuards | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;

  const lockedRaw = o.locked_segment_ids ?? o.lockedSegmentIds;
  const locked_segment_ids = Array.isArray(lockedRaw)
    ? lockedRaw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : undefined;

  const segment_editor_mode = pickSegmentEditorMode(o);

  const guards: WorldModelGuards = {
    physical_reality_incomplete:
      o.physical_reality_incomplete === true || o.physicalRealityIncomplete === true,
    physical_data_region:
      typeof (o.physical_data_region ?? o.physicalDataRegion) === 'string'
        ? String(o.physical_data_region ?? o.physicalDataRegion).trim()
        : undefined,
    is_route_topology_locked:
      o.is_route_topology_locked === true || o.isRouteTopologyLocked === true,
    route_skeleton_locked:
      o.route_skeleton_locked === true || o.routeSkeletonLocked === true,
    locked_segment_ids,
    route_skeleton_signature:
      typeof (o.route_skeleton_signature ?? o.routeSkeletonSignature) === 'string'
        ? String(o.route_skeleton_signature ?? o.routeSkeletonSignature).trim()
        : undefined,
    freeze_route_selection:
      o.freeze_route_selection === true || o.freezeRouteSelection === true,
    topology_match: o.topology_match === true || o.topologyMatch === true,
    recommended_plan_rejected:
      o.recommended_plan_rejected === true || o.recommendedPlanRejected === true,
    segment_editor_mode,
    banner_message_zh:
      typeof (o.banner_message_zh ?? o.bannerMessageZh) === 'string'
        ? String(o.banner_message_zh ?? o.bannerMessageZh).trim()
        : undefined,
  };

  const hasSignal = Object.values(guards).some((v) => {
    if (v === undefined || v === false) return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
  return hasSignal ? guards : undefined;
}

export function pickWorldModelGuardsFromRouteRun(
  res: RouteAndRunResponse
): WorldModelGuards | undefined {
  const explain = asRecord(res.explain);
  return normalizeWorldModelGuards(explain?.world_model_guards ?? explain?.worldModelGuards);
}

export function pickItineraryFromRouteRun(res: RouteAndRunResponse): unknown {
  const payload = res.result?.payload as Record<string, unknown> | undefined;
  if (!payload) return undefined;
  const orch = asRecord(payload.orchestrationResult ?? payload.orchestration_result);
  return payload.timeline ?? orch?.itinerary;
}

/** `explain.optimization.world_constraint_materialization`（snake_case） */
export function normalizeWorldConstraintMaterialization(
  raw: unknown
): WorldConstraintMaterialization | undefined {
  const m = asRecord(raw);
  if (!m) return undefined;

  const appliedRaw = m.applied_events;
  const applied_events =
    typeof appliedRaw === 'number' && Number.isFinite(appliedRaw) && appliedRaw > 0
      ? Math.floor(appliedRaw)
      : undefined;

  const road_ids = Array.isArray(m.road_ids)
    ? m.road_ids
        .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
        .map((r) => r.trim())
    : undefined;

  const weather_dates = Array.isArray(m.weather_dates)
    ? m.weather_dates
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
        .map((d) => d.trim())
    : undefined;

  const store_version =
    typeof m.store_version === 'number' && Number.isFinite(m.store_version)
      ? m.store_version
      : undefined;

  const unified_graph_node_count =
    typeof m.unified_graph_node_count === 'number' && Number.isFinite(m.unified_graph_node_count)
      ? m.unified_graph_node_count
      : undefined;
  const unified_graph_edge_count =
    typeof m.unified_graph_edge_count === 'number' && Number.isFinite(m.unified_graph_edge_count)
      ? m.unified_graph_edge_count
      : undefined;

  if (
    applied_events == null &&
    !(road_ids?.length ?? 0) &&
    !(weather_dates?.length ?? 0) &&
    store_version == null
  ) {
    return undefined;
  }

  return {
    ...(applied_events != null ? { applied_events } : {}),
    ...(road_ids?.length ? { road_ids } : {}),
    ...(weather_dates?.length ? { weather_dates } : {}),
    ...(store_version != null ? { store_version } : {}),
    ...(unified_graph_node_count != null ? { unified_graph_node_count } : {}),
    ...(unified_graph_edge_count != null ? { unified_graph_edge_count } : {}),
  };
}

function normalizeRejectedPlan(raw: unknown): RouteRunRejectedPlan | null {
  const row = asRecord(raw);
  const id = row?.id;
  if (typeof id !== 'string' || !id.trim()) return null;
  const reasons = row?.rejection_reasons;
  const num = (k: string) => {
    const v = row?.[k];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  };

  return {
    id: id.trim(),
    status:
      typeof row?.status === 'string' && row.status.trim()
        ? row.status.trim()
        : undefined,
    rejection_reasons: Array.isArray(reasons)
      ? reasons.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
      : undefined,
    hard_violation_count: num('hard_violation_count'),
    soft_penalty_degree: num('soft_penalty_degree'),
    expected_utility: num('expected_utility'),
    feasibility_probability: num('feasibility_probability'),
    utility_delta_vs_chosen: num('utility_delta_vs_chosen'),
  };
}

function normalizeMonteCarloSummary(raw: unknown): RouteRunMonteCarloSummary | undefined {
  const mc = asRecord(raw);
  if (!mc) return undefined;
  const used = mc.used;
  const total = mc.total_samples;
  if (used !== true && typeof total !== 'number') return undefined;
  const spc = mc.samples_per_candidate;
  const samples_per_candidate =
    spc && typeof spc === 'object' && !Array.isArray(spc)
      ? Object.fromEntries(
          Object.entries(spc as Record<string, unknown>).filter(
            ([, v]) => typeof v === 'number' && Number.isFinite(v)
          )
        )
      : undefined;

  return {
    used: used === true ? true : undefined,
    total_samples: typeof total === 'number' && Number.isFinite(total) ? total : undefined,
    ...(samples_per_candidate && Object.keys(samples_per_candidate).length > 0
      ? { samples_per_candidate }
      : {}),
  };
}

function normalizeFallbackChain(raw: unknown): RouteRunDecisionVerdictFallbackStep[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const steps = raw
    .map((item) => {
      const row = asRecord(item);
      const step = row?.step;
      const reason = row?.reason;
      if (typeof step !== 'string' || typeof reason !== 'string') return null;
      return { step: step.trim(), reason: reason.trim() };
    })
    .filter((s): s is RouteRunDecisionVerdictFallbackStep => s != null);
  return steps.length ? steps : undefined;
}

function normalizeOptimizationAlternatives(raw: unknown): OptimizationAlternative[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw
    .map((item) => {
      const row = asRecord(item);
      const id = row?.id;
      if (typeof id !== 'string' || !id.trim()) return null;
      const score = row?.score;
      const violations = Array.isArray(row?.violations) ? row.violations : undefined;
      const num = (k: string) => {
        const v = row?.[k];
        return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
      };
      return {
        id: id.trim(),
        ...(typeof score === 'number' && Number.isFinite(score) ? { score } : {}),
        expected_utility: num('expected_utility'),
        feasibility_probability: num('feasibility_probability'),
        ...(violations?.length ? { violations } : {}),
      } satisfies OptimizationAlternative;
    })
    .filter((a): a is OptimizationAlternative => a != null);
  return list.length ? list : undefined;
}

function normalizeDecisionVerdict(raw: unknown): RouteRunDecisionVerdict | undefined {
  const v = asRecord(raw);
  if (!v) return undefined;
  const chosen = v.chosen_plan_id;
  const rejectedRaw = v.rejected_plans;
  const rejected = Array.isArray(rejectedRaw)
    ? rejectedRaw
        .map(normalizeRejectedPlan)
        .filter((p): p is RouteRunRejectedPlan => p != null)
    : undefined;
  const mc = normalizeMonteCarloSummary(v.monte_carlo_summary);
  const fallback_chain = normalizeFallbackChain(v.fallback_chain);
  if (
    typeof chosen !== 'string' &&
    (!rejected || rejected.length === 0) &&
    !mc &&
    !fallback_chain
  ) {
    return undefined;
  }
  return {
    chosen_plan_id: typeof chosen === 'string' && chosen.trim() ? chosen.trim() : undefined,
    rejected_plans: rejected?.length ? rejected : undefined,
    monte_carlo_summary: mc,
    fallback_chain,
  };
}

/** 从 `explain.optimization` 读取完整只读优化说明（对外 API snake_case） */
export function pickExplainOptimizationFromRouteRun(
  res: RouteAndRunResponse
): RouteRunExplainOptimization | undefined {
  const explain = asRecord(res.explain);
  const opt = asRecord(explain?.optimization);
  if (!opt) return undefined;

  const methodRaw = opt.method;
  const method =
    typeof methodRaw === 'string' && methodRaw.trim()
      ? (methodRaw.trim() as RouteRunExplainOptimization['method'])
      : undefined;
  const recommended = opt.recommended_alternative_id;
  const audit = opt.meta_decision_audit;
  const verdict = normalizeDecisionVerdict(opt.decision_verdict);
  const narration = opt.decision_verdict_narration_zh;
  const world_constraint_materialization = normalizeWorldConstraintMaterialization(
    opt.world_constraint_materialization
  );
  const alternatives = normalizeOptimizationAlternatives(opt.alternatives);

  if (
    !method &&
    typeof recommended !== 'string' &&
    typeof audit !== 'string' &&
    !verdict &&
    typeof narration !== 'string' &&
    !world_constraint_materialization &&
    !alternatives
  ) {
    return undefined;
  }

  return {
    method,
    recommended_alternative_id:
      typeof recommended === 'string' && recommended.trim() ? recommended.trim() : undefined,
    meta_decision_audit: typeof audit === 'string' && audit.trim() ? audit.trim() : undefined,
    decision_verdict_narration_zh:
      typeof narration === 'string' && narration.trim() ? narration.trim() : undefined,
    decision_verdict: verdict,
    world_constraint_materialization,
    alternatives,
  };
}

/** 指南别名：`res.explain?.optimization` */
export function pickOptimizationExplain(
  res: RouteAndRunResponse
): RouteRunExplainOptimization | undefined {
  return pickExplainOptimizationFromRouteRun(res);
}

export function pickOptimizationMethodFromRouteRun(
  res: RouteAndRunResponse
): string | undefined {
  return pickExplainOptimizationFromRouteRun(res)?.method;
}

/** `is_route_topology_locked` / `isRouteTopologyLocked`（与骨架锁一并视为拓扑锁） */
export function isRouteTopologyLocked(
  guards: WorldModelGuards | null | undefined
): boolean {
  return (
    guards?.is_route_topology_locked === true || guards?.route_skeleton_locked === true
  );
}

/**
 * 业务层有效段编辑模式：`isRouteTopologyLocked` 时强制降级，禁止结构编辑（防震荡）。
 * 后端若仍下发 `full`，前端收敛为 `slot_timing_only`。
 */
export function resolveEffectiveSegmentEditorMode(
  guards: WorldModelGuards | null | undefined
): SegmentEditorMode {
  const raw = guards?.segment_editor_mode ?? 'full';
  if (isRouteTopologyLocked(guards)) {
    if (raw === 'full') return 'slot_timing_only';
    return raw;
  }
  return raw;
}

export type SegmentEditorDegradation = {
  effectiveMode: SegmentEditorMode;
  isTopologyLocked: boolean;
  structureReadOnly: boolean;
  timingEditable: boolean;
  /** 拓扑锁 + 可改时间：防震荡引导文案 */
  slotTimingGuidanceZh: string | null;
};

export function getSegmentEditorDegradation(
  guards: WorldModelGuards | null | undefined
): SegmentEditorDegradation {
  const effectiveMode = resolveEffectiveSegmentEditorMode(guards);
  const topologyLocked = isRouteTopologyLocked(guards);
  const structureReadOnly = effectiveMode !== 'full';
  const timingEditable = effectiveMode !== 'readonly';

  let slotTimingGuidanceZh: string | null = null;
  if (topologyLocked && timingEditable) {
    slotTimingGuidanceZh =
      guards?.banner_message_zh ??
      '路线拓扑已锁定（防震荡保护）。路线段不可拖拽或增删，请在下方日程中微调各站的开始/结束时间与停留时长。';
  }

  return {
    effectiveMode,
    isTopologyLocked: topologyLocked,
    structureReadOnly,
    timingEditable,
    slotTimingGuidanceZh,
  };
}

export function canEditSegmentStructure(
  guards: WorldModelGuards | null | undefined
): boolean {
  return resolveEffectiveSegmentEditorMode(guards) === 'full';
}

export function canEditSlotTiming(guards: WorldModelGuards | null | undefined): boolean {
  const mode = resolveEffectiveSegmentEditorMode(guards);
  return mode === 'full' || mode === 'slot_timing_only';
}

export function canRunRouteRecalculation(
  guards: WorldModelGuards | null | undefined
): boolean {
  return !guards?.freeze_route_selection;
}

export function assertStructuralEditAllowed(guards: WorldModelGuards | null | undefined): void {
  if (!canEditSegmentStructure(guards)) {
    throw new UserFacingError(
      guards?.banner_message_zh ?? '当前阶段不可修改路线结构'
    );
  }
}

/** 拦截结构编辑并 toast；返回 true 表示允许继续 */
export function guardStructuralEditOrToast(
  guards: WorldModelGuards | null | undefined
): boolean {
  if (canEditSegmentStructure(guards)) return true;
  toast.error(guards?.banner_message_zh ?? '当前阶段不可修改路线结构');
  return false;
}

export function resolvePlanningBannerText(
  guards: WorldModelGuards | null | undefined
): string | null {
  const degradation = getSegmentEditorDegradation(guards);
  if (degradation.slotTimingGuidanceZh) return degradation.slotTimingGuidanceZh;
  if (guards?.banner_message_zh) return guards.banner_message_zh;

  const mode = resolveEffectiveSegmentEditorMode(guards);
  if (mode === 'readonly') {
    return '物理数据为草稿或占位，当前仅可查看行程草案，不可修改路线结构';
  }
  if (mode === 'slot_timing_only') {
    return '路线骨架已锁定，仅可调整各站开始/结束时间与停留时长';
  }
  return null;
}

export function applyRouteAndRunToStore(res: RouteAndRunResponse, tripId?: string | null): void {
  applyDsoVersionFromRouteRun(res, tripId);

  const guards = pickWorldModelGuardsFromRouteRun(res);
  const effectiveMode = resolveEffectiveSegmentEditorMode(guards);
  useWorldModelGuardsStore.getState().setFromRouteRun({
    worldModelGuards: guards ?? null,
    segmentEditorMode: effectiveMode,
    isRouteTopologyLocked: isRouteTopologyLocked(guards),
    lockedSegmentIds: new Set(guards?.locked_segment_ids ?? []),
    itinerary: pickItineraryFromRouteRun(res),
    explainOptimization: pickExplainOptimizationFromRouteRun(res),
    optimizationMethod: pickOptimizationMethodFromRouteRun(res),
    decisionCockpit: pickDecisionCockpitFromRouteRun(res),
    requestId: res.request_id,
  });

  if (guards?.recommended_plan_rejected && res.request_id !== lastRecommendedPlanRejectedRequestId) {
    lastRecommendedPlanRejectedRequestId = res.request_id;
    toast.warning('推荐方案因路线拓扑不一致未应用，已保留当前行程');
  }
}

export function resetWorldModelGuardsStore(): void {
  useWorldModelGuardsStore.getState().reset();
  lastRecommendedPlanRejectedRequestId = null;
}
