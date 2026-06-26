import type { CostCategory } from '@/types/trip';
import type { BudgetAllocations, LedgerCategory } from '@/types/trip-budget';
import { STRUCTURE_CATEGORY_META } from '@/lib/trip-budget-structure';

export function ledgerCategoryToCostCategory(category: LedgerCategory): CostCategory {
  const meta = STRUCTURE_CATEGORY_META.find((m) => m.key === category);
  return meta?.costCategory ?? 'OTHER';
}

export function costCategoryToLedgerCategory(
  category: CostCategory | null | undefined,
): LedgerCategory {
  const meta = STRUCTURE_CATEGORY_META.find((m) => m.costCategory === category);
  return meta?.key ?? 'other';
}

export function defaultSplitMemberIds(
  members: Array<{ userId: string }>,
  currentUserId: string | undefined,
): string[] {
  if (members.length > 0) return members.map((m) => m.userId);
  if (currentUserId) return [currentUserId];
  return [];
}

export function ledgerCategoryOptions(isZh: boolean): Array<{
  key: LedgerCategory;
  label: string;
}> {
  return STRUCTURE_CATEGORY_META.filter((m) => m.key !== 'other').map((m) => ({
    key: m.key,
    label: isZh ? m.labelZh : m.labelEn,
  }));
}

export function formatLedgerCategoryLabel(key: LedgerCategory, isZh: boolean): string {
  const meta = STRUCTURE_CATEGORY_META.find((m) => m.key === key);
  if (!meta) return key;
  return isZh ? meta.labelZh : meta.labelEn;
}

/** 汇总 breakdown 增量（前端乐观更新用，optional） */
export function addToBreakdown(
  breakdown: BudgetAllocations,
  category: LedgerCategory,
  amount: number,
): BudgetAllocations {
  return { ...breakdown, [category]: (breakdown[category] ?? 0) + amount };
}
