export type SolutionDiffTone = 'same' | 'better' | 'worse' | 'neutral';

export interface SolutionDimensionMeta {
  id: string;
  label: string;
  /** 分数越高是否对用户越有利 */
  higherIsBetter: boolean;
}

export const SOLUTION_MATRIX_DIMENSIONS: SolutionDimensionMeta[] = [
  { id: 'overall', label: '综合评分', higherIsBetter: true },
  { id: 'executability', label: '可执行性', higherIsBetter: true },
  { id: 'cost', label: '成本', higherIsBetter: false },
  { id: 'fatigue', label: '疲劳', higherIsBetter: false },
  { id: 'risk', label: '风险', higherIsBetter: false },
];

const DIMENSION_BY_ID = new Map(SOLUTION_MATRIX_DIMENSIONS.map((d) => [d.id, d]));

export function getSolutionDimensionMeta(id: string): SolutionDimensionMeta {
  return DIMENSION_BY_ID.get(id) ?? { id, label: id, higherIsBetter: true };
}

export function resolveSolutionDiffTone(
  baseline: number | null | undefined,
  value: number | null | undefined,
  higherIsBetter: boolean,
): SolutionDiffTone {
  if (baseline == null || value == null || !Number.isFinite(baseline) || !Number.isFinite(value)) {
    return 'neutral';
  }
  if (Math.abs(baseline - value) < 0.5) return 'same';
  const improved = higherIsBetter ? value > baseline : value < baseline;
  return improved ? 'better' : 'worse';
}

export function formatSolutionScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return String(Math.round(value));
}

export function computeOverallScore(scores: Record<string, number> | undefined): number | null {
  if (!scores) return null;
  const values = Object.values(scores).filter((v) => Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function diffToneClassName(tone: SolutionDiffTone): string {
  switch (tone) {
    case 'better':
      return 'bg-muted/15 text-success';
    case 'worse':
      return 'bg-muted/80 text-error dark:bg-muted/30 dark:text-error';
    case 'same':
      return 'text-muted-foreground';
    default:
      return '';
  }
}
