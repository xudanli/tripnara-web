import type { BudgetActualLineItem, BudgetAllocations, TripBudgetProfile, WalletMember } from '@/types/trip-budget';
import type { BudgetOptimizationSuggestion, UnpaidItem } from '@/types/trip';
import type { SplitConsensusData } from '@/types/trip-decision-profiling';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { STRUCTURE_CATEGORY_META } from '@/lib/trip-budget-structure';

export type BudgetViewMode = 'per_capita' | 'total';
export type BudgetHealthLevel = 'good' | 'caution' | 'critical';

export interface BudgetHotspot {
  id: string;
  name: string;
  dayLabel?: string;
  risk: 'high' | 'medium' | 'low';
  reason: string;
  amount?: number;
}

export interface BudgetDailyBucket {
  dayIndex: number;
  date?: string;
  dateLabel?: string;
  label: string;
  amount: number;
  dailyBudget?: number;
  overBudget: boolean;
}

export interface BudgetLineRow {
  id: string;
  date?: string;
  name: string;
  category?: keyof BudgetAllocations;
  participants?: number;
  plannedAmount: number;
  confidence?: number;
  status: 'calculated' | 'fluctuation' | 'unpaid' | 'actual';
  source: 'itinerary' | 'ledger' | 'unpaid';
  editable: boolean;
}

export function resolveMemberCount(profile: TripBudgetProfile | null): number {
  const fromWallet = profile?.wallet?.members?.length ?? 0;
  const fromRule = profile?.wallet?.paymentRule?.splitBase ?? 0;
  return Math.max(fromWallet, fromRule, 1);
}

/** Checker 分摊预览成员：wallet → split consensus simulation */
export function resolveCheckerMembers(
  walletMembers: WalletMember[],
  splitConsensus?: SplitConsensusData | null,
): WalletMember[] {
  if (walletMembers.length > 0) return walletMembers;

  const mode =
    splitConsensus?.lockedMode ??
    splitConsensus?.selectedMode ??
    splitConsensus?.recommendedMode;
  const simMembers =
    mode != null ? splitConsensus?.simulation?.byMode?.[mode]?.members : undefined;
  if (simMembers?.length) {
    return simMembers.map((member) => ({
      userId: member.userId,
      displayName: member.displayName,
    }));
  }

  if (splitConsensus?.confirmations?.length) {
    return splitConsensus.confirmations.map((member) => ({
      userId: member.userId,
      displayName: member.displayName,
    }));
  }

  return [];
}

export function scaleBudgetAmount(amount: number, memberCount: number, mode: BudgetViewMode): number {
  if (mode === 'per_capita' && memberCount > 1) {
    return amount / memberCount;
  }
  return amount;
}

export function scaleBudgetBreakdown(
  breakdown: BudgetAllocations,
  memberCount: number,
  mode: BudgetViewMode,
): BudgetAllocations {
  return {
    transportation: scaleBudgetAmount(breakdown.transportation, memberCount, mode),
    accommodation: scaleBudgetAmount(breakdown.accommodation, memberCount, mode),
    experience: scaleBudgetAmount(breakdown.experience, memberCount, mode),
    food: scaleBudgetAmount(breakdown.food, memberCount, mode),
    other: scaleBudgetAmount(breakdown.other, memberCount, mode),
  };
}

function asBudgetCategory(category?: string): keyof BudgetAllocations | undefined {
  if (!category) return undefined;
  const keys = new Set<keyof BudgetAllocations>([
    'transportation',
    'accommodation',
    'experience',
    'food',
    'other',
  ]);
  return keys.has(category as keyof BudgetAllocations)
    ? (category as keyof BudgetAllocations)
    : undefined;
}

export function computeBudgetHealth(
  usagePercent: number,
  bufferRate: number,
): { level: BudgetHealthLevel; labelZh: string; labelEn: string } {
  if (usagePercent >= 100 || bufferRate < 0) {
    return { level: 'critical', labelZh: '紧张', labelEn: 'Tight' };
  }
  if (usagePercent >= 85 || bufferRate < 5) {
    return { level: 'caution', labelZh: '需关注', labelEn: 'Watch' };
  }
  return { level: 'good', labelZh: '良好', labelEn: 'Good' };
}

