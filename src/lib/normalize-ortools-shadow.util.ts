import {
  ORTOOLS_EVALUATE_SHADOW_SCHEMA_ID,
  ORTOOLS_PLANNING_SHADOW_SCHEMA_ID,
  type OrtToolsEvaluateShadowAttachment,
  type OrtToolsPlanningShadowAttachment,
  type OrtToolsShadowCandidate,
  type OrtToolsShadowEvidenceFreshness,
  type OrtToolsShadowHealthData,
} from '@/types/ortools-shadow';

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

function asFreshness(value: unknown): OrtToolsShadowEvidenceFreshness | undefined {
  const text = asString(value)?.toUpperCase();
  if (text === 'FRESH' || text === 'STALE') return text;
  return undefined;
}

function normalizeShadowCandidates(raw: unknown): OrtToolsShadowCandidate[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((item) => {
      const record = readRecord(item);
      if (!record) return null;
      return {
        ...record,
        candidateId: asString(record.candidateId ?? record.candidate_id),
        id: asString(record.id),
        label: asString(record.label),
        generatorVersion: asString(record.generatorVersion ?? record.generator_version),
      };
    })
    .filter(Boolean) as OrtToolsShadowCandidate[];
}

/** Health data — writeAuthority 恒锁定 false */
export function normalizeOrtToolsShadowHealthData(
  raw: unknown,
): OrtToolsShadowHealthData {
  const record = readRecord(raw) ?? {};
  return {
    ...record,
    shadowRepairEnabled: record.shadowRepairEnabled === true,
    solverUrlConfigured: record.solverUrlConfigured === true,
    writeAuthority: false,
    canaryStage: asString(record.canaryStage) ?? 'shadow',
    authoritativeCanaryFlag: record.authoritativeCanaryFlag === true,
    planningOrchestratorShadow: readRecord(record.planningOrchestratorShadow) ?? undefined,
    mvpOperations: Array.isArray(record.mvpOperations)
      ? record.mvpOperations.map((op) => String(op)).filter(Boolean)
      : undefined,
  };
}

export function normalizeOrtToolsEvaluateShadow(
  raw: unknown,
): OrtToolsEvaluateShadowAttachment | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;

return {
    ...record,
    schemaId: ORTOOLS_EVALUATE_SHADOW_SCHEMA_ID,
    shadowAuthority: false,
    report: readRecord(record.report) ?? undefined,
    gatewayByCandidateId: readRecord(record.gatewayByCandidateId ?? record.gateway_by_candidate_id)
      ?? undefined,
    shadowRepairCandidates: normalizeShadowCandidates(
      record.shadowRepairCandidates ?? record.shadow_repair_candidates,
    ),
    neptuneCandidateCount: asNumber(
      record.neptuneCandidateCount ?? record.neptune_candidate_count,
    ),
    shadowCandidateCount: asNumber(
      record.shadowCandidateCount ?? record.shadow_candidate_count,
    ),
    evidenceFreshness: asFreshness(record.evidenceFreshness ?? record.evidence_freshness),
    discardedStalePrior:
      record.discardedStalePrior === true || record.discarded_stale_prior === true,
    solverOperation: asString(record.solverOperation ?? record.solver_operation),
    solverUnavailableReason: asString(
      record.solverUnavailableReason ?? record.solver_unavailable_reason,
    ),
    canary: readRecord(record.canary) ?? undefined,
  };
}

export function normalizeOrtToolsPlanningShadow(
  raw: unknown,
): OrtToolsPlanningShadowAttachment | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;

  const shadowChangesRaw = record.shadowChanges ?? record.shadow_changes;
  const shadowChanges = Array.isArray(shadowChangesRaw)
    ? shadowChangesRaw
        .map((item) => readRecord(item))
        .filter(Boolean) as Array<Record<string, unknown>>
    : undefined;

  return {
    ...record,
    schemaId: ORTOOLS_PLANNING_SHADOW_SCHEMA_ID,
    shadowAuthority: false,
    planningIntent: asString(record.planningIntent ?? record.planning_intent),
    shadowChanges,
    legacyChangeCount: asNumber(record.legacyChangeCount ?? record.legacy_change_count),
    shadowChangeCount: asNumber(record.shadowChangeCount ?? record.shadow_change_count),
    labCompare: readRecord(record.labCompare ?? record.lab_compare) ?? undefined,
    dayIndex: asNumber(record.dayIndex ?? record.day_index),
    evidenceFreshness: asFreshness(record.evidenceFreshness ?? record.evidence_freshness),
    report: readRecord(record.report) ?? undefined,
    solverUnavailableReason: asString(
      record.solverUnavailableReason ?? record.solver_unavailable_reason,
    ),
    canary: readRecord(record.canary) ?? undefined,
  };
}

/**
 * 从 problem detail / workspace / debug.rawCanonical 抽取 Evaluate Shadow。
 */
export function extractOrtToolsEvaluateShadowFromDetail(
  payload: unknown,
): OrtToolsEvaluateShadowAttachment | undefined {
  const record = readRecord(payload);
  if (!record) return undefined;

  const direct =
    normalizeOrtToolsEvaluateShadow(record.ortoolsShadow ?? record.ortools_shadow) ??
    normalizeOrtToolsEvaluateShadow(
      readRecord(record.workspace)?.ortoolsShadow ??
        readRecord(record.workspace)?.ortools_shadow,
    );
  if (direct) return direct;

  const debug = readRecord(record.debug);
  const rawCanonical = readRecord(debug?.rawCanonical ?? debug?.raw_canonical);
  const workspace = readRecord(rawCanonical?.workspace);
  return normalizeOrtToolsEvaluateShadow(
    workspace?.ortoolsShadow ?? workspace?.ortools_shadow,
  );
}

/**
 * 有 ortoolsShadow 且 intent∈OPTIMIZE_ROUTE|AUTO_ARRANGE 即展示旁路。
 * health 明确关闭时隐藏；未探活完成不挡附件展示。
 */
export function shouldShowOrtToolsPlanningShadowPanel(
  intent: string | undefined,
  shadow: OrtToolsPlanningShadowAttachment | undefined | null,
  shadowRepairEnabledOrOpts:
    | boolean
    | { shadowRepairEnabled?: boolean; healthLoaded?: boolean } = true,
): boolean {
  if (!shadow) return false;
  const intentKey = (intent ?? shadow.planningIntent ?? '').toUpperCase();
  if (intentKey !== 'OPTIMIZE_ROUTE' && intentKey !== 'AUTO_ARRANGE') return false;

  const opts =
    typeof shadowRepairEnabledOrOpts === 'boolean'
      ? {
          shadowRepairEnabled: shadowRepairEnabledOrOpts,
          healthLoaded: true,
        }
      : shadowRepairEnabledOrOpts;

  if (opts.healthLoaded && opts.shadowRepairEnabled === false) return false;
  return true;
}
