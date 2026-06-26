/** 级联影响 UI 卡片 — 与后端 ReadinessCascadeUiHint 对齐，全入口共用 */

export type CascadeRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CascadeRecommendation =
  | 'AVOID'
  | 'ADJUST'
  | 'DELAY'
  | 'REPLACE'
  | 'ASK_USER';

/** Impact Algebra — causalPreAnalysis / dependency_impact.impact.affected[] */
export interface CascadeImpactAlgebra {
  /** 净影响分钟（buffer 吸收后） */
  netImpactMinutes?: number;
  /** 被 buffer 吃掉的部分 */
  absorbedMinutes?: number;
  /** 级联置信度 0..1 */
  cascadeConfidence?: number;
  /** 传播跳数 */
  propagationHop?: number;
}

export interface CascadeAffectedItem {
  riskLevel: CascadeRiskLevel;
  message: string;
  recommendation: CascadeRecommendation;
  entityRef: { kind: string; label?: string; id: string };
  userConfirmationRequired?: string[];
  impactAlgebra?: CascadeImpactAlgebra;
}

/** 可直接渲染的卡片 — score / repair-options / insight / route-and-run 同形 */
export interface CascadeUiHint {
  id: string;
  riskLevel: CascadeRiskLevel;
  /** 中文说明，主文案 */
  message: string;
  /** 机器码，用于 badge / 按钮文案 */
  recommendation: CascadeRecommendation;
  entityKind?: string;
  entityLabel?: string;
  /** 需用户自行确认的事项（不可代订） */
  userConfirmationRequired?: string[];
  /** 净延误（0 = buffer 吸收） */
  netImpactMinutes?: number;
  /** 被 buffer 吃掉的部分 */
  absorbedMinutes?: number;
  /** 级联置信度 0..1 */
  cascadeConfidence?: number;
  /** 传播跳数 */
  propagationHop?: number;
  /** ROAD / WEATHER / FLIGHT_STATUS … */
  triggerFactType?: string;
  /** physical_validator / readiness_blocker */
  triggerSource?: string;
}

export interface CascadeCausalPreAnalysis {
  trigger: {
    factType: string;
  };
  impact: {
    affected: CascadeAffectedItem[];
  };
  coverage?: Record<string, unknown>;
  analyzedAt: string;
}

/** Insight / score 摘要级因果预分析 */
export interface CascadeCausalPreAnalysisSummary {
  triggerFactType?: string;
  affectedCount?: number;
  maxRiskLevel?: CascadeRiskLevel;
}

export interface CascadeImpactResponse {
  tripId: string;
  cascadeUiHints: CascadeUiHint[];
  causalPreAnalysis?: CascadeCausalPreAnalysis;
  updatedAt?: string;
}
