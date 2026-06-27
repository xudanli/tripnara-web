import type { ConstraintFlexKey } from '@/lib/constraint-flexibility.util';
import type { SolutionMatrixModel } from '@/lib/solution-matrix-model';

/** 约束项 ↔ 矩阵评估维度（M2 影响指示） */
const CONSTRAINT_DIMENSION_MAP: Record<ConstraintFlexKey, string[]> = {
  budget: ['cost'],
  time_range: ['executability', 'overall'],
  travelers: ['cost', 'overall'],
  transport: ['fatigue', 'executability'],
};

export function countImpactedOptionsForConstraint(
  model: SolutionMatrixModel,
  constraintKey: ConstraintFlexKey,
): number {
  if (!model.visible || model.columns.length < 2) return 0;

  const dimensionIds = new Set(CONSTRAINT_DIMENSION_MAP[constraintKey]);
  const impactedColumnIndexes = new Set<number>();

  for (const row of model.rows) {
    if (!dimensionIds.has(row.dimensionId)) continue;
    row.cells.forEach((cell, index) => {
      if (cell.diffTone === 'better' || cell.diffTone === 'worse') {
        impactedColumnIndexes.add(index);
      }
    });
  }

  return impactedColumnIndexes.size;
}

export function buildConstraintImpactMap(
  model: SolutionMatrixModel,
): Partial<Record<ConstraintFlexKey, number>> {
  if (!model.visible) return {};

  const keys: ConstraintFlexKey[] = ['budget', 'time_range', 'travelers', 'transport'];
  const result: Partial<Record<ConstraintFlexKey, number>> = {};

  for (const key of keys) {
    const count = countImpactedOptionsForConstraint(model, key);
    if (count > 0) result[key] = count;
  }

  return result;
}

export function formatConstraintImpactLabel(count: number): string {
  return `影响 ${count} 个方案`;
}
