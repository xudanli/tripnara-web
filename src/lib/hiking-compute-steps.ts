import type { ComputeStep, ComputeStepId } from '@/types/hiking';

/** 进度条每步至少 600ms，按 latencyMs 累加 */
export function stepDurationMs(step: ComputeStep): number {
  return Math.max(step.latencyMs ?? 0, 600);
}

export function totalComputeDurationMs(steps: ComputeStep[]): number {
  return steps.reduce((sum, s) => sum + stepDurationMs(s), 0);
}

export type ComputeReveal =
  | 'elevation'
  | 'fitness'
  | 'weather'
  | null;

export function revealAfterStepId(id: ComputeStepId): ComputeReveal {
  switch (id) {
    case 'dem.elevation_profile':
      return 'elevation';
    case 'decision.fitness_match':
      return 'fitness';
    case 'world.weather_risk':
      return 'weather';
    default:
      return null;
  }
}
