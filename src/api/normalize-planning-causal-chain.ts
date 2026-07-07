import type {
  PlanningCausalChain,
  PlanningCausalChainNode,
  PlanningCausalChainSeverity,
} from '@/dto/frontend-planning-causal-chain.types';
import { sortCausalChainNodes } from '@/dto/frontend-planning-causal-chain.types';

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeSeverity(value: unknown): PlanningCausalChainSeverity {
  const raw = asString(value)?.toLowerCase();
  if (raw === 'warn' || raw === 'warning') return 'warn';
  if (raw === 'risk' || raw === 'danger' || raw === 'error') return 'risk';
  return 'info';
}

function normalizeNode(raw: unknown, index: number): PlanningCausalChainNode | null {
  const record = readRecord(raw);
  if (!record) return null;
  const description = asString(record.description);
  if (!description) return null;

  return {
    id: asString(record.id) ?? `node_${index}`,
    order: asNumber(record.order) ?? index,
    severity: normalizeSeverity(record.severity),
    description,
    entityLabel: asString(record.entityLabel ?? record.entity_label),
    itemId: asString(record.itemId ?? record.item_id),
    netImpactMinutes: asNumber(record.netImpactMinutes ?? record.net_impact_minutes),
    source: asString(record.source) as PlanningCausalChainNode['source'],
  };
}

/** 兼容 { data: chain }、gateway 信封或已解包 payload */
function peelCausalChainPayload(raw: unknown): Record<string, unknown> {
  const record = readRecord(raw);
  if (!record) return {};

  const hasChainShape =
    asString(record.schema)?.includes('planning_causal_chain') ||
    Array.isArray(record.nodes);

  if (hasChainShape) return record;

  const nested = readRecord(record.data);
  if (
    nested &&
    (asString(nested.schema)?.includes('planning_causal_chain') || Array.isArray(nested.nodes))
  ) {
    return nested;
  }

  const causalChain = readRecord(record.causalChain ?? record.causal_chain);
  if (causalChain) return peelCausalChainPayload(causalChain);

  return record;
}

export function normalizePlanningCausalChain(raw: unknown, tripId: string): PlanningCausalChain {
  const record = peelCausalChainPayload(raw);
  const nodesRaw = Array.isArray(record.nodes) ? record.nodes : [];
  const nodes = sortCausalChainNodes(
    nodesRaw
      .map(normalizeNode)
      .filter(Boolean) as PlanningCausalChainNode[],
  );

  return {
    schema: (asString(record.schema) ?? 'tripnara.planning_causal_chain@v1') as PlanningCausalChain['schema'],
    tripId: asString(record.tripId ?? record.trip_id) ?? tripId,
    proposalId: asString(record.proposalId ?? record.proposal_id),
    problemId: asString(record.problemId ?? record.problem_id),
    generatedAt: asString(record.generatedAt ?? record.generated_at),
    basisUpdatedAt: asString(record.basisUpdatedAt ?? record.basis_updated_at),
    basisSource: asString(record.basisSource ?? record.basis_source) as PlanningCausalChain['basisSource'],
    refreshUrl: asString(record.refreshUrl ?? record.refresh_url),
    nodes,
  };
}
