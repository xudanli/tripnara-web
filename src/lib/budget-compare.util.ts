import type { OptionComparison, PlanSummary } from '@/api/planning-workbench';
import type {
  BudgetAllocations,
  BudgetCompareCategoryBreakdown,
  BudgetComparePlanInput,
  BudgetComparePlanResult,
  BudgetCompareRequest,
  BudgetCompareResponse,
  TripBudgetProfile,
} from '@/types/trip-budget';
import { allocationsToEvaluateBreakdown, normalizeBudgetAllocations } from '@/lib/trip-budget-normalize';

export interface BudgetComparisonRow {
  planId: string;
  label: string;
  estimatedCost: number;
  budgetUsagePercent: number;
  verdict: string;
  violationCount: number;
  topHotspot?: string | null;
  recommended: boolean;
  risk: 'low' | 'medium' | 'high';
  /** BFF cost 列文案（如 ¥9,500 · 95%） */
  costDisplayValue?: string;
  /** scores.cost — 越低越省 */
  costScore?: number;
  gateStatus?: string;
}

function estimateBreakdownFromTotal(
  total: number,
  ratios?: BudgetAllocations | null,
): BudgetCompareCategoryBreakdown {
  const base: BudgetAllocations = ratios ?? {
    transportation: 0.2,
    accommodation: 0.35,
    experience: 0.25,
    food: 0.15,
    other: 0.05,
  };
  const sum =
    base.transportation + base.accommodation + base.experience + base.food + base.other || 1;
  return allocationsToEvaluateBreakdown({
    transportation: (total * base.transportation) / sum,
    accommodation: (total * base.accommodation) / sum,
    experience: (total * base.experience) / sum,
    food: (total * base.food) / sum,
    other: (total * base.other) / sum,
  });
}

export function buildBudgetCompareRequest(
  tripId: string,
  currentPlanId: string | null,
  profile: TripBudgetProfile | null,
  planSummaries: PlanSummary[],
  isZh: boolean,
): BudgetCompareRequest | null {
  if (!profile?.intent?.total) return null;

  const ordered: PlanSummary[] = [];
  if (currentPlanId) {
    const current = planSummaries.find((item) => item.planId === currentPlanId);
    if (current) ordered.push(current);
    ordered.push(...planSummaries.filter((item) => item.planId !== currentPlanId));
  } else {
    ordered.push(...planSummaries);
  }

  const selected = ordered.slice(0, 3);
  if (selected.length === 0) return null;

  const structureRatios = profile.structure?.allocations ?? null;
  const plans: BudgetComparePlanInput[] = selected.map((summary, index) => {
    const isCurrent = summary.planId === currentPlanId;
    const estimatedCost = isCurrent
      ? (profile.actuals?.totalEstimated ?? summary.summary?.budget?.total ?? 0)
      : (summary.summary?.budget?.total ?? 0);
    const categoryBreakdown =
      isCurrent && profile.actuals?.categoryBreakdown
        ? allocationsToEvaluateBreakdown(
            normalizeBudgetAllocations(profile.actuals.categoryBreakdown),
          )
        : estimateBreakdownFromTotal(estimatedCost, structureRatios);

    const defaultLabel = isZh
      ? `方案 ${String.fromCharCode(65 + index)}`
      : `Plan ${String.fromCharCode(65 + index)}`;

    return {
      planId: summary.planId,
      label: isCurrent && index === 0 ? (isZh ? '方案 A（当前）' : 'Plan A (Current)') : defaultLabel,
      estimatedCost,
      categoryBreakdown,
    };
  });

  return { tripId, plans };
}

export function verdictToRisk(verdict: string): 'low' | 'medium' | 'high' {
  if (verdict === 'REJECT') return 'high';
  if (verdict === 'ALLOW') return 'low';
  return 'medium';
}

export function formatBudgetVerdict(verdict: string, isZh: boolean): string {
  const labels: Record<string, { zh: string; en: string }> = {
    ALLOW: { zh: '通过', en: 'Allow' },
    NEED_ADJUST: { zh: '需调整', en: 'Adjust' },
    NEED_CONFIRM: { zh: '待确认', en: 'Confirm' },
    REJECT: { zh: '拒绝', en: 'Reject' },
  };
  const entry = labels[verdict];
  if (entry) return isZh ? entry.zh : entry.en;
  return verdict;
}

export function mapCompareResponseToRows(
  response: BudgetCompareResponse | null,
  isZh: boolean,
): BudgetComparisonRow[] {
  if (response?.optionComparison) {
    return mapOptionComparisonToBudgetRows(response.optionComparison, isZh);
  }
  if (!response?.plans?.length) return [];
  return response.plans.map((plan: BudgetComparePlanResult) => ({
    planId: plan.planId,
    label: plan.label,
    estimatedCost: plan.estimatedCost,
    budgetUsagePercent: plan.budgetUsagePercent,
    verdict: plan.verdict,
    violationCount: plan.violationCount,
    topHotspot: plan.topHotspot,
    recommended: plan.planId === response.recommendedPlanId,
    risk: verdictToRisk(plan.verdict),
  }));
}

export function resolveRecommendedPlanId(
  optionComparison: OptionComparison | null | undefined,
  fallbackPlanId?: string | null,
): string | null {
  return (
    optionComparison?.budgetComparison?.recommendedPlanId ??
    optionComparison?.recommendation?.optionId ??
    fallbackPlanId ??
    null
  );
}

export function optionComparisonHasBudgetData(
  optionComparison: OptionComparison | null | undefined,
): boolean {
  return Boolean(optionComparison?.options?.some((entry) => entry.budget));
}

export function mapOptionComparisonToBudgetRows(
  optionComparison: OptionComparison | null | undefined,
  _isZh: boolean,
): BudgetComparisonRow[] {
  if (!optionComparison?.options?.length) return [];

  const recommendedId = resolveRecommendedPlanId(optionComparison);
  const gateByOption = new Map(
    (optionComparison.kernelGateEval?.optionDeltas ?? []).map((delta) => [delta.optionId, delta]),
  );

  return optionComparison.options.map((entry) => {
    const budget = entry.budget;
    const gate = gateByOption.get(entry.optionId);
    const verdict = budget?.verdict ?? gate?.gateStatus ?? 'UNKNOWN';
    const budgetUsagePercent =
      budget?.budgetUsagePercent ?? entry.scores?.cost ?? 0;

    return {
      planId: entry.optionId,
      label: entry.label ?? entry.optionId,
      estimatedCost: budget?.estimatedCost ?? 0,
      budgetUsagePercent,
      verdict,
      violationCount: gate?.violationCount ?? 0,
      topHotspot: budget?.topHotspot ?? null,
      costDisplayValue: budget?.costDisplayValue,
      costScore: entry.scores?.cost ?? budgetUsagePercent,
      gateStatus: gate?.gateStatus,
      recommended: entry.optionId === recommendedId,
      risk: verdictToRisk(verdict),
    };
  });
}

export function resolveBudgetComparisonRows(
  optionComparison: OptionComparison | null | undefined,
  compareResponse: BudgetCompareResponse | null,
  isZh: boolean,
): BudgetComparisonRow[] {
  if (optionComparisonHasBudgetData(optionComparison)) {
    return mapOptionComparisonToBudgetRows(optionComparison, isZh);
  }
  if (compareResponse?.optionComparison) {
    return mapOptionComparisonToBudgetRows(compareResponse.optionComparison, isZh);
  }
  return mapCompareResponseToRows(compareResponse, isZh);
}
