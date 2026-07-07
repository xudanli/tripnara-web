import type { MemoryConsoleDecisionLedgerCausalityV1 } from '@/features/memory/types/memory-console.v1';

export interface DecisionLedgerCausalityLink {
  ledgerNodeId: string;
  decisionId: string;
  problemId?: string;
  decidedAt?: string;
  status?: string;
  source?: string;
}

/** Agent / Memory Console / route_and_run 统一读模型 */
export interface DecisionLedgerCausalityView {
  ledgerNodeToDecisionId: Record<string, string>;
  links: DecisionLedgerCausalityLink[];
  affectedNodeIds?: string[];
  healingStatus?: string;
  ledgerSnapshotVersion?: number;
  decisionRecordsCount?: number;
  source: 'memory_console' | 'route_and_run' | 'merged';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseStringRecord(raw: unknown): Record<string, string> {
  const o = asRecord(raw);
  if (!o) return {};
  return Object.fromEntries(
    Object.entries(o)
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : String(v ?? '').trim()])
      .filter(([, v]) => Boolean(v)),
  );
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).map((s) => s.trim()).filter(Boolean);
}

export function parseDecisionLedgerCausalityLink(raw: unknown): DecisionLedgerCausalityLink | null {
  const o = asRecord(raw);
  if (!o) return null;
  const ledgerNodeId = String(o.ledger_node_id ?? o.ledgerNodeId ?? '').trim();
  const decisionId = String(o.decision_id ?? o.decisionId ?? '').trim();
  if (!ledgerNodeId || !decisionId) return null;
  return {
    ledgerNodeId,
    decisionId,
    ...(typeof (o.problem_id ?? o.problemId) === 'string'
      ? { problemId: String(o.problem_id ?? o.problemId) }
      : {}),
    ...(typeof (o.decided_at ?? o.decidedAt) === 'string'
      ? { decidedAt: String(o.decided_at ?? o.decidedAt) }
      : {}),
    ...(typeof (o.status) === 'string' ? { status: o.status } : {}),
    ...(typeof o.source === 'string' ? { source: o.source } : {}),
  };
}

export function parseDecisionLedgerCausality(raw: unknown): DecisionLedgerCausalityView | null {
  const o = asRecord(raw);
  if (!o) return null;

  const mapRaw = o.ledger_node_to_decision_id ?? o.ledgerNodeToDecisionId;
  const ledgerNodeToDecisionId = parseStringRecord(mapRaw);
  const linksRaw = o.links;
  const links = Array.isArray(linksRaw)
    ? linksRaw
        .map(parseDecisionLedgerCausalityLink)
        .filter((x): x is DecisionLedgerCausalityLink => x != null)
    : [];

  if (links.length === 0 && Object.keys(ledgerNodeToDecisionId).length === 0) {
    return null;
  }

  const mergedMap = { ...ledgerNodeToDecisionId };
  for (const link of links) {
    mergedMap[link.ledgerNodeId] = link.decisionId;
  }

  return {
    ledgerNodeToDecisionId: mergedMap,
    links,
    ledgerSnapshotVersion:
      typeof (o.ledger_snapshot_version ?? o.ledgerSnapshotVersion) === 'number'
        ? Number(o.ledger_snapshot_version ?? o.ledgerSnapshotVersion)
        : undefined,
    decisionRecordsCount:
      typeof (o.decision_records_count ?? o.decisionRecordsCount) === 'number'
        ? Number(o.decision_records_count ?? o.decisionRecordsCount)
        : undefined,
    source: 'memory_console',
  };
}

export function parseMemoryConsoleDecisionLedgerCausality(
  raw: MemoryConsoleDecisionLedgerCausalityV1 | null | undefined,
): DecisionLedgerCausalityView | null {
  if (!raw) return null;
  return parseDecisionLedgerCausality(raw);
}

export function parseLedgerHealingObservability(raw: unknown): Pick<
  DecisionLedgerCausalityView,
  'affectedNodeIds' | 'healingStatus' | 'ledgerNodeToDecisionId' | 'links'
> | null {
  const o = asRecord(raw);
  if (!o) return null;

  const userDecisionByNodeId = parseStringRecord(
    o.user_decision_by_node_id ?? o.userDecisionByNodeId,
  );
  const affectedNodeIds = parseStringArray(o.affected_node_ids ?? o.affectedNodeIds);
  const status = typeof o.status === 'string' ? o.status : undefined;

  if (
    Object.keys(userDecisionByNodeId).length === 0 &&
    affectedNodeIds.length === 0 &&
    !status
  ) {
    return null;
  }

  const links: DecisionLedgerCausalityLink[] = Object.entries(userDecisionByNodeId).map(
    ([ledgerNodeId, decisionId]) => ({ ledgerNodeId, decisionId, source: 'ledger_healing' }),
  );

  return {
    affectedNodeIds: affectedNodeIds.length ? affectedNodeIds : undefined,
    healingStatus: status,
    ledgerNodeToDecisionId: userDecisionByNodeId,
    links,
  };
}

export function mergeDecisionLedgerCausalityViews(
  ...views: Array<DecisionLedgerCausalityView | null | undefined>
): DecisionLedgerCausalityView | null {
  const present = views.filter((v): v is DecisionLedgerCausalityView => Boolean(v));
  if (present.length === 0) return null;

  const ledgerNodeToDecisionId: Record<string, string> = {};
  const linkByKey = new Map<string, DecisionLedgerCausalityLink>();
  let affectedNodeIds: string[] | undefined;
  let healingStatus: string | undefined;
  let ledgerSnapshotVersion: number | undefined;
  let decisionRecordsCount: number | undefined;

  for (const view of present) {
    Object.assign(ledgerNodeToDecisionId, view.ledgerNodeToDecisionId);
    for (const link of view.links) {
      linkByKey.set(`${link.ledgerNodeId}:${link.decisionId}`, link);
    }
    if (view.affectedNodeIds?.length) {
      affectedNodeIds = [...new Set([...(affectedNodeIds ?? []), ...view.affectedNodeIds])];
    }
    healingStatus = healingStatus ?? view.healingStatus;
    ledgerSnapshotVersion = ledgerSnapshotVersion ?? view.ledgerSnapshotVersion;
    decisionRecordsCount = decisionRecordsCount ?? view.decisionRecordsCount;
  }

  return {
    ledgerNodeToDecisionId,
    links: [...linkByKey.values()],
    affectedNodeIds,
    healingStatus,
    ledgerSnapshotVersion,
    decisionRecordsCount,
    source: present.length > 1 ? 'merged' : present[0]!.source,
  };
}

export function resolveDecisionIdForLedgerNode(
  view: DecisionLedgerCausalityView | null | undefined,
  ledgerNodeId: string,
): string | undefined {
  if (!view || !ledgerNodeId) return undefined;
  return view.ledgerNodeToDecisionId[ledgerNodeId];
}

export function listDecisionLedgerLinksForDisplay(
  view: DecisionLedgerCausalityView | null | undefined,
): DecisionLedgerCausalityLink[] {
  if (!view) return [];
  if (view.links.length > 0) return view.links;

  return Object.entries(view.ledgerNodeToDecisionId).map(([ledgerNodeId, decisionId]) => ({
    ledgerNodeId,
    decisionId,
  }));
}
