import type { TripDetail } from '@/types/trip';
import type { BudgetActualLineItem, LedgerEntry } from '@/types/trip-budget';
import { costCategoryToLedgerCategory } from '@/lib/trip-budget-expense';

function itineraryItemName(item: {
  Place?: { nameCN?: string | null; nameEN?: string | null } | null;
  note?: string | null;
  costNote?: string | null;
}): string {
  return (
    item.Place?.nameCN?.trim() ||
    item.Place?.nameEN?.trim() ||
    item.note?.trim() ||
    item.costNote?.trim() ||
    '未命名费用项'
  );
}

export function extractCostLineItemsFromTrip(trip: TripDetail): BudgetActualLineItem[] {
  const currency = trip.budgetConfig?.currency ?? 'CNY';
  const rows: BudgetActualLineItem[] = [];

  for (const day of trip.TripDay ?? []) {
    for (const item of day.ItineraryItem ?? []) {
      const estimated = item.estimatedCost ?? 0;
      const actual = item.actualCost ?? 0;
      if (estimated <= 0 && actual <= 0) continue;

      rows.push({
        id: item.id,
        name: itineraryItemName(item),
        date: day.date,
        estimated: estimated > 0 ? estimated : undefined,
        actual: actual > 0 ? actual : undefined,
        currency: item.currency ?? currency,
        category: item.costCategory
          ? costCategoryToLedgerCategory(item.costCategory)
          : undefined,
        source: 'itinerary',
      });
    }
  }

  return rows.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

export function ledgerEntriesToLineItems(entries: LedgerEntry[]): BudgetActualLineItem[] {
  return entries
    .filter((entry) => entry.sourceType === 'manual')
    .map((entry) => ({
      id: entry.id,
      name: entry.title?.trim() || '未命名费用',
      date: entry.createdAt?.split('T')[0],
      actual: entry.amount,
      currency: entry.currency,
      category: entry.category,
      source: 'ledger' as const,
    }));
}

export function buildActualLineItems(
  trip: TripDetail | null,
  ledgerEntries: LedgerEntry[] | null | undefined,
): BudgetActualLineItem[] {
  const fromTrip = trip ? extractCostLineItemsFromTrip(trip) : [];
  const fromLedger = ledgerEntries ? ledgerEntriesToLineItems(ledgerEntries) : [];
  return [...fromTrip, ...fromLedger].sort((a, b) => {
    const dateCmp = (a.date ?? '').localeCompare(b.date ?? '');
    if (dateCmp !== 0) return dateCmp;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}
