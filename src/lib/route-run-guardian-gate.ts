/**
 * route_and_run 门控三人格：优先读 payload.orchestrationResult.gate_result.guardian_results，
 * 否则回退 explain.guardian_personas（同源只读镜像，勿维护第二真源）。
 *
 * 主路径与 trip-plan.interface 对齐：`abu` / `drdre` / `neptune` + `debate_summary_zh` 等。
 *
 * VERIFY 之后（契约）：
 * - `violation_projection_v1`：`guardian_results` / `explain.guardian_personas` 内各人格的 `evidence_atoms`
 *   会与 VERIFY 对齐刷新（规则投影仍可为 is_simulated）。
 * - `llm_debate`：人格条保持合议（LLM）verdict / 叙述；**额外**在 `gate_result.violations` 上挂 VERIFY
 *   审计字段（含可与 VERIFY 对齐的 `evidence_atoms`），与人格块分层，勿混为第二套 verdict。
 */

import type {
  OrchestrationResult,
  GuardianEvidenceAtom,
  GuardianGateResultsBundle,
  RouteRunPersonaHint,
} from '@/api/agent';

export type GuardianPersonaKey = 'ABU' | 'DR_DRE' | 'NEPTUNE' | string;

export type RouteRunExplainGuardianMirror = {
  guardian_personas?: GuardianGateResultsBundle;
};

/** 从 route_and_run 顶层 explain 抽取三人格镜像（无字段则 undefined） */
export function pickRouteRunExplainGuardianMirror(explain: {
  guardian_personas?: GuardianGateResultsBundle;
} | null | undefined): RouteRunExplainGuardianMirror | undefined {
  if (!explain || explain.guardian_personas == null) return undefined;
  return { guardian_personas: explain.guardian_personas };
}

export type GuardianGateDisplayRow = {
  personaKey: GuardianPersonaKey;
  verdict?: string;
  evidenceLines: string[];
  evidence_atoms: GuardianEvidenceAtom[];
};

export type ResolvedGuardianGateView = {
  rows: GuardianGateDisplayRow[];
  source?: string;
  is_simulated?: boolean;
  debate_summary_zh?: string;
  debate_latency_ms?: number;
  debate_shadow_wait_ms?: number;
  debate_overlapping_latency_saved_estimate_ms?: number;
  debate_shadow_triggered_at?: number;
  fromExplainMirror: boolean;
  /**
   * `gate_result.violations`：仅在 source === `llm_debate` 时填充；
   * VERIFY 后追加的审计层，与人格 LLM 结果分离展示。
   */
  verifyAuditViolations?: GateVerifyViolationAuditEntry[];
  /** violation_projection_v1 且人格块上已有 evidence_atoms：表示 VERIFY 后与可执行性校验对齐下发 */
  projectionEvidenceAtomsVerifyAligned?: boolean;
};

/** VERIFY 审计层单条（gate_result.violations[]） */
export type GateVerifyViolationAuditEntry = {
  explanation?: string;
  violation?: string;
  code?: string;
  evidence_atoms: GuardianEvidenceAtom[];
};

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

function normKey(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
}

function pickPersonaKey(entry: Record<string, unknown>): GuardianPersonaKey {
  const candidates = [
    entry.persona,
    entry.guardian,
    entry.guardian_id,
    entry.guardianId,
    entry.id,
    entry.role,
    entry.persona_key,
    entry.personaKey,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      const n = normKey(c);
      if (n.includes('ABU')) return 'ABU';
      if (n.includes('NEPTUNE')) return 'NEPTUNE';
      if (n.includes('DRE') || n.includes('DR_DRE') || n === 'DR') return 'DR_DRE';
      return c.trim();
    }
  }
  return 'UNKNOWN';
}

function coerceAtoms(raw: unknown): GuardianEvidenceAtom[] {
  if (!Array.isArray(raw)) return [];
  const out: GuardianEvidenceAtom[] = [];
  for (const item of raw) {
    const r = asRecord(item);
    if (!r) continue;
    const atom: GuardianEvidenceAtom = { ...r };
    if (typeof r.text === 'string') atom.text = r.text;
    if (typeof r.violation_code === 'string') atom.violation_code = r.violation_code;
    else if (typeof r.violationCode === 'string') atom.violation_code = r.violationCode;
    if (typeof r.tag === 'string') atom.tag = r.tag;
    out.push(atom);
  }
  return out;
}

function coerceStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim());
}

function getBlock(o: Record<string, unknown>, keys: string[]): Record<string, unknown> | undefined {
  for (const k of keys) {
    const r = asRecord(o[k]);
    if (r) return r;
  }
  return undefined;
}

