import type { UserPreferences } from '@/api/user';

/** preferences.other 中已下线的奥德赛 / 搭子 / profile_seed 字段 */
const LEGACY_OTHER_PREFERENCE_KEYS = new Set([
  'defaultOdysseySovereigntyTier',
  'default_odyssey_sovereignty_tier',
  'companionInteractionMode',
  'companion_interaction_mode',
  'companionSocialBoundaryNote',
  'companion_social_boundary_note',
  'personaProfileUpdatedAt',
  'persona_profile_updated_at',
  'travelPersonaNonNegotiables',
  'travel_persona_non_negotiables',
  'preferredDestinationScope',
  'preferred_destination_scope',
  'profileSeedPlan',
  'profile_seed_plan',
  'profileSeedApplied',
  'profile_seed_applied',
  'decisionOsSessionId',
  'decision_os_session_id',
  'clientSessionId',
  'client_session_id',
]);

const SESSION_STORAGE_KEYS = [
  'companion',
  'decision_os_session_id',
  'tripnara_intake_cafe_meta_json',
  'tripnara_intake_cafe_complete',
  'tripnara_intake_cafe_round',
  'tripnara_intake_cafe_country_code',
  'tripnara_script_chapter_transition',
];

const LOCAL_STORAGE_PREFIXES = [
  'tripnara_intake_cafe_',
  'tripnara_odyssey_',
  'tripnara_script_',
  'tripnara_decision_os_',
];

export function stripLegacyOdysseyCompanionOther(
  other: Record<string, unknown> | undefined | null
): Record<string, unknown> {
  if (!other || typeof other !== 'object' || Array.isArray(other)) return {};
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(other)) {
    if (!LEGACY_OTHER_PREFERENCE_KEYS.has(key)) {
      next[key] = value;
    }
  }
  return next;
}

export function sanitizeUserPreferences(
  preferences: UserPreferences
): UserPreferences {
  return {
    ...preferences,
    other: stripLegacyOdysseyCompanionOther(
      preferences.other as Record<string, unknown> | undefined
    ),
  };
}

/** 清除浏览器内残留的搭子 / 奥德赛 session（一次性迁移） */
export function clearLegacyOdysseyCompanionClientStorage(): void {
  if (typeof window === 'undefined') return;

  for (const key of SESSION_STORAGE_KEYS) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  try {
    const localKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) localKeys.push(key);
    }
    for (const key of localKeys) {
      if (LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}
