import type {
  RouteRunMonteCarloSummary,
  WorldConstraintMaterialization,
} from '@/types/world-model-guards';

/** `explain.decision_cockpit`（decision-cockpit@v1，由 explain.unified 投影） */
export type DecisionCockpitVersion = 'decision-cockpit@v1' | (string & {});

export type DecisionCockpitIntegrityBadgeKey =
  | 'traceability'
  | 'physical_evidence'
  | 'narrative_drift'
  | (string & {});

export type DecisionCockpitBadgeStatus = 'pass' | 'warn' | 'fail' | 'unknown' | (string & {});

export interface DecisionCockpitIntegrityBadge {
  key: DecisionCockpitIntegrityBadgeKey;
  label_zh?: string;
  status: DecisionCockpitBadgeStatus;
  summary_zh?: string;
}

export interface DecisionCockpitTraceRow {
  persona: string;
  persona_label_zh?: string;
  step?: string;
  phase?: string;
  verdict?: string;
  summary_zh?: string;
  detail_zh?: string;
  evidence_tags?: string[];
}

export interface DecisionCockpitRiskFactor {
  id?: string;
  label_zh?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | (string & {});
  grounded?: boolean;
  source_refs?: string[];
  detail_zh?: string;
}

export interface DecisionCockpitCounterfactual {
  question_zh: string;
  answer_zh?: string;
  baseline_alternative_id?: string;
  chosen_alternative_id?: string;
}

export interface DecisionCockpitApiLink {
  path?: string;
  method?: string;
  trip_run_id?: string;
  /** 预填 POST body */
  payload?: Record<string, unknown>;
}

export interface DecisionCockpitApis {
  counterfactual?: DecisionCockpitApiLink;
  [key: string]: DecisionCockpitApiLink | undefined;
}

export interface DecisionCockpitDto {
  version?: DecisionCockpitVersion;
  integrity_badges?: DecisionCockpitIntegrityBadge[];
  decision_trace_rows?: DecisionCockpitTraceRow[];
  /** 展示用风险卡；后端亦可能以 grounded_factors 投影 */
  risk_factors?: DecisionCockpitRiskFactor[];
  grounded_factors?: DecisionCockpitRiskFactor[];
  counterfactuals?: DecisionCockpitCounterfactual[];
  world_constraints?: WorldConstraintMaterialization;
  monte_carlo?: RouteRunMonteCarloSummary;
  apis?: DecisionCockpitApis;
}
