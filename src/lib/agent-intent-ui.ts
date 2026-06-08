import type { RouteType } from '@/api/agent';

export type InteractionKind = 'planning' | 'lookup' | 'qa' | 'unknown';

/**
 * 由后端任务类型 / route_policy / route 推断 UI 呈现模式（规划管线 vs 咨询/RAG）。
 * `taskType` 建议传入「routing_task_type 解析链」的结果（见 `src/lib/unified-execution-trace.ts`
 * 中 `resolveRoutingTaskType`），勿仅用 `route.task_type` 顶替。
 */
export function inferInteractionKind(
  taskType: string | null | undefined,
  routePolicy: string | null | undefined,
  routeType: RouteType | undefined
): InteractionKind {
  const t = (taskType ?? '').trim().toUpperCase();
  /** 显式 task_type 优先于 route：避免 RAG 长文走了 SYSTEM2 却被误判为「规划」管线 */
  if (t === 'TRIP_PLANNING' || t === 'PLANNING') return 'planning';
  if (t === 'DATA_LOOKUP' || t === 'RAG_LOOKUP') return 'lookup';
  if (t === 'GENERIC_QA' || t === 'QA') return 'qa';

  const rt = (routeType ?? '').trim();
  if (rt === 'SYSTEM1_RAG' || rt === 'SYSTEM1_API') return 'lookup';
  if (rt === 'SYSTEM2_REASONING' || rt === 'SYSTEM2_WEBBROWSE') return 'planning';

  const p = (routePolicy ?? '').toUpperCase();
  if (p.includes('CLAUDE_DYNAMIC')) return 'lookup';

  return 'unknown';
}

function citationRecordToLabel(o: Record<string, unknown>): string | undefined {
  const candidates = [
    o.path,
    o.doc_path,
    o.source_path,
    o.title,
    o.id,
    o.source,
    o.uri,
    o.chunk_id,
    o.chunkId,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return undefined;
}

function normalizeCitationArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === 'string' && x.trim()) out.push(x.trim());
    else if (x && typeof x === 'object') {
      const label = citationRecordToLabel(x as Record<string, unknown>);
      if (label) out.push(label);
    }
  }
  return out;
}

/**
 * 知识库 RAG 引用条数（与脚注分列展示；调试条可并用）。
 */
export function extractKbRagCitationCount(
  payload: Record<string, unknown> | null | undefined
): number | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const n = payload.kb_rag_citation_count ?? payload.kbRagCitationCount;
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  if (typeof n === 'string' && n.trim()) {
    const p = parseInt(n, 10);
    if (!Number.isNaN(p)) return p;
  }
  return undefined;
}

/**
 * 从 route_and_run payload 提取 RAG/知识库引用路径（字段名以后端为准，多键合并去重）。
 * 包含：`rag_sources` / `reference_sources` / `data_lookup_rag_citations` 等。
 */
export function extractRagSources(payload: Record<string, unknown> | null | undefined): string[] | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const p = payload as Record<string, unknown>;
  const merged = new Set<string>();

  const rawLegacy =
    p.rag_sources ??
    p.reference_sources ??
    p.sources ??
    (p.rag as Record<string, unknown> | undefined)?.sources;
  if (Array.isArray(rawLegacy)) {
    for (const s of normalizeCitationArray(rawLegacy)) merged.add(s);
  } else if (typeof rawLegacy === 'string' && rawLegacy.trim()) {
    merged.add(rawLegacy.trim());
  }

  const dataLookup = p.data_lookup_rag_citations ?? p.dataLookupRagCitations;
  for (const s of normalizeCitationArray(dataLookup)) merged.add(s);

  return merged.size ? [...merged] : undefined;
}

export function shouldHidePlanningChrome(kind: InteractionKind): boolean {
  return kind === 'lookup' || kind === 'qa';
}
