import { getEmotionContextStoreState } from '@/store/emotionContextStore';

/** 行中 / 规划前 metadata.emotional_realtime_signals.emergency_mode */

let emergencyModeActive = false;
let emergencyModeExpiresAt = 0;

const DEFAULT_TTL_MS = 30 * 60 * 1000;

function isExpired(): boolean {
  return emergencyModeExpiresAt > 0 && Date.now() > emergencyModeExpiresAt;
}

export function setEmergencyModeActive(active: boolean, ttlMs = DEFAULT_TTL_MS): void {
  emergencyModeActive = active;
  emergencyModeExpiresAt = active ? Date.now() + ttlMs : 0;
}

export function clearEmergencyMode(): void {
  emergencyModeActive = false;
  emergencyModeExpiresAt = 0;
}

export function isEmergencyModeActive(): boolean {
  if (!emergencyModeActive) return false;
  if (isExpired()) {
    clearEmergencyMode();
    return false;
  }
  return true;
}

/** 上报用：显式 emergency 或 store 锚定态 */
export function resolveEmergencyModeForMetadata(): boolean {
  if (isEmergencyModeActive()) return true;
  const ctx = getEmotionContextStoreState().emotionalContext;
  return (
    ctx?.anxietyTriggered === true ||
    ctx?.voiceToneModifier === 'professional_authoritative'
  );
}
