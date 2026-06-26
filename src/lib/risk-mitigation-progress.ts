import type { EnhancedRisk } from '@/api/readiness';
import {
  pickRiskBodyText,
  stripItineraryPlaceSuffix,
  isItineraryPlaceOnlyMessage,
} from '@/lib/risk-display.util';

const storageKey = (tripId: string) => `readiness_risk_mitigations_${tripId}`;

export function mitigationKey(risk: EnhancedRisk, index: number): string {
  const id = risk.id || risk.type || 'risk';
  return `${id}:${index}`;
}

export function getActionableMitigations(
  risk: EnhancedRisk,
): Array<{ action: string; priority: 'high' | 'medium' | 'low' }> {
  const mitigationDetails = risk.mitigationDetails || [];
  const mitigations = risk.mitigation || risk.mitigations || [];
  const affectedPois = risk.affectedPois || [];
  const rawBodyText = pickRiskBodyText(risk as Parameters<typeof pickRiskBodyText>[0]);
  const strippedBody =
    affectedPois.length > 0 ? stripItineraryPlaceSuffix(rawBodyText) : rawBodyText;
  const bodyText =
    isItineraryPlaceOnlyMessage(strippedBody) || isItineraryPlaceOnlyMessage(rawBodyText)
      ? ''
      : strippedBody;
  const bodyUsedFirstMitigation =
    !((risk.summary || risk.message || risk.description || '').trim()) &&
    mitigations.length > 0 &&
    bodyText === mitigations[0];
  const showMitigationList = mitigations.length > 0 && !bodyUsedFirstMitigation;
  const hasMitigationDetails = mitigationDetails.length > 0 && showMitigationList;

  if (hasMitigationDetails) return mitigationDetails;
  if (showMitigationList && mitigations.length > 0) {
    return mitigations.map((action) => ({ action, priority: 'medium' as const }));
  }
  return [];
}

export function loadRiskMitigationChecked(tripId: string): Set<string> {
  try {
    const stored = localStorage.getItem(storageKey(tripId));
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveRiskMitigationChecked(tripId: string, checked: Set<string>): void {
  try {
    localStorage.setItem(storageKey(tripId), JSON.stringify(Array.from(checked)));
  } catch {
    // ignore quota / private mode
  }
}

export function listMitigationActions(risk: EnhancedRisk): Array<{ action: string; priority: 'high' | 'medium' | 'low' }> {
  return getActionableMitigations(risk);
}

export function countMitigationProgress(
  risks: EnhancedRisk[],
  checked: Set<string>,
): { total: number; done: number; remaining: number } {
  let total = 0;
  let done = 0;
  for (const risk of risks) {
    const actions = listMitigationActions(risk);
    total += actions.length;
    actions.forEach((_, index) => {
      if (checked.has(mitigationKey(risk, index))) done += 1;
    });
  }
  return { total, done, remaining: Math.max(0, total - done) };
}
