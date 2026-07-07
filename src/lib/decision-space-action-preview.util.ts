import { formatIsoDateTimesInDisplayText } from '@/components/plan-studio/workbench/workbench-format.util';
import { parseTradeoffComparisonSegments } from '@/lib/decision-space-option-view.util';
import {
  extractItineraryDiffFromDecisionPreview,
  resolveScheduleNavigationFromDecisionPreview,
} from '@/lib/decision-space-itinerary-diff.util';
import type { PlanStudioScheduleNavigateDetail } from '@/lib/plan-studio-schedule-navigation';
import type { GatewayDecisionPreviewResult } from '@/lib/unified-gateway-response.util';
import type { DecisionOption, DecisionTradeoffRow } from '@/types/decision-problem';
import type { ItineraryDiffEntry } from '@/types/feasibility-repair';
import type { DecisionAction } from '@/types/unified-decision';

export interface DecisionSpaceActionPreviewView {
  summary?: string;
  comparison?: { before: string; after: string };
  mutationLines: string[];
  supportPct?: number;
  itineraryDiff: ItineraryDiffEntry[];
  scheduleNavigation: PlanStudioScheduleNavigateDetail | null;
}

function readPreviewSummary(preview: GatewayDecisionPreviewResult): string | undefined {
  const record = preview as GatewayDecisionPreviewResult & {
    impactSummary?: string;
    description?: string;
  };
  return (
    record.impactSummary?.trim() ||
    record.description?.trim() ||
    undefined
  );
}

function comparisonFromTradeoffs(
  tradeoffs: DecisionTradeoffRow[] | undefined,
): { before: string; after: string } | undefined {
  if (!tradeoffs?.length) return undefined;
  for (const row of tradeoffs) {
    const segments = parseTradeoffComparisonSegments(row.explanation);
    if (segments) return segments;
  }
  return undefined;
}

function mutationLinesFromPreview(
  preview: GatewayDecisionPreviewResult,
  displayTimezone?: string,
): string[] {
  const ops = preview.proposedMutations?.operations ?? [];
  return ops
    .map((op) =>
      formatIsoDateTimesInDisplayText(
        op.description?.trim() || op.label?.trim(),
        displayTimezone,
      ),
    )
    .filter(Boolean)
    .slice(0, 4) as string[];
}

/** 从 tradeoffs 估算 AI 支持度（与方案卡一致，P2 降级展示） */
export function predictSupportPctFromTradeoffs(
  tradeoffs: DecisionTradeoffRow[] | undefined,
  isRecommended = false,
): number | undefined {
  if (!tradeoffs?.length) return undefined;
  const improves = tradeoffs.filter((t) => t.direction === 'IMPROVE').length;
  const worsens = tradeoffs.filter((t) => t.direction === 'WORSEN').length;
  const base = isRecommended ? 76 : 58;
  return Math.min(92, Math.max(38, base + improves * 7 - worsens * 5));
}

export function buildDecisionSpaceActionPreviewView(input: {
  preview?: GatewayDecisionPreviewResult | null;
  action?: DecisionAction | null;
  matchedOption?: DecisionOption | null;
  optionIndex?: number;
  displayTimezone?: string;
}): DecisionSpaceActionPreviewView | null {
  const { displayTimezone } = input;
  const tradeoffs = input.preview?.tradeoffs ?? input.matchedOption?.tradeoffs;
  const rawSummary =
    readPreviewSummary(input.preview ?? { optionId: input.action?.actionId ?? '' }) ||
    input.action?.expectedImpact?.trim() ||
    input.action?.summary?.trim();
  const summary = rawSummary
    ? formatIsoDateTimesInDisplayText(rawSummary, displayTimezone)
    : undefined;

  const comparison = comparisonFromTradeoffs(tradeoffs);
  const mutationLines = input.preview
    ? mutationLinesFromPreview(input.preview, displayTimezone)
    : [];
  const itineraryDiff = extractItineraryDiffFromDecisionPreview(input.preview);
  const scheduleNavigation = resolveScheduleNavigationFromDecisionPreview({
    preview: input.preview,
    itineraryDiff,
  });

  if (
    !summary &&
    !comparison &&
    mutationLines.length === 0 &&
    !tradeoffs?.length &&
    itineraryDiff.length === 0 &&
    !scheduleNavigation
  ) {
    return null;
  }

  const supportPct = predictSupportPctFromTradeoffs(
    tradeoffs,
    (input.optionIndex ?? 0) === 0,
  );

  return {
    summary,
    comparison,
    mutationLines,
    supportPct,
    itineraryDiff,
    scheduleNavigation,
  };
}

/** 中栏是否值得单独展示预览区（相对方案卡有增量信息） */
export function actionPreviewHasIncrementalContent(
  view: DecisionSpaceActionPreviewView | null | undefined,
): boolean {
  if (!view) return false;
  return Boolean(
    view.comparison ||
      view.mutationLines.length > 0 ||
      view.itineraryDiff.length > 0 ||
      view.scheduleNavigation,
  );
}
