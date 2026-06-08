import type { RouteAndRunResponse, DecisionLogEntry } from '@/api/agent';
import type { MemoryContractConstraintSink, MemoryContractObs } from '@/features/route-and-run/types/observability';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

/** explain.decision_log 中 constraint_sink hydrate 证据 */
export type ConstraintSinkDecisionLogEvidence = {
  patch_ids: string[];
  applied_keys: string[];
  outputs_summary?: string;
  step?: string;
};

function parseStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map(String).filter(Boolean);
}

function parseAppliedKeysFromSummary(summary: string): string[] {
  const m = summary.match(/applied_keys=\[([^\]]*)\]/i);
  if (!m?.[1]) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 从 explain.decision_log（或 payload 等价字段）提取 constraint_sink 依据 */
export function extractConstraintSinkFromDecisionLog(
  decisionLog: DecisionLogEntry[] | null | undefined
): ConstraintSinkDecisionLogEvidence | null {
  if (!decisionLog?.length) return null;

  for (const entry of decisionLog) {
    const meta = asRecord(entry.metadata);
    const patchIds =
      parseStringArray(meta?.constraint_sink_patch_ids) ??
      parseStringArray(meta?.constraintSinkPatchIds);
    const appliedKeys =
      parseStringArray(meta?.applied_keys) ?? parseStringArray(meta?.appliedKeys);
    const summary = String(entry.outputs_summary ?? '');
    const isSinkEntry =
      (patchIds?.length ?? 0) > 0 ||
      (appliedKeys?.length ?? 0) > 0 ||
      /constraint_sink_hydrate/i.test(summary);

    if (!isSinkEntry) continue;

    const keysFromSummary = appliedKeys?.length ? appliedKeys : parseAppliedKeysFromSummary(summary);

    return {
      patch_ids: patchIds ?? [],
      applied_keys: keysFromSummary,
      outputs_summary: summary || undefined,
      step: entry.step,
    };
  }

  return null;
}

export function mergeConstraintSinkSources(
  observabilitySink?: MemoryContractConstraintSink | null,
  decisionLogEvidence?: ConstraintSinkDecisionLogEvidence | null
): MemoryContractConstraintSink | null {
  const obs = observabilitySink ?? undefined;
  const dl = decisionLogEvidence ?? undefined;
  if (!obs && !dl) return null;

  const patchSet = new Set<string>([...(obs?.patch_ids ?? []), ...(dl?.patch_ids ?? [])]);
  const keySet = new Set<string>([...(obs?.applied_keys ?? []), ...(dl?.applied_keys ?? [])]);
  const overridden = obs?.overridden_by_request_keys ?? [];

  if (patchSet.size === 0 && keySet.size === 0 && overridden.length === 0) {
    return null;
  }

  return {
    hydrated: obs?.hydrated === true || (dl != null && (patchSet.size > 0 || keySet.size > 0)),
    applied_keys: keySet.size > 0 ? [...keySet] : undefined,
    patch_ids: patchSet.size > 0 ? [...patchSet] : undefined,
    overridden_by_request_keys: overridden.length > 0 ? overridden : undefined,
  };
}

function parseMemoryContract(raw: unknown): MemoryContractObs | undefined {
  const rec = asRecord(raw);
  if (!rec || typeof rec.revision !== 'string') return undefined;
  const layers = Array.isArray(rec.layers) ? rec.layers.map(String) : [];
  const constraintSinkRaw = asRecord(rec.constraint_sink);
  const constraint_sink = constraintSinkRaw
    ? {
        hydrated: constraintSinkRaw.hydrated === true,
        applied_keys: Array.isArray(constraintSinkRaw.applied_keys)
          ? constraintSinkRaw.applied_keys.map(String)
          : undefined,
        patch_ids: Array.isArray(constraintSinkRaw.patch_ids)
          ? constraintSinkRaw.patch_ids.map(String)
          : undefined,
        overridden_by_request_keys: Array.isArray(constraintSinkRaw.overridden_by_request_keys)
          ? constraintSinkRaw.overridden_by_request_keys.map(String)
          : undefined,
      }
    : undefined;

  return {
    revision: rec.revision,
    loaded: rec.loaded === true,
    layers,
    constraint_sink,
  };
}

/** 从 route_and_run 响应读取 observability.memory_contract（含 meta.observability 回退） */
export function extractMemoryContractFromRouteRun(
  response: RouteAndRunResponse | null | undefined
): MemoryContractObs | undefined {
  if (!response) return undefined;
  const top = parseMemoryContract(
    (response.observability as { memory_contract?: unknown } | undefined)?.memory_contract
  );
  if (top) return top;
  const metaObs = response.meta?.observability as { memory_contract?: unknown } | undefined;
  return parseMemoryContract(metaObs?.memory_contract);
}

export function extractConstraintSinkFromRouteRun(
  response: RouteAndRunResponse | null | undefined
) {
  return extractMemoryContractFromRouteRun(response)?.constraint_sink;
}

/** observability + decision_log 合并后的 constraint_sink（Evidence Drawer / Gate 共用） */
export function extractMergedConstraintSinkFromRouteRun(
  response: RouteAndRunResponse | null | undefined,
  decisionLog?: DecisionLogEntry[] | null
): MemoryContractConstraintSink | null {
  const obsSink = extractConstraintSinkFromRouteRun(response);
  const dlEvidence = extractConstraintSinkFromDecisionLog(decisionLog ?? undefined);
  return mergeConstraintSinkSources(obsSink, dlEvidence);
}
