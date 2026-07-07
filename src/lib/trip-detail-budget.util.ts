import type { BudgetConstraint } from '@/api/planning-workbench';
import { resolveTravelerCount } from '@/lib/planning-constraints.util';
import type {
  BudgetOptimizationSuggestion,
  BudgetStatisticsResponse,
  BudgetSummary,
  BudgetTrendsResponse,
  ItineraryItem,
  TripDetail,
} from '@/types/trip';

export type BudgetCategoryKey =
  | 'transportation'
  | 'accommodation'
  | 'activities'
  | 'food'
  | 'shopping'
  | 'other';

export type BudgetCategoryStatus = 'healthy' | 'controllable' | 'ample' | 'unused';

export interface BudgetCategoryRow {
  key: BudgetCategoryKey;
  label: string;
  budgetLimit: number;
  planned: number;
  percentOfTotal: number;
  status: BudgetCategoryStatus;
}

export interface BudgetStatusChip {
  id: string;
  label: string;
  detail?: string;
  tone: 'reject' | 'confirm' | 'suggest' | 'allow';
}

export interface BudgetAlertItem {
  id: string;
  title: string;
  subtitle: string;
  tone: 'reject' | 'confirm' | 'warning';
  icon: 'risk' | 'warning' | 'pending';
}

export interface BudgetOptimizationView {
  id: string;
  title: string;
  subtitle: string;
  savings: number;
  icon: 'accommodation' | 'activities' | 'food' | 'generic';
}

export interface BookingStats {
  overBudgetRiskCount: number;
  bookedCount: number;
  bookedAmount: number;
  pendingCount: number;
  pendingAmount: number;
  freeCancelCount: number;
}

export interface BudgetComparisonMetric {
  key: string;
  label: string;
  original: number;
  current: number;
  format: 'currency' | 'count';
}

export interface DailyBudgetRow {
  id: string;
  label: string;
  date: string;
  budget: number;
  planned: number;
  remaining: number;
  usagePercent: number;
}

const CATEGORY_KEYS: BudgetCategoryKey[] = [
  'transportation',
  'accommodation',
  'activities',
  'food',
  'shopping',
  'other',
];

const CATEGORY_LABELS: Record<BudgetCategoryKey, string> = {
  transportation: '交通',
  accommodation: '住宿',
  activities: '活动',
  food: '餐饮',
  shopping: '购物',
  other: '备用金',
};

function readCategoryPlanned(
  breakdown: BudgetSummary['categoryBreakdown'],
  key: BudgetCategoryKey,
): number {
  if (key === 'shopping') return 0;
  if (key === 'other') return breakdown.other ?? 0;
  return breakdown[key] ?? 0;
}

function readCategoryLimit(
  constraint: BudgetConstraint | null | undefined,
  key: BudgetCategoryKey,
  totalBudget: number,
): number {
  const limits = constraint?.categoryLimits;
  if (key === 'shopping') return 0;
  if (key === 'other') return limits?.other ?? Math.round(totalBudget * 0.05);
  const mapped = key as keyof NonNullable<BudgetConstraint['categoryLimits']>;
  return limits?.[mapped] ?? 0;
}

export function resolveCategoryStatus(planned: number, limit: number): BudgetCategoryStatus {
  if (planned <= 0) return 'unused';
  if (limit <= 0) return planned > 0 ? 'controllable' : 'unused';
  const ratio = planned / limit;
  if (ratio > 1) return 'controllable';
  if (ratio >= 0.8) return 'controllable';
  if (ratio <= 0.5) return 'ample';
  return 'healthy';
}

export function categoryStatusLabel(status: BudgetCategoryStatus): string {
  if (status === 'healthy') return '健康';
  if (status === 'controllable') return '可控';
  if (status === 'ample') return '充裕';
  return '未使用';
}

export function buildCategoryRows(
  budget: BudgetSummary,
  constraint: BudgetConstraint | null | undefined,
): BudgetCategoryRow[] {
  const totalBudget = budget.totalBudget || 1;
  return CATEGORY_KEYS.map((key) => {
    const planned = readCategoryPlanned(budget.categoryBreakdown, key);
    const budgetLimit = readCategoryLimit(constraint, key, totalBudget);
    const basis = budgetLimit > 0 ? budgetLimit : totalBudget;
    return {
      key,
      label: CATEGORY_LABELS[key],
      budgetLimit,
      planned,
      percentOfTotal: basis > 0 ? (planned / basis) * 100 : 0,
      status: resolveCategoryStatus(planned, budgetLimit),
    };
  });
}

export function computeRiskBuffer(
  totalBudget: number,
  constraint: BudgetConstraint | null | undefined,
): number {
  const explicit = constraint?.categoryLimits?.other;
  if (typeof explicit === 'number' && explicit > 0) return explicit;
  const threshold = constraint?.alertThreshold ?? 0.95;
  return Math.max(0, Math.round(totalBudget * (1 - threshold)));
}

export function computeUsagePercent(spent: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (spent / total) * 100);
}

