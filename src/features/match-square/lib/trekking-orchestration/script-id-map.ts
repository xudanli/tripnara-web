import type { TrekActivityProfile } from '@/types/match-square';
import type { TrekkingRecruitmentScriptId } from '@/types/trekking-vibe-orchestration';

export const ACTIVITY_PROFILE_TO_SCRIPT_ID: Record<
  TrekActivityProfile,
  TrekkingRecruitmentScriptId
> = {
  heavy_pack: 'chuanxi_heavy_trek',
  light_trek: 'light_trek_dyl_retreat',
  speed_ascent: 'weekend_fast_light_trek',
};

export const SCRIPT_ID_TO_ACTIVITY_PROFILE: Record<
  TrekkingRecruitmentScriptId,
  TrekActivityProfile
> = {
  chuanxi_heavy_trek: 'heavy_pack',
  light_trek_dyl_retreat: 'light_trek',
  weekend_fast_light_trek: 'speed_ascent',
};

export function scriptIdFromActivityProfile(
  profile: TrekActivityProfile | null | undefined
): TrekkingRecruitmentScriptId | null {
  if (!profile) return null;
  return ACTIVITY_PROFILE_TO_SCRIPT_ID[profile] ?? null;
}

export function activityProfileFromScriptId(
  scriptId: TrekkingRecruitmentScriptId | string | null | undefined
): TrekActivityProfile | null {
  if (!scriptId) return null;
  return SCRIPT_ID_TO_ACTIVITY_PROFILE[scriptId as TrekkingRecruitmentScriptId] ?? null;
}
