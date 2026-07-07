/**
 * 决策空间读路径：仅从 GET .../decision-problems/:id 派生 options / actions。
 * 禁止 GET .../options（后端 enrichTradeoffs 仅在 POST preview 时开启）。
 * 方案卡 baseline tradeoffs 可能无数值；完整数据走 POST .../options/:actionId/preview。
 */
import { extractComparisonViewFromPayload } from '@/lib/candidate-comparison-view.util';
import { normalizeDecisionOption } from '@/lib/decision-semantics-normalize.util';
import {
  mapGatewayOptionsPayload,
  type GatewayDecisionProblemDetailResult,
} from '@/lib/unified-gateway-response.util';
import type { CandidateComparisonView } from '@/types/candidate-comparison';
import type { DecisionOption, DecisionProblemDetail } from '@/types/decision-problem';
import type { DecisionAction } from '@/types/unified-decision';

export interface DecisionSpaceDetailContent {
  options: DecisionOption[];
  optionsActions: DecisionAction[];
  comparisonView: CandidateComparisonView | null;
}

const EMPTY: DecisionSpaceDetailContent = {
  options: [],
  optionsActions: [],
  comparisonView: null,
};

/** detail.actions[] → Legacy 方案卡 DecisionOption[] */
export function mapDetailActionsToDecisionOptions(actions: DecisionAction[]): DecisionOption[] {
  if (!actions.length) return [];

  return actions.map((action) => {
    const payload =
      action.payload && typeof action.payload === 'object'
        ? (action.payload as Record<string, unknown>)
        : {};
    const id = String(payload.optionId ?? action.actionId).trim();
    const tradeoffs = payload.tradeoffs;
    const routePreview = payload.routePreview;

    return normalizeDecisionOption({
      id,
      label: action.label ?? action.title ?? action.summary ?? id,
      title: action.title,
      description: action.description ?? action.summary,
      executable: action.allowed !== false,
      tradeoffs: Array.isArray(tradeoffs) ? (tradeoffs as DecisionOption['tradeoffs']) : undefined,
      routePreview: routePreview as DecisionOption['routePreview'],
      executionCapability: payload.executionCapability as DecisionOption['executionCapability'],
    });
  });
}

export function deriveDecisionSpaceContentFromDetail(
  detail: GatewayDecisionProblemDetailResult | DecisionProblemDetail | null | undefined,
): DecisionSpaceDetailContent {
  if (!detail) return EMPTY;

  const optionsActions = detail.actions ?? [];
  const embeddedOptions = mapGatewayOptionsPayload(detail);
  const options =
    embeddedOptions.length > 0
      ? embeddedOptions
      : mapDetailActionsToDecisionOptions(optionsActions);
  const comparisonView = extractComparisonViewFromPayload(detail);

  return { options, optionsActions, comparisonView };
}