export function buildCategoryChartData(
  breakdown: BudgetAllocations | undefined,
  currency: string,
) {
  if (!breakdown) return [];
  const keyMap: Record<keyof BudgetAllocations, 'accommodation' | 'transportation' | 'food' | 'activities' | 'other'> = {
    transportation: 'transportation',
    accommodation: 'accommodation',
    experience: 'activities',
    food: 'food',
    other: 'other',
  };

  return STRUCTURE_CATEGORY_META.map((meta) => ({
    key: keyMap[meta.key],
    name: meta.labelZh,
    value: breakdown[meta.key] ?? 0,
    currency,
  })).filter((row) => row.value > 0);
}

export function buildDailyBuckets(
  lineItems: BudgetActualLineItem[],
  intentTotal: number,
  dayCount: number,
  dailyBudget?: number,
  dayDates?: string[],
  isZh = true,
): BudgetDailyBucket[] {
  const byDate = new Map<string, number>();
  for (const item of lineItems) {
    if (!item.date) continue;
    byDate.set(item.date, (byDate.get(item.date) ?? 0) + (item.actual ?? item.estimated ?? 0));
  }

  const perDayBudget =
    dailyBudget && dailyBudget > 0
      ? dailyBudget
      : dayCount > 0 && intentTotal > 0
        ? intentTotal / dayCount
        : undefined;

  const sortedDates = [...byDate.keys()].sort();
  if (sortedDates.length === 0 && dayCount <= 0) return [];

  const count = Math.max(sortedDates.length, dayCount, dayDates?.length ?? 0, 1);
  const buckets: BudgetDailyBucket[] = [];

  for (let i = 0; i < count; i += 1) {
    const scheduledDate = dayDates?.[i];
    const date = scheduledDate ?? sortedDates[i];
    const amount = date ? (byDate.get(date) ?? 0) : 0;
    buckets.push({
      dayIndex: i + 1,
      date,
      dateLabel: date ? formatBucketDateLabelStatic(date, isZh) : undefined,
      label: isZh ? `Day ${i + 1}` : `Day ${i + 1}`,
      amount,
      dailyBudget: perDayBudget,
      overBudget: perDayBudget != null && perDayBudget > 0 && amount > perDayBudget * 1.1,
    });
  }

  return buckets;
}

function formatBucketDateLabelStatic(date: string, isZh: boolean): string | undefined {
  try {
    const parsed = parseISO(date.length > 10 ? date.slice(0, 10) : date);
    return format(parsed, 'M/d EEE', isZh ? { locale: zhCN } : undefined);
  } catch {
    return date.slice(5);
  }
}

