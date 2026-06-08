import { toast } from 'sonner';
import { OntologyEvidenceZhCallout, ReadinessEvidenceZhCallout } from '@/lib/ontology-decision-display';

/** 行尾 UUID（rag_chunk:…:uuid） */
const UUID_AT_END = /:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export type ParsedEvidenceRef =
  | { kind: 'rag'; title: string; chunkIdShort: string; raw: string }
  | { kind: 'live_tool'; summary: string; raw: string }
  | { kind: 'ontology_anchor'; label: string; detail: string; raw: string }
  | { kind: 'ontology_road_status'; nodeId: string; summary: string; raw: string }
  | { kind: 'readiness'; summary: string; raw: string }
  | { kind: 'readiness_pack'; summary: string; raw: string }
  | { kind: 'other'; raw: string };

/**
 * 与编排一行级约定一致：`ontology_hard_anchor:`、`ontology_road_status:` 不得作主文案，
 * 仅出现在折叠「技术细节」或 `title` 悬停；同域 `ontology:` 行一并收进技术区。
 * `aggregate=OPEN` 等保留在原始行内供核对。
 */
export function isOntologyNonPrimaryEvidenceRef(raw: string): boolean {
  const t = raw.trim();
  return (
    t.startsWith('ontology_hard_anchor:') ||
    t.startsWith('ontology_road_status:') ||
    t.startsWith('ontology:')
  );
}

/** @deprecated 使用 isOntologyNonPrimaryEvidenceRef */
export const isOntologyTechnicalEvidenceRef = isOntologyNonPrimaryEvidenceRef;

const COUNTRY_ZH: Record<string, string> = { IS: '冰岛', JP: '日本', TH: '泰国' };

const ONTOLOGY_ID_ZH: Record<string, string> = {
  SNAEFELLSNES: '斯奈山半岛',
  SOUTH_COAST: '南岸走廊',
  REYKJAVIK: '雷克雅未克',
  HIGHLANDS: '内陆高地',
};

function humanizeOntologySegment(seg: string): string {
  let s = seg.trim().replace(/^ontology:/i, '');
  const agg = s.match(/:aggregate=(OPEN|CLOSED|LIMITED|UNKNOWN)$/i);
  const base = agg ? s.slice(0, s.length - agg[0].length) : s;
  const m = base.match(/^(region|corridor):([A-Z]{2}):(.+)$/i);
  if (m) {
    const kind = m[1].toLowerCase() === 'region' ? '区域' : '走廊';
    const cc = m[2].toUpperCase();
    const idRaw = m[3].trim();
    const idKey = idRaw.toUpperCase().replace(/-/g, '_');
    const country = COUNTRY_ZH[cc] || cc;
    const place = ONTOLOGY_ID_ZH[idKey] || ONTOLOGY_ID_ZH[idRaw.toUpperCase()] || idRaw.replace(/_/g, ' ');
    let suffix = '';
    if (agg) {
      const v = agg[1].toUpperCase();
      if (v === 'OPEN') suffix = ' · 汇总：开放';
      else if (v === 'CLOSED') suffix = ' · 汇总：关闭';
      else if (v === 'LIMITED') suffix = ' · 汇总：部分开放';
      else suffix = ` · 汇总：${v}`;
    }
    return `${kind}（${country} · ${place}）${suffix}`;
  }
  return seg.trim();
}

/** 技术细节区内：将硬锚 / 本体 detail 转为中文短语（原始行仍单独展示供核对） */
function humanizeOntologyEvidenceDetail(detail: string): string {
  if (!detail.trim()) return detail;
  return detail
    .split(/\s*[·|]\s*/)
    .map((p) => humanizeOntologySegment(p))
    .filter(Boolean)
    .join(' · ');
}

function humanizeRoadStatusLine(nodeId: string, summary: string, raw: string): string {
  const place = humanizeOntologySegment(nodeId) || nodeId;
  const t = `${summary} ${raw}`;
  if (/aggregate\s*=\s*OPEN/i.test(t)) return `${place}：路况依据为「开放」（可通行）`;
  if (/aggregate\s*=\s*CLOSED/i.test(t)) return `${place}：路况依据为「关闭」或受限`;
  if (/aggregate\s*=\s*LIMITED/i.test(t)) return `${place}：路况依据为「部分开放 / 受限」`;
  return `${place}：${summary.replace(/aggregate=/gi, '汇总=')}`;
}

