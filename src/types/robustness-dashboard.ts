/** tripnara.robustness_dashboard@v1 — 正式 rollout */
export type RobustnessBottleneckRisk =
  | 'PHYSICAL_BLOCK'
  | 'EMOTIONAL_EXPLOSION'
  | 'TIME_CRUNCH'
  | (string & {});

export interface RobustnessBottleneck {
  nodeId: string;
  primaryRisk: RobustnessBottleneckRisk;
  triggerEvent: string;
  description: string;
}

export interface RobustnessTimelinePoint {
  timestamp: string;
  nodeId: string;
  baseUtility?: number;
  physicsRobustness: number;
  socialStressIndex: number;
  activePerturbations?: string[];
}

export interface RobustnessContingencyPlan {
  trigger_node_id: string;
  condition: string;
  mutated_ir_step_delta: number;
}

export interface RobustnessDashboardPayload {
  schema: 'tripnara.robustness_dashboard@v1';
  physical_robustness_score: number;
  organizational_robustness_score: number;
  combined_robustness_score: number;
  sample_count: number;
  bottlenecks: RobustnessBottleneck[];
  timeline: RobustnessTimelinePoint[];
  contingency_plans?: RobustnessContingencyPlan[];
  party_id?: string;
  member_count?: number;
  computed_at?: string;
  [key: string]: unknown;
}

/** INTAKE 预演（无独立 schema 名） */
export interface OrganizationalRobustnessPreview {
  organizational_robustness_score: number;
  physical_robustness_score: number;
  combined_robustness_score: number;
  sample_count: number;
  peak_social_stress_node_id?: string;
  peak_social_stress_index?: number;
  peak_social_stress_day?: string;
  bottlenecks: RobustnessBottleneck[];
  timeline: Array<{
    timestamp: string;
    nodeId: string;
    physicsRobustness: number;
    socialStressIndex: number;
  }>;
  is_preview: true;
  source: 'intake_stub_itinerary' | (string & {});
}

export interface PartyNegotiationMemberProfile {
  /** 与 Match Square roster `userId` 对齐的稳定成员 ID */
  member_id?: string;
  pace?: string;
  risk_tolerance?: 'LOW' | 'MEDIUM' | 'HIGH' | (string & {});
  /** @deprecated 后端已兼容；请求侧请用 risk_tolerance */
  risk?: string;
  adventure_weight?: number;
  fitness_level?: string;
  role?: string;
  mbti_type?: string;
  [key: string]: unknown;
}

export interface PartyNegotiationBranchPolicy {
  [key: string]: unknown;
}

export interface PartyNegotiationPayload {
  party_size?: number;
  member_profiles?: PartyNegotiationMemberProfile[];
  aggregated_pace?: 'intensive' | 'relaxed' | 'moderate' | (string & {});
  aggregated_risk_tolerance?: 'LOW' | 'MEDIUM' | 'HIGH' | (string & {});
  regret_upper_bound?: number;
  requires_hitl_clarification?: boolean;
  branch_policies?: PartyNegotiationBranchPolicy[];
  nash_reorder_hint?: string;
  organizational_robustness_preview?: OrganizationalRobustnessPreview;
  [key: string]: unknown;
}

export type AlignmentDiscardReason =
  | 'FATIGUE_OVERFLOW'
  | 'SOCIAL_FRICTION'
  | 'WEATHER_BLOCK'
  | 'TIME_CONFLICT'
  | 'PREFERENCE_SHIFT'
  | 'UNKNOWN'
  | (string & {});

export interface AlignmentTupleSummary {
  tuple_id: string;
  captured_at: string;
  discard_reason: AlignmentDiscardReason;
  organizational_penalty: number;
  physical_penalty: number;
  affected_node_ids: string[];
  revision_id?: string;
  resolution_type?: string;
}

export interface AlignmentSlice {
  organizational_weight?: number;
  physical_weight?: number;
  tuple_count?: number;
  last_discard_reason?: AlignmentDiscardReason;
  metadata_revision?: number;
  recent_tuples: AlignmentTupleSummary[];
}

export interface TripRobustnessDualCurvePoint {
  node_id: string;
  timestamp: string;
  physical: number;
  organizational: number;
  active_perturbations?: string[];
}

export type TripRobustnessDashboardStatus =
  | 'ready'
  | 'cached'
  | 'empty_itinerary'
  | 'computation_failed'
  | 'trip_not_found';

/** tripnara.trip_robustness_dashboard@v1 */
export interface TripRobustnessDashboardResponse {
  trip_id: string;
  schema: 'tripnara.trip_robustness_dashboard@v1';
  status: TripRobustnessDashboardStatus;
  rollout?: RobustnessDashboardPayload;
  cached_at?: string;
  dual_curves: TripRobustnessDualCurvePoint[];
  alignment?: AlignmentSlice;
  computed_at: string;
}
