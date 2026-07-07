/** BFF GET /trips/:tripId/destination-insights — 决策上下文目的地洞察（勿直调 /api/rag/*） */

export interface TripDestinationInsightsQuery {
  /** planning-conflicts 冲突 ID */
  focusConflictId?: string;
  /** 决策问题 ID（支持 dp_id: 前缀） */
  problemId?: string;
  /** 如 is.reynisfjara */
  poiSlug?: string;
  placeId?: string;
  /** 0-based 行程天索引 */
  dayIndex?: number;
  /** true 时最多追加 3 条 scoped RAG（默认关） */
  includeRag?: boolean;
  /** 条件请求：同一 scope 短 TTL 复用 */
  ifNoneMatch?: string;
}

export interface DestinationInsightSourceRef {
  type?: string;
  id?: string;
  label?: string;
  system?: string;
  refId?: string;
}

/** bundle.insights[] — 冲突解释 / 证据详情条目 */
export interface DestinationInsightEntry {
  id?: string;
  type?: string;
  title?: string;
  summary?: string;
  sourceRefs?: DestinationInsightSourceRef[];
  sourceLevel?: string;
  explanatoryOnly?: boolean;
  applicability?: Record<string, unknown>;
  relatedTripObjectIds?: string[];
}

export interface DestinationInsightBundle {
  insights?: DestinationInsightEntry[];
}

export interface TripDestinationInsightBundleMeta {
  conflictCount?: number;
  problemCount?: number;
  ragRetrievalSkipped?: boolean;
  skipReason?: string;
}

/** BFF 原始 DTO：`tripnara.destination_insight_bundle@v1` */
export interface TripDestinationInsightBundleDto {
  schemaId?: string;
  tripId?: string;
  focus?: {
    conflictId?: string;
    problemId?: string;
    poiSlug?: string;
    placeId?: string;
    dayIndex?: number;
  };
  generatedAt?: string;
  /** v1 BFF：顶层数组 */
  insights?: DestinationInsightEntry[];
  meta?: TripDestinationInsightBundleMeta;
  etag?: string;
}

export interface TripDestinationInsightTip {
  content: string;
  source?: string;
  score?: number;
}

export interface TripDestinationInsightLocal {
  content: string;
  tags?: string[];
}

export interface TripDestinationInsightRoute {
  answer: string;
  source?: string;
}

export interface TripDestinationInsightItem {
  id?: string;
  kind?: string;
  title?: string;
  subtitle?: string;
  content?: string;
  source?: string;
  reliability?: 'high' | 'medium' | 'low';
  observedAt?: string;
}

export interface TripDestinationInsightsPayload {
  /** 新版 bundle 条目（与 items/tips 等可并存） */
  insights?: DestinationInsightEntry[];
  items?: TripDestinationInsightItem[];
  tips?: TripDestinationInsightTip[];
  localInsights?: TripDestinationInsightLocal[];
  routeInsights?: TripDestinationInsightRoute;
  /** includeRag=1 时 BFF 追加的 scoped RAG（最多 3 条） */
  rag?: TripDestinationInsightItem[];
}

export interface TripDestinationInsightsResponse {
  schemaId?: string;
  tripId?: string;
  focus?: TripDestinationInsightBundleDto['focus'];
  generatedAt?: string;
  meta?: TripDestinationInsightBundleMeta;
  bundle?: DestinationInsightBundle;
  insights: TripDestinationInsightsPayload;
  focusConflictId?: string;
  problemId?: string;
  poiSlug?: string;
  placeId?: string;
  dayIndex?: number;
  etag?: string;
}

export type TripDestinationInsightsFetchResult =
  | { status: 'ok'; data: TripDestinationInsightsResponse; etag?: string }
  | { status: 'not_modified'; etag?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asInsightEntries(value: unknown): DestinationInsightEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === 'object') as DestinationInsightEntry[];
}

function isRagDestinationInsight(entry: DestinationInsightEntry): boolean {
  return (entry.sourceRefs ?? []).some((ref) => ref.system === 'RAG');
}

