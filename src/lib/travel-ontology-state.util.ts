import type {
  TravelOntologyEntitySummary,
  TravelOntologyState,
  TravelOntologyVerb,
} from '@/types/travel-ontology-state';

function parseOptionalNumber(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() && !Number.isNaN(Number(raw))) return Number(raw);
  return undefined;
}

function normalizeEntity(raw: unknown): TravelOntologyEntitySummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const label = String(o.label ?? o.name ?? o.title ?? '').trim();
  if (!label) return null;
  return {
    ...(o.id != null ? { id: String(o.id) } : {}),
    label,
    ...(o.kind != null ? { kind: String(o.kind) } : {}),
    ...(o.status != null ? { status: String(o.status) } : {}),
  };
}

function normalizeEntityList(raw: unknown): TravelOntologyEntitySummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeEntity).filter((e): e is TravelOntologyEntitySummary => e != null);
}

function normalizeVerb(raw: unknown, index: number): TravelOntologyVerb | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const label = String(
    o.label ?? o.message ?? o.description ?? o.verb ?? o.action_type ?? o.actionType ?? ''
  ).trim();
  if (!label) return null;
  return {
    id: String(o.id ?? o.action_id ?? o.actionId ?? `verb-${index}`),
    label,
    ...(o.kind != null ? { kind: String(o.kind) } : {}),
    ...(o.status != null ? { status: String(o.status) } : {}),
    riskLevel:
      o.risk_level != null
        ? String(o.risk_level)
        : o.riskLevel != null
          ? String(o.riskLevel)
          : undefined,
  };
}

export function normalizeTravelOntologyState(raw: unknown): TravelOntologyState | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const verbsRaw = o.verbs ?? o.pending_verbs ?? o.pendingVerbs;
  const verbs = Array.isArray(verbsRaw)
    ? verbsRaw.map(normalizeVerb).filter((v): v is TravelOntologyVerb => v != null)
    : [];

  const flights = normalizeEntityList(o.flights ?? o.flight_entities ?? o.flightEntities);
  const hotels = normalizeEntityList(o.hotels ?? o.hotel_entities ?? o.hotelEntities);
  const activities = normalizeEntityList(o.activities ?? o.activity_entities ?? o.activityEntities);

  const pendingConfirmCount =
    parseOptionalNumber(o.pendingConfirmCount ?? o.pending_confirm_count) ??
    parseOptionalNumber(o.requires_confirmation_count) ??
    (verbs.filter((v) => {
      const s = (v.status ?? '').toUpperCase();
      return s.includes('PENDING') || s.includes('CONFIRM');
    }).length || undefined);

  const summary = String(o.summary ?? o.message ?? '').trim() || undefined;

  if (
    !summary &&
    verbs.length === 0 &&
    flights.length === 0 &&
    hotels.length === 0 &&
    activities.length === 0 &&
    pendingConfirmCount == null
  ) {
    return null;
  }

  return {
    ...(summary ? { summary } : {}),
    ...(verbs.length > 0 ? { verbs } : {}),
    ...(flights.length > 0 ? { flights } : {}),
    ...(hotels.length > 0 ? { hotels } : {}),
    ...(activities.length > 0 ? { activities } : {}),
    ...(pendingConfirmCount != null ? { pendingConfirmCount } : {}),
  };
}

export function pickTravelOntologyStateFromPayload(payload: unknown): TravelOntologyState | null {
  if (!payload || typeof payload !== 'object') return null;
  const o = payload as Record<string, unknown>;
  return normalizeTravelOntologyState(o.travel_ontology_state ?? o.travelOntologyState);
}

export function hasTravelOntologyStateContent(state: TravelOntologyState | null | undefined): boolean {
  if (!state) return false;
  return Boolean(
    state.summary ||
      (state.verbs && state.verbs.length > 0) ||
      (state.flights && state.flights.length > 0) ||
      (state.hotels && state.hotels.length > 0) ||
      (state.activities && state.activities.length > 0) ||
      (state.pendingConfirmCount != null && state.pendingConfirmCount > 0)
  );
}

export function summarizeTravelOntologyState(state: TravelOntologyState): string {
  const parts: string[] = [];
  if (state.flights?.length) parts.push(`${state.flights.length} 航班`);
  if (state.hotels?.length) parts.push(`${state.hotels.length} 住宿`);
  if (state.activities?.length) parts.push(`${state.activities.length} 活动`);
  if (state.verbs?.length) parts.push(`${state.verbs.length} 待处理动作`);
  if (state.pendingConfirmCount != null && state.pendingConfirmCount > 0) {
    parts.push(`${state.pendingConfirmCount} 项待确认`);
  }
  return parts.join(' · ') || state.summary || '';
}
