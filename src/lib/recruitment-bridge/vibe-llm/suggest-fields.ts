import type { DestinationRegionOption, PlanningStyle, TravelMode, TripMoodTag } from '@/types/match-square';
import type { VibeHardGates, VibeLlmParseResult, VibeSuggestedFields } from '@/types/vibe-llm';
import { inferDestinationIdsFromScope, inferDestinationIdsFromVision, buildClarifyDestinationRegions } from '../destination-options';
import { inferBudgetCentsFromBudgetRangeString } from '../resolve-budget-gate';
import { hardGatesToPreferences } from './rule-parser';

export type { VibeSuggestedFields };

const TRAVEL_MODES = new Set<TravelMode>(['self_drive', 'public_transit', 'mixed', 'other']);
const TRIP_MOODS = new Set<TripMoodTag>(['relax', 'adventure', 'healing', 'social']);

function asTravelMode(raw: unknown): TravelMode | null {
  if (typeof raw !== 'string') return null;
  return TRAVEL_MODES.has(raw as TravelMode) ? (raw as TravelMode) : null;
}

function asTripMood(raw: unknown): TripMoodTag | null {
  if (typeof raw !== 'string') return null;
  return TRIP_MOODS.has(raw as TripMoodTag) ? (raw as TripMoodTag) : null;
}

function asCents(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return null;
  return Math.round(raw);
}

function asNullableString(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t || null;
}

/** 归一化 API suggestedFields / suggested_fields */
export function normalizeSuggestedFields(raw: unknown): VibeSuggestedFields | null {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  if (!record) return null;

  const destination = asNullableString(record.destination);
  const destinationRegionId = asNullableString(
    record.destinationRegionId ?? record.destination_region_id
  );
  const destinationSubScopeId = asNullableString(
    record.destinationSubScopeId ?? record.destination_sub_scope_id
  );
  const budgetMinCents = asCents(record.budgetMinCents ?? record.budget_min_cents);
  const budgetMaxCents = asCents(record.budgetMaxCents ?? record.budget_max_cents);
  const travelMode = asTravelMode(record.travelMode ?? record.travel_mode);
  const tripMoodTag = asTripMood(record.tripMoodTag ?? record.trip_mood_tag);
  const preferenceNotes = asNullableString(record.preferenceNotes ?? record.preference_notes);

  if (
    !destination &&
    !destinationRegionId &&
    !destinationSubScopeId &&
    budgetMinCents == null &&
    budgetMaxCents == null &&
    !travelMode &&
    !tripMoodTag &&
    !preferenceNotes
  ) {
    return null;
  }

  return {
    destination,
    destinationRegionId,
    destinationSubScopeId,
    budgetMinCents,
    budgetMaxCents,
    travelMode,
    tripMoodTag,
    preferenceNotes,
  };
}

function inferDestinationFromText(text: string): string | null {
  return inferDestinationIdsFromVision(text, buildClarifyDestinationRegions()).destination ?? null;
}

/** API 只返回 destination 文案时，补全 region/sub id */
export function enrichSuggestedFieldsWithDestinationIds(
  sf: VibeSuggestedFields | null | undefined,
  regions: DestinationRegionOption[],
  vision?: string
): VibeSuggestedFields | null {
  const visionText = vision?.trim() ?? '';
  if (!sf && !visionText) return sf ?? null;

  const base: VibeSuggestedFields = { ...(sf ?? {}) };
  if (base.destinationRegionId) return base;

  const fromDestination = base.destination
    ? inferDestinationIdsFromScope(regions, base.destination)
    : {};
  const fromVision = visionText
    ? inferDestinationIdsFromVision([base.destination, visionText].filter(Boolean).join(' '), regions)
    : {};

  return {
    ...base,
    destination: base.destination ?? fromVision.destination ?? null,
    destinationRegionId:
      base.destinationRegionId ??
      fromDestination.destinationRegionId ??
      fromVision.destinationRegionId ??
      null,
    destinationSubScopeId:
      base.destinationSubScopeId ??
      fromDestination.destinationSubScopeId ??
      fromVision.destinationSubScopeId ??
      null,
  };
}

