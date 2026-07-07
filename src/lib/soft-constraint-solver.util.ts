import type { SoftPreferencePriority } from '@/components/plan-studio/workbench/constraint-console-view.util';
import { softPriorityToApiPriority } from '@/lib/trip-constraints.adapter';

/**
 * 软约束求解器权重 SSOT：stored API priority → solver weight。
 * BFF / 求解器应使用同一公式，避免 UI「高」与优化器「低」不一致。
 */
export function softApiPriorityToSolverWeight(priority?: number | null): number {
  const p = priority ?? 5;
  return p / 10;
}

export function softUiPriorityToSolverWeight(priority: SoftPreferencePriority): number {
  return softApiPriorityToSolverWeight(softPriorityToApiPriority(priority));
}

/**
 * 软模板 → compiledWeights.legacy / principles 中的 canonical 键。
 * 例：budget_soft 应 boost budget_deviation，而非仅 generic soft 槽位。
 */
export const SOFT_TEMPLATE_CANONICAL_WEIGHT_KEY: Record<string, string> = {
  budget_soft: 'budget_deviation',
  allow_budget_overrun: 'budget_deviation',
  minimize_hotel_changes: 'fewer_hotel_changes',
  lunch_time_window: 'lunch_window_deviation',
  max_major_pois_per_day: 'poi_count_deviation',
  daily_free_time: 'free_time_shortfall',
  avoid_early: 'early_departure_penalty',
  avoid_backtracking: 'backtracking_penalty',
  prefer_nature_scenery: 'nature_scenery_boost',
  attractions_over_shopping: 'shopping_penalty',
  less_shopping: 'shopping_penalty',
  sunset_photography: 'photography_timing',
  aurora_photo: 'photography_timing',
  prefer_local_food: 'local_food_boost',
  avoid_crowds: 'crowd_penalty',
  elderly_rest: 'rest_break_shortfall',
};

export function resolveSoftTemplateCanonicalWeightKey(templateId: string): string | undefined {
  return SOFT_TEMPLATE_CANONICAL_WEIGHT_KEY[templateId];
}

/** 从 API 约束记录解析 effective solver weight（priority/10） */
export function resolveSoftConstraintSolverWeight(input: {
  priority?: number | null;
  templateId?: string | null;
}): number {
  return softApiPriorityToSolverWeight(input.priority);
}
