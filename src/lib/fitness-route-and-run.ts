import type { FitnessLevel } from '@/types/fitness';
import type { RouteRunPreferenceProfilePatch } from '@/lib/route-run-preference-profile';

/** 与后端 route_and_run / Hydrator 约定：`low` | `medium` | `high` */
export type RouteRunFitnessApiLevel = 'low' | 'medium' | 'high';

/** 34/100 中等偏低 → `MEDIUM_LOW` → API `low` */
export function mapFitnessLevelToRouteAndRunApi(level: FitnessLevel): RouteRunFitnessApiLevel {
  switch (level) {
    case 'LOW':
    case 'MEDIUM_LOW':
      return 'low';
    case 'MEDIUM':
      return 'medium';
    case 'MEDIUM_HIGH':
    case 'HIGH':
      return 'high';
    default:
      return 'medium';
  }
}

/**
 * 用户已完成体能问卷时，显式下发档位（配合服务端 Hydrator / 记忆层）。
 * 同时写 `fitness_level` 与 `party_profile.fitness_level` 以兼容不同 DTO 路径。
 */
export function buildFitnessPreferenceProfilePatch(params: {
  hasCompletedAssessment: boolean;
  fitnessLevel: FitnessLevel;
  overallScore?: number;
}): RouteRunPreferenceProfilePatch | undefined {
  if (!params.hasCompletedAssessment) return undefined;

  const fitness_level = mapFitnessLevelToRouteAndRunApi(params.fitnessLevel);
  const party_profile: Record<string, unknown> = { fitness_level };
  if (typeof params.overallScore === 'number' && Number.isFinite(params.overallScore)) {
    party_profile.fitness_overall_score = Math.round(params.overallScore);
  }

  return {
    fitness_level,
    party_profile,
  };
}

export function mergePreferenceProfileForRouteAndRun(
  base?: RouteRunPreferenceProfilePatch,
  fitnessPatch?: RouteRunPreferenceProfilePatch
): RouteRunPreferenceProfilePatch | undefined {
  if (!base && !fitnessPatch) return undefined;
  if (!fitnessPatch) return base;
  if (!base) return fitnessPatch;

  const baseParty =
    base.party_profile && typeof base.party_profile === 'object'
      ? (base.party_profile as Record<string, unknown>)
      : undefined;
  const fitParty =
    fitnessPatch.party_profile && typeof fitnessPatch.party_profile === 'object'
      ? (fitnessPatch.party_profile as Record<string, unknown>)
      : undefined;

  return {
    ...base,
    ...fitnessPatch,
    ...(fitParty
      ? { party_profile: { ...baseParty, ...fitParty } }
      : baseParty
        ? { party_profile: baseParty }
        : {}),
  };
}
