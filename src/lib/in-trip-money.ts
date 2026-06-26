import type { NudgeType, PsychologicalBucket, RebalanceScenario } from '@/types/in-trip-money';

export const IN_TRIP_MONEY_CATEGORIES = [
  { value: 'dining', label: '餐饮' },
  { value: 'transport', label: '交通' },
  { value: 'accommodation', label: '住宿' },
  { value: 'activities', label: '体验/活动' },
  { value: 'shopping', label: '购物' },
  { value: 'emergency', label: '应急' },
  { value: 'other', label: '其他' },
] as const;

export const IN_TRIP_CURRENCY_OPTIONS = ['CNY', 'ISK', 'USD', 'EUR', 'GBP', 'JPY'] as const;

export function bucketUsageBarClass(usagePercent: number): string {
  if (usagePercent >= 100) return 'bg-red-500';
  if (usagePercent >= 85) return 'bg-amber-400';
  return 'bg-emerald-500';
}

export function bucketUsageTextClass(usagePercent: number): string {
  if (usagePercent >= 100) return 'text-red-700';
  if (usagePercent >= 85) return 'text-amber-700';
  return 'text-muted-foreground';
}

export function nudgeTypeLabel(type: NudgeType): string {
  switch (type) {
    case 'progress_bar':
      return '节奏提示';
    case 'reference_point':
      return '金额对照';
    case 'cooling_off':
      return '冷静期';
    case 'fomo_hedge':
      return '冲动提醒';
  }
}

export function nudgeTypeClasses(type: NudgeType): string {
  switch (type) {
    case 'progress_bar':
      return 'border-sky-200 bg-sky-50 text-sky-900';
    case 'reference_point':
      return 'border-violet-200 bg-violet-50 text-violet-900';
    case 'cooling_off':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'fomo_hedge':
      return 'border-rose-200 bg-rose-50 text-rose-900';
  }
}

export function rebalanceScenarioLabel(scenario: RebalanceScenario): string {
  switch (scenario) {
    case 'surplus':
      return '预算结余';
    case 'overspend':
      return '超支调剂';
    case 'pace_gap':
      return '节奏差异';
  }
}

export function psychologicalBucketLabel(bucket: PsychologicalBucket): string {
  const labels: Record<PsychologicalBucket, string> = {
    transportation: '交通',
    accommodation: '住宿',
    experience: '体验',
    food: '餐饮',
    other: '其他',
    contingency: '应急',
  };
  return labels[bucket];
}
