/**
 * POST /api/agent/route_and_run 成功体中的 POI 卡片：
 * payload.poi_cards_by_day（优先）、payload.poi_cards（按 day_index 分组）
 *
 * 展示字段以 Place 库补水为准：`resolved_from_place_registry === true` 时名称/类别/坐标等来自登记；
 * `display_name` 命中库时为 nameCN || nameEN（由后端下发）。
 */

import { parseJsonFromLlmText } from '@/lib/parse-json-from-llm';

/** `matched_from`：库命中方式或草案（与后端 dehydrator 对齐） */
export type AgentPoiMatchedFrom =
  | 'place_id'
  | 'place_uuid'
  | 'place_google_id'
  | 'name_exact'
  | 'itinerary_only'
  | string;

export interface AgentPoiCard {
  /** 列表 key / 调试；默认不在卡片正文展示 */
  itineraryItemId?: string;
  /** 与 `safety_surface` / 路段几何对齐；后端若在 POI 卡上携带则解析 */
  routeSegmentRef?: string;
  displayName: string;
  nameCn?: string;
  nameEn?: string;
  category?: string;
  rating?: number;
  description?: string;
  address?: string;
  startWindow?: string;
  endWindow?: string;
  lat?: number;
  lng?: number;
  tags: string[];
  matchedFrom?: AgentPoiMatchedFrom;
  /**
   * true：place_id / uuid / google_place_id / 名称精确匹配命中 Place 库；
   * false：仅行程草案或草稿坐标兜底。
   */
  resolvedFromPlaceRegistry?: boolean;
  /** 本体/限行等结构化规则（后端 JSON；不入地图几何） */
  ontologyRules?: unknown;
  /** Google / 供应商 place_id，便于与 spatial_projection.poi_card_match_keys 对齐 */
  placeId?: string;
  /** POI_SELECTION 打标：off_beaten_path_quota 等 */
  planningScoreReasons?: string[];
  /** metadata.poi_offbeat_quota_applied === true */
  offbeatQuotaApplied?: boolean;
}

export interface AgentPoiDayBlock {
  /** 0-based：第 1 天存 0 */
  dayIndex: number;
  /** yyyy-mm-dd */
  date?: string;
  /** 当日 narrative，可与时间窗对齐展示 */
  narrative?: string;
  cards: AgentPoiCard[];
}

function pickStr(o: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function pickNum(o: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim()) {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

function normalizeDateStr(s: string): string | undefined {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return undefined;
}

const OFFBEAT_SCORE_REASON = 'off_beaten_path_quota';

function pickStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.map((x) => String(x).trim()).filter(Boolean);
  return out.length > 0 ? out : undefined;
}

/** POI 是否因小众配额 / offbeat lane 入选 */
export function isOffbeatPoiCard(card: Pick<AgentPoiCard, 'planningScoreReasons' | 'offbeatQuotaApplied' | 'tags'>): boolean {
  if (card.offbeatQuotaApplied === true) return true;
  if (card.planningScoreReasons?.includes(OFFBEAT_SCORE_REASON)) return true;
  return (card.tags ?? []).some((t) => {
    const s = t.toLowerCase();
    return s.includes('小众') || s.includes('秘境') || s.includes('hidden') || s.includes('offbeat');
  });
}

export function normalizePoiCard(raw: unknown): AgentPoiCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const loc =
    o.location_ref && typeof o.location_ref === 'object' && !Array.isArray(o.location_ref)
      ? (o.location_ref as Record<string, unknown>)
      : undefined;

  const nameCn = pickStr(o, 'name_cn', 'nameCn');
  const nameEn = pickStr(o, 'name_en', 'nameEn');
  const displayName =
    pickStr(o, 'display_name', 'displayName') ||
    pickStr(o, 'itinerary_name', 'itineraryName') ||
    pickStr(loc, 'name') ||
    nameCn ||
    nameEn ||
    pickStr(o, 'name', 'title') ||
    '地点';

  const itineraryItemId = pickStr(o, 'itinerary_item_id', 'itineraryItemId');
  const routeSegmentRef = pickStr(o, 'route_segment_ref', 'routeSegmentRef', 'route_segment_ref_id', 'routeSegmentRefId');

  const rating = pickNum(o, 'rating', 'score');
  const description = pickStr(o, 'description', 'summary', 'snippet');
  const address =
    pickStr(o, 'address', 'formatted_address') ?? pickStr(loc ?? {}, 'address', 'formatted_address');
  const category = pickStr(o, 'category', 'item_type', 'itemType', 'type', 'poi_type');

  const startWindow = pickStr(o, 'start_window', 'startWindow', 'start');
  const endWindow = pickStr(o, 'end_window', 'endWindow', 'end');

  const lat = pickNum(o, 'lat', 'latitude');
  const lng = pickNum(o, 'lng', 'lon', 'longitude');

  const tags = Array.isArray(o.tags) ? o.tags.map((x) => String(x).trim()).filter(Boolean) : [];

  const planningScoreReasons = pickStringArray(
    o.poi_planning_score_reasons ?? o.poiPlanningScoreReasons
  );

  const metadata =
    o.metadata && typeof o.metadata === 'object' && !Array.isArray(o.metadata)
      ? (o.metadata as Record<string, unknown>)
      : undefined;
  const offbeatRaw = metadata?.poi_offbeat_quota_applied ?? metadata?.poiOffbeatQuotaApplied;
  const offbeatQuotaApplied = offbeatRaw === true;

  const matchedFrom = pickStr(o, 'matched_from', 'matchedFrom') as AgentPoiMatchedFrom | undefined;

  const resolvedRaw = o.resolved_from_place_registry ?? o.resolvedFromPlaceRegistry;
  const resolvedFromPlaceRegistry =
    resolvedRaw === true || resolvedRaw === false ? resolvedRaw : undefined;

  const placeRaw = o.place_id ?? o.placeId;
  const placeId =
    typeof placeRaw === 'string' && placeRaw.trim()
      ? placeRaw.trim()
      : typeof placeRaw === 'number' && !Number.isNaN(placeRaw)
        ? String(placeRaw)
        : undefined;

  let ontologyRules: unknown = o.ontology_rules ?? o.ontologyRules;
  if (typeof ontologyRules === 'string') {
    const t = ontologyRules.trim();
    if (t.startsWith('{') || t.startsWith('[') || t.includes('```')) {
      try {
        ontologyRules = parseJsonFromLlmText(t);
      } catch {
        ontologyRules = t;
      }
    }
  }

  return {
    displayName,
    ...(itineraryItemId ? { itineraryItemId } : {}),
    ...(routeSegmentRef ? { routeSegmentRef } : {}),
    ...(nameCn ? { nameCn } : {}),
    ...(nameEn ? { nameEn } : {}),
    ...(category ? { category } : {}),
    ...(rating != null ? { rating } : {}),
    ...(description ? { description } : {}),
    ...(address ? { address } : {}),
    ...(startWindow ? { startWindow } : {}),
    ...(endWindow ? { endWindow } : {}),
    ...(lat != null ? { lat } : {}),
    ...(lng != null ? { lng } : {}),
    tags,
    ...(matchedFrom ? { matchedFrom } : {}),
    ...(resolvedFromPlaceRegistry !== undefined ? { resolvedFromPlaceRegistry } : {}),
    ...(ontologyRules != null ? { ontologyRules } : {}),
    ...(placeId ? { placeId } : {}),
    ...(planningScoreReasons?.length ? { planningScoreReasons } : {}),
    ...(offbeatQuotaApplied ? { offbeatQuotaApplied: true } : {}),
  };
}

