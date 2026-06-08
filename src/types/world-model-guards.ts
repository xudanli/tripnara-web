/** `explain.world_model_guards`：段编辑器与路线结构门控（route_and_run 唯一真源） */

export type SegmentEditorMode = 'full' | 'slot_timing_only' | 'readonly';

export interface WorldModelGuards {
  physical_reality_incomplete?: boolean;
  /** 如 "iceland" */
  physical_data_region?: string;
  is_route_topology_locked?: boolean;
  route_skeleton_locked?: boolean;
  locked_segment_ids?: string[];
  route_skeleton_signature?: string;
  freeze_route_selection?: boolean;
  topology_match?: boolean;
  recommended_plan_rejected?: boolean;
  segment_editor_mode?: SegmentEditorMode;
  banner_message_zh?: string;
}

export type RouteRunOptimizationMethod = 'HEURISTIC' | 'CGUS' | 'MONTE_CARLO';

/** 与后端 `explain.optimization` 对齐（snake_case） */
export type OptimizationExplain = RouteRunExplainOptimization;

export type RouteRunRejectedPlanStatus =
  | 'chosen'
  | 'rejected'
  | 'infeasible'
  | 'dominated'
  | 'filtered'
  | string;

export interface RouteRunRejectedPlan {
  id: string;
  status?: RouteRunRejectedPlanStatus;
  rejection_reasons?: string[];
  hard_violation_count?: number;
  soft_penalty_degree?: number;
  expected_utility?: number;
  feasibility_probability?: number;
  utility_delta_vs_chosen?: number;
}

export interface RouteRunMonteCarloSummary {
  used?: boolean;
  total_samples?: number;
  samples_per_candidate?: Record<string, number>;
}

export interface RouteRunDecisionVerdictFallbackStep {
  step: string;
  reason: string;
}

export interface RouteRunDecisionVerdict {
  chosen_plan_id?: string;
  rejected_plans?: RouteRunRejectedPlan[];
  monte_carlo_summary?: RouteRunMonteCarloSummary;
  fallback_chain?: RouteRunDecisionVerdictFallbackStep[];
}

/**
 * `explain.optimization.world_constraint_materialization`
 * `applied_events` 为纳入约束的条数（非事件数组）。
 */
export interface WorldConstraintMaterialization {
  applied_events?: number;
  road_ids?: string[];
  weather_dates?: string[];
  store_version?: number;
  unified_graph_node_count?: number;
  unified_graph_edge_count?: number;
}

export interface OptimizationAlternativeViolation {
  type?: string;
  severity?: string;
  degree?: number;
  detail?: string;
}

export interface OptimizationAlternative {
  id: string;
  score?: number;
  expected_utility?: number;
  feasibility_probability?: number;
  violations?: OptimizationAlternativeViolation[];
}

/** `explain.optimization`：OPTIMIZE/CGUS 结构化出口（只读，非门控真源） */
export interface RouteRunExplainOptimization {
  method?: RouteRunOptimizationMethod;
  recommended_alternative_id?: string;
  meta_decision_audit?: string;
  decision_verdict_narration_zh?: string;
  decision_verdict?: RouteRunDecisionVerdict;
  world_constraint_materialization?: WorldConstraintMaterialization;
  /** L2：与 payload.alternatives 互补，优先用于 CandidatesPanel */
  alternatives?: OptimizationAlternative[];
}