/** 有自然语言摘要时，准备度类技术行（UUID / 内部 id）收进技术细节 */
export function isReadinessTechnicalEvidenceRef(raw: string): boolean {
  const t = raw.trim();
  return t.startsWith('readiness_pack_check:') || t.startsWith('readiness:');
}

/**
 * 将单条 evidence_ref 解析为可读结构（产品线默认：标题优先、技术 ID 弱化）。
 */
export function parseEvidenceRef(ref: string): ParsedEvidenceRef {
  const t = ref.trim();
  if (!t) return { kind: 'other', raw: ref };

  if (t.startsWith('rag_chunk:')) {
    const body = t.slice('rag_chunk:'.length);
    const m = body.match(UUID_AT_END);
    if (m) {
      const id = m[1];
      let title = body.slice(0, body.length - m[0].length);
      title = title.replace(/_full$/i, '').trim();
      return {
        kind: 'rag',
        title: title || '知识库片段',
        chunkIdShort: `${id.slice(0, 8)}…`,
        raw: t,
      };
    }
    const cleaned = body.replace(/_full$/i, '').trim();
    return { kind: 'rag', title: cleaned || '知识库片段', chunkIdShort: '—', raw: t };
  }

  if (t.startsWith('ontology_hard_anchor:')) {
    const body = t.slice('ontology_hard_anchor:'.length).trim();
    const label = '本体硬锚';
    const detail = body.replace(/\|/g, ' · ') || body;
    return { kind: 'ontology_anchor', label, detail, raw: t };
  }

  if (t.startsWith('ontology_road_status:')) {
    const rest = t.slice('ontology_road_status:'.length);
    // 形如 ontology:region:IS:XXX:aggregate=OPEN — nodeId 内含多级冒号，不能用首个 ':' 切
    const mAgg = rest.match(/^(.+):aggregate=(.+)$/i);
    if (mAgg) {
      return {
        kind: 'ontology_road_status',
        nodeId: mAgg[1].trim() || '—',
        summary: `aggregate=${mAgg[2].trim()}`,
        raw: t,
      };
    }
    const colon = rest.indexOf(':');
    const nodeId = colon >= 0 ? rest.slice(0, colon) : rest;
    const tail = colon >= 0 ? rest.slice(colon + 1) : '';
    const summary = tail ? tail.replace(/aggregate=/i, 'aggregate=') : '路况绑定';
    return { kind: 'ontology_road_status', nodeId: nodeId || '—', summary, raw: t };
  }

  if (t.startsWith('ontology:')) {
    const body = t.slice('ontology:'.length).trim();
    const detail = body.replace(/\|/g, ' · ') || body;
    return { kind: 'ontology_anchor', label: '本体', detail, raw: t };
  }

  if (t.startsWith('readiness_pack_check:')) {
    const rest = t.slice('readiness_pack_check:'.length).trim();
    const short =
      rest.length > 18 ? `${rest.slice(0, 8)}…${rest.slice(-4)}` : rest || '—';
    return { kind: 'readiness_pack', summary: `准备度 pack 校验 · ${short}`, raw: t };
  }

  if (t.startsWith('readiness:')) {
    return { kind: 'readiness', summary: '就绪度 / 阻断检查', raw: t };
  }

  if (t.startsWith('live_tool:')) {
    let summary = '外部工具调用';
    if (t.includes('car_rental')) summary = '租车询价（实时 MCP）';
    else if (t.includes('hotel')) summary = '酒店查询（实时 MCP）';
    else if (t.includes('flight')) summary = '航班查询（实时 MCP）';
    else if (t.includes('weather')) summary = '天气查询（实时 MCP）';
    return { kind: 'live_tool', summary, raw: t };
  }

  return { kind: 'other', raw: t };
}

function groupEvidenceRefs(refs: string[]) {
  const parsed = refs.map(parseEvidenceRef);
  return {
    rag: parsed.filter((p): p is Extract<ParsedEvidenceRef, { kind: 'rag' }> => p.kind === 'rag'),
    tools: parsed.filter((p): p is Extract<ParsedEvidenceRef, { kind: 'live_tool' }> => p.kind === 'live_tool'),
    ontologyAnchors: parsed.filter(
      (p): p is Extract<ParsedEvidenceRef, { kind: 'ontology_anchor' }> => p.kind === 'ontology_anchor'
    ),
    ontologyRoad: parsed.filter(
      (p): p is Extract<ParsedEvidenceRef, { kind: 'ontology_road_status' }> => p.kind === 'ontology_road_status'
    ),
    readiness: parsed.filter((p): p is Extract<ParsedEvidenceRef, { kind: 'readiness' }> => p.kind === 'readiness'),
    readinessPack: parsed.filter(
      (p): p is Extract<ParsedEvidenceRef, { kind: 'readiness_pack' }> => p.kind === 'readiness_pack'
    ),
    other: parsed.filter((p): p is Extract<ParsedEvidenceRef, { kind: 'other' }> => p.kind === 'other'),
  };
}

