import { isUserVisiblePersonaAlert } from '@/lib/persona-alert-display';
import { normalizePersonaAlerts } from '@/lib/persona-alert.adapter';
import type { PersonaAlert } from '@/types/trip';

export function resolveTripPersonaAlerts(apiAlerts: PersonaAlert[] | unknown): PersonaAlert[] {
  return normalizePersonaAlerts(apiAlerts).filter(isUserVisiblePersonaAlert);
}
