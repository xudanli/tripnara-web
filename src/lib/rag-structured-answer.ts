/**
 * RAG 检索命中 JSON 决策片段时的前端解析与正文拆分（why / decision）。
 */

export interface RagStructuredOutcome {
  decision?: string;
  /** 要点列表，直接渲染为 bullet */
  why: string[];
  /** 结构化块之外的补充说明（Markdown） */
  supplementaryMarkdown?: string;
}

function normalizeWhy(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          const t = o.text ?? o.title ?? o.summary ?? o.body;
          if (typeof t === 'string') return t.trim();
        }
        return String(item ?? '').trim();
      })
      .filter(Boolean);
  }
  if (typeof raw === 'string') return [raw.trim()].filter(Boolean);
  return [];
}

function parseDecision(o: Record<string, unknown>): string | undefined {
  const d = o.decision ?? o.verdict ?? o.status ?? o.result;
  return typeof d === 'string' ? d : undefined;
}

function tryPayload(payload: Record<string, unknown> | null | undefined): RagStructuredOutcome | null {
  if (!payload) return null;
  const candidates = [
    payload.rag_structured_outcome,
    payload.ragStructured,
    payload.rag_structured,
    payload.structured_outcome,
    payload.decision_support,
    payload.decision_support_json,
  ];
  for (const v of candidates) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      const why = normalizeWhy(o.why ?? o.reasons ?? o.bullets ?? o.points);
      const decision = parseDecision(o);
      if (why.length || decision) return { decision, why };
    }
  }
  return null;
}

function tryAnswerText(answerText: string): RagStructuredOutcome | null {
  const trimmed = answerText.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const o = JSON.parse(fenceMatch[1].trim()) as Record<string, unknown>;
      const why = normalizeWhy(o.why ?? o.reasons ?? o.bullets);
      const decision = parseDecision(o);
      if (!why.length && !decision) return null;
      const fenceStart = trimmed.indexOf('```');
      const before = fenceStart > 0 ? trimmed.slice(0, fenceStart).trim() : '';
      return {
        decision,
        why,
        ...(before ? { supplementaryMarkdown: before } : {}),
      };
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith('{')) {
    try {
      const o = JSON.parse(trimmed) as Record<string, unknown>;
      const why = normalizeWhy(o.why ?? o.reasons ?? o.bullets);
      const decision = parseDecision(o);
      if (!why.length && !decision) return null;
      return { decision, why };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 同时识别 payload 嵌套对象与 answer_text 中的 JSON / fenced JSON。
 */
export function extractRagStructuredOutcome(
  answerText: string,
  payload?: Record<string, unknown> | null
): RagStructuredOutcome | null {
  const fromPayload = tryPayload(payload ?? undefined);
  const fromText = tryAnswerText(answerText);
  if (fromPayload && fromText) {
    return {
      decision: fromPayload.decision ?? fromText.decision,
      why: fromPayload.why.length ? fromPayload.why : fromText.why,
      supplementaryMarkdown: fromText.supplementaryMarkdown ?? fromPayload.supplementaryMarkdown,
    };
  }
  return fromPayload ?? fromText;
}

/** 结构化卡片展示后，底部 Markdown 区应展示的正文（避免重复渲染整段 JSON） */
export function assistantBodyAfterStructuredOutcome(message: {
  content: string;
  ragStructured?: RagStructuredOutcome | null;
}): string {
  const raw = typeof message.content === 'string' ? message.content : '';
  const rs = message.ragStructured;
  if (!rs) return raw;
  if (rs.supplementaryMarkdown?.trim()) return rs.supplementaryMarkdown.trim();
  const t = raw.trim();
  const looksStructuredOnly =
    t.startsWith('{') || /^[\s]*```(?:json)?/m.test(t);
  if (looksStructuredOnly) return '';
  return raw;
}
