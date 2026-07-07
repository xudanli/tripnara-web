import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

const STORAGE_KEY_PREFIX = 'tripnara_workbench_dismissed_conflicts:';

export interface DismissedWorkbenchConflict {
  conflictId: string;
  semanticKey?: string;
  dismissedAt: string;
  dayIndex?: number;
}

function storageKey(tripId: string): string {
  return `${STORAGE_KEY_PREFIX}${tripId}`;
}

export function readDismissedWorkbenchConflicts(tripId: string): DismissedWorkbenchConflict[] {
  if (typeof window === 'undefined' || !tripId) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(tripId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is DismissedWorkbenchConflict =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof (entry as DismissedWorkbenchConflict).conflictId === 'string',
    );
  } catch {
    return [];
  }
}

export function writeDismissedWorkbenchConflicts(
  tripId: string,
  entries: DismissedWorkbenchConflict[],
): void {
  if (typeof window === 'undefined' || !tripId) return;
  try {
    window.localStorage.setItem(storageKey(tripId), JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
}

/** revalidate 后清理已不存在的 semanticKey，避免静默隐藏新冲突 */
export function pruneDismissedWorkbenchConflicts(
  tripId: string,
  currentItems: PlanningConflictItem[],
): DismissedWorkbenchConflict[] {
  const stored = readDismissedWorkbenchConflicts(tripId);
  if (!stored.length) return stored;

  const activeSemanticKeys = new Set(
    currentItems.map((item) => item.semanticKey ?? item.id).filter(Boolean),
  );
  const activeIds = new Set(currentItems.map((item) => item.id));

  const pruned = stored.filter((entry) => {
    if (entry.semanticKey) return activeSemanticKeys.has(entry.semanticKey);
    return activeIds.has(entry.conflictId);
  });

  if (pruned.length !== stored.length) {
    writeDismissedWorkbenchConflicts(tripId, pruned);
  }
  return pruned;
}

export function isWorkbenchConflictDeferrable(item: PlanningConflictItem): boolean {
  return item.priority === 'suggest_adjust' || item.priority === 'pending_confirm';
}

export function filterVisibleWorkbenchConflicts(
  tripId: string,
  items: PlanningConflictItem[],
): PlanningConflictItem[] {
  const dismissed = pruneDismissedWorkbenchConflicts(tripId, items);
  const dismissedIds = new Set(dismissed.map((entry) => entry.conflictId));
  const dismissedSemantic = new Set(
    dismissed.map((entry) => entry.semanticKey).filter(Boolean) as string[],
  );

  return items.filter((item) => {
    if (dismissedIds.has(item.id)) return false;
    const key = item.semanticKey;
    if (key && dismissedSemantic.has(key)) return false;
    return true;
  });
}

export function isWorkbenchConflictDismissed(
  tripId: string,
  conflict: Pick<PlanningConflictItem, 'id' | 'semanticKey'>,
): boolean {
  const dismissed = readDismissedWorkbenchConflicts(tripId);
  return dismissed.some(
    (entry) =>
      entry.conflictId === conflict.id ||
      (Boolean(conflict.semanticKey) && entry.semanticKey === conflict.semanticKey),
  );
}

export function dismissWorkbenchConflicts(
  tripId: string,
  conflicts: PlanningConflictItem[],
  dayIndex?: number,
): DismissedWorkbenchConflict[] {
  const deferrable = conflicts.filter(isWorkbenchConflictDeferrable);
  if (!deferrable.length) return [];

  const stored = readDismissedWorkbenchConflicts(tripId);
  const existingIds = new Set(stored.map((entry) => entry.conflictId));
  const now = new Date().toISOString();

  const added: DismissedWorkbenchConflict[] = [];
  for (const conflict of deferrable) {
    if (existingIds.has(conflict.id)) continue;
    added.push({
      conflictId: conflict.id,
      semanticKey: conflict.semanticKey,
      dismissedAt: now,
      dayIndex,
    });
  }

  if (!added.length) return [];
  writeDismissedWorkbenchConflicts(tripId, [...stored, ...added]);
  return added;
}

export function undoDismissWorkbenchConflict(tripId: string, conflictId: string): void {
  const stored = readDismissedWorkbenchConflicts(tripId);
  writeDismissedWorkbenchConflicts(
    tripId,
    stored.filter((entry) => entry.conflictId !== conflictId),
  );
}

export function conflictsForWorkbenchDay(
  items: PlanningConflictItem[],
  dayIndex: number,
): PlanningConflictItem[] {
  const dayNumber = dayIndex + 1;
  const seen = new Set<string>();
  return items.filter((item) => {
    const days = item.affectedDays ?? item.issue?.affectedDays;
    const matchesDay = days?.length ? days.includes(dayNumber) : item.priority === 'must_handle';
    if (!matchesDay || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
