import type { MoneyDnaVector } from '@/types/trip-decision-profiling';
import { SEMANTIC_BLUE_HEX, SEMANTIC_GREEN_HEX } from '@/lib/semantic-colors';

export const MONEY_DNA_AXIS_KEYS: (keyof MoneyDnaVector)[] = [
  'experienceTendency',
  'qualityTendency',
  'timeValueTendency',
  'socialScarcityTendency',
];

export function averageMoneyDnaVector(vectors: MoneyDnaVector[]): MoneyDnaVector | null {
  if (vectors.length === 0) return null;
  const sum: MoneyDnaVector = {
    experienceTendency: 0,
    qualityTendency: 0,
    timeValueTendency: 0,
    socialScarcityTendency: 0,
  };
  for (const vector of vectors) {
    for (const key of MONEY_DNA_AXIS_KEYS) {
      sum[key] += vector[key];
    }
  }
  const count = vectors.length;
  return {
    experienceTendency: sum.experienceTendency / count,
    qualityTendency: sum.qualityTendency / count,
    timeValueTendency: sum.timeValueTendency / count,
    socialScarcityTendency: sum.socialScarcityTendency / count,
  };
}

export const MEMBER_CHART_COLORS = [
  'oklch(0.205 0 0)',
  SEMANTIC_BLUE_HEX,
  '#D97746',
  SEMANTIC_GREEN_HEX,
] as const;
