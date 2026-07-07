import type { DecisionTradeoffRow } from '@/types/decision-problem';
import type { PersonaAlertTradeoffDimension } from '@/types/trip';

type TradeoffSummaryRow = Pick<
  DecisionTradeoffRow | PersonaAlertTradeoffDimension,
  'contextualNarrative' | 'explanation'
>;

/** contextualNarrative 优先，explanation 为短摘要兜底 */
export function resolveTradeoffRowSummary(row: TradeoffSummaryRow | undefined | null): string | null {
  const narrative = row?.contextualNarrative?.trim();
  if (narrative) return narrative;
  const explanation = row?.explanation?.trim();
  return explanation || null;
}

const DIRECTION_PRIORITY: Record<string, number> = {
  WORSEN: 0,
  UNCHANGED: 1,
  IMPROVE: 2,
};

/** 同一维度多条时优先展示恶化项 */
export function pickPrimaryTradeoffRow<T extends { direction?: string }>(
  rows: T[],
): T | undefined {
  if (!rows.length) return undefined;
  return [...rows].sort((a, b) => {
    const aOrder = DIRECTION_PRIORITY[a.direction ?? ''] ?? 3;
    const bOrder = DIRECTION_PRIORITY[b.direction ?? ''] ?? 3;
    return aOrder - bOrder;
  })[0];
}

/** Persona alert 级主叙述（全 tradeoffDimensions 中取最严重一条） */
export function resolvePersonaAlertTradeoffSummary(
  tradeoffDimensions: PersonaAlertTradeoffDimension[] | undefined,
): string | null {
  if (!tradeoffDimensions?.length) return null;
  return resolveTradeoffRowSummary(pickPrimaryTradeoffRow(tradeoffDimensions));
}
