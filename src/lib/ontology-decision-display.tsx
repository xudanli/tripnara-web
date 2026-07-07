import type { DecisionLogEntry } from '@/api/agent';
import type { DecisionLogEntry as TripDecisionLogEntry, OntologyHardAnchorSnapshot } from '@/types/trip';

/** 与后端 `result.ontology_hard_anchor` 对齐的可序列化子集 */
export type OntologyHardAnchorData = OntologyHardAnchorSnapshot;

export interface OntologyRoadStatusProviderInfo {
  ms?: number;
  [key: string]: unknown;
}

export interface OntologyHardAnchorAppendix {
  ontology_road_status_provider?: OntologyRoadStatusProviderInfo;
  [key: string]: unknown;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function unifiedTraceFrom(rec: Record<string, unknown>): Record<string, unknown> | null {
  const u = rec.unified_execution_trace ?? rec.unifiedExecutionTrace;
  return isRecord(u) ? u : null;
}

function pickOntologyZh(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * 决策日志「依据说明（本体 / 路况）」文案来源（多处冗余、内容一致，按序取首个非空）：
 * 1. `decision_log[i].ontology_evidence_display_zh`（或驼峰 `ontologyEvidenceDisplayZh`）
 * 2. `…unified_execution_trace.ontology_evidence_display_zh`（及驼峰）
 * 3. `result.ontology_evidence_display_zh`（及驼峰）→ `result.payload.unified_execution_trace…`
 * 亦扫描 `metadata` / `metadata.result` 等行程面板落库路径。
 */
export function extractOntologyEvidenceDisplayZh(
  log: Record<string, unknown> | null | undefined
): string | null {
  if (!log) return null;

  const fromEntryRoot =
    pickOntologyZh(log.ontology_evidence_display_zh) ||
    pickOntologyZh(log.ontologyEvidenceDisplayZh);
  if (fromEntryRoot) return fromEntryRoot;

  const tryUet = (uet: Record<string, unknown> | null): string | null => {
    if (!uet) return null;
    return (
      pickOntologyZh(uet.ontology_evidence_display_zh) ||
      pickOntologyZh(uet.ontologyEvidenceDisplayZh) ||
      null
    );
  };

  const tryResult = (result: Record<string, unknown> | null): string | null => {
    if (!result) return null;
    const fromResult =
      pickOntologyZh(result.ontology_evidence_display_zh) ||
      pickOntologyZh(result.ontologyEvidenceDisplayZh);
    if (fromResult) return fromResult;
    const payload = result.payload;
    if (isRecord(payload)) {
      const fromPayload = tryUet(unifiedTraceFrom(payload));
      if (fromPayload) return fromPayload;
    }
    return null;
  };

  const fromTopTrace = tryUet(unifiedTraceFrom(log));
  if (fromTopTrace) return fromTopTrace;

  const r = log.result;
  if (isRecord(r)) {
    const fromLog = tryResult(r);
    if (fromLog) return fromLog;
  }

  const meta = log.metadata;
  if (isRecord(meta)) {
    const fromMetaUet = tryUet(unifiedTraceFrom(meta));
    if (fromMetaUet) return fromMetaUet;
    const payload = meta.payload;
    if (isRecord(payload)) {
      const fromMetaPayload = tryUet(unifiedTraceFrom(payload));
      if (fromMetaPayload) return fromMetaPayload;
    }
    const mr = meta.result;
    if (isRecord(mr)) {
      const nested = tryResult(mr);
      if (nested) return nested;
    }
  }

  return null;
}

export function extractTripDecisionOntologyEvidenceDisplayZh(log: TripDecisionLogEntry): string | null {
  const meta = log.metadata as Record<string, unknown> | undefined;
  if (!meta) return null;
  const fromMetaRoot =
    pickOntologyZh(meta.ontology_evidence_display_zh) ||
    pickOntologyZh(meta.ontologyEvidenceDisplayZh);
  if (fromMetaRoot) return fromMetaRoot;
  const nestedResult = meta.result;
  return extractOntologyEvidenceDisplayZh({
    result: isRecord(nestedResult) ? nestedResult : undefined,
    metadata: meta,
  });
}

/** 决策日志内：自然语言本体/路况结论（优先于 URI 行展示） */
export function OntologyEvidenceZhCallout({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-gate-allow-border/90 bg-muted/65 px-2.5 py-2 text-[12px] leading-relaxed text-foreground/95">
      <div className="text-[10px] font-semibold text-success/90 mb-1">依据说明（本体 / 路况）</div>
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}

/**
 * 决策日志「依据说明（准备度）」文案来源（与本体字段族一致：根 → trace → result / metadata）。
 * **已对接**条件之一：`readiness_evidence_display_zh?.trim().length > 0`。
 */
export function extractReadinessEvidenceDisplayZh(
  log: Record<string, unknown> | null | undefined
): string | null {
  if (!log) return null;

  const fromEntryRoot =
    pickOntologyZh(log.readiness_evidence_display_zh) ||
    pickOntologyZh(log.readinessEvidenceDisplayZh);
  if (fromEntryRoot) return fromEntryRoot;

  const tryUet = (uet: Record<string, unknown> | null): string | null => {
    if (!uet) return null;
    return (
      pickOntologyZh(uet.readiness_evidence_display_zh) ||
      pickOntologyZh(uet.readinessEvidenceDisplayZh) ||
      null
    );
  };

  const tryResult = (result: Record<string, unknown> | null): string | null => {
    if (!result) return null;
    const fromResult =
      pickOntologyZh(result.readiness_evidence_display_zh) ||
      pickOntologyZh(result.readinessEvidenceDisplayZh);
    if (fromResult) return fromResult;
    const payload = result.payload;
    if (isRecord(payload)) {
      const fromPayload = tryUet(unifiedTraceFrom(payload));
      if (fromPayload) return fromPayload;
    }
    return null;
  };

  const fromTopTrace = tryUet(unifiedTraceFrom(log));
  if (fromTopTrace) return fromTopTrace;

  const r = log.result;
  if (isRecord(r)) {
    const fromLog = tryResult(r);
    if (fromLog) return fromLog;
  }

  const meta = log.metadata;
  if (isRecord(meta)) {
    const fromMetaUet = tryUet(unifiedTraceFrom(meta));
    if (fromMetaUet) return fromMetaUet;
    const payload = meta.payload;
    if (isRecord(payload)) {
      const fromMetaPayload = tryUet(unifiedTraceFrom(payload));
      if (fromMetaPayload) return fromMetaPayload;
    }
    const mr = meta.result;
    if (isRecord(mr)) {
      const nested = tryResult(mr);
      if (nested) return nested;
    }
  }

  return null;
}

function pickReadinessTechnicalStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out = v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
  return out.length > 0 ? out : null;
}

/**
 * 从编排/行程对象上收集 `readiness_technical_evidence_refs`（蛇形 / 驼峰），
 * 扫描根、`result`、`metadata`、`metadata.result`。
 */
export function extractReadinessTechnicalEvidenceRefs(
  log: Record<string, unknown> | null | undefined
): string[] {
  if (!log) return [];
  const top =
    pickReadinessTechnicalStringArray(log.readiness_technical_evidence_refs) ??
    pickReadinessTechnicalStringArray(log.readinessTechnicalEvidenceRefs);
  if (top?.length) return top;

  const r = log.result;
  if (isRecord(r)) {
    const fromR =
      pickReadinessTechnicalStringArray(r.readiness_technical_evidence_refs) ??
      pickReadinessTechnicalStringArray(r.readinessTechnicalEvidenceRefs);
    if (fromR?.length) return fromR;
  }

  const meta = log.metadata;
  if (isRecord(meta)) {
    const fromM =
      pickReadinessTechnicalStringArray(meta.readiness_technical_evidence_refs) ??
      pickReadinessTechnicalStringArray(meta.readinessTechnicalEvidenceRefs);
    if (fromM?.length) return fromM;
    const mr = meta.result;
    if (isRecord(mr)) {
      const fromMr =
        pickReadinessTechnicalStringArray(mr.readiness_technical_evidence_refs) ??
        pickReadinessTechnicalStringArray(mr.readinessTechnicalEvidenceRefs);
      if (fromMr?.length) return fromMr;
    }
  }

  return [];
}

export function extractTripDecisionReadinessTechnicalEvidenceRefs(log: TripDecisionLogEntry): string[] {
  const meta = log.metadata as Record<string, unknown> | undefined;
  if (!meta) return [];
  return extractReadinessTechnicalEvidenceRefs({
    readiness_technical_evidence_refs: meta.readiness_technical_evidence_refs,
    readinessTechnicalEvidenceRefs: meta.readinessTechnicalEvidenceRefs,
    result: isRecord(meta.result) ? (meta.result as Record<string, unknown>) : undefined,
    metadata: meta,
  });
}

export function extractTripDecisionReadinessEvidenceDisplayZh(log: TripDecisionLogEntry): string | null {
  const meta = log.metadata as Record<string, unknown> | undefined;
  if (!meta) return null;
  const fromMetaRoot =
    pickOntologyZh(meta.readiness_evidence_display_zh) ||
    pickOntologyZh(meta.readinessEvidenceDisplayZh);
  if (fromMetaRoot) return fromMetaRoot;
  const nestedResult = meta.result;
  return extractReadinessEvidenceDisplayZh({
    result: isRecord(nestedResult) ? nestedResult : undefined,
    metadata: meta,
  });
}

/** 决策日志内：自然语言准备度 / 就绪结论（优先于 readiness_pack_check UUID 行） */
export function ReadinessEvidenceZhCallout({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-border/90 bg-muted/70 px-2.5 py-2 text-[12px] leading-relaxed text-foreground/95">
      <div className="text-[10px] font-semibold text-muted-foreground/90 mb-1">依据说明（准备度 / 就绪）</div>
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function hasAnchorSignal(o: Record<string, unknown>): boolean {
  const ids = o.matched_node_ids;
  const labels = o.labels_zh;
  const road = o.road_status_by_node;
  return (
    (Array.isArray(ids) && ids.length > 0) ||
    (Array.isArray(labels) && labels.length > 0) ||
    (isRecord(road) && Object.keys(road).length > 0)
  );
}

export function extractOntologyHardAnchorFromMeta(
  meta: Record<string, unknown> | null | undefined
): OntologyHardAnchorData | null {
  if (!meta) return null;
  const direct = meta.ontology_hard_anchor;
  if (isRecord(direct) && hasAnchorSignal(direct)) return direct as OntologyHardAnchorData;
  const result = meta.result;
  if (isRecord(result)) {
    const inner = result.ontology_hard_anchor;
    if (isRecord(inner) && hasAnchorSignal(inner)) return inner as OntologyHardAnchorData;
  }
  return null;
}

export function extractOntologyAppendix(
  meta: Record<string, unknown> | null | undefined,
  stepsPayload: unknown
): OntologyHardAnchorAppendix | null {
  if (meta?.ontology_hard_anchor_appendix && isRecord(meta.ontology_hard_anchor_appendix)) {
    return meta.ontology_hard_anchor_appendix as OntologyHardAnchorAppendix;
  }
  const fromMetaSteps = meta?.stepsExecuted ?? meta?.steps_executed;
  if (isRecord(fromMetaSteps)) {
    const ap = fromMetaSteps.ontology_hard_anchor_appendix;
    if (isRecord(ap)) return ap as OntologyHardAnchorAppendix;
  }
  if (isRecord(stepsPayload)) {
    const ap = stepsPayload.ontology_hard_anchor_appendix;
    if (isRecord(ap)) return ap as OntologyHardAnchorAppendix;
  }
  return null;
}

/** 行程决策 API 条目的 evidence_refs（camel / snake） */
export function getTripDecisionEvidenceRefs(log: TripDecisionLogEntry): string[] {
  const m = log.metadata as Record<string, unknown> | undefined;
  if (!m) return [];
  const raw = m.evidenceRefs ?? m.evidence_refs;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x)).filter(Boolean);
}

function formatRoadQueryRow(key: string, val: unknown): string {
  if (!isRecord(val)) return `${key}: ${String(val)}`;
  const access = val.accessState ?? val.access_state;
  const cond = val.condition;
  const src = val.source;
  const parts = [access && `access=${access}`, cond && `cond=${cond}`, src && `src=${src}`].filter(Boolean);
  return parts.length ? `${key}（${parts.join(' · ')}）` : `${key}`;
}

/** 结构化展示本体硬锚 + 路段真值（与 rag_chunk 并列可见） */
export function OntologyHardAnchorBlock({ data }: { data: OntologyHardAnchorSnapshot }) {
  const ids = data.matched_node_ids ?? [];
  const labels = data.labels_zh ?? [];
  const road = data.road_status_by_node;
  const hasRoad = isRecord(road) && Object.keys(road).length > 0;
  if (ids.length === 0 && labels.length === 0 && !hasRoad) return null;

  return (
    <div className="mt-1.5 rounded-md border border-border/80 bg-muted/50 px-2 py-1.5 text-[11px] leading-snug space-y-1.5">
      <div className="font-medium text-muted-foreground/95">本体命中</div>
      {labels.length > 0 ? (
        <ul className="list-disc pl-4 space-y-0.5 text-foreground/90">
          {labels.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      ) : null}
      {ids.length > 0 ? (
        <div className="text-muted-foreground">
          <span className="font-medium text-foreground/80">节点 ID：</span>
          <span className="font-mono text-[10px] break-all">{ids.join('、')}</span>
        </div>
      ) : null}
      {hasRoad && road ? (
        <details className="group rounded border border-border/90 bg-white/60 px-1.5 py-1">
          <summary className="cursor-pointer text-[10px] font-medium text-muted-foreground/90 select-none">
            路段 accessState / aggregate
          </summary>
          <div className="mt-1.5 space-y-2 pl-0.5">
            {Object.entries(road).map(([nodeId, payload]) => (
              <div key={nodeId} className="border-l-2 border-border/60 pl-2">
                <div className="font-mono text-[10px] text-foreground/85 break-all">{nodeId}</div>
                {isRecord(payload) ? (
                  <div className="mt-0.5 space-y-1 text-[10px] text-muted-foreground">
                    {payload.aggregate != null && (
                      <div>
                        <span className="text-foreground/75">aggregate：</span>
                        <span className="font-mono">{String(payload.aggregate)}</span>
                      </div>
                    )}
                    {Object.entries(payload)
                      .filter(([k]) => k !== 'aggregate')
                      .map(([k, v]) => (
                        <div key={k} className="pl-1 border-l border-border/60">
                          <span className="text-foreground/70">{k}</span>
                          <span className="mx-1">→</span>
                          <span>{formatRoadQueryRow(k, v)}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-[10px]">{String(payload)}</div>
                )}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function OntologyAppendixLine({ appendix }: { appendix: OntologyHardAnchorAppendix }) {
  const prov = appendix.ontology_road_status_provider;
  if (!isRecord(prov)) return null;
  const ms = typeof prov.ms === 'number' ? prov.ms : prov.duration_ms;
  const label =
    typeof prov.name === 'string'
      ? prov.name
      : typeof prov.provider === 'string'
        ? prov.provider
        : 'ontology_road_status_provider';
  return (
    <div className="mt-1 text-[10px] text-muted-foreground border-t border-border/80 pt-1">
      <span className="font-medium text-foreground/75">路况真值来源：</span>
      {label}
      {typeof ms === 'number' ? <span className="ml-1 font-mono">（{ms} ms）</span> : null}
    </div>
  );
}

/** Agent 编排单步：自然语言摘要 + 结构化本体（有中文摘要时结构化默认折叠） */
export function OntologyDecisionStepExtras({ log }: { log: DecisionLogEntry }) {
  const asRecord = log as unknown as Record<string, unknown>;
  const displayZh = extractOntologyEvidenceDisplayZh(asRecord);
  const meta = log.metadata as Record<string, unknown> | undefined;
  const extended = log as DecisionLogEntry & {
    result?: { ontology_hard_anchor?: OntologyHardAnchorSnapshot };
    stepsExecuted?: Record<string, unknown>;
    steps_executed?: Record<string, unknown>;
  };
  const anchor =
    extended.result?.ontology_hard_anchor ??
    extractOntologyHardAnchorFromMeta(meta);
  const stepsPayload = extended.stepsExecuted ?? extended.steps_executed;
  const appendix = extractOntologyAppendix(meta, stepsPayload);

  if (!displayZh && !anchor && !appendix) return null;

  const structured = (
    <>
      {anchor ? <OntologyHardAnchorBlock data={anchor} /> : null}
      {appendix ? <OntologyAppendixLine appendix={appendix} /> : null}
    </>
  );

  return (
    <div className="mt-1 space-y-2">
      {anchor || appendix ? (
        displayZh ? (
          <details className="rounded-md border border-border/90 bg-muted/20 text-[11px]">
            <summary className="cursor-pointer px-2 py-1.5 font-medium text-muted-foreground select-none hover:text-foreground">
              结构化本体命中（供核对）
            </summary>
            <div className="border-t border-border/50 px-2 py-2 space-y-1">{structured}</div>
          </details>
        ) : (
          <div className="space-y-0">{structured}</div>
        )
      ) : null}
    </div>
  );
}

/** 行程 GET decision-log 单条：中文摘要 + metadata 上的本体块 */
export function OntologyTripDecisionExtras({ log }: { log: TripDecisionLogEntry }) {
  const meta = log.metadata as Record<string, unknown> | undefined;
  const displayZh = extractTripDecisionOntologyEvidenceDisplayZh(log);
  const anchor = extractOntologyHardAnchorFromMeta(meta);
  const stepsPayload = meta?.stepsExecuted ?? meta?.steps_executed;
  const appendix = extractOntologyAppendix(meta, stepsPayload);
  if (!displayZh && !anchor && !appendix) return null;

  const structured = (
    <>
      {anchor ? <OntologyHardAnchorBlock data={anchor} /> : null}
      {appendix ? <OntologyAppendixLine appendix={appendix} /> : null}
    </>
  );

  return (
    <div className="mt-2 space-y-2">
      {anchor || appendix ? (
        displayZh ? (
          <details className="rounded-md border border-border/90 bg-muted/20 text-[11px]">
            <summary className="cursor-pointer px-2 py-1.5 font-medium text-muted-foreground select-none hover:text-foreground">
              结构化本体命中（供核对）
            </summary>
            <div className="border-t border-border/50 px-2 py-2 space-y-1">{structured}</div>
          </details>
        ) : (
          <div className="space-y-0">{structured}</div>
        )
      ) : null}
    </div>
  );
}