function toRagInsightItems(entries: DestinationInsightEntry[]): TripDestinationInsightItem[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    subtitle: entry.summary,
    content: entry.summary,
    source: entry.sourceRefs?.find((ref) => ref.system === 'RAG')?.refId,
  }));
}

/** 将 BFF DTO（insights 数组或 legacy payload）规范化为前端读模型 */
export function normalizeTripDestinationInsightsResponse(
  raw: unknown,
): TripDestinationInsightsResponse {
  const root = asRecord(raw) ?? {};
  const focus = asRecord(root.focus) ?? undefined;
  const topInsights = root.insights;

  let payload: TripDestinationInsightsPayload = {};
  let entries: DestinationInsightEntry[] = [];

  if (Array.isArray(topInsights)) {
    const allEntries = asInsightEntries(topInsights);
    const ragEntries = allEntries.filter(isRagDestinationInsight);
    entries = allEntries.filter((entry) => !isRagDestinationInsight(entry));
    payload = {
      insights: entries,
      rag: ragEntries.length ? toRagInsightItems(ragEntries) : undefined,
    };
  } else {
    payload = (asRecord(topInsights) ?? {}) as TripDestinationInsightsPayload;
    const bundleRaw = asRecord(root.bundle);
    entries = [
      ...asInsightEntries(bundleRaw?.insights),
      ...asInsightEntries(payload.insights),
    ];
  }

  const focusConflictId =
    (typeof focus?.conflictId === 'string' ? focus.conflictId : undefined) ??
    (typeof root.focusConflictId === 'string' ? root.focusConflictId : undefined);
  const problemId =
    (typeof focus?.problemId === 'string' ? focus.problemId : undefined) ??
    (typeof root.problemId === 'string' ? root.problemId : undefined);

  return {
    schemaId: typeof root.schemaId === 'string' ? root.schemaId : undefined,
    tripId: typeof root.tripId === 'string' ? root.tripId : undefined,
    focus: focus
      ? {
          conflictId: typeof focus.conflictId === 'string' ? focus.conflictId : undefined,
          problemId: typeof focus.problemId === 'string' ? focus.problemId : undefined,
          poiSlug: typeof focus.poiSlug === 'string' ? focus.poiSlug : undefined,
          placeId: typeof focus.placeId === 'string' ? focus.placeId : undefined,
          dayIndex: typeof focus.dayIndex === 'number' ? focus.dayIndex : undefined,
        }
      : undefined,
    generatedAt: typeof root.generatedAt === 'string' ? root.generatedAt : undefined,
    meta: asRecord(root.meta) as TripDestinationInsightBundleMeta | undefined,
    bundle: { insights: entries },
    insights: payload,
    focusConflictId,
    problemId,
    poiSlug:
      (typeof focus?.poiSlug === 'string' ? focus.poiSlug : undefined) ??
      (typeof root.poiSlug === 'string' ? root.poiSlug : undefined),
    placeId:
      (typeof focus?.placeId === 'string' ? focus.placeId : undefined) ??
      (typeof root.placeId === 'string' ? root.placeId : undefined),
    dayIndex:
      (typeof focus?.dayIndex === 'number' ? focus.dayIndex : undefined) ??
      (typeof root.dayIndex === 'number' ? root.dayIndex : undefined),
    etag: typeof root.etag === 'string' ? root.etag : undefined,
  };
}

/** 合并 bundle.insights 与 payload.insights（去重 id） */
export function collectDestinationInsightEntries(
  response: TripDestinationInsightsResponse | undefined | null,
): DestinationInsightEntry[] {
  if (!response) return [];

  const merged: DestinationInsightEntry[] = [
    ...(response.bundle?.insights ?? []),
    ...(response.insights?.insights ?? []),
  ];

  const seen = new Set<string>();
  return merged.filter((entry, index) => {
    const key = entry.id?.trim() || `idx:${index}:${entry.title ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(entry.title?.trim() || entry.summary?.trim());
  });
}
