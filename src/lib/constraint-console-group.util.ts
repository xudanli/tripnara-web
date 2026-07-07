import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';

export type HardConstraintGroupKey = 'TIME' | 'BUDGET' | 'TRANSPORT' | 'MEMBER' | 'PLACE' | 'RISK' | 'OTHER';

export interface HardConstraintGroup {
  key: HardConstraintGroupKey;
  label: string;
  items: ConstraintListEntry[];
}

const GROUP_LABELS: Record<HardConstraintGroupKey, string> = {
  TIME: '时间',
  BUDGET: '预算',
  TRANSPORT: '交通',
  MEMBER: '人员',
  PLACE: '地点与住宿',
  RISK: '风险',
  OTHER: '其他',
};

const GROUP_ORDER: HardConstraintGroupKey[] = [
  'TIME',
  'BUDGET',
  'TRANSPORT',
  'MEMBER',
  'PLACE',
  'RISK',
  'OTHER',
];

const ID_TO_GROUP: Record<string, HardConstraintGroupKey> = {
  time_range: 'TIME',
  daily_drive: 'TRANSPORT',
  max_segment_distance: 'TRANSPORT',
  c_max_segment_distance: 'TRANSPORT',
  transport: 'TRANSPORT',
  road_restrictions: 'TRANSPORT',
  budget: 'BUDGET',
  travelers: 'MEMBER',
  elderly_rest: 'MEMBER',
  must_go: 'PLACE',
  accommodation: 'PLACE',
  no_night_drive: 'RISK',
  c_no_night_drive: 'RISK',
  no_unpaved_road: 'RISK',
  no_bad_weather: 'RISK',
  no_high_risk_activity: 'RISK',
  no_unverified_route: 'RISK',
  elderly_walk_limit: 'MEMBER',
  child_nap_time: 'MEMBER',
  accessibility: 'MEMBER',
  dietary_restrictions: 'MEMBER',
  motion_sickness: 'MEMBER',
  avoid_activity_type: 'MEMBER',
  earliest_departure: 'TIME',
  latest_end: 'TIME',
  max_daily_activity: 'TIME',
  required_rest: 'TIME',
  fixed_appointments: 'TIME',
  activity_budget: 'BUDGET',
  budget_overrun_tolerance: 'BUDGET',
  allow_budget_overrun: 'BUDGET',
  max_daily_drive: 'TRANSPORT',
  c_max_daily_drive: 'TRANSPORT',
};

function resolveHardGroup(entry: ConstraintListEntry): HardConstraintGroupKey {
  if (entry.category === 'SAFETY' || entry.category === 'WORLD') return 'RISK';
  if (entry.category === 'TIME') return 'TIME';
  if (entry.category === 'BUDGET') return 'BUDGET';
  if (entry.category === 'TRANSPORT') return 'TRANSPORT';
  if (entry.category === 'MEMBER') return 'MEMBER';
  if (entry.category === 'PLACE' || entry.category === 'PACE') return 'PLACE';
  return ID_TO_GROUP[entry.id] ?? 'OTHER';
}

export function groupHardConstraints(items: ConstraintListEntry[]): HardConstraintGroup[] {
  const buckets = new Map<HardConstraintGroupKey, ConstraintListEntry[]>();
  for (const item of items) {
    const key = resolveHardGroup(item);
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }
  return GROUP_ORDER.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map((key) => ({
    key,
    label: GROUP_LABELS[key],
    items: buckets.get(key) ?? [],
  }));
}
