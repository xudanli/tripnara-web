/**
 * longestHike（0–4）解析：URL query > 体能 profile > 默认 2
 * 不再使用 tripnara_fitness_longest_hike localStorage。
 */

import type { FitnessProfile } from '@/types/fitness';

const DEFAULT_LONGEST_HIKE = 2;

export function clampLongestHike(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_LONGEST_HIKE;
  return Math.min(4, Math.max(0, Math.round(n)));
}

export function longestHikeFromProfile(profile?: FitnessProfile | null): number | null {
  if (!profile) return null;
  const days =
    profile.longestHikeDays ??
    (profile as FitnessProfile & { longestHike?: number }).longestHike;
  if (days == null || !Number.isFinite(Number(days))) return null;
  return clampLongestHike(Number(days));
}

export function parseLongestHikeQueryParam(
  value: string | null | undefined
): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 4) return null;
  return clampLongestHike(n);
}

export function resolveLongestHike(options?: {
  queryOverride?: number | null;
  profile?: FitnessProfile | null;
}): number {
  if (options?.queryOverride != null) return clampLongestHike(options.queryOverride);
  const fromProfile = longestHikeFromProfile(options?.profile);
  if (fromProfile != null) return fromProfile;
  return DEFAULT_LONGEST_HIKE;
}
