/**
 * Gateway causalStoryView / causalTraceRef 归一化 — causal-trace-v1
 */
import type {
  CausalStoryChainNode,
  CausalStoryRecommendedOption,
  CausalStoryView,
  CausalTraceReference,
  CausalTraceReplayView,
} from '@/types/causal-trace';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readString(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function readStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw.map((item) => String(item).trim()).filter(Boolean);
  return items.length ? items : undefined;
}

export function normalizeCausalTraceReference(raw: unknown): CausalTraceReference | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const traceId = readString(record.traceId ?? record.trace_id);
  const worldStateVersion = readString(record.worldStateVersion ?? record.world_state_version);
  const protocolVersion = readString(record.protocolVersion ?? record.protocol_version);

  if (!traceId || !worldStateVersion) return undefined;

  return {
    traceId,
    worldStateVersion,
    protocolVersion:
      protocolVersion === 'causal-trace-v1' ? 'causal-trace-v1' : 'causal-trace-v1',
  };
}

function normalizeRecommendedOption(raw: unknown): CausalStoryRecommendedOption | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const optionId = readString(record.optionId ?? record.option_id);
  const summary = readString(record.summary);
  if (!optionId || !summary) return undefined;

  return {
    optionId,
    summary,
    expectedImprovement: readString(record.expectedImprovement ?? record.expected_improvement),
    tradeoff: readString(record.tradeoff),
  };
}

function normalizeChainNode(raw: unknown): CausalStoryChainNode | null {
  const record = asRecord(raw);
  if (!record) return null;

  const nodeId = readString(record.nodeId ?? record.node_id);
  const type = readString(record.type);
  const title = readString(record.title);
  const description = readString(record.description);
  if (!nodeId || !type || !title || !description) return null;

  return {
    nodeId,
    type,
    title,
    description,
    sourceRefs: readStringArray(record.sourceRefs ?? record.source_refs),
  };
}

export function normalizeCausalStoryView(raw: unknown): CausalStoryView | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const traceId = readString(record.traceId ?? record.trace_id);
  const worldStateVersion = readString(record.worldStateVersion ?? record.world_state_version);
  const headline = readString(record.headline);
  const assessment = readString(record.assessment);
  const technicalTraceRef = readString(record.technicalTraceRef ?? record.technical_trace_ref);

  if (!traceId || !worldStateVersion || !headline || !assessment || !technicalTraceRef) {
    return undefined;
  }

  const chainRaw = record.chain;
  const chain = Array.isArray(chainRaw)
    ? chainRaw
        .map((node) => normalizeChainNode(node))
        .filter((node): node is CausalStoryChainNode => Boolean(node))
    : [];

  return {
    traceId,
    worldStateVersion,
    headline,
    assessment,
    chain,
    recommendedOption: normalizeRecommendedOption(record.recommendedOption ?? record.recommended_option),
    technicalTraceRef,
  };
}

export interface CausalTracePayloadFields {
  causalTraceRef?: CausalTraceReference;
  causalStoryView?: CausalStoryView;
  guardianCausalStoryView?: CausalStoryView;
}

/** Abu · guardianCausalStoryView.headline — 用户可见安全提示 */
export function formatGuardianCausalWarning(headline: string | undefined | null): string {
  const trimmed = headline?.trim();
  if (!trimmed) return '';
  if (/^Abu\s*[:：]/i.test(trimmed)) return trimmed;
  return `Abu：${trimmed}`;
}

/**
 * 读取 guardian 安全提示 — 兼容 BFF 只返回 headline 的 partial 投影。
 * normalizeCausalStoryView 要求 assessment / technicalTraceRef 等全字段，
 * BLOCK 态 detail 刷新后常只剩 headline，此前会导致 Abu 条消失。
 */
export function resolveGuardianCausalHeadline(raw: unknown): string | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const direct = readString(
    record.guardianHeadline ??
      record.guardian_headline ??
      record.guardianCausalHeadline ??
      record.guardian_causal_headline,
  );
  if (direct) return direct;

  const guardianRaw = record.guardianCausalStoryView ?? record.guardian_causal_story_view;
  const normalized = normalizeCausalStoryView(guardianRaw);
  if (normalized?.headline) return normalized.headline;

  const guardianRecord = asRecord(guardianRaw);
  return readString(guardianRecord?.headline);
}

/** 从 Gateway detail / preview / list item 提取因果 trace 字段 */
export function extractCausalTraceFromPayload(raw: unknown): CausalTracePayloadFields {
  const record = asRecord(raw);
  if (!record) return {};

  const causalTraceRef = normalizeCausalTraceReference(
    record.causalTraceRef ?? record.causal_trace_ref,
  );
  const causalStoryView = normalizeCausalStoryView(
    record.causalStoryView ?? record.causal_story_view,
  );
  const guardianCausalStoryView = normalizeCausalStoryView(
    record.guardianCausalStoryView ?? record.guardian_causal_story_view,
  );

  return {
    causalTraceRef,
    causalStoryView,
    guardianCausalStoryView,
  };
}

export function normalizeCausalTraceReplayView(raw: unknown): CausalTraceReplayView | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const schemaId = readString(record.schemaId ?? record.schema_id);
  const tripId = readString(record.tripId ?? record.trip_id);
  const problemId = readString(record.problemId ?? record.problem_id);
  const generatedAt = readString(record.generatedAt ?? record.generated_at);
  const ref = normalizeCausalTraceReference(record.ref);
  const causalStoryView = normalizeCausalStoryView(
    record.causalStoryView ?? record.causal_story_view,
  );
  const guardianCausalStoryView = normalizeCausalStoryView(
    record.guardianCausalStoryView ?? record.guardian_causal_story_view,
  );
  const trace = asRecord(record.trace) ?? {};

  if (
    schemaId !== 'tripnara.causal_trace_replay@v1' ||
    !tripId ||
    !problemId ||
    !generatedAt ||
    !ref ||
    !causalStoryView ||
    !guardianCausalStoryView
  ) {
    return undefined;
  }

  return {
    schemaId: 'tripnara.causal_trace_replay@v1',
    tripId,
    problemId,
    generatedAt,
    ref,
    trace,
    causalStoryView,
    guardianCausalStoryView,
  };
}

/** submit / apply 链路：preview 优先，否则 detail */
export function resolveCausalTraceRefForSubmit(input: {
  preview?: CausalTracePayloadFields | null;
  detail?: CausalTracePayloadFields | null;
}): CausalTraceReference | undefined {
  return input.preview?.causalTraceRef ?? input.detail?.causalTraceRef;
}

export function hasGatewayCausalStoryView(
  fields: CausalTracePayloadFields | null | undefined,
): boolean {
  return Boolean(fields?.causalStoryView?.chain?.length || fields?.causalStoryView?.headline);
}