function normalizeDayBlocks(arr: unknown[]): AgentPoiDayBlock[] | undefined {
  const out: AgentPoiDayBlock[] = [];
  for (const block of arr) {
    if (!block || typeof block !== 'object') continue;
    const b = block as Record<string, unknown>;
    const dayIndexRaw = pickNum(b, 'day_index', 'dayIndex');
    const dayIndex =
      dayIndexRaw != null && dayIndexRaw >= 0 ? Math.floor(dayIndexRaw) : out.length;

    const dateRaw = pickStr(b, 'date', 'day_date', 'dayDate');
    const date = dateRaw ? normalizeDateStr(dateRaw) : undefined;

    const narrative = pickStr(b, 'narrative', 'day_narrative', 'dayNarrative');

    const cardsRaw = b.cards ?? b.poi_cards ?? b.items;
    const cards = Array.isArray(cardsRaw)
      ? (cardsRaw.map(normalizePoiCard).filter(Boolean) as AgentPoiCard[])
      : [];
    if (cards.length === 0) continue;

    out.push({ dayIndex, date, narrative, cards });
  }
  if (out.length === 0) return undefined;
  out.sort((a, b) => a.dayIndex - b.dayIndex);
  return out;
}

function groupFlatPoiCards(flat: unknown[]): AgentPoiDayBlock[] | undefined {
  const map = new Map<number, AgentPoiCard[]>();
  for (const item of flat) {
    const card = normalizePoiCard(item);
    if (!card) continue;
    const raw = item as Record<string, unknown>;
    const diRaw = pickNum(raw, 'day_index', 'dayIndex');
    const dayIndex = diRaw != null && diRaw >= 0 ? Math.floor(diRaw) : 0;
    if (!map.has(dayIndex)) map.set(dayIndex, []);
    map.get(dayIndex)!.push(card);
  }
  if (map.size === 0) return undefined;
  const blocks = [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dayIndex, cards]) => ({ dayIndex, cards }));
  return blocks.length ? blocks : undefined;
}

function extractFromRoot(root: Record<string, unknown> | undefined): AgentPoiDayBlock[] | undefined {
  if (!root) return undefined;

  const ui =
    root.ui_display && typeof root.ui_display === 'object' && !Array.isArray(root.ui_display)
      ? (root.ui_display as Record<string, unknown>)
      : undefined;

  const byDay =
    root.poi_cards_by_day ??
    root.poiCardsByDay ??
    ui?.poi_cards_by_day ??
    ui?.poiCardsByDay;
  if (Array.isArray(byDay) && byDay.length > 0) {
    return normalizeDayBlocks(byDay);
  }

  const flat = root.poi_cards ?? root.poiCards ?? ui?.poi_cards ?? ui?.poiCards;
  if (Array.isArray(flat) && flat.length > 0) {
    return groupFlatPoiCards(flat);
  }

  return undefined;
}

/**
 * 从 payload 与 result 根对象读取（与后端挂载位置对齐）。
 * 是否隐藏 answer 正文由 AgentChat 根据解析出的 POI/酒店/住宿列表决定，避免仅依赖 meta 与 payload 形状不一致时出现空白气泡。
 */
export function extractPoiCardsByDayFromRouteRun(
  payloadRecord: Record<string, unknown> | undefined,
  resultRecord: Record<string, unknown> | undefined
): AgentPoiDayBlock[] | undefined {
  return extractFromRoot(payloadRecord) ?? extractFromRoot(resultRecord);
}

/** payload.poi_cards_meta.suppress_answer_prose：前端保留短 answer_text，仅收起长文 Markdown 组件 */
export function extractPoiSuppressAnswerProse(
  payload: Record<string, unknown> | undefined
): boolean {
  if (!payload) return false;
  const meta = payload.poi_cards_meta ?? payload.poiCardsMeta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false;
  return (meta as Record<string, unknown>).suppress_answer_prose === true;
}
