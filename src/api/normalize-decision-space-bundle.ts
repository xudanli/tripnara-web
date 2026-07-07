import { normalizePlanningDecisionBasis } from '@/api/normalize-planning-decision-basis';
import { normalizePlanningDecisionInspector } from '@/api/normalize-planning-decision-inspector';
import { normalizePlanningDecisionPack } from '@/api/normalize-planning-decision-pack';
import type {
  DecisionSpaceBundle,
  DecisionSpaceBundleBinding,
  DecisionSpaceBundleMeta,
  DecisionSpaceBundleOrchestration,
} from '@/dto/frontend-decision-space-bundle.types';
import { normalizeGatewayProblemDetail } from '@/lib/unified-gateway-response.util';

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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function peelBundlePayload(raw: unknown): Record<string, unknown> {
  const record = readRecord(raw);
  if (!record) return {};

  if (asString(record.schema)?.includes('decision_space_bundle')) return record;

  const nested = readRecord(record.data);
  if (nested && asString(nested.schema)?.includes('decision_space_bundle')) return nested;

  return record;
}

function normalizeBinding(raw: unknown): DecisionSpaceBundleBinding {
  const record = readRecord(raw);
  if (!record) return {};
  return {
    mode: asString(record.mode) as DecisionSpaceBundleBinding['mode'],
    problemId: asString(record.problemId ?? record.problem_id) ?? null,
    proposalId: asString(record.proposalId ?? record.proposal_id) ?? null,
    conflictId: asString(record.conflictId ?? record.conflict_id) ?? null,
    optionId: asString(record.optionId ?? record.option_id) ?? null,
  };
}

function normalizeOrchestration(raw: unknown): DecisionSpaceBundleOrchestration | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;
  const activeProposalId = asString(record.activeProposalId ?? record.active_proposal_id) ?? null;
  const phase = asString(record.phase) ?? null;
  const pendingRaw = record.pendingProposalCount ?? record.pending_proposal_count;
  const pendingProposalCount =
    typeof pendingRaw === 'number' && Number.isFinite(pendingRaw) ? pendingRaw : undefined;
  if (!activeProposalId && pendingProposalCount == null && !phase) return undefined;
  return { activeProposalId, pendingProposalCount, phase };
}

function normalizeMeta(raw: unknown): DecisionSpaceBundleMeta | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;
  const tabEmptyRaw = readRecord(record.tabEmptyState ?? record.tab_empty_state);
  const tabEmptyState = tabEmptyRaw
    ? Object.fromEntries(
        Object.entries(tabEmptyRaw).map(([key, value]) => [key, Boolean(value)]),
      )
    : undefined;
  const deferredReasonRaw = readRecord(record.deferredReason ?? record.deferred_reason);
  const refreshHintsRaw = readRecord(record.refreshHints ?? record.refresh_hints);
  return {
    included: asStringArray(record.included),
    deferred: asStringArray(record.deferred),
    tabEmptyState,
    deferredReason: deferredReasonRaw
      ? {
          previewRequired: Boolean(
            deferredReasonRaw.previewRequired ?? deferredReasonRaw.preview_required,
          ),
        }
      : undefined,
    refreshHints: refreshHintsRaw
      ? Object.fromEntries(
          Object.entries(refreshHintsRaw)
            .map(([key, value]) => [key, asString(value)])
            .filter((entry): entry is [string, string] => Boolean(entry[1])),
        )
      : undefined,
  };
}

export function normalizeDecisionSpaceBundle(raw: unknown, tripId: string): DecisionSpaceBundle {
  const record = peelBundlePayload(raw);
  const resolvedTripId = asString(record.tripId ?? record.trip_id) ?? tripId;
  const binding = normalizeBinding(record.binding);
  const problemId =
    binding.problemId ??
    asString(readRecord(record.problem)?.id) ??
    undefined;

  const problemRaw = record.problem;
  const problem =
    problemRaw != null && problemId
      ? normalizeGatewayProblemDetail(problemRaw, problemId)
      : undefined;

  const basisRaw = record.basis ?? readRecord(record.inspector)?.decisionBasis;
  const basis = basisRaw
    ? normalizePlanningDecisionBasis(basisRaw, resolvedTripId)
    : undefined;

  const pack = normalizePlanningDecisionPack(record.pack);

  const inspectorRaw = record.inspector;
  let inspector = inspectorRaw
    ? normalizePlanningDecisionInspector(inspectorRaw, resolvedTripId)
    : undefined;
  if (inspector && basis && !inspector.decisionBasis) {
    inspector = { ...inspector, decisionBasis: basis };
  }

  return {
    schema: (asString(record.schema) ?? 'tripnara.decision_space_bundle@v1') as DecisionSpaceBundle['schema'],
    tripId: resolvedTripId,
    tripVersion: asString(record.tripVersion ?? record.trip_version),
    etag: asString(record.etag),
    binding,
    problem,
    basis,
    pack,
    inspector,
    negotiation: record.negotiation,
    orchestration: normalizeOrchestration(record.orchestration),
    meta: normalizeMeta(record.meta),
  };
}
