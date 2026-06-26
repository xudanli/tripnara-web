import type { InTripRecommendedPlan, LoopRecommendedPatch } from '@/types/trip-loop';

const PREFIX = 'tripnara.loop';

export type TripLoopSessionKind = 'readiness' | 'in-trip';

function runIdKey(tripId: string, kind: TripLoopSessionKind): string {
  return `${PREFIX}.${kind}.${tripId}`;
}

function patchesKey(tripId: string): string {
  return `${PREFIX}.readiness.patches.${tripId}`;
}

function plansKey(tripId: string): string {
  return `${PREFIX}.in-trip.plans.${tripId}`;
}

export function readLoopRunIdFromSession(
  tripId: string,
  kind: TripLoopSessionKind,
): string | null {
  try {
    return sessionStorage.getItem(runIdKey(tripId, kind));
  } catch {
    return null;
  }
}

export function writeLoopRunIdToSession(
  tripId: string,
  kind: TripLoopSessionKind,
  loopRunId: string | null,
): void {
  try {
    const key = runIdKey(tripId, kind);
    if (!loopRunId) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, loopRunId);
  } catch {
    // ignore
  }
}

export function readRecommendedPatchesFromSession(tripId: string): LoopRecommendedPatch[] {
  try {
    const raw = sessionStorage.getItem(patchesKey(tripId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LoopRecommendedPatch[]) : [];
  } catch {
    return [];
  }
}

export function writeRecommendedPatchesToSession(
  tripId: string,
  patches: LoopRecommendedPatch[] | null,
): void {
  try {
    const key = patchesKey(tripId);
    if (!patches?.length) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify(patches));
  } catch {
    // ignore
  }
}

export function readRecommendedPlansFromSession(tripId: string): InTripRecommendedPlan[] {
  try {
    const raw = sessionStorage.getItem(plansKey(tripId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as InTripRecommendedPlan[]) : [];
  } catch {
    return [];
  }
}

export function writeRecommendedPlansToSession(
  tripId: string,
  plans: InTripRecommendedPlan[] | null,
): void {
  try {
    const key = plansKey(tripId);
    if (!plans?.length) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify(plans));
  } catch {
    // ignore
  }
}
