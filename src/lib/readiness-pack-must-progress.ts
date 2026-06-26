import type { ReadinessCheckResult, ReadinessFindingItem } from '@/api/readiness';
import { taskCheckKey } from '@/lib/readiness-place-display.util';

export function collectPackMustItems(
  result: ReadinessCheckResult | null | undefined,
): ReadinessFindingItem[] {
  if (!result?.findings?.length) return [];
  const items: ReadinessFindingItem[] = [];
  for (const finding of result.findings) {
    finding.must?.forEach((item) => items.push(item));
  }
  return items;
}

export function checklistItemKey(item: ReadinessFindingItem, index: number, prefix = 'must'): string {
  return item.id || `${prefix}-${index}`;
}

export function completionUnitsForMustItem(item: ReadinessFindingItem, index: number): string[] {
  const key = checklistItemKey(item, index);
  if (Array.isArray(item.tasks) && item.tasks.length > 0) {
    return item.tasks.map((_, taskIndex) => taskCheckKey(key, taskIndex));
  }
  return [key];
}

export function isMustItemComplete(
  item: ReadinessFindingItem,
  index: number,
  checkedIds: Set<string>,
): boolean {
  const key = checklistItemKey(item, index);
  if (checkedIds.has(key)) return true;
  const units = completionUnitsForMustItem(item, index);
  return units.every((unit) => checkedIds.has(unit));
}

export function countRemainingPackMust(
  result: ReadinessCheckResult | null | undefined,
  checkedIds: Set<string>,
  excludedIds: Set<string> = new Set(),
): { total: number; remaining: number; done: number } {
  const items = collectPackMustItems(result).filter((item, index) => {
    const key = checklistItemKey(item, index);
    return !excludedIds.has(key) && !(item.id && excludedIds.has(item.id));
  });
  const total = items.length;
  const done = items.filter((item, index) => isMustItemComplete(item, index, checkedIds)).length;
  return { total, remaining: total - done, done };
}

export function isPackMustResolved(
  result: ReadinessCheckResult | null | undefined,
  checkedIds: Set<string>,
  excludedIds?: Set<string>,
): boolean {
  const { total, remaining } = countRemainingPackMust(result, checkedIds, excludedIds);
  return total === 0 || remaining === 0;
}