export function resolveBudgetHealthLabel(
  statistics: BudgetStatisticsResponse | null | undefined,
  usagePercent: number,
): { label: string; description: string; tone: 'verified' | 'confirm' | 'allow' } {
  const risk = statistics?.riskLevel;
  if (risk === 'high' || usagePercent >= 95) {
    return { label: '需关注', description: '部分分类接近或超出预算上限', tone: 'confirm' };
  }
  if (risk === 'medium' || usagePercent >= 80) {
    return { label: '基本可控', description: '整体在可控范围内，建议关注高风险项', tone: 'allow' };
  }
  return { label: '健康可控', description: '整体在可控范围内', tone: 'verified' };
}

function isFreeCancellationItem(item: ItineraryItem): boolean {
  const note = item.note ?? '';
  const meta = item.metadata;
  if (/免费取消|free cancel/i.test(note)) return true;
  if (meta && typeof meta === 'object') {
    const flag = meta.freeCancellation ?? meta.freeCancel;
    return flag === true;
  }
  return false;
}

export function computeBookingStats(trip: TripDetail, budget: BudgetSummary): BookingStats {
  let bookedCount = 0;
  let bookedAmount = 0;
  let pendingCount = 0;
  let pendingAmount = 0;
  let freeCancelCount = 0;

  for (const day of trip.TripDay ?? []) {
    for (const item of day.ItineraryItem ?? []) {
      const amount = item.estimatedCost ?? item.actualCost ?? 0;
      if (item.bookingStatus === 'BOOKED') {
        bookedCount += 1;
        bookedAmount += amount;
      } else if (item.bookingStatus === 'NEED_BOOKING') {
        pendingCount += 1;
        pendingAmount += amount;
      }
      if (isFreeCancellationItem(item)) freeCancelCount += 1;
    }
  }

  const overBudgetRiskCount = budget.warnings.filter((w) => w.severity === 'error').length;

  return {
    overBudgetRiskCount,
    bookedCount,
    bookedAmount,
    pendingCount,
    pendingAmount,
    freeCancelCount,
  };
}

export function buildStatusChips(
  stats: BookingStats,
  formatAmount: (value: number) => string,
): BudgetStatusChip[] {
  return [
    {
      id: 'risk',
      label: '超预算风险',
      detail: `${stats.overBudgetRiskCount} 项`,
      tone: 'reject',
    },
    {
      id: 'booked',
      label: '已预定费用',
      detail: `${stats.bookedCount} 项 ${formatAmount(stats.bookedAmount)}`,
      tone: 'allow',
    },
    {
      id: 'pending',
      label: '待确认预订',
      detail: `${stats.pendingCount} 项 ${formatAmount(stats.pendingAmount)}`,
      tone: 'confirm',
    },
    {
      id: 'cancel',
      label: '可免费取消',
      detail: `${stats.freeCancelCount} 项`,
      tone: 'allow',
    },
  ];
}

export function buildBudgetAlerts(
  budget: BudgetSummary,
  categoryRows: BudgetCategoryRow[],
  dailyRows: DailyBudgetRow[],
  bookingStats: BookingStats,
  formatAmount: (value: number) => string,
): BudgetAlertItem[] {
  const alerts: BudgetAlertItem[] = [];

  for (const row of categoryRows) {
    if (row.budgetLimit > 0 && row.planned > row.budgetLimit) {
      alerts.push({
        id: `cat-${row.key}`,
        title: `${row.label}超预算风险`,
        subtitle: `当前已规划 ${formatAmount(row.planned)}，超出建议 ${formatAmount(row.planned - row.budgetLimit)}`,
        tone: 'reject',
        icon: 'risk',
      });
    }
  }

  const hotDay = [...dailyRows].sort((a, b) => b.usagePercent - a.usagePercent)[0];
  if (hotDay && hotDay.usagePercent >= 60) {
    alerts.push({
      id: `day-${hotDay.id}`,
      title: `${hotDay.label} 活动支出较高`,
      subtitle: `占当日预算 ${formatPercent(hotDay.usagePercent)}，建议优化`,
      tone: 'warning',
      icon: 'warning',
    });
  }

  if (bookingStats.pendingCount > 0) {
    alerts.push({
      id: 'pending-bookings',
      title: `${bookingStats.pendingCount}项待确认预订`,
      subtitle: `预计花费 ${formatAmount(bookingStats.pendingAmount)} 需尽快确认`,
      tone: 'confirm',
      icon: 'pending',
    });
  }

  for (const warning of budget.warnings) {
    const parts = warning.message.split(/[，,]/);
    alerts.push({
      id: `warning-${warning.type}-${warning.message}`,
      title: parts[0]?.trim() || warning.message,
      subtitle: parts.slice(1).join('，').trim() || warning.message,
      tone: warning.severity === 'error' ? 'reject' : 'warning',
      icon: warning.severity === 'error' ? 'risk' : 'warning',
    });
  }

  const seen = new Set<string>();
  return alerts.filter((alert) => {
    if (seen.has(alert.id)) return false;
    seen.add(alert.id);
    return true;
  });
}