/** 折叠区：本体类 ref */
function OntologyTechnicalRefsBody({ refs }: { refs: string[] }) {
  if (refs.length === 0) return null;
  const { ontologyAnchors, ontologyRoad } = groupEvidenceRefs(refs);
  if (ontologyAnchors.length === 0 && ontologyRoad.length === 0) {
    return (
      <ul className="space-y-1">
        {refs.map((r, i) => (
          <li key={i} className="font-mono text-[10px] text-muted-foreground break-all leading-snug" title={r}>
            {r}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-2">
      {ontologyAnchors.length > 0 ? (
        <ul className="space-y-2">
          {ontologyAnchors.map((item, i) => (
            <li key={`oa-${i}`} className="pl-2 border-l-2 border-violet-400/50 space-y-0.5">
              <div className="text-[11px] leading-snug text-foreground/90">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground"> — {humanizeOntologyEvidenceDetail(item.detail)}</span>
              </div>
              <div className="font-mono text-[9px] text-muted-foreground/90 break-all leading-snug" title="原始 evidence_ref">
                {item.raw}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {ontologyRoad.length > 0 ? (
        <ul className="space-y-2">
          {ontologyRoad.map((item, i) => (
            <li key={`or-${i}`} className="pl-2 border-l-2 border-amber-400/45 space-y-0.5">
              <div className="text-[11px] leading-snug text-foreground/90">
                {humanizeRoadStatusLine(item.nodeId, item.summary, item.raw)}
              </div>
              <div className="font-mono text-[9px] text-muted-foreground/90 break-all leading-snug" title="原始 evidence_ref">
                {item.raw}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatReadinessTechnicalLine(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('readiness_pack_check:')) {
    const rest = t.slice('readiness_pack_check:'.length).trim();
    const short =
      rest.length > 18 ? `${rest.slice(0, 8)}…${rest.slice(-4)}` : rest || '—';
    return `准备度 pack 校验 · ${short}`;
  }
  if (t.startsWith('readiness:')) return '就绪度引用';
  return t;
}

/** 折叠区：准备度类 ref（中文摘要 + 原始行，与本体区一致） */
function ReadinessTechnicalRefsBody({ refs }: { refs: string[] }) {
  if (refs.length === 0) return null;
  return (
    <ul className="space-y-2">
      {refs.map((r, i) => (
        <li key={i} className="pl-2 border-l-2 border-sky-400/50 space-y-0.5">
          <div className="text-[11px] leading-snug text-foreground/90">
            <span className="font-medium">准备度</span>
            <span className="text-muted-foreground"> — {formatReadinessTechnicalLine(r)}</span>
          </div>
          <div className="font-mono text-[9px] text-muted-foreground/90 break-all leading-snug" title="原始 evidence_ref">
            {r}
          </div>
        </li>
      ))}
    </ul>
  );
}

function TechnicalEvidenceDetailsBody({ refs }: { refs: string[] }) {
  const ont = refs.filter(isOntologyNonPrimaryEvidenceRef);
  const rd = refs.filter((r) => !isOntologyNonPrimaryEvidenceRef(r));
  if (ont.length === 0 && rd.length === 0) return null;
  return (
    <div className="space-y-3">
      {ont.length > 0 ? (
        <div>
          <div className="text-[9px] font-medium text-muted-foreground mb-1">
            本体 / 路况（中文摘要；下方等宽为原始 evidence_ref，含 aggregate= 供核对）
          </div>
          <OntologyTechnicalRefsBody refs={ont} />
        </div>
      ) : null}
      {rd.length > 0 ? (
        <div>
          <div className="text-[9px] font-medium text-muted-foreground mb-1">
            准备度 / 就绪（摘要；下方为 readiness_* 原始行供核对）
          </div>
          <ReadinessTechnicalRefsBody refs={rd} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * 决策日志「证据引用」：`ontology_evidence_display_zh` 置顶为「依据说明」；
 * `ontology_hard_anchor:`、`ontology_road_status:`、`ontology:` 仅出现在折叠「技术细节」或悬停。
 *
 * 准备度**已对接**（不再要求 `evidence_refs` 必含 readiness 行）：`readiness_evidence_display_zh` 非空，
 * 或 `readiness_technical_evidence_refs` 中至少一条以 `readiness_pack_check:` / `readiness:` 开头；`evidence_refs` 内旧式 readiness 行仍合并进「技术细节」并参与对接判断。
 * 有自然语言 zh 时顶部展示「依据说明（准备度）」；**不在主区重复** pack 校验摘要框（与「技术细节」内准备度块二选一展示位，避免重复）。
 */
export function EvidenceRefsReadable({
  refs,
  ontologyEvidenceDisplayZh,
  readinessEvidenceDisplayZh,
  readinessTechnicalEvidenceRefs,
  outputsSummary,
}: {
  refs: string[];
  /** 与 `decision_log[i].ontology_evidence_display_zh`（或 result / unified_execution_trace）同源，由调用方注入 */
  ontologyEvidenceDisplayZh?: string | null;
  /** `decision_log[i].readiness_evidence_display_zh`（或 result / trace 冗余） */
  readinessEvidenceDisplayZh?: string | null;
  /** `decision_log[i].readiness_technical_evidence_refs`：与 evidence_refs 解耦的准备度技术行 */
  readinessTechnicalEvidenceRefs?: string[] | null;
  /** 编排摘要；仅当摘要声明准备度且本步无任何对接信号时出现说明 */
  outputsSummary?: string | null;
}) {
  const ontologyZh =
    typeof ontologyEvidenceDisplayZh === 'string' && ontologyEvidenceDisplayZh.trim()
      ? ontologyEvidenceDisplayZh.trim()
      : null;
  const readinessZh =
    typeof readinessEvidenceDisplayZh === 'string' && readinessEvidenceDisplayZh.trim()
      ? readinessEvidenceDisplayZh.trim()
      : null;
  const outputsSummaryTrim =
    typeof outputsSummary === 'string' && outputsSummary.trim() ? outputsSummary.trim() : null;

  const readinessDedicated = Array.isArray(readinessTechnicalEvidenceRefs)
    ? readinessTechnicalEvidenceRefs.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const hasReadinessPackCheckInDedicated = readinessDedicated.some((r) =>
    r.startsWith('readiness_pack_check:') || r.startsWith('readiness:')
  );
  const readinessFromLegacyEvidenceRefs = refs.filter(isReadinessTechnicalEvidenceRef);
  /** 与编排契约一致：zh 非空，或专用 technical 数组含 readiness_* 行，或 evidence_refs 内旧式 readiness 行 */
  const readinessWired =
    Boolean(readinessZh) ||
    hasReadinessPackCheckInDedicated ||
    readinessFromLegacyEvidenceRefs.length > 0;

  /** 本体、准备度技术行一律进「技术细节」；准备度专用数组全量并入（不限于 readiness_* 前缀） */
  const techOnt = refs.filter(isOntologyNonPrimaryEvidenceRef);
  const techRd = Array.from(new Set([...readinessDedicated, ...readinessFromLegacyEvidenceRefs]));

  const technicalRefsMerged = Array.from(new Set([...techOnt, ...techRd]));

  const primaryRefs = refs.filter(
    (r) => !isOntologyNonPrimaryEvidenceRef(r) && !isReadinessTechnicalEvidenceRef(r)
  );

  const { rag, tools, other } = groupEvidenceRefs(primaryRefs);
  const rawAll = Array.from(new Set([...refs, ...readinessDedicated])).join('\n');

  const copyRaw = async () => {
    try {
      await navigator.clipboard.writeText(rawAll);
      toast.success('已复制完整引用');
    } catch {
      toast.error('复制失败');
    }
  };

  const hasOntologyRefs = refs.some(isOntologyNonPrimaryEvidenceRef);
  const summaryMentionsReadiness =
    outputsSummaryTrim != null &&
    /准备度|Readiness|readiness|就绪/i.test(outputsSummaryTrim);
  const showReadinessMissingHint = summaryMentionsReadiness && !readinessWired;

  return (
    <div className="mt-1.5 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-foreground/85">证据引用</span>
        <button
          type="button"
          className="text-[10px] text-primary hover:underline shrink-0"
          onClick={() => void copyRaw()}
        >
          复制完整标识符
        </button>
      </div>

      {ontologyZh ? <OntologyEvidenceZhCallout text={ontologyZh} /> : null}
      {readinessZh ? <ReadinessEvidenceZhCallout text={readinessZh} /> : null}

      {showReadinessMissingHint ? (
        <div className="rounded-md bg-sky-50/50 px-2 py-1.5 border border-sky-200/60 text-[11px] text-muted-foreground leading-snug space-y-1.5">
          <p>
            本步摘要提到<strong className="text-foreground/90 font-medium">准备度</strong>
            ，但当前条目上<strong className="text-foreground/85">没有对接信号</strong>
            ：既无 <code className="text-[9px]">readiness_evidence_display_zh</code>，也无{' '}
            <code className="text-[9px]">readiness_technical_evidence_refs</code> 中含{' '}
            <code className="text-[9px]">readiness_pack_check:</code> / <code className="text-[9px]">readiness:</code>
            的行，且 <code className="text-[9px]">evidence_refs</code> 内也无上述旧式 readiness 行。
          </p>
          <details className="text-[10px]">
            <summary className="cursor-pointer text-primary/90 hover:underline select-none">
              对接 / 联调说明
            </summary>
            <div className="mt-1.5 border-l-2 border-sky-300/60 pl-2 space-y-1.5 text-muted-foreground">
              <p>
                编排应在 <code className="text-[9px]">decision_log[]</code> 上至少提供其一：非空的{' '}
                <code className="text-[9px]">readiness_evidence_display_zh</code>，或在{' '}
                <code className="text-[9px]">readiness_technical_evidence_refs</code> 中写入以{' '}
                <code className="text-[9px]">readiness_pack_check:</code>（推荐）或 <code className="text-[9px]">readiness:</code>{' '}
                开头的行；<strong className="text-foreground/85">不必</strong>再写入{' '}
                <code className="text-[9px]">evidence_refs</code>。
              </p>
              <p>
                浏览器 / App 联调时请确认请求打到的 <code className="text-[9px]">POST /api/agent/route_and_run</code>{' '}
                与当前后端版本一致（例如 Vite 代理的 <code className="text-[9px]">VITE_BACKEND_HOST</code> /{' '}
                <code className="text-[9px]">VITE_API_BASE_URL</code> 未指向旧容器或旧构建），避免 Network 里 200
                但响应体仍是旧契约。
              </p>
            </div>
          </details>
        </div>
      ) : null}

      {hasOntologyRefs && !ontologyZh ? (
        <p className="text-[11px] text-muted-foreground leading-snug rounded-md bg-muted/30 px-2 py-1.5 border border-border/50">
          已引用<strong className="text-foreground/90 font-medium">地图与路况本体</strong>（区域 / 走廊是否开放等）。请优先阅读下方「知识库片段」里的攻略说明；若需核对系统内部标识，展开「技术细节」即可。
        </p>
      ) : null}

      {tools.length > 0 ? (
        <div className="rounded-md border border-border/60 bg-background/60 px-2 py-1.5">
          <div className="text-[10px] font-medium text-muted-foreground mb-1">实时数据 / 工具</div>
          <ul className="space-y-1">
            {tools.map((item, i) => (
              <li key={i} className="text-[11px] leading-snug text-foreground/90 pl-2 border-l-2 border-sky-400/50">
                {item.summary}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rag.length > 0 ? (
        <div className="rounded-md border border-border/60 bg-background/60 px-2 py-1.5">
          <div className="text-[10px] font-medium text-muted-foreground mb-1">知识库片段</div>
          <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-snug text-foreground/90 marker:text-muted-foreground">
            {rag.map((item, i) => (
              <li key={i}>
                <span>{item.title}</span>
                <span className="ml-1 font-mono text-[10px] text-muted-foreground" title={item.raw}>
                  {item.chunkIdShort}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {other.length > 0 ? (
        <div className="rounded-md border border-dashed border-border/70 px-2 py-1.5">
          <div className="text-[10px] font-medium text-muted-foreground mb-1">其他</div>
          <ul className="space-y-1">
            {other.map((item, i) => (
              <li
                key={i}
                className="text-[10px] font-mono text-muted-foreground break-all cursor-default"
                title={item.raw}
              >
                {item.raw}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {technicalRefsMerged.length > 0 ? (
        <details className="rounded-md border border-border/70 bg-muted/15">
          <summary className="cursor-pointer px-2 py-1.5 text-[10px] font-medium text-muted-foreground select-none hover:text-foreground">
            技术细节（ontology_hard_anchor / ontology_road_status 原始 evidence_ref、准备度检查 ID 等）
          </summary>
          <div className="border-t border-border/50 px-2 py-2">
            <TechnicalEvidenceDetailsBody refs={technicalRefsMerged} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
