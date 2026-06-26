import type { PlanState } from '@/api/planning-workbench';
import type { TripDetail } from '@/types/trip';
import type { ConstraintDSL, GenerateMultiplePlansRequest } from '@/types/constraints';

function normalizeDateKey(date: string): string {
  return date.includes('T') ? date.split('T')[0] : date;
}

/** 从行程构建 Constraint DSL（至少包含日期窗口） */
export function buildPlanVariantsConstraintDSL(trip: TripDetail): ConstraintDSL {
  const constraints: ConstraintDSL = {
    hard_constraints: {},
    soft_constraints: {},
  };

  if (trip.startDate && trip.endDate) {
    constraints.hard_constraints.date_window = {
      start: normalizeDateKey(trip.startDate),
      end: normalizeDateKey(trip.endDate),
      flexible: false,
    };
  }

  const budgetMax = trip.budgetConfig?.totalBudget ?? trip.totalBudget;
  if (budgetMax != null && budgetMax > 0) {
    constraints.hard_constraints.budget = {
      max: budgetMax,
      currency: trip.budgetConfig?.currency || 'CNY',
      flexible: false,
    };
  }

  const paceLevel = trip.pacingConfig?.level;
  if (paceLevel) {
    const paceMap: Record<string, 'relaxed' | 'moderate' | 'intense'> = {
      relaxed: 'relaxed',
      standard: 'moderate',
      tight: 'intense',
    };
    constraints.soft_constraints.pace = {
      preference: paceMap[paceLevel] ?? 'moderate',
      weight: 0.8,
    };
  }

  return constraints;
}

/** 决策引擎 state：优先 workbench PlanState，否则从行程日程拼装 */
export function buildPlanVariantsState(
  trip: TripDetail,
  planState?: PlanState | null,
): Record<string, unknown> {
  const durationDays =
    trip.TripDay?.length ?? trip.statistics?.totalDays ?? 0;

  const context = {
    destination: trip.destination,
    startDate: normalizeDateKey(trip.startDate),
    endDate: normalizeDateKey(trip.endDate),
    durationDays,
    preferences: trip.pacingConfig ?? {},
    budget: {
      total: trip.totalBudget,
      currency: trip.budgetConfig?.currency ?? 'CNY',
    },
  };

  const candidatesByDate: Record<string, unknown[]> = {};
  for (const day of trip.TripDay ?? []) {
    const dateKey = normalizeDateKey(day.date);
    candidatesByDate[dateKey] =
      day.ItineraryItem?.map((item) => ({
        id: item.id,
        type: item.type,
        placeId: item.Place?.id,
        title: item.Place?.nameCN ?? item.Place?.nameEN ?? item.type,
      })) ?? [];
  }

  const planFromTrip = {
    version: '1.0',
    days: (trip.TripDay ?? []).map((day, index) => ({
      dayIndex: index + 1,
      date: normalizeDateKey(day.date),
      theme: day.theme,
      items: day.ItineraryItem ?? [],
    })),
  };

  if (planState) {
    return {
      tripId: trip.id,
      plan_id: planState.plan_id,
      plan_version: planState.plan_version,
      status: planState.status,
      context,
      candidatesByDate,
      itinerary: planState.itinerary ?? planFromTrip,
      plan: planState.itinerary ?? planFromTrip,
      mobility: planState.mobility,
      budget: planState.budget,
      pace: planState.pace,
      gate: planState.gate,
      constraints: planState.constraints,
      world: planState.world,
      metadata: planState.metadata,
    };
  }

  const constraints = buildPlanVariantsConstraintDSL(trip);

  return {
    tripId: trip.id,
    context,
    candidatesByDate,
    plan: planFromTrip,
    itinerary: planFromTrip,
    policies: {
      constraintDSL: constraints,
    },
  };
}

export function buildGenerateMultiplePlansRequest(
  trip: TripDetail,
  planState?: PlanState | null,
): GenerateMultiplePlansRequest {
  const constraints = buildPlanVariantsConstraintDSL(trip);
  const state = buildPlanVariantsState(trip, planState);

  if (!trip.startDate || !trip.endDate) {
    throw new Error('行程缺少出发或结束日期，无法生成方案');
  }
  if (!trip.TripDay?.length) {
    throw new Error('行程日程为空，请先完善时间轴后再生成方案');
  }

  return {
    tripId: trip.id,
    state,
    constraints,
    count: 3,
  };
}