function inferBudgetCentsFromText(text: string, gates?: VibeHardGates): Pick<VibeSuggestedFields, 'budgetMinCents' | 'budgetMaxCents'> {
  const plus5w = text.match(/(?:人均\s*)?(\d+)\s*[wW万]\s*\+|(\d+)\s*[wW]\s*\+/i);
  if (plus5w) {
    const w = Number(plus5w[1] ?? plus5w[2]);
    return { budgetMinCents: w * 10000 * 100, budgetMaxCents: undefined };
  }

  const m = text.match(/人均\s*([23])\s*w|([23])\s*万|三万/i);
  if (m) {
    const w = Number(m[1] ?? m[2] ?? 3);
    return { budgetMinCents: w * 10000 * 100, budgetMaxCents: undefined };
  }

  if (typeof gates?.budget_range === 'string') {
    const fromString = inferBudgetCentsFromBudgetRangeString(gates.budget_range);
    if (fromString.budgetMinCents != null) return fromString;
  }

  const min = typeof gates?.budget_range === 'object' ? gates?.budget_range?.min : undefined;
  if (min != null) {
    return {
      budgetMinCents: min * 100,
      budgetMaxCents:
        typeof gates?.budget_range === 'object' && gates.budget_range?.max != null
          ? gates.budget_range.max * 100
          : undefined,
    };
  }
  return {};
}

function inferTravelModeFromParse(text: string, parse?: VibeLlmParseResult | null): TravelMode | null {
  if (/🏎️|自驾|拼车/i.test(parse?.vibe_chips.join('') ?? '') || /自驾|拼车/i.test(text)) {
    return 'self_drive';
  }
  if (/公共交通|地铁|火车/i.test(text)) return 'public_transit';
  if (/跳伞|滑雪|直升机/i.test(text)) return 'mixed';
  return null;
}

function inferTripMoodFromText(text: string): TripMoodTag | null {
  if (/极限|跳伞|滑雪|高强度|冒险|硬核/i.test(text)) return 'adventure';
  if (/疗愈|放松|佛系/i.test(text)) return 'healing';
  if (/社交|热闹|e人/i.test(text)) return 'social';
  if (/躺平|休息/i.test(text)) return 'relax';
  return null;
}

/** 规则引擎 mock · suggestedFields 推断（API 未返回时兜底） */
export function inferSuggestedFieldsFromVision(
  text: string,
  parse?: VibeLlmParseResult | null
): VibeSuggestedFields | null {
  const trimmed = text.trim();
  if (trimmed.length < 8) return null;

  const destinationIds = inferDestinationIdsFromVision(trimmed, buildClarifyDestinationRegions());
  const destination = destinationIds.destination ?? inferDestinationFromText(trimmed);
  const budget = inferBudgetCentsFromText(trimmed, parse?.hard_gates);
  const travelMode = inferTravelModeFromParse(trimmed, parse);
  const tripMoodTag = inferTripMoodFromText(trimmed);
  const gateLine = parse ? hardGatesToPreferences(parse.hard_gates) : '';
  const chipLine = parse?.vibe_chips.join(' · ') ?? '';
  const preferenceNotes = [gateLine, chipLine].filter(Boolean).join('\n') || null;

  if (
    !destination &&
    !destinationIds.destinationRegionId &&
    budget.budgetMinCents == null &&
    !travelMode &&
    !tripMoodTag &&
    !preferenceNotes
  ) {
    return null;
  }

  return {
    destination,
    destinationRegionId: destinationIds.destinationRegionId,
    destinationSubScopeId: destinationIds.destinationSubScopeId,
    ...budget,
    travelMode,
    tripMoodTag,
    preferenceNotes,
  };
}

export type VibeFormUserEdited = {
  itinerary?: boolean;
  captain?: boolean;
  planningStyle?: boolean;
  destination?: boolean;
  destinationRegion?: boolean;
  destinationSubScope?: boolean;
  budget?: boolean;
  travelMode?: boolean;
  tripMoodTag?: boolean;
  preferences?: boolean;
};

