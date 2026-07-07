import type { CommitPlanOptions } from '@/api/planning-workbench';
import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';
import type { TripDetail } from '@/types/trip';

export function resolvePlanGatePartialCommitDayOptions(
  result: ExecutePlanningWorkbenchResponse | null,
  trip: TripDetail | null,
): number[] {
  const daySet = new Set<number>();

  const draftDiff = result?.uiOutput.planGate?.draftDiff;
  for (const change of draftDiff?.timelineChanges ?? []) {
    if (change.day != null) daySet.add(change.day);
  }
  for (const change of draftDiff?.memberChanges ?? []) {
    daySet.add(change.day);
  }
  for (const change of draftDiff?.mapChanges ?? []) {
    if (change.day != null) daySet.add(change.day);
  }

  if (daySet.size > 0) {
    return Array.from(daySet).sort((a, b) => a - b);
  }

  const affected =
    draftDiff?.metrics?.affectedDays ??
    draftDiff?.affectedDayCount ??
    result?.uiOutput.planGate?.verification.metrics?.affectedDayCount;
  if (affected != null && affected > 0) {
    const tripDays = trip?.TripDay?.length ?? affected;
    const count = Math.min(affected, tripDays);
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  const tripDayCount = trip?.TripDay?.length ?? 0;
  if (tripDayCount > 0) {
    return Array.from({ length: tripDayCount }, (_, i) => i + 1);
  }

  return [];
}

export function buildPlanGateCommitOptions(
  partialCommit: boolean,
  commitDays: number[],
): CommitPlanOptions | undefined {
  if (!partialCommit) return undefined;
  if (commitDays.length === 0) return { partialCommit: true, commitDays: [] };
  return { partialCommit: true, commitDays: [...commitDays].sort((a, b) => a - b) };
}

export function isValidPartialCommitSelection(
  partialCommit: boolean,
  commitDays: number[],
): boolean {
  if (!partialCommit) return true;
  return commitDays.length > 0;
}