function rowFromPersonaBlock(
  personaKey: GuardianPersonaKey,
  block: Record<string, unknown>
): GuardianGateDisplayRow | null {
  const verdict = typeof block.verdict === 'string' && block.verdict.trim() ? block.verdict.trim() : undefined;
  const evidenceLines = coerceStringList(block.evidence);
  const evidence_atoms = coerceAtoms(block.evidence_atoms ?? block.evidenceAtoms);
  if (!verdict && evidenceLines.length === 0 && evidence_atoms.length === 0) return null;
  return { personaKey, verdict, evidenceLines, evidence_atoms };
}

/** 后端契约：abu / drdre(/dr_dre) / neptune 三块 */
function rowsFromKeyedGuardians(o: Record<string, unknown>): GuardianGateDisplayRow[] {
  const out: GuardianGateDisplayRow[] = [];
  const abuB = getBlock(o, ['abu']);
  const dreB = getBlock(o, ['drdre', 'dr_dre', 'drDre']);
  const nepB = getBlock(o, ['neptune']);
  const r1 = abuB ? rowFromPersonaBlock('ABU', abuB) : null;
  const r2 = dreB ? rowFromPersonaBlock('DR_DRE', dreB) : null;
  const r3 = nepB ? rowFromPersonaBlock('NEPTUNE', nepB) : null;
  if (r1) out.push(r1);
  if (r2) out.push(r2);
  if (r3) out.push(r3);
  return out;
}

function normalizePersonaEntry(entry: unknown): GuardianGateDisplayRow | null {
  const e = asRecord(entry);
  if (!e) return null;
  const personaKey = pickPersonaKey(e);
  const verdict = typeof e.verdict === 'string' && e.verdict.trim() ? e.verdict.trim() : undefined;
  const fromEvidence = coerceStringList(e.evidence);
  const textParts = [
    typeof e.summary === 'string' ? e.summary : undefined,
    typeof e.message === 'string' ? e.message : undefined,
    typeof e.outputs_summary === 'string' ? e.outputs_summary : undefined,
    typeof e.outputsSummary === 'string' ? e.outputsSummary : undefined,
    typeof e.rationale === 'string' ? e.rationale : undefined,
  ].filter((s): s is string => Boolean(s && s.trim()));
  const atoms = coerceAtoms(e.evidence_atoms ?? e.evidenceAtoms);
  const evidenceLines =
    fromEvidence.length > 0 ? fromEvidence : textParts.length > 0 ? textParts : verdict ? [] : [];
  if (!verdict && evidenceLines.length === 0 && atoms.length === 0) return null;
  return { personaKey, verdict, evidenceLines, evidence_atoms: atoms };
}

const RESERVED_LIST_KEYS = new Set([
  'source',
  'is_simulated',
  'isSimulated',
  'debate_summary_zh',
  'debateSummaryZh',
  'debate_latency_ms',
  'debateLatencyMs',
  'debate_shadow_wait_ms',
  'debateShadowWaitMs',
  'debate_overlapping_latency_saved_estimate_ms',
  'debateOverlappingLatencySavedEstimateMs',
  'debate_shadow_triggered_at',
  'debateShadowTriggeredAt',
  'abu',
  'drdre',
  'dr_dre',
  'drDre',
  'neptune',
  'personas',
  'items',
  'results',
  'guardians',
  'version',
  'meta',
]);

function extractListFromBundle(o: Record<string, unknown>): unknown[] {
  if (Array.isArray(o.personas)) return o.personas;
  if (Array.isArray(o.items)) return o.items;
  if (Array.isArray(o.results)) return o.results;
  if (Array.isArray(o.guardians)) return o.guardians;
  const keyed: unknown[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (RESERVED_LIST_KEYS.has(k)) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keyed.push({ ...(v as object), persona_key: (v as Record<string, unknown>).persona ?? k });
    }
  }
  return keyed;
}

function readNumber(o: Record<string, unknown>, snake: string, camel?: string): number | undefined {
  const v = o[snake] ?? (camel ? o[camel] : undefined);
  return typeof v === 'number' && !Number.isNaN(v) ? v : undefined;
}

