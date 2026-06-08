/**
 * route_and_run 行程条目展示模型（与后端 itinerary.days[].items / timeline / POI hydration 对齐）。
 * 字段：start_window/end_window、location_ref.name、address、type、place_id 等；
 * 卡片级补水见 {@link mergeItineraryItemWithPoiCard} / {@link itineraryItemCardModelFromAgentPoiCard}。
 */

import type { AgentPoiCard, AgentPoiDayBlock } from '@/lib/agent-poi-payload';
import {
  categoryLabelZh,
  extractHmFromWindow,
  formatDurationBetweenWindows,
  isTransitLikeItemType,
} from '@/lib/itinerary-item-card-format';

export interface ItineraryDayItemsBlock {
  date?: string;
  items: unknown[];
}

export type ItineraryItemDisplayKind = 'rich' | 'compact';

export interface ItineraryItemChip {
  label: string;
  tone?: 'default' | 'muted' | 'warning';
}

export interface ItineraryItemCardModel {
  title: string;
  address?: string;
  startWindow?: string;
  endWindow?: string;
  /** 展示用 HH:mm（由 start_window 解析） */
  startTimeDisplay?: string;
  endTimeDisplay?: string;
  itemType?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  /** 地点缩略图 URL（有则左列优先） */
  photoUrl?: string;
  /** 同日窗内时长文案 */
  durationLabel?: string;
  /** 类别 / 营业态 / 价格等 pill；勿虚构 Closed */
  chips?: ItineraryItemChip[];
  /** 有明确金额+口径时再展示；弱数据可带「参考价」前缀 */
  priceLabel?: string;
  /** rich：POI/餐厅整卡；compact：交通等扁行 */
  displayKind?: ItineraryItemDisplayKind;
  /**
   * timeline：`type === 'REST'` 且 `metadata.placeholder_reason === 'single_poi_catalog_multi_day'` 时，
   * 取 `metadata.suggested_poi_search_queries`（蛇形/驼峰）作为建议检索词；**仅用于 UI，勿当真实 POI**。
   * 未命中占位语义时为 `undefined`；命中但数组为空时为 `[]`。
   */
  suggestedPoiSearchQueries?: string[];
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

export function extractItineraryItemId(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const o = item as Record<string, unknown>;
  return pickStr(o, 'itinerary_item_id', 'itineraryItemId', 'id');
}

function buildPriceLabel(o: Record<string, unknown>): string | undefined {
  const currency = pickStr(o, 'currency', 'currency_code', 'currencyCode') ?? 'CNY';
  const amount = pickNum(o, 'estimated_cost', 'estimatedCost', 'price', 'cost', 'amount');
  const level = pickNum(o, 'price_level', 'priceLevel');
  const display = pickStr(o, 'price_display', 'priceDisplay', 'cost_display', 'costDisplay');
  if (display?.trim()) {
    return display.includes('参考') || display.includes('约') ? display : `参考价 ${display}`;
  }
  if (amount != null && amount > 0) {
    const sym = currency === 'CNY' || currency === 'RMB' ? '¥' : `${currency} `;
    return `参考价 ${sym}${amount}`;
  }
  if (level != null && level >= 1 && level <= 4) {
    return `价位 · ${'¥'.repeat(Math.min(level, 4))}`;
  }
  return undefined;
}

/**
 * 仅在后端明确下发营业相关字段时生成 pill，避免误标 Closed。
 */
function businessStatusChipFromRaw(o: Record<string, unknown>): ItineraryItemChip | undefined {
  const s =
    pickStr(o, 'business_status', 'operating_status', 'opening_status', 'hours_status') ??
    pickStr(
      o.verification && typeof o.verification === 'object'
        ? (o.verification as Record<string, unknown>)
        : {},
      'business_status',
      'operating_status'
    );
  if (!s?.trim()) return undefined;
  const t = s.trim();
  const lower = t.toLowerCase();
  let label = t;
  if (lower.includes('close') || /闭店|打烊|休息|不营业/.test(t)) label = '休息中';
  else if (lower.includes('open') || /营业|开放/.test(t)) label = '营业中';
  return { label, tone: label === '休息中' ? 'warning' : 'muted' };
}

function enrichItineraryItemCardModel(m: ItineraryItemCardModel): ItineraryItemCardModel {
  const startTimeDisplay = extractHmFromWindow(m.startWindow);
  const endTimeDisplay = extractHmFromWindow(m.endWindow);
  const durationLabel = formatDurationBetweenWindows(m.startWindow, m.endWindow);
  const transit = isTransitLikeItemType(m.itemType);
  const chips: ItineraryItemChip[] = [...(m.chips ?? [])];
  const cat = categoryLabelZh(m.itemType);
  if (cat && !chips.some((c) => c.label === cat)) {
    chips.unshift({ label: cat, tone: 'muted' });
  }
  const catalogPlaceholder = m.suggestedPoiSearchQueries !== undefined;
  return {
    ...m,
    ...(startTimeDisplay ? { startTimeDisplay } : {}),
    ...(endTimeDisplay ? { endTimeDisplay } : {}),
    ...(durationLabel ? { durationLabel } : {}),
    ...(chips.length ? { chips } : {}),
    displayKind: catalogPlaceholder ? 'rich' : transit ? 'compact' : (m.displayKind ?? 'rich'),
  };
}

const PLACEHOLDER_SINGLE_POI_CATALOG_MULTI_DAY = 'single_poi_catalog_multi_day';

/** timeline item：`REST` + `metadata.placeholder_reason === single_poi_catalog_multi_day` */
export function extractSuggestedPoiSearchQueriesFromTimelineItem(item: unknown): string[] | undefined {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return undefined;
  const o = item as Record<string, unknown>;
  const typeRaw = (pickStr(o, 'type', 'item_type', 'itemType', 'poi_type') ?? '').toUpperCase();
  if (typeRaw !== 'REST') return undefined;
  const meta =
    o.metadata && typeof o.metadata === 'object' && !Array.isArray(o.metadata)
      ? (o.metadata as Record<string, unknown>)
      : undefined;
  if (!meta) return undefined;
  const reason = pickStr(meta, 'placeholder_reason', 'placeholderReason');
  if (reason !== PLACEHOLDER_SINGLE_POI_CATALOG_MULTI_DAY) return undefined;
  const raw = meta.suggested_poi_search_queries ?? meta.suggestedPoiSearchQueries;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

/**
 * 将单日条目（含 location_ref）规范为卡片字段；hydration 前的原始 JSON 与调试输出一致。
 */
export function normalizeItineraryItemCard(item: unknown): ItineraryItemCardModel | null {
  if (item == null) return null;
  if (typeof item === 'string') return enrichItineraryItemCardModel({ title: item.trim() || '行程项' });
  if (typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;

  const loc =
    o.location_ref && typeof o.location_ref === 'object' && !Array.isArray(o.location_ref)
      ? (o.location_ref as Record<string, unknown>)
      : undefined;

  const title =
    (loc && typeof loc.name === 'string' && loc.name.trim()) ||
    pickStr(o, 'title', 'name', 'itinerary_name', 'itineraryName', 'display_name', 'displayName') ||
    '行程项';

  const address = pickStr(o, 'address', 'formatted_address') ?? pickStr(loc ?? {}, 'address', 'formatted_address');

  const placeId =
    pickStr(loc ?? {}, 'place_id', 'placeId') ??
    pickStr(o, 'place_id', 'placeId');

  const startWindow = pickStr(o, 'start_window', 'startWindow');
  const endWindow = pickStr(o, 'end_window', 'endWindow');

  const itemType = pickStr(o, 'type', 'item_type', 'itemType', 'poi_type');

  const lat = pickNum(loc ?? {}, 'lat', 'latitude') ?? pickNum(o, 'lat', 'latitude');
  const lng = pickNum(loc ?? {}, 'lng', 'longitude', 'lon') ?? pickNum(o, 'lng', 'longitude', 'lon');

  const rating = pickNum(o, 'rating', 'score', 'stars');
  const photoUrl =
    pickStr(o, 'photo_url', 'photoUrl', 'thumbnail_url', 'thumbnailUrl', 'image_url', 'imageUrl') ??
    pickStr(loc ?? {}, 'photo_url', 'thumbnail_url', 'image_url');

  const bizChip = businessStatusChipFromRaw(o);
  const priceLabel = buildPriceLabel(o);
  const chips: ItineraryItemChip[] = [];
  if (bizChip) chips.push(bizChip);

  const catalogQueries = extractSuggestedPoiSearchQueriesFromTimelineItem(o);
  const titleFinal =
    catalogQueries !== undefined && (!title.trim() || title === '行程项')
      ? '多日行程 · 单 POI 目录占位'
      : title;

  const base: ItineraryItemCardModel = {
    title: titleFinal,
    ...(address ? { address } : {}),
    ...(startWindow ? { startWindow } : {}),
    ...(endWindow ? { endWindow } : {}),
    ...(itemType ? { itemType } : {}),
    ...(placeId ? { placeId } : {}),
    ...(lat != null ? { lat } : {}),
    ...(lng != null ? { lng } : {}),
    ...(rating != null ? { rating } : {}),
    ...(photoUrl ? { photoUrl } : {}),
    ...(chips.length ? { chips } : {}),
    ...(priceLabel ? { priceLabel } : {}),
    ...(catalogQueries !== undefined ? { suggestedPoiSearchQueries: catalogQueries } : {}),
  };
  return enrichItineraryItemCardModel(base);
}

/** 与 {@link normalizeItineraryItemCard} 合并：卡片字段优先（标题/地址/评分/时间窗等） */
export function mergeItineraryItemWithPoiCard(base: ItineraryItemCardModel, card: AgentPoiCard): ItineraryItemCardModel {
  const chips: ItineraryItemChip[] = [...(base.chips ?? [])];
  for (const t of card.tags ?? []) {
    const label = String(t).trim();
    if (label && !chips.some((c) => c.label === label)) {
      chips.push({ label, tone: 'muted' });
    }
  }
  const merged: ItineraryItemCardModel = {
    ...base,
    /** 单 POI 多日目录占位：不以 POI 卡标题覆盖占位标题 */
    title:
      base.suggestedPoiSearchQueries !== undefined
        ? base.title
        : card.displayName?.trim() || base.title,
    ...(base.suggestedPoiSearchQueries !== undefined
      ? { suggestedPoiSearchQueries: base.suggestedPoiSearchQueries }
      : {}),
    ...(card.address ? { address: card.address } : {}),
    ...(card.rating != null ? { rating: card.rating } : {}),
    ...(card.startWindow ? { startWindow: card.startWindow } : {}),
    ...(card.endWindow ? { endWindow: card.endWindow } : {}),
    ...(card.lat != null ? { lat: card.lat } : {}),
    ...(card.lng != null ? { lng: card.lng } : {}),
    ...(card.category ? { itemType: card.category } : {}),
    ...(card.placeId ? { placeId: card.placeId } : {}),
    ...(chips.length ? { chips } : {}),
    displayKind: 'rich',
  };
  return enrichItineraryItemCardModel(merged);
}

export function itineraryItemCardModelFromAgentPoiCard(card: AgentPoiCard): ItineraryItemCardModel {
  const base: ItineraryItemCardModel = {
    title: card.displayName || '地点',
    ...(card.address ? { address: card.address } : {}),
    ...(card.startWindow ? { startWindow: card.startWindow } : {}),
    ...(card.endWindow ? { endWindow: card.endWindow } : {}),
    ...(card.category ? { itemType: card.category } : {}),
    ...(card.rating != null ? { rating: card.rating } : {}),
    ...(card.lat != null ? { lat: card.lat } : {}),
    ...(card.lng != null ? { lng: card.lng } : {}),
    ...(card.placeId ? { placeId: card.placeId } : {}),
    ...(card.tags?.length
      ? { chips: card.tags.map((t) => ({ label: t, tone: 'muted' as const })) }
      : {}),
    displayKind: 'rich',
  };
  return enrichItineraryItemCardModel(base);
}

export function normalizeItineraryItemWithOptionalPoiHydration(
  item: unknown,
  poiCards?: AgentPoiCard[]
): ItineraryItemCardModel | null {
  const base = normalizeItineraryItemCard(item);
  if (!base || !poiCards?.length) return base;
  const id = extractItineraryItemId(item);
  const card = id ? poiCards.find((c) => c.itineraryItemId && c.itineraryItemId === id) : undefined;
  return card ? mergeItineraryItemWithPoiCard(base, card) : base;
}

/** 按天索引取 POI 卡片列表（dayIndex 与列表日序对齐） */
/** 将后端 poi_cards_by_day 与 itinerary 按「第 di 天」对齐（优先 dayIndex === di，否则按排序位回退） */
export function agentPoiDayBlocksToHydrationRows(
  blocks: AgentPoiDayBlock[] | undefined,
  dayCount: number
): AgentPoiCard[][] | undefined {
  if (!blocks?.length || dayCount <= 0) return undefined;
  const sorted = [...blocks].sort((a, b) => a.dayIndex - b.dayIndex);
  const rows: AgentPoiCard[][] = [];
  for (let di = 0; di < dayCount; di++) {
    rows.push(sorted.find((b) => b.dayIndex === di)?.cards ?? sorted[di]?.cards ?? []);
  }
  return rows;
}

/**
 * 从 payload.timeline 解析为按天条目（非空数组时才返回）。
 * 支持：① { date?, items[] }[] ② 扁平条目数组（合成单日）。
 */
export function extractTimelineDayBlocks(timeline: unknown): ItineraryDayItemsBlock[] | undefined {
  if (!Array.isArray(timeline) || timeline.length === 0) return undefined;

  const first = timeline[0];
  if (first && typeof first === 'object' && !Array.isArray(first)) {
    const f = first as Record<string, unknown>;
    if (Array.isArray(f.items)) {
      const out: ItineraryDayItemsBlock[] = [];
      for (const d of timeline) {
        if (!d || typeof d !== 'object') continue;
        const dr = d as Record<string, unknown>;
        const date =
          pickStr(dr, 'date', 'day_date', 'date_iso', 'day') ??
          (typeof dr.label === 'string' ? dr.label.trim() : undefined);
        const items = Array.isArray(dr.items) ? dr.items : [];
        out.push({ ...(date ? { date } : {}), items });
      }
      return out.length > 0 ? out : undefined;
    }
  }

  return [{ items: timeline as unknown[] }];
}

export function extractTimelineDayBlocksFromPayload(
  payload: Record<string, unknown> | undefined
): ItineraryDayItemsBlock[] | undefined {
  if (!payload) return undefined;
  const timeline = payload.timeline;
  return extractTimelineDayBlocks(timeline);
}
