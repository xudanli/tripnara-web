import type { ComparePlansResponse, ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';
import { pickWorkbenchOptionComparison } from '@/api/planning-workbench';
import type { TripDetail } from '@/types/trip';
import { extractPlanItems, humanizeWorkbenchDisplayText } from '@/lib/planning-workbench-ux.util';
import { resolvePlanGateDisplayMetrics } from '@/lib/normalize-plan-gate.util';
import { readPlanStateExecutabilityScore } from '@/hooks/usePlanGateFeasibility';
import { formatCurrency } from '@/utils/format';
import { getGateStatusLabel, normalizeGateStatus } from '@/lib/gate-status';

export interface PlanGateCompareSideMetrics {
  label: string;
  itemCount: number;
  dayCount: number;
  budget: number | null;
  gateStatus: string | null;
  executabilityScore: number | null;
  fatigueScore: number | null;
}

export interface PlanGateCompareMetricRow {
  id: string;
  label: string;
  baselineLabel: string;
  baselineValue: string;
  draftLabel: string;
  draftValue: string;
  delta?: string;
  tone?: 'good' | 'bad' | 'neutral';
}

export function buildPlanGateTripBaselineMetrics(trip: TripDetail | null): PlanGateCompareSideMetrics {
  const itemCount =
    trip?.TripDay?.reduce((sum, day) => sum + (day.ItineraryItem?.length ?? 0), 0) ?? 0;
  return {
    label: '当前时间轴',
    itemCount,
    dayCount: trip?.TripDay?.length ?? 0,
    budget: trip?.totalBudget ?? null,
    gateStatus: null,
    executabilityScore: null,
    fatigueScore: null,
  };
}

export function buildPlanGateDraftMetrics(result: ExecutePlanningWorkbenchResponse): PlanGateCompareSideMetrics {
  const planItems = extractPlanItems(result.planState);
  const optionComparison = pickWorkbenchOptionComparison([result]);
  const recommendedOption =
    optionComparison?.options?.find(
      (o) => o.optionId === optionComparison.recommendation?.optionId,
    ) ?? optionComparison?.options?.[0];

  const dayIndexes = new Set<number>();
  for (const item of planItems) {
    if (item && typeof item === 'object') {
      const dayIndex = (item as { dayIndex?: number }).dayIndex;
      if (typeof dayIndex === 'number') dayIndexes.add(dayIndex);
    }
  }

  const planGateMetrics = resolvePlanGateDisplayMetrics(result.uiOutput.planGate);
  const metadataScore = readPlanStateExecutabilityScore(result.planState);

  return {
    label: `方案草案 A${result.planState.plan_version ?? '—'}`,
    itemCount: planItems.length,
    dayCount: dayIndexes.size || (result.planState.itinerary as { days?: unknown[] })?.days?.length || 0,
    budget:
      result.planState.budget?.total ??
      result.uiOutput.budgetPreview?.totalEstimate ??
      recommendedOption?.budget?.estimatedCost ??
      null,
    gateStatus: result.uiOutput.consolidatedDecision?.status ?? null,
    executabilityScore:
      planGateMetrics?.executability ??
      metadataScore ??
      recommendedOption?.scores?.executability ??
      null,
    fatigueScore: recommendedOption?.scores?.fatigue ?? null,
  };
}

function formatScore(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return String(Math.round(value));
}

export function buildPlanGateCompareMetricRows(
  baseline: PlanGateCompareSideMetrics,
  draft: PlanGateCompareSideMetrics,
  currency = 'CNY',
): PlanGateCompareMetricRow[] {
  const rows: PlanGateCompareMetricRow[] = [
    {
      id: 'feasibility',
      label: '可执行性',
      baselineLabel: baseline.label,
      baselineValue: formatScore(baseline.executabilityScore),
      draftLabel: draft.label,
      draftValue: formatScore(draft.executabilityScore),
      delta:
        baseline.executabilityScore != null && draft.executabilityScore != null
          ? `${draft.executabilityScore - baseline.executabilityScore >= 0 ? '+' : ''}${Math.round(draft.executabilityScore - baseline.executabilityScore)}`
          : undefined,
      tone:
        baseline.executabilityScore != null && draft.executabilityScore != null
          ? draft.executabilityScore >= baseline.executabilityScore
            ? 'good'
            : 'bad'
          : 'neutral',
    },
    {
      id: 'budget',
      label: '总预算',
      baselineLabel: baseline.label,
      baselineValue: baseline.budget != null ? formatCurrency(baseline.budget, currency) : '—',
      draftLabel: draft.label,
      draftValue: draft.budget != null ? formatCurrency(draft.budget, currency) : '—',
      delta:
        baseline.budget != null && draft.budget != null
          ? formatCurrency(draft.budget - baseline.budget, currency)
          : undefined,
      tone:
        baseline.budget != null && draft.budget != null
          ? draft.budget <= baseline.budget
            ? 'good'
            : 'bad'
          : 'neutral',
    },
    {
      id: 'items',
      label: '行程项',
      baselineLabel: baseline.label,
      baselineValue: String(baseline.itemCount),
      draftLabel: draft.label,
      draftValue: String(draft.itemCount),
      delta:
        draft.itemCount !== baseline.itemCount
          ? `${draft.itemCount - baseline.itemCount >= 0 ? '+' : ''}${draft.itemCount - baseline.itemCount}`
          : undefined,
      tone: 'neutral',
    },
    {
      id: 'days',
      label: '影响天数',
      baselineLabel: baseline.label,
      baselineValue: `${baseline.dayCount} 天`,
      draftLabel: draft.label,
      draftValue: `${draft.dayCount} 天`,
      delta:
        draft.dayCount !== baseline.dayCount
          ? `${draft.dayCount - baseline.dayCount >= 0 ? '+' : ''}${draft.dayCount - baseline.dayCount} 天`
          : undefined,
      tone: 'neutral',
    },
    {
      id: 'gate',
      label: '综合状态',
      baselineLabel: baseline.label,
      baselineValue: baseline.gateStatus
        ? getGateStatusLabel(normalizeGateStatus(baseline.gateStatus))
        : '正式版',
      draftLabel: draft.label,
      draftValue: draft.gateStatus
        ? getGateStatusLabel(normalizeGateStatus(draft.gateStatus))
        : '—',
      tone: 'neutral',
    },
    {
      id: 'fatigue',
      label: '节奏负荷',
      baselineLabel: baseline.label,
      baselineValue: formatScore(baseline.fatigueScore),
      draftLabel: draft.label,
      draftValue: formatScore(draft.fatigueScore),
      delta:
        baseline.fatigueScore != null && draft.fatigueScore != null
          ? `${draft.fatigueScore - baseline.fatigueScore >= 0 ? '+' : ''}${Math.round(draft.fatigueScore - baseline.fatigueScore)}`
          : undefined,
      tone:
        baseline.fatigueScore != null && draft.fatigueScore != null
          ? draft.fatigueScore <= baseline.fatigueScore
            ? 'good'
            : 'bad'
          : 'neutral',
    },
  ];

  return rows;
}

export function buildPlanGateChangeList(
  result: ExecutePlanningWorkbenchResponse,
  compareResult?: ComparePlansResponse | null,
): string[] {
  const items: string[] = [];
  const seen = new Set<string>();

  const push = (text?: string) => {
    const normalized = humanizeWorkbenchDisplayText(text) || text?.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    items.push(normalized);
  };

  for (const step of result.uiOutput.consolidatedDecision?.nextSteps ?? []) {
    push(step);
  }

  for (const diff of compareResult?.differences ?? []) {
    push(diff.description ?? `${diff.field}: ${diff.plan1Value} → ${diff.plan2Value}`);
  }

  for (const rec of compareResult?.summary?.recommendations ?? []) {
    push(rec);
  }

  const optionComparison = pickWorkbenchOptionComparison([result]);
  for (const option of optionComparison?.options ?? []) {
    for (const tradeoff of option.tradeoffs ?? []) {
      push(tradeoff);
    }
  }

  return items.slice(0, 12);
}
