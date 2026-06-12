import type { RouteAndRunResponse } from '@/api/agent';
import type { LegEvidenceCard, LegEvidenceCardsPayload } from '@/types/leg-evidence';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function normalizeLegEvidenceCard(v: unknown): LegEvidenceCard | null {
  if (!isRecord(v)) return null;
  const summary =
    typeof v.summary_zh === 'string'
      ? v.summary_zh.trim()
      : typeof v.summaryZh === 'string'
        ? v.summaryZh.trim()
        : '';
  if (!summary) return null;

  const pitfallRaw = v.pitfall_tips_zh ?? v.pitfallTipsZh;
  const pitfall_tips_zh = Array.isArray(pitfallRaw)
    ? pitfallRaw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : undefined;

  return {
    ...(typeof v.leg_id === 'string' ? { leg_id: v.leg_id } : {}),
    ...(typeof v.from_label_zh === 'string' ? { from_label_zh: v.from_label_zh } : {}),
    ...(typeof v.to_label_zh === 'string' ? { to_label_zh: v.to_label_zh } : {}),
    summary_zh: summary,
    ...(pitfall_tips_zh?.length ? { pitfall_tips_zh } : {}),
    ...(typeof v.travel_mode === 'string' ? { travel_mode: v.travel_mode } : {}),
    ...(typeof v.distance_km === 'number' ? { distance_km: v.distance_km } : {}),
    ...(typeof v.eta_minutes === 'number' ? { eta_minutes: v.eta_minutes } : {}),
    ...(typeof v.max_slope_pct === 'number' ? { max_slope_pct: v.max_slope_pct } : {}),
    ...(typeof v.slope_warning_zh === 'string' ? { slope_warning_zh: v.slope_warning_zh } : {}),
    ...(typeof v.elderly_warn_zh === 'string' ? { elderly_warn_zh: v.elderly_warn_zh } : {}),
    ...(typeof v.opening_hours_tip_zh === 'string'
      ? { opening_hours_tip_zh: v.opening_hours_tip_zh }
      : {}),
    ...(typeof v.priority === 'number' ? { priority: v.priority } : {}),
  };
}

export function normalizeLegEvidenceCards(raw: unknown): LegEvidenceCard[] {
  if (!Array.isArray(raw)) return [];
  const cards: LegEvidenceCard[] = [];
  for (const item of raw) {
    const card = normalizeLegEvidenceCard(item);
    if (card) cards.push(card);
  }
  return cards.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
}

export function isLegEvidenceCardsPayload(v: unknown): v is LegEvidenceCardsPayload {
  if (!isRecord(v)) return false;
  if (v.schema != null && v.schema !== 'tripnara.leg_evidence_cards@v1') return false;
  return Array.isArray(v.cards);
}

function pickRawLegEvidenceCards(payload: Record<string, unknown> | undefined): unknown {
  if (!payload) return undefined;

  const uiDisplay = isRecord(payload.ui_display) ? payload.ui_display : undefined;
  const fromUi = uiDisplay?.leg_evidence_cards;
  if (fromUi != null) return fromUi;

  const narration = isRecord(payload.narration) ? payload.narration : undefined;
  return narration?.leg_evidence_cards;
}

/** 展示层优先：result.payload.ui_display.leg_evidence_cards；次选 narration.leg_evidence_cards */
export function pickLegEvidenceCardsFromRouteRun(response: RouteAndRunResponse): LegEvidenceCard[] {
  if (response.result?.status !== 'OK') return [];

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const raw = pickRawLegEvidenceCards(payload);
  if (raw == null) return [];

  if (isLegEvidenceCardsPayload(raw)) {
    return normalizeLegEvidenceCards(raw.cards);
  }

  return normalizeLegEvidenceCards(raw);
}

export function hasLegEvidenceCardsUi(cards: LegEvidenceCard[] | null | undefined): boolean {
  return Boolean(cards?.length);
}
