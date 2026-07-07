import type { GatewayDecisionPreviewResult } from '@/lib/unified-gateway-response.util';
import { normalizeDecisionOption } from '@/lib/decision-semantics-normalize.util';
import type { DecisionOption } from '@/types/decision-problem';

/** 读路径 baseline tradeoffs 是否已含可展示数值（enrichTradeoffs=false 时通常 false） */
export function optionHasEnrichedTradeoffs(option: DecisionOption): boolean {
  const tradeoffs = option.tradeoffs ?? [];
  if (!tradeoffs.length) return false;
  return tradeoffs.some((row) => row.value != null && Number.isFinite(row.value));
}

/** 是否需 POST .../options/:actionId/preview 补齐 tradeoffs / routePreview */
export function optionNeedsPreviewEnrichment(option: DecisionOption): boolean {
  if (option.routePreview?.placeNames?.filter(Boolean).length) return false;
  return !optionHasEnrichedTradeoffs(option);
}

function readPreviewRoutePreview(
  preview: GatewayDecisionPreviewResult,
): DecisionOption['routePreview'] | undefined {
  const record = preview as GatewayDecisionPreviewResult & {
    routePreview?: DecisionOption['routePreview'];
    option?: DecisionOption;
    repairPreview?: { routePreview?: DecisionOption['routePreview'] };
  };
  return (
    record.routePreview ??
    record.option?.routePreview ??
    record.repairPreview?.routePreview
  );
}

/** 将 POST preview 结果合并进方案卡（不触发 GET .../options） */
export function mergePreviewIntoDecisionOption(
  option: DecisionOption,
  preview: GatewayDecisionPreviewResult,
): DecisionOption {
  const routePreview = readPreviewRoutePreview(preview);
  const tradeoffs =
    preview.tradeoffs?.length ? preview.tradeoffs : option.tradeoffs;

  return normalizeDecisionOption({
    ...option,
    tradeoffs,
    routePreview: routePreview ?? option.routePreview,
    executionCapability: preview.executionCapability ?? option.executionCapability,
    description:
      option.description ??
      (preview as GatewayDecisionPreviewResult & { description?: string }).description,
  });
}
