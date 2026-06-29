import type { BudgetAllocations, TripBudgetProfile } from '@/types/trip-budget';

/** API actuals / evaluate 使用 activities；L2 结构使用 experience */
export type ApiCategoryBreakdown = Partial<BudgetAllocations> & {
  activities?: number;
};

export function normalizeBudgetAllocations(raw: ApiCategoryBreakdown | null | undefined): BudgetAllocations {
  if (!raw) {
    return { transportation: 0, accommodation: 0, experience: 0, food: 0, other: 0 };
  }
  return {
    transportation: raw.transportation ?? 0,
    accommodation: raw.accommodation ?? 0,
    experience: raw.experience ?? raw.activities ?? 0,
    food: raw.food ?? 0,
    other: raw.other ?? 0,
  };
}

/** evaluate 请求体：L2 experience → activities */
export function allocationsToEvaluateBreakdown(allocations: BudgetAllocations) {
  return {
    transportation: allocations.transportation,
    accommodation: allocations.accommodation,
    food: allocations.food,
    activities: allocations.experience,
    other: allocations.other,
  };
}

export function normalizeBudgetProfile(profile: TripBudgetProfile): TripBudgetProfile {
  const next: TripBudgetProfile = { ...profile };

  if (profile.actuals?.categoryBreakdown) {
    next.actuals = {
      ...profile.actuals,
      categoryBreakdown: normalizeBudgetAllocations(
        profile.actuals.categoryBreakdown as ApiCategoryBreakdown,
      ),
    };
  }

  if (profile.structure?.allocations) {
    next.structure = {
      ...profile.structure,
      allocations: normalizeBudgetAllocations(
        profile.structure.allocations as ApiCategoryBreakdown,
      ),
    };
  }

  return next;
}