function readDebateSummary(o: Record<string, unknown>): string | undefined {
  const v = o.debate_summary_zh ?? o.debateSummaryZh;
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export type ParsedGuardianBundle = {
  rows: GuardianGateDisplayRow[];
  source?: string;
  is_simulated?: boolean;
  debate_summary_zh?: string;
  debate_latency_ms?: number;
  debate_shadow_wait_ms?: number;
  debate_overlapping_latency_saved_estimate_ms?: number;
  debate_shadow_triggered_at?: number;
};

function parseGuardianBundle(raw: unknown): ParsedGuardianBundle {
  const empty: ParsedGuardianBundle = { rows: [] };
  if (raw == null) return empty;
  if (Array.isArray(raw)) {
    const rows = raw.map(normalizePersonaEntry).filter((r): r is GuardianGateDisplayRow => r != null);
    return { rows };
  }
  const o = asRecord(raw);
  if (!o) return empty;

  const source = typeof o.source === 'string' ? o.source : undefined;
  const is_simulated =
    o.is_simulated === true ||
    o.isSimulated === true ||
    (typeof o.is_simulated === 'string' && o.is_simulated === 'true');

  const meta: ParsedGuardianBundle = {
    rows: [],
    source,
    is_simulated: is_simulated || undefined,
    debate_summary_zh: readDebateSummary(o),
    debate_latency_ms: readNumber(o, 'debate_latency_ms', 'debateLatencyMs'),
    debate_shadow_wait_ms: readNumber(o, 'debate_shadow_wait_ms', 'debateShadowWaitMs'),
    debate_overlapping_latency_saved_estimate_ms: readNumber(
      o,
      'debate_overlapping_latency_saved_estimate_ms',
      'debateOverlappingLatencySavedEstimateMs'
    ),
    debate_shadow_triggered_at: readNumber(o, 'debate_shadow_triggered_at', 'debateShadowTriggeredAt'),
  };

  const keyedRows = rowsFromKeyedGuardians(o);
  if (keyedRows.length > 0) {
    return { ...meta, rows: keyedRows };
  }

  const list = extractListFromBundle(o);
  const rows = list.map(normalizePersonaEntry).filter((r): r is GuardianGateDisplayRow => r != null);
  return { ...meta, rows };
}

function hasRenderableRows(rows: GuardianGateDisplayRow[]): boolean {
  return rows.some(
    (r) =>
      Boolean(r.verdict?.trim()) ||
      r.evidenceLines.length > 0 ||
      r.evidence_atoms.some((a) => a.text?.trim() || a.violation_code?.trim() || a.tag?.trim())
  );
}

function hasGuardianPayload(p: ParsedGuardianBundle): boolean {
  return hasRenderableRows(p.rows) || Boolean(p.debate_summary_zh?.trim());
}

export function parseGateVerifyAuditViolations(
  gate: Record<string, unknown> | undefined
): GateVerifyViolationAuditEntry[] {
  if (!gate) return [];
  const rawList = gate.violations;
  if (!Array.isArray(rawList)) return [];
  const out: GateVerifyViolationAuditEntry[] = [];
  for (const item of rawList) {
    const r = asRecord(item);
    if (!r) continue;
    const atoms = coerceAtoms(r.evidence_atoms ?? r.evidenceAtoms);
    const explanation =
      typeof r.explanation === 'string'
        ? r.explanation
        : typeof r.message === 'string'
          ? r.message
          : typeof r.detail === 'string'
            ? r.detail
            : undefined;
    const violation = typeof r.violation === 'string' ? r.violation : undefined;
    const code =
      typeof r.code === 'string'
        ? r.code
        : typeof r.violation_code === 'string'
          ? r.violation_code
          : typeof r.issue_code === 'string'
            ? r.issue_code
            : undefined;
    if (!explanation?.trim() && atoms.length === 0 && !code?.trim()) continue;
    out.push({
      explanation: explanation?.trim(),
      violation,
      code: code?.trim(),
      evidence_atoms: atoms,
    });
  }
  return out;
}

function finalizeGuardianView(
  base: ResolvedGuardianGateView,
  gate: Record<string, unknown> | undefined
): ResolvedGuardianGateView {
  const audit = parseGateVerifyAuditViolations(gate);
  const verifyAuditViolations =
    base.source === 'llm_debate' && audit.length > 0 ? audit : undefined;
  const projectionEvidenceAtomsVerifyAligned =
    base.source === 'violation_projection_v1' &&
    base.rows.some((r) => r.evidence_atoms.length > 0);
  return {
    ...base,
    ...(verifyAuditViolations ? { verifyAuditViolations } : {}),
    ...(projectionEvidenceAtomsVerifyAligned ? { projectionEvidenceAtomsVerifyAligned: true } : {}),
  };
}

/**
 * 解析三人格门控展示：优先 payload，其次 explain 镜像。
 * `gate_result.violations` 中的 VERIFY 审计层在 `llm_debate` 时并入 {@link ResolvedGuardianGateView.verifyAuditViolations}。
 */
export function resolveRouteRunGuardianGateView(
  orchestrationResult: OrchestrationResult | null | undefined,
  explainMirror?: RouteRunExplainGuardianMirror | null
): ResolvedGuardianGateView {
  const gate = orchestrationResult?.gate_result as Record<string, unknown> | undefined;
  const fromPayload = gate?.guardian_results ?? gate?.guardianResults;
  const parsedPayload = parseGuardianBundle(fromPayload);
  if (hasGuardianPayload(parsedPayload)) {
    return finalizeGuardianView(
      {
        rows: parsedPayload.rows,
        source: parsedPayload.source,
        is_simulated: parsedPayload.is_simulated,
        debate_summary_zh: parsedPayload.debate_summary_zh,
        debate_latency_ms: parsedPayload.debate_latency_ms,
        debate_shadow_wait_ms: parsedPayload.debate_shadow_wait_ms,
        debate_overlapping_latency_saved_estimate_ms: parsedPayload.debate_overlapping_latency_saved_estimate_ms,
        debate_shadow_triggered_at: parsedPayload.debate_shadow_triggered_at,
        fromExplainMirror: false,
      },
      gate
    );
  }
  const fromExplain = parseGuardianBundle(explainMirror?.guardian_personas);
  if (hasGuardianPayload(fromExplain)) {
    return finalizeGuardianView(
      {
        rows: fromExplain.rows,
        source: fromExplain.source,
        is_simulated: fromExplain.is_simulated,
        debate_summary_zh: fromExplain.debate_summary_zh,
        debate_latency_ms: fromExplain.debate_latency_ms,
        debate_shadow_wait_ms: fromExplain.debate_shadow_wait_ms,
        debate_overlapping_latency_saved_estimate_ms: fromExplain.debate_overlapping_latency_saved_estimate_ms,
        debate_shadow_triggered_at: fromExplain.debate_shadow_triggered_at,
        fromExplainMirror: true,
      },
      gate
    );
  }
  /** 无人格块时仍可能仅有 violations 审计层（llm_debate + VERIFY） */
  const auditOnly = parseGateVerifyAuditViolations(gate);
  if (auditOnly.length > 0) {
  const src = asRecord(gate?.guardian_results);
  const srcFromMirror = explainMirror?.guardian_personas
    ? asRecord(explainMirror.guardian_personas as object)
    : undefined;
    const bundleMeta = src ?? srcFromMirror;
    const source = typeof bundleMeta?.source === 'string' ? bundleMeta.source : undefined;
    if (source === 'llm_debate') {
      return finalizeGuardianView(
        {
          rows: [],
          source,
          is_simulated:
            bundleMeta?.is_simulated === true ||
            bundleMeta?.isSimulated === true ||
            undefined,
          debate_summary_zh: readDebateSummary(bundleMeta ?? {}),
          debate_latency_ms: readNumber(bundleMeta ?? {}, 'debate_latency_ms', 'debateLatencyMs'),
          debate_shadow_wait_ms: readNumber(bundleMeta ?? {}, 'debate_shadow_wait_ms', 'debateShadowWaitMs'),
          debate_overlapping_latency_saved_estimate_ms: readNumber(
            bundleMeta ?? {},
            'debate_overlapping_latency_saved_estimate_ms',
            'debateOverlappingLatencySavedEstimateMs'
          ),
          debate_shadow_triggered_at: readNumber(
            bundleMeta ?? {},
            'debate_shadow_triggered_at',
            'debateShadowTriggeredAt'
          ),
          fromExplainMirror: !src && Boolean(srcFromMirror),
        },
        gate
      );
    }
  }
  return finalizeGuardianView({ rows: [], fromExplainMirror: false }, gate);
}

/** 仅包含有数值的 `options.persona_hint` 字段，避免传空对象。 */
export function compactRouteRunPersonaHint(
  h: RouteRunPersonaHint | undefined
): RouteRunPersonaHint | undefined {
  if (!h) return undefined;
  const out: RouteRunPersonaHint = {};
  if (typeof h.abu_strictness === 'number' && !Number.isNaN(h.abu_strictness)) {
    out.abu_strictness = h.abu_strictness;
  }
  if (typeof h.drdre_tolerance === 'number' && !Number.isNaN(h.drdre_tolerance)) {
    out.drdre_tolerance = h.drdre_tolerance;
  }
  if (typeof h.neptune_creativity === 'number' && !Number.isNaN(h.neptune_creativity)) {
    out.neptune_creativity = h.neptune_creativity;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
