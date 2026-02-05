/**
 * 约束DSL和冲突检测相关类型定义
 */

// ==================== 约束DSL类型 ====================

export interface BudgetConstraint {
  max: number;
  currency: string;
  flexible?: boolean;
}

export interface DateWindowConstraint {
  start: string; // ISO date string
  end: string; // ISO date string
  flexible?: boolean;
}

export interface PaceConstraint {
  preference: 'relaxed' | 'moderate' | 'intense';
  weight?: number;
}

export interface ComfortLevelConstraint {
  hotel_quality: 'low' | 'medium' | 'high';
  weight?: number;
}

export interface ConstraintDSL {
  hard_constraints: {
    budget?: BudgetConstraint;
    date_window?: DateWindowConstraint;
    // 可以扩展其他硬约束
  };
  soft_constraints: {
    pace?: PaceConstraint;
    comfort_level?: ComfortLevelConstraint;
    // 可以扩展其他软约束
  };
}

// ==================== 冲突检测类型 ====================

export interface DetectConflictsRequest {
  constraints: ConstraintDSL;
  plan?: any; // 可选，用于更精确的冲突检测
  state?: any; // 可选，世界状态
}

export interface Conflict {
  between: string[]; // 冲突的约束名称
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  tradeoff_options: string[];
  details: Record<string, any>;
}

export interface DetectConflictsResponse {
  data: {
    conflicts: Conflict[];
    has_conflicts: boolean;
    summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

// ==================== 约束检查类型 ====================

export interface CheckConstraintsRequest {
  state: any;
  plan: any;
}

export interface ConstraintViolation {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details: Record<string, any>;
  suggestions: string[];
}

export interface InfeasibilityReason {
  constraint: string;
  description: string;
  affected_activities: any[];
  fix_suggestions: string[];
}

export interface InfeasibilityExplanation {
  feasible: boolean;
  reasons: InfeasibilityReason[];
  summary: string;
}

export interface CheckConstraintsResponse {
  data: {
    isValid: boolean;
    violations: ConstraintViolation[];
    summary: {
      errorCount: number;
      warningCount: number;
      infoCount: number;
    };
    conflicts: {
      conflicts: Conflict[];
      has_conflicts: boolean;
      critical_count: number;
      high_count: number;
      medium_count: number;
      low_count: number;
    };
    infeasibilityExplanation: InfeasibilityExplanation;
  };
}

// ==================== 多方案生成类型 ====================

export interface GenerateMultiplePlansRequest {
  state: any;
  constraints: ConstraintDSL;
}

export interface PlanVariantTradeoff {
  constraint: string;
  sacrificed: string;
  reason: string;
  can_adjust: boolean;
  impact_score: number;
}

export interface PlanVariantScore {
  total: number;
  breakdown: {
    satisfaction: number;
    violationRisk: number;
    robustness: number;
    cost: number;
  };
}

export interface PlanVariantFeasibility {
  isValid: boolean;
  violations: number;
  conflicts: number;
}

export interface PlanVariantSummary {
  days: number;
  totalActivities: number;
}

export interface SeasonalWarning {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  affectedItems?: string[]; // 受影响的行程项ID
  affectedDays?: string[]; // 受影响的日期
}

export interface PlanVariantMetadata {
  seasonalWarnings?: SeasonalWarning[];
  [key: string]: any;
}

export interface PlanVariant {
  id: 'conservative' | 'balanced' | 'aggressive';
  score: PlanVariantScore;
  tradeoffs: PlanVariantTradeoff[];
  feasibility: PlanVariantFeasibility;
  planSummary: PlanVariantSummary;
  plan?: any; // 完整的方案数据（可选）
  metadata?: PlanVariantMetadata;
}

export interface GenerateMultiplePlansResponse {
  data: {
    variants: PlanVariant[];
    log: {
      runId: string;
      explanation: string;
    };
  };
}
