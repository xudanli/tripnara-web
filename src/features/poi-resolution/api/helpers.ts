import type {
  EvidenceChainStep,
  PoiEvidenceStep,
  PoiResolutionBadge,
  PoiChipViewModel,
  ResolvedPoi,
} from '../types';

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  AI_RECOGNITION: 'AI 识别',
  ALIAS_MATCH: '别名命中',
  OFFICIAL_POI: '官方 POI',
  HUMAN_CONFIRM: '人工确认',
  REGISTRY_LOOKUP: '注册表匹配',
  REGISTRY: '注册表匹配',
};

const VERIFIED_CONFIDENCE_THRESHOLD = 0.75;

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNum(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
  }
  return undefined;
}

/** 对齐 compare / resolve 接口 — 后端常返回 status=MATCHED 但不带 resolved 字段 */
export function normalizeResolvedPoi(raw: unknown): ResolvedPoi | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const matchedPoi =
    record.matchedPoi && typeof record.matchedPoi === 'object' && !Array.isArray(record.matchedPoi)
      ? (record.matchedPoi as Record<string, unknown>)
      : undefined;

  const poiId = pickStr(record, 'poiId') ?? (matchedPoi ? pickStr(matchedPoi, 'poiId') : undefined);
  const canonicalName =
    pickStr(record, 'canonicalName') ?? (matchedPoi ? pickStr(matchedPoi, 'canonicalName') : undefined);
  const name = pickStr(record, 'name', 'queryName', 'query') ?? canonicalName;
  if (!name) return null;

  const confidence = pickNum(record, 'confidence') ?? (matchedPoi ? pickNum(matchedPoi, 'confidence') : undefined);
  const status = pickStr(record, 'status') as ResolvedPoi['status'] | undefined;
  const resolved =
    record.resolved === true ||
    status === 'MATCHED' ||
    (Boolean(poiId) && (confidence ?? 0) >= VERIFIED_CONFIDENCE_THRESHOLD);

  return {
    name,
    canonicalName,
    poiId,
    confidence,
    resolved,
    status: status ?? (resolved ? 'MATCHED' : !poiId ? 'NOT_FOUND' : undefined),
    method: pickStr(record, 'method') as ResolvedPoi['method'],
    evidence: Array.isArray(record.evidence) ? (record.evidence as PoiEvidenceStep[]) : undefined,
    candidates: Array.isArray(record.candidates) ? (record.candidates as ResolvedPoi['candidates']) : undefined,
  };
}

export function normalizeResolvedPois(raw: unknown[] | undefined): ResolvedPoi[] | undefined {
  if (!raw?.length) return raw?.length === 0 ? [] : undefined;
  return raw.map(normalizeResolvedPoi).filter((poi): poi is ResolvedPoi => poi != null);
}

export function needsPoiConfirmation(poi: ResolvedPoi): boolean {
  return poi.status === 'NEEDS_CONFIRMATION' || poi.status === 'AMBIGUOUS';
}

export function isPoiVerified(poi: ResolvedPoi): boolean {
  const confidence = poi.confidence ?? 0;
  if (!poi.poiId || confidence < VERIFIED_CONFIDENCE_THRESHOLD) return false;
  return poi.resolved === true || poi.status === 'MATCHED';
}

export function getPoiResolutionBadge(poi: ResolvedPoi): PoiResolutionBadge {
  if (isPoiVerified(poi)) {
    const pct = Math.round((poi.confidence ?? 0) * 100);
    return { label: `✓ 已验证 ${pct}%`, tone: 'success' };
  }
  if (needsPoiConfirmation(poi)) {
    return { label: '⚠ 等待确认', tone: 'warning' };
  }
  if (poi.poiId && (poi.confidence ?? 0) < VERIFIED_CONFIDENCE_THRESHOLD) {
    return { label: '⚠ 等待确认', tone: 'warning' };
  }
  if (poi.status === 'NOT_FOUND' || !poi.poiId) {
    return { label: '未解析', tone: 'muted', actionLabel: '手动选择' };
  }
  return { label: '未解析', tone: 'muted', actionLabel: '手动选择' };
}

export function countUnresolvedPois(resolvedPois?: ResolvedPoi[]): number {
  if (!resolvedPois?.length) return 0;
  return resolvedPois.filter((poi) => !isPoiVerified(poi)).length;
}

export function getUnresolvedPoisBannerText(unresolvedCount: number): string {
  if (unresolvedCount <= 0) return '';
  return `${unresolvedCount} 个地点尚未确认。请点击路线卡片底部的地点 chip 进行验证，确保后续行程准确。`;
}

function formatEvidenceSubtitle(step: PoiEvidenceStep): string {
  if (step.type === 'OFFICIAL_POI' && step.poiId) {
    return step.canonicalName ? `${step.poiId} — ${step.canonicalName}` : step.poiId;
  }
  return step.canonicalName ?? step.label ?? step.query ?? step.poiId ?? '';
}

export function formatEvidenceChain(evidence?: PoiEvidenceStep[]): EvidenceChainStep[] {
  if (!evidence?.length) return [];
  return evidence.map((step) => ({
    title: EVIDENCE_TYPE_LABELS[step.type] ?? step.type,
    subtitle: formatEvidenceSubtitle(step),
  }));
}

export function mapResolvedPoisToChips(resolvedPois?: ResolvedPoi[]): PoiChipViewModel[] {
  return (resolvedPois ?? []).map((poi) => ({
    key: poi.name,
    label: poi.canonicalName ?? poi.name,
    poiId: poi.poiId,
    badge: getPoiResolutionBadge(poi),
    needsAction: !isPoiVerified(poi),
    poi,
  }));
}

export function applyConfirmResultToPoi(poi: ResolvedPoi, result: {
  poiId: string;
  canonicalName?: string;
  confidence?: number;
  evidence?: PoiEvidenceStep[];
}): ResolvedPoi {
  return {
    ...poi,
    poiId: result.poiId,
    canonicalName: result.canonicalName ?? poi.canonicalName,
    confidence: result.confidence ?? poi.confidence ?? 1,
    resolved: true,
    status: 'MATCHED',
    method: 'HUMAN',
    evidence: result.evidence ?? poi.evidence,
    candidates: undefined,
  };
}

export function formatConfidencePercent(confidence?: number): string {
  if (confidence == null) return '—';
  return `${Math.round(confidence * 100)}%`;
}
