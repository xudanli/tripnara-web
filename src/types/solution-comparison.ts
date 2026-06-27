import type { OptionComparison, OptionComparisonEntry } from '@/api/planning-workbench';

/** BFF / route_and_run `explain` 方案对比 — 与 OptionComparison 对齐并扩展 */
export interface ExplainAlternativeDimensionScores {
  executability?: number;
  cost?: number;
  fatigue?: number;
  risk?: number;
  pace?: number;
  /** 0–100 综合分 */
  overall?: number;
  [key: string]: number | undefined;
}

/** `explain.alternatives[]` 单条（snake_case 与 camelCase 均由解析层归一） */
export interface ExplainAlternativeDto {
  id: string;
  label?: string;
  summary?: string;
  /** 各维度 0–100 */
  dimension_scores?: ExplainAlternativeDimensionScores;
  dimensionScores?: ExplainAlternativeDimensionScores;
  scores?: Record<string, number>;
  caveat?: string;
  caveats?: string[];
  is_recommended?: boolean;
  isRecommended?: boolean;
  gate_status?: string;
  gateStatus?: string;
}

/** Goal Seek 松弛建议 — 已废弃，见 @/types/relaxation-suggestions RelaxationSuggestionV1 */
export interface RelaxationSuggestionDto {
  id: string;
  constraint_label: string;
  suggested_value: string;
  delta_label: string;
  satisfies_remaining_count?: number;
}

/** 扩展 compare 读模型（workbench comparison + explain 投影） */
export interface SolutionComparisonReadModel extends OptionComparison {
  /** 来源标记，供调试与 BFF 演进 */
  source?: 'workbench' | 'route_and_run' | 'explain_alternatives' | 'merged';
  alternatives?: ExplainAlternativeDto[];
  relaxation_suggestions?: RelaxationSuggestionDto[];
  relaxationSuggestions?: RelaxationSuggestionDto[];
}

export type { OptionComparisonEntry };
