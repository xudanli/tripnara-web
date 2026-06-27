import type { LucideIcon } from 'lucide-react';
import { CalendarRange, Car, Users, Wallet } from 'lucide-react';
import { itineraryItemsApi, tripsApi } from '@/api/trips';
import { notifyPlanStudioConstraintsChanged } from '@/hooks/useConstraintsSummary';
import type { ConstraintFlexKey } from '@/lib/constraint-flexibility.util';
import type { ConstraintPendingKey } from '@/types/planning-constraints';
import { IntentTravelMode, type PacingConfig, type Traveler, type TripDetail } from '@/types/trip';

export interface ConstraintEditMeta {
  title: string;
  description: string;
  flexibilityHint: string;
  icon: LucideIcon;
}

export const PLANNING_CONSTRAINT_EDIT_META: Record<ConstraintPendingKey, ConstraintEditMeta> = {
  time_range: {
    title: '调整时间范围',
    description: '出发与返程日期决定行程天数，变更后需重新确认固化约束。',
    flexibilityHint: '日期通常为硬约束；若可微调，请在卡片上标记为「软」或「可协商」。',
    icon: CalendarRange,
  },
  budget: {
    title: '调整预算上限',
    description: '总预算用于门控与可执行性评估，保存后将同步约束摘要。',
    flexibilityHint: '预算上限默认可协商；可在卡片上切换硬 / 软 / 可协商。',
    icon: Wallet,
  },
  travelers: {
    title: '调整出行人数',
    description: '规划与预算按此人数计算。邀请同行者请在「同行者」Tab 管理。',
    flexibilityHint: '人数变更可能影响团队协商；可在卡片上标记约束弹性。',
    icon: Users,
  },
  transport: {
    title: '调整基础交通',
    description: '默认出行方式影响路线评估与时间轴交通计算。',
    flexibilityHint: '若行程中混用多种交通，可选「混合」；与时间轴不一致时请改此处或调整日程。',
    icon: Car,
  },
};

export type ConstraintTransportValue = IntentTravelMode | 'WALKING';

export const CONSTRAINT_TRANSPORT_OPTIONS: Array<{ value: ConstraintTransportValue; label: string }> = [
  { value: IntentTravelMode.DRIVING, label: '自驾' },
  { value: IntentTravelMode.PUBLIC_TRANSIT, label: '公共交通' },
  { value: IntentTravelMode.MIXED, label: '混合' },
  { value: 'WALKING', label: '步行' },
];

export function resolveConstraintTransportValue(trip: TripDetail | null | undefined): ConstraintTransportValue | '' {
  const mode = trip?.pacingConfig?.travelMode;
  if (mode === IntentTravelMode.DRIVING) return IntentTravelMode.DRIVING;
  if (mode === IntentTravelMode.PUBLIC_TRANSIT) return IntentTravelMode.PUBLIC_TRANSIT;
  if (mode === IntentTravelMode.MIXED) return IntentTravelMode.MIXED;
  if (mode === 'WALKING' || String(mode).toUpperCase() === 'WALKING') return 'WALKING';

  const hint = (trip?.pacingConfig as { transport?: string } | undefined)?.transport;
  if (hint?.trim().toLowerCase() === 'walk' || hint?.trim().toLowerCase() === 'walking') {
    return 'WALKING';
  }
  return '';
}

export async function saveConstraintTravelers(
  tripId: string,
  trip: TripDetail,
  count: number,
): Promise<void> {
  const travelers: Traveler[] = Array.from({ length: count }, () => ({
    type: 'ADULT',
    mobilityTag: 'CITY_POTATO',
  }));

  await tripsApi.update(tripId, {
    pacingConfig: {
      ...(trip.pacingConfig ?? { travelers: [] }),
      travelers,
    },
  } as Parameters<typeof tripsApi.update>[1] & { pacingConfig?: PacingConfig });

  notifyPlanStudioConstraintsChanged(tripId, 'team');
}

export async function saveConstraintTransport(
  tripId: string,
  trip: TripDetail,
  mode: ConstraintTransportValue,
): Promise<void> {
  const pacingBase = {
    level: trip.pacingConfig?.level ?? ('standard' as const),
    maxDailyActivities: trip.pacingConfig?.maxDailyActivities,
  };

  await tripsApi.updateIntent(tripId, {
    pacingConfig: {
      ...pacingBase,
      travelMode: mode as IntentTravelMode,
    },
  });

  notifyPlanStudioConstraintsChanged(tripId, 'transport');
}

export async function saveConstraintTimeRange(
  tripId: string,
  startDate: string,
  endDate: string,
  name?: string,
): Promise<void> {
  await tripsApi.update(tripId, {
    ...(name !== undefined ? { name } : {}),
    startDate: `${startDate}T00:00:00.000Z`,
    endDate: `${endDate}T00:00:00.000Z`,
  });

  try {
    const fixRes = await itineraryItemsApi.fixDates(tripId);
    if (fixRes.fixedCount > 0) {
      return;
    }
  } catch {
    /* fixDates optional */
  }

  notifyPlanStudioConstraintsChanged(tripId, 'dates');
}

export function constraintKeyToFlexKey(key: ConstraintPendingKey): ConstraintFlexKey {
  return key;
}
