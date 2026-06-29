import type { BudgetGateStatus } from '@/types/trip-budget';
import type { BudgetWorkbenchPriceEvidence } from '@/types/trip-budget';
import type {
  BudgetEvaluationEvidence,
  BudgetEvaluationHotspot,
  BudgetEvaluationOptimization,
  BudgetEvaluationResponse,
  BudgetRecommendation,
  BudgetViolation,
} from '@/types/trip';
import type { BudgetHotspot, BudgetSuggestion, BudgetPriceEvidence } from '@/components/budget/workbench/budget-planning.util';
import { hasMeaningfulBudgetActuals } from '@/components/budget/workbench/budget-planning.util';

const CATEGORY_LABEL_ZH: Record<string, string> = {
  transportation: '交通',
  accommodation: '住宿',
  food: '餐饮',
  experience: '活动',
  activities: '活动',
  other: '其他',
};

/** 过滤 evaluate 占位热点（仅有 risk、缺 name/reason/amount） */
export function isDisplayableHotspot(spot: BudgetHotspot): boolean {
  if (spot.name?.trim()) return true;
  if (spot.reason?.trim()) return true;
  if (spot.amount != null && Number.isFinite(spot.amount)) return true;
  return false;
}

export function mapEvaluationToGateStatus(
  evaluation: BudgetEvaluationResponse | null | undefined,
): BudgetGateStatus | null {
  if (!evaluation) return null;
  const verdict =
    evaluation.verdict === 'NEED_ADJUST'
      ? 'NEED_CONFIRM'
      : evaluation.verdict;
  return {
    verdict: verdict as BudgetGateStatus['verdict'],
    message: evaluation.reason,
  };
}

export function mapViolationsToHotspots(
  violations: BudgetViolation[] | undefined,
  isZh: boolean,
): BudgetHotspot[] {
  if (!violations?.length) return [];
  return violations.map((item, index) => ({
    id: `eval-violation-${item.category}-${index}`,
    name: isZh
      ? CATEGORY_LABEL_ZH[item.category] ?? item.category
      : item.category,
    risk: item.percentage >= 40 ? 'high' : item.percentage >= 20 ? 'medium' : 'low',
    reason: isZh
      ? `超出 ${item.percentage.toFixed(1)}%`
      : `Over by ${item.percentage.toFixed(1)}%`,
    amount: item.exceeded,
  }));
}

export function mapEvaluationHotspots(
  hotspots: BudgetEvaluationHotspot[] | undefined,
): BudgetHotspot[] {
  if (!hotspots?.length) return [];
  return hotspots
    .map((item, index) => ({
      id: item.id ?? `eval-hotspot-${index}`,
      name: item.name?.trim() ?? '',
      dayLabel: item.dayLabel,
      risk: item.risk ?? 'medium',
      reason: item.reason?.trim() ?? '',
      amount: item.amount,
    }))
    .filter(isDisplayableHotspot);
}

export function resolveEvaluationHotspots(
  evaluation: BudgetEvaluationResponse | null | undefined,
  isZh: boolean,
  context?: { intentTotal?: number; totalEstimated?: number },
): BudgetHotspot[] {
  const fromHotspots = mapEvaluationHotspots(evaluation?.hotspots);
  if (fromHotspots.length > 0) return fromHotspots;

  const intentTotal = context?.intentTotal ?? 0;
  const totalEstimated = context?.totalEstimated ?? 0;
  if (!hasMeaningfulBudgetActuals(intentTotal, totalEstimated)) {
    return [];
  }

  return mapViolationsToHotspots(evaluation?.violations, isZh);
}

export function mapRecommendationsToSuggestions(
  recommendations: BudgetRecommendation[] | undefined,
): BudgetSuggestion[] {
  if (!recommendations?.length) return [];
  return recommendations.map((item, index) => ({
    id: `eval-rec-${index}`,
    message: [item.action, item.impact].filter(Boolean).join(' · '),
    savings: item.estimatedSavings,
    tone: item.estimatedSavings > 0 ? 'save' : 'group',
  }));
}

export function mapOptimizationsToSuggestions(
  optimizations: BudgetEvaluationOptimization[] | undefined,
): BudgetSuggestion[] {
  if (!optimizations?.length) return [];
  return optimizations.map((item) => ({
    id: item.id,
    optimizationId: item.id,
    message:
      item.message ??
      [item.type, item.itemName].filter(Boolean).join(' · '),
    savings: item.estimatedSavings,
    itemName: item.itemName,
    tone: item.estimatedSavings > 0 ? 'save' : 'group',
  }));
}

export function resolveEvaluationSuggestions(
  evaluation: BudgetEvaluationResponse | null | undefined,
): BudgetSuggestion[] {
  const fromOptimizations = mapOptimizationsToSuggestions(evaluation?.optimizations);
  if (fromOptimizations.length > 0) return fromOptimizations;
  return mapRecommendationsToSuggestions(evaluation?.recommendations);
}

export function mapEvidenceForDisplay(
  evidence: BudgetEvaluationEvidence[] | undefined,
): Array<{ id: string; title: string; body: string; source?: string }> {
  if (!evidence?.length) return [];
  return evidence.map((item) => ({
    id: item.id,
    title: item.title ?? item.label ?? item.kind ?? item.id,
    body: item.excerpt ?? item.value ?? '',
    source: item.source,
  }));
}

export function collectOptimizationIds(
  evaluation: BudgetEvaluationResponse | null | undefined,
): string[] {
  return (evaluation?.optimizations ?? []).map((item) => item.id).filter(Boolean);
}

export function mapPriceEvidenceForChecker(
  raw?: BudgetWorkbenchPriceEvidence | null,
): BudgetPriceEvidence | undefined {
  if (!raw) return undefined;
  return {
    fxRate: raw.fxRate,
    tickets: raw.tickets ?? raw.allocationSummary,
    carRental: raw.carRental ?? raw.structureSummary,
    updatedLabel: raw.updatedLabel ?? raw.updatedAt,
    allocationSummary: raw.allocationSummary,
  };
}

export function resolveEvaluationEvidence(
  detailsEvidence: BudgetEvaluationEvidence[] | undefined,
  evaluationEvidence: BudgetEvaluationEvidence[] | undefined,
) {
  const source = detailsEvidence?.length ? detailsEvidence : evaluationEvidence;
  return mapEvidenceForDisplay(source);
}

export function resolveOptimizationIds(
  detailsOptimizations: BudgetEvaluationOptimization[] | undefined,
  evaluation: BudgetEvaluationResponse | null | undefined,
): string[] {
  if (detailsOptimizations?.length) {
    return detailsOptimizations.map((item) => item.id).filter(Boolean);
  }
  return collectOptimizationIds(evaluation);
}

export function resolveEvaluationSuggestionsFromSources(
  detailsOptimizations: BudgetEvaluationOptimization[] | undefined,
  evaluation: BudgetEvaluationResponse | null | undefined,
): BudgetSuggestion[] {
  const fromDetails = mapOptimizationsToSuggestions(detailsOptimizations);
  if (fromDetails.length > 0) return fromDetails;
  return resolveEvaluationSuggestions(evaluation);
}
