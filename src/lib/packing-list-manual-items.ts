export interface ManualPackingListItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  priority: 'must' | 'should' | 'optional';
  checked: boolean;
  note?: string;
  source: 'manual';
}

const storageKey = (tripId: string) => `packing_list_manual_${tripId}`;

export function isManualPackingItemId(id: string): boolean {
  return id.startsWith('manual:');
}

export function loadManualPackingItems(tripId: string): ManualPackingListItem[] {
  if (!tripId) return [];
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ManualPackingListItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveManualPackingItems(tripId: string, items: ManualPackingListItem[]): void {
  if (!tripId) return;
  localStorage.setItem(storageKey(tripId), JSON.stringify(items));
}

export function createManualPackingItem(input: {
  name: string;
  category: string;
  quantity?: number;
  note?: string;
  priority?: ManualPackingListItem['priority'];
}): ManualPackingListItem {
  return {
    id: `manual:${crypto.randomUUID()}`,
    name: input.name.trim(),
    category: input.category,
    quantity: input.quantity ?? 1,
    priority: input.priority ?? 'should',
    checked: false,
    note: input.note?.trim() || undefined,
    source: 'manual',
  };
}

export function mergePackingListItems<T extends { id: string; checked: boolean; category: string }>(
  serverItems: T[],
  manualItems: ManualPackingListItem[],
): Array<T | ManualPackingListItem> {
  const serverIds = new Set(serverItems.map((i) => i.id));
  const uniqueManual = manualItems.filter((m) => !serverIds.has(m.id));
  return [...serverItems, ...uniqueManual];
}

export function summarizeMergedPackingItems(
  items: Array<{ checked: boolean; category: string }>,
): {
  totalItems: number;
  checkedItems: number;
  byCategory: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};
  let checkedItems = 0;
  for (const item of items) {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    if (item.checked) checkedItems += 1;
  }
  return { totalItems: items.length, checkedItems, byCategory };
}
