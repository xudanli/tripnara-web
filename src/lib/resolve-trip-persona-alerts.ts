import { isUserVisiblePersonaAlert } from '@/lib/persona-alert-display';
import { normalizePersonaAlerts } from '@/lib/persona-alert.adapter';
import type { PersonaAlert } from '@/types/trip';

/**
 * M3 单源：readiness-repair loop ui.personaAlerts 优先于 GET persona-alerts。
 * 两者均由后端 guardian-user-facing.projection 投影。
 */
export function resolveTripPersonaAlerts(
  apiAlerts: PersonaAlert[] | unknown,
  loopAlerts?: PersonaAlert[] | unknown | null,
): PersonaAlert[] {
  const loop = normalizePersonaAlerts(loopAlerts).filter(isUserVisiblePersonaAlert);
  if (loop.length > 0) return loop;
  return normalizePersonaAlerts(apiAlerts).filter(isUserVisiblePersonaAlert);
}
