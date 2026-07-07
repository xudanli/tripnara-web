import { formatIsoDateTimesInDisplayText } from '@/components/plan-studio/workbench/workbench-format.util';
import {
  formatTradeoffCell,
  tradeoffDimensionLabel,
} from '@/lib/decision-problem-display.util';
import type { GatewayDecisionPreviewResult } from '@/lib/unified-gateway-response.util';
import type {
  DecisionCheckerImpactDto,
  DecisionCheckerLabeledTone,
} from '@/types/decision-checker';
import type { DecisionTradeoffRow, TradeoffDimension } from '@/types/decision-problem';

function tradeoffDirectionTone(
  direction: DecisionTradeoffRow['direction'],
): DecisionCheckerLabeledTone | undefined {
  if (direction === 'IMPROVE') return 'good';
  if (direction === 'WORSEN') return 'bad';
  return undefined;
}

function formatPreviewText(text: string | undefined | null, displayTimezone?: string): string {
  return formatIsoDateTimesInDisplayText(text?.trim() ?? '', displayTimezone);
}

function summaryKeyForDimension(
  dimension: TradeoffDimension,
): keyof DecisionCheckerImpactDto['summary'] | null {
  switch (dimension) {
    case 'POI_COVERAGE':
      return 'experienceCompletion';
    case 'COST':
      return 'budgetImpact';
    case 'TIME':
      return 'affectedDays';
    default:
      return null;
  }
}

/** 将 POST preview 的 tradeoffs / mutations 合并进决策检查器影响 Tab */
export function mergePreviewIntoDecisionCheckerImpact(
  base: DecisionCheckerImpactDto,
  preview: GatewayDecisionPreviewResult | null | undefined,
  displayTimezone?: string,
): DecisionCheckerImpactDto {
  if (!preview) return base;

  const summary = { ...base.summary };
  const cascade = [...(base.cascade ?? [])];
  let order = cascade.length;

  for (const row of preview.tradeoffs ?? []) {
    const value = formatTradeoffCell(row);
    const tone = tradeoffDirectionTone(row.direction);
    const label = tradeoffDimensionLabel(row.dimension);
    const detail = row.explanation?.trim()
      ? formatPreviewText(row.explanation, displayTimezone)
      : undefined;
    const summaryKey = summaryKeyForDimension(row.dimension);

    if (summaryKey) {
      summary[summaryKey] = { label, value, tone, detail };
      continue;
    }

    cascade.push({
      id: `preview-tradeoff-${row.dimension}-${order}`,
      title: label,
      description: formatPreviewText(detail ?? row.explanation ?? value, displayTimezone),
      status:
        row.direction === 'WORSEN'
          ? 'at_risk'
          : row.direction === 'IMPROVE'
            ? 'ok'
            : 'affected',
      order,
    });
    order += 1;
  }

  for (const op of preview.proposedMutations?.operations ?? []) {
    const description = formatPreviewText(op.description ?? op.label, displayTimezone);
    if (!description) continue;
    cascade.push({
      id: `preview-mutation-${order}`,
      title: op.label?.trim() || '行程变更',
      description,
      status: 'affected',
      order,
    });
    order += 1;
  }

  const record = preview as GatewayDecisionPreviewResult & {
    impactSummary?: string;
    description?: string;
  };
  const previewNarrative =
    record.impactSummary?.trim() || record.description?.trim() || undefined;
  const aiInterpretation = previewNarrative
    ? {
        text: formatPreviewText(previewNarrative, displayTimezone),
        source: 'preview' as const,
      }
    : base.aiInterpretation;

  return {
    ...base,
    summary,
    cascade,
    aiInterpretation,
  };
}