function resolveOptimizationIcon(opt: BudgetOptimizationSuggestion): BudgetOptimizationView['icon'] {
  const blob = `${opt.message} ${opt.itemName ?? ''}`.toLowerCase();
  if (/住宿|酒店|hotel|accommodation|房源/.test(blob)) return 'accommodation';
  if (/活动|体验|activity|门票|套餐/.test(blob)) return 'activities';
  if (/餐饮|餐|food|dining|自助/.test(blob)) return 'food';
  return 'generic';
}

function resolveOptimizationTitle(opt: BudgetOptimizationSuggestion): string {
  const icon = resolveOptimizationIcon(opt);
  if (icon === 'accommodation') return '住宿可优化';
  if (icon === 'activities') return '活动组合优化';
  if (icon === 'food') return '餐饮预算偏高';
  return opt.itemName?.trim() || '预算可优化';
}

function resolveOptimizationSubtitle(
  opt: BudgetOptimizationSuggestion,
  formatAmount: (value: number) => string,
): string {
  const savings = opt.estimatedSavings ?? 0;
  if (savings <= 0) return opt.message;
  const icon = resolveOptimizationIcon(opt);
  if (icon === 'accommodation') return `更换酒店或房源预计节省 ${formatAmount(savings)}`;
  if (icon === 'activities') return `调整顺序或套餐预计节省 ${formatAmount(savings)}`;
  if (icon === 'food') return `选择超市/自助餐预计节省 ${formatAmount(savings)}`;
  return opt.message || `预计节省 ${formatAmount(savings)}`;
}

export function buildOptimizationViews(
  optimizations: BudgetOptimizationSuggestion[],
  formatAmount: (value: number) => string,
): BudgetOptimizationView[] {
  return optimizations.map((opt, index) => ({
    id: opt.id ?? opt.itemId ?? `opt-${index}`,
    title: resolveOptimizationTitle(opt),
    subtitle: resolveOptimizationSubtitle(opt, formatAmount),
    savings: opt.estimatedSavings ?? 0,
    icon: resolveOptimizationIcon(opt),
  }));
}

export function buildDailyBudgetRows(
  trends: BudgetTrendsResponse | null | undefined,
): DailyBudgetRow[] {
  if (!trends?.dailySpending?.length) return [];
  return trends.dailySpending.map((day, index) => {
    const budget = day.budget ?? 0;
    const planned = day.spent ?? 0;
    const remaining = Math.max(0, budget - planned);
    return {
      id: day.date,
      label: `Day ${index + 1}`,
      date: day.date,
      budget,
      planned,
      remaining,
      usagePercent: budget > 0 ? Math.min(100, (planned / budget) * 100) : 0,
    };
  });
}

export function buildComparisonMetrics(
  trip: TripDetail,
  budget: BudgetSummary,
  memberCount: number,
  stats: BookingStats,
): BudgetComparisonMetric[] {
  const originalTotal = trip.totalBudget ?? budget.totalBudget;
  const currentTotal = budget.totalBudget;
  const originalPerPerson = memberCount > 0 ? originalTotal / memberCount : originalTotal;
  const currentPerPerson = memberCount > 0 ? currentTotal / memberCount : currentTotal;

  return [
    { key: 'total', label: '总预算', original: originalTotal, current: currentTotal, format: 'currency' },
    {
      key: 'perPerson',
      label: '人均预算',
      original: originalPerPerson,
      current: currentPerPerson,
      format: 'currency',
    },
    {
      key: 'planned',
      label: '已规划预算',
      original: trip.statistics?.budgetUsed ?? budget.totalSpent,
      current: budget.totalSpent,
      format: 'currency',
    },
    {
      key: 'remaining',
      label: '预算余量',
      original: Math.max(0, originalTotal - (trip.statistics?.budgetUsed ?? 0)),
      current: budget.remaining,
      format: 'currency',
    },
    {
      key: 'risk',
      label: '超预算风险项',
      original: stats.overBudgetRiskCount,
      current: stats.overBudgetRiskCount,
      format: 'count',
    },
  ];
}

export function buildTrendChartData(trends: BudgetTrendsResponse | null | undefined) {
  if (!trends?.dailySpending?.length) return [];
  let cumulative = 0;
  return trends.dailySpending.map((day, index) => {
    cumulative += day.spent ?? 0;
    return {
      label: `Day ${index + 1}`,
      planned: cumulative,
      forecast: trends.forecast
        ? ((trends.forecast.projectedTotal ?? cumulative) / trends.dailySpending.length) * (index + 1)
        : cumulative * 1.05,
      budget: day.budget ?? 0,
    };
  });
}

export function resolveMemberCount(trip: TripDetail): number {
  return Math.max(1, resolveTravelerCount(trip));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function computeSavingsPercent(original: number, current: number): number | null {
  if (original <= 0) return null;
  return ((current - original) / original) * 100;
}
