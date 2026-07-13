import type { FitnessProfile } from '@/types/fitness';

/** 从体能画像推断最长连续徒步天数档位（0–4） */
export function longestHikeFromProfile(profile: FitnessProfile): number | null {
  if (typeof profile.longestHikeDays === 'number') return profile.longestHikeDays;
  if (typeof profile.longestHike === 'number') return profile.longestHike;
  return null;
}

/** 限制在 0–4 档位 */
export function clampLongestHike(days: number): number {
  return Math.max(0, Math.min(4, Math.round(days)));
}
