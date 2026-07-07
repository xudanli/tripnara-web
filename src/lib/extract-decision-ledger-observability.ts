import type { RouteAndRunResponse } from '@/api/agent';
import {
  mergeDecisionLedgerCausalityViews,
  parseDecisionLedgerCausality,
  parseLedgerHealingObservability,
  type DecisionLedgerCausalityView,
} from '@/lib/decision-ledger-causality.util';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readObservabilityRecord(response: RouteAndRunResponse | null | undefined): Record<string, unknown> | null {
  if (!response) return null;
  const top = asRecord(response.observability);
  if (top) return top;
  const metaObs = asRecord(response.meta?.observability);
  return metaObs;
}

/** route_and_run observability.ledger_healing + memory_contract.decision_ledger_causality */
export function extractDecisionLedgerCausalityFromRouteRun(
  response: RouteAndRunResponse | null | undefined,
): DecisionLedgerCausalityView | null {
  const obs = readObservabilityRecord(response);
  if (!obs) return null;

  const healingRaw = obs.ledger_healing ?? obs.ledgerHealing;
  const healingPartial = parseLedgerHealingObservability(healingRaw);

  const memoryContract = asRecord(obs.memory_contract ?? obs.memoryContract);
  const causalityRaw =
    memoryContract?.decision_ledger_causality ??
    memoryContract?.decisionLedgerCausality ??
    obs.decision_ledger_causality ??
    obs.decisionLedgerCausality;

  const causality = parseDecisionLedgerCausality(causalityRaw);
  const causalityView = causality
    ? {
        ...causality,
        source: 'route_and_run' as const,
        ...(healingPartial?.affectedNodeIds ? { affectedNodeIds: healingPartial.affectedNodeIds } : {}),
        ...(healingPartial?.healingStatus ? { healingStatus: healingPartial.healingStatus } : {}),
      }
    : null;

  const healingView = healingPartial
    ? {
        ledgerNodeToDecisionId: healingPartial.ledgerNodeToDecisionId,
        links: healingPartial.links,
        affectedNodeIds: healingPartial.affectedNodeIds,
        healingStatus: healingPartial.healingStatus,
        source: 'route_and_run' as const,
      }
    : null;

  return mergeDecisionLedgerCausalityViews(causalityView, healingView);
}