export function buildLineRows(
  actualLineItems: BudgetActualLineItem[],
  unpaidItems: UnpaidItem[],
  memberCount: number,
): BudgetLineRow[] {
  const rows: BudgetLineRow[] = actualLineItems.map((item) => ({
    id: item.id,
    date: item.date,
    name: item.name,
    category: asBudgetCategory(item.category),
    participants: memberCount,
    plannedAmount: item.estimated ?? item.actual ?? 0,
    confidence: item.estimated != null ? 0.85 : undefined,
    status:
      item.actual != null && item.estimated != null && item.actual !== item.estimated
        ? 'fluctuation'
        : 'calculated',
    source: item.source,
    editable: item.source === 'itinerary',
  }));

  for (const item of unpaidItems) {
    rows.push({
      id: item.id,
      date: item.date,
      name: item.placeName ?? item.costNote ?? '未支付项',
      category: undefined,
      participants: memberCount,
      plannedAmount: item.estimatedCost ?? 0,
      status: 'unpaid',
      source: 'unpaid',
      editable: true,
    });
  }

  return rows.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

export function buildHotspots(
  profile: TripBudgetProfile | null,
  dailyBuckets: BudgetDailyBucket[],
  lineItems: BudgetActualLineItem[],
  isZh = true,
): BudgetHotspot[] {
  const hotspots: BudgetHotspot[] = [];
  const intentTotal = profile?.intent?.total ?? 0;
  const totalEstimated = profile?.actuals?.totalEstimated ?? 0;
  const hasEnoughActuals = hasMeaningfulBudgetActuals(intentTotal, totalEstimated);

  for (const bucket of dailyBuckets.filter((b) => b.overBudget)) {
    hotspots.push({
      id: `day-${bucket.dayIndex}`,
      name: bucket.label,
      dayLabel: bucket.label,
      risk: bucket.amount > (bucket.dailyBudget ?? 0) * 1.25 ? 'high' : 'medium',
      reason: isZh ? '当日预估超出日均预算' : 'Daily estimate exceeds daily budget',
      amount: bucket.amount,
    });
  }

  const vs = profile?.structureVsActual;
  if (vs && hasEnoughActuals) {
    for (const meta of STRUCTURE_CATEGORY_META) {
      const row = vs[meta.key];
      if (row && row.variancePercent > 25) {
        hotspots.push({
          id: `cat-${meta.key}`,
          name: meta.labelZh,
          risk: row.variancePercent > 40 ? 'high' : 'medium',
          reason: isZh ? '超出意愿分配' : 'Over allocation intent',
          amount: row.estimated,
        });
      }
    }
  }

  const expensive = [...lineItems]
    .filter((item) => (item.estimated ?? item.actual ?? 0) > 0)
    .sort((a, b) => (b.estimated ?? b.actual ?? 0) - (a.estimated ?? a.actual ?? 0))
    .slice(0, 2);

  for (const item of expensive) {
    if (hotspots.some((h) => h.id === item.id)) continue;
    const amount = item.estimated ?? item.actual ?? 0;
    if (amount <= 0 || !hasEnoughActuals) continue;

    const shareOfTotal = totalEstimated > 0 ? amount / totalEstimated : 0;
    const shareOfIntent = intentTotal > 0 ? amount / intentTotal : 0;
    // 避免仅录入少量费用时（如单笔 ¥100）误报「单项占比过高」
    if (shareOfTotal < 0.2 && shareOfIntent < 0.08) continue;

    hotspots.push({
      id: item.id,
      name: item.name,
      dayLabel: item.date ? item.date.slice(5) : undefined,
      risk: 'medium',
      reason: isZh ? '单项占比较高' : 'High single-item share',
      amount,
    });
  }

  return hotspots;
}

/** 已录入预估是否足以做占比/结构偏差类判断（默认 ≥ L1 的 5%） */
export function hasMeaningfulBudgetActuals(
  intentTotal: number,
  totalEstimated: number,
  minFillRatio = 0.05,
): boolean {
  if (totalEstimated <= 0) return false;
  if (intentTotal <= 0) return true;
  return totalEstimated >= intentTotal * minFillRatio;
}

export type BudgetSuggestionTone = 'save' | 'experience' | 'group';

export interface BudgetSuggestion {
  id: string;
  message: string;
  savings: number;
  itemName?: string;
  tone: BudgetSuggestionTone;
  /** evaluate optimizations[].id — 可调用 apply-optimization */
  optimizationId?: string;
}

export interface BudgetPriceEvidence {
  fxRate?: string;
  tickets?: string;
  carRental?: string;
  allocationSummary?: string;
  updatedLabel?: string;
}

export function mapOptimizationsToSuggestions(items: BudgetOptimizationSuggestion[]): BudgetSuggestion[] {
  return items.map((item, index) => ({
    id: item.itemId ?? `opt-${index}`,
    message: item.message,
    savings: item.estimatedSavings,
    itemName: item.itemName,
    tone:
      item.estimatedSavings > 0
        ? 'save'
        : index % 3 === 1
          ? 'experience'
          : 'group',
  }));
}