export type ApplyVibeSuggestionsInput = {
  response: {
    suggestedItinerarySummary?: string | null;
    suggestedCaptainMessage?: string | null;
    suggestedPlanningStyle?: PlanningStyle | null;
    suggestedFields?: VibeSuggestedFields | null;
  };
  userEdited: VibeFormUserEdited;
  /** filters/options · 用于从 destination 文案反推 region/sub id */
  destinationRegions?: DestinationRegionOption[];
  visionText?: string;
  /** 本地规则兜底 copy（API 未返回 suggestedItinerary/Captain 时） */
  fallbackItinerary?: string | null;
  fallbackCaptain?: string | null;
};

export type ApplyVibeSuggestionsResult = {
  filled: Partial<Record<keyof VibeFormUserEdited, boolean>>;
};

/** 将 parse 响应写入表单 — 尊重 userEdited，不覆盖用户手改字段 */
export function pickVibeSuggestionsToApply(
  input: ApplyVibeSuggestionsInput
): {
  itinerarySummary?: string;
  captainMessage?: string;
  planningStyle?: PlanningStyle;
  destination?: string;
  destinationRegionId?: string;
  destinationSubScopeId?: string;
  budgetMinRmb?: number;
  budgetMaxRmb?: number;
  travelMode?: TravelMode;
  tripMoodTag?: TripMoodTag;
  preferences?: string;
  filled: ApplyVibeSuggestionsResult['filled'];
} {
  const { response, userEdited, fallbackItinerary, fallbackCaptain, destinationRegions, visionText } =
    input;
  const sf =
    destinationRegions?.length ?
      enrichSuggestedFieldsWithDestinationIds(response.suggestedFields, destinationRegions, visionText)
    : response.suggestedFields;
  const filled: ApplyVibeSuggestionsResult['filled'] = {};
  const out: ReturnType<typeof pickVibeSuggestionsToApply> = { filled };

  if (!userEdited.itinerary) {
    const v = response.suggestedItinerarySummary?.trim() || fallbackItinerary?.trim();
    if (v) {
      out.itinerarySummary = v;
      filled.itinerary = true;
    }
  }

  if (!userEdited.captain) {
    const v = response.suggestedCaptainMessage?.trim() || fallbackCaptain?.trim();
    if (v) {
      out.captainMessage = v;
      filled.captain = true;
    }
  }

  if (!userEdited.planningStyle && response.suggestedPlanningStyle) {
    out.planningStyle = response.suggestedPlanningStyle;
    filled.planningStyle = true;
  }

  if (!userEdited.destinationRegion && sf?.destinationRegionId) {
    out.destinationRegionId = sf.destinationRegionId;
    filled.destinationRegion = true;
  }

  if (!userEdited.destinationSubScope && sf?.destinationSubScopeId) {
    out.destinationSubScopeId = sf.destinationSubScopeId;
    filled.destinationSubScope = true;
  }

  if (!userEdited.destination && sf?.destination) {
    out.destination = sf.destination;
    filled.destination = true;
  }

  if (!userEdited.budget) {
    if (sf?.budgetMinCents != null) {
      out.budgetMinRmb = Math.round(sf.budgetMinCents / 100);
      filled.budget = true;
    }
    if (sf?.budgetMaxCents != null) {
      out.budgetMaxRmb = Math.round(sf.budgetMaxCents / 100);
      filled.budget = true;
    }
  }

  if (!userEdited.travelMode && sf?.travelMode) {
    out.travelMode = sf.travelMode;
    filled.travelMode = true;
  }

  if (!userEdited.tripMoodTag && sf?.tripMoodTag) {
    out.tripMoodTag = sf.tripMoodTag;
    filled.tripMoodTag = true;
  }

  if (!userEdited.preferences && sf?.preferenceNotes) {
    out.preferences = sf.preferenceNotes;
    filled.preferences = true;
  }

  return out;
}
