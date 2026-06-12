import type { RouteAndRunResponse } from '@/api/agent';
import type { PoiPitfallCard, PoiPitfallCardsPayload } from '@/types/poi-pitfall';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  return out.length > 0 ? out : undefined;
}

export function normalizePoiPitfallCard(v: unknown): PoiPitfallCard | null {
  if (!isRecord(v)) return null;

  const headline =
    typeof v.headline_zh === 'string'
      ? v.headline_zh.trim()
      : typeof v.headlineZh === 'string'
        ? v.headlineZh.trim()
        : '';
  const summary =
    typeof v.summary_zh === 'string'
      ? v.summary_zh.trim()
      : typeof v.summaryZh === 'string'
        ? v.summaryZh.trim()
        : '';
  const poiName =
    typeof v.poi_name_zh === 'string'
      ? v.poi_name_zh.trim()
      : typeof v.poiNameZh === 'string'
        ? v.poiNameZh.trim()
        : typeof v.display_name === 'string'
          ? v.display_name.trim()
          : '';

  const pitfall_tips_zh = pickStringArray(v.pitfall_tips_zh ?? v.pitfallTipsZh);
  if (!headline && !summary && !poiName && !pitfall_tips_zh?.length) return null;

  return {
    ...(typeof v.card_id === 'string' ? { card_id: v.card_id } : {}),
    ...(typeof v.poi_id === 'string' ? { poi_id: v.poi_id } : {}),
    ...(typeof v.itinerary_item_id === 'string' ? { itinerary_item_id: v.itinerary_item_id } : {}),
    ...(poiName ? { poi_name_zh: poiName } : {}),
    ...(typeof v.day_date === 'string' ? { day_date: v.day_date } : {}),
    ...(typeof v.day_index === 'number' ? { day_index: v.day_index } : {}),
    ...(headline ? { headline_zh: headline } : {}),
    ...(summary ? { summary_zh: summary } : {}),
    ...(pitfall_tips_zh?.length ? { pitfall_tips_zh } : {}),
    ...(typeof v.severity === 'string' ? { severity: v.severity } : {}),
    ...(typeof v.source === 'string' ? { source: v.source } : {}),
  };
}

export function normalizePoiPitfallCards(raw: unknown): PoiPitfallCard[] {
  if (!Array.isArray(raw)) return [];
  const cards: PoiPitfallCard[] = [];
  for (const item of raw) {
    const card = normalizePoiPitfallCard(item);
    if (card) cards.push(card);
  }
  return cards;
}

export function isPoiPitfallCardsPayload(v: unknown): v is PoiPitfallCardsPayload {
  if (!isRecord(v)) return false;
  if (v.schema != null && v.schema !== 'tripnara.poi_pitfall_cards@v1') return false;
  return Array.isArray(v.cards);
}

function pickRawPoiPitfallCards(payload: Record<string, unknown> | undefined): unknown {
  if (!payload) return undefined;

  const uiDisplay = isRecord(payload.ui_display) ? payload.ui_display : undefined;
  const fromUi = uiDisplay?.poi_pitfall_cards;
  if (fromUi != null) return fromUi;

  const narration = isRecord(payload.narration) ? payload.narration : undefined;
  return narration?.poi_pitfall_cards;
}

/** ui_display.poi_pitfall_cards 优先；次选 narration.poi_pitfall_cards */
export function pickPoiPitfallCardsFromRouteRun(response: RouteAndRunResponse): PoiPitfallCard[] {
  if (response.result?.status !== 'OK') return [];

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const raw = pickRawPoiPitfallCards(payload);
  if (raw == null) return [];

  if (isPoiPitfallCardsPayload(raw)) {
    return normalizePoiPitfallCards(raw.cards);
  }

  return normalizePoiPitfallCards(raw);
}

export function hasPoiPitfallCardsUi(cards: PoiPitfallCard[] | null | undefined): boolean {
  return Boolean(cards?.length);
}
