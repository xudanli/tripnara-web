import type { PlanStudioConstraintsChangeSource } from '@/types/planning-constraints';

/** 约束轻量变更：前端 800ms 内展示矩阵 refreshing，等待 compare 刷新 */
export const LIGHT_CONSTRAINT_CHANGE_SOURCES = new Set<PlanStudioConstraintsChangeSource>([
  'budget',
  'transport',
]);

/** 结构性变更：须等 route_and_run / comparison-updated，不设短 refreshing */
export const HEAVY_CONSTRAINT_CHANGE_SOURCES = new Set<PlanStudioConstraintsChangeSource>([
  'dates',
  'team',
  'collaborators',
  'intent',
]);

export const SOLUTION_MATRIX_FAST_REFRESH_MS = 800;

export function isLightConstraintChange(source: PlanStudioConstraintsChangeSource): boolean {
  return LIGHT_CONSTRAINT_CHANGE_SOURCES.has(source);
}
