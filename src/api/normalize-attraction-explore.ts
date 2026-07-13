import type {
  AttractionExploreAutoArrangeResponse,
  AttractionExploreCandidate,
  AttractionExploreCandidatesResponse,
  AttractionExploreContextResponse,
  AttractionExploreFilterOption,
  AttractionExploreItem,
  AttractionExploreMapPoint,
  AttractionExploreMapResponse,
  AttractionExploreMetadata,
  AttractionExploreRecommendationsResponse,
  AttractionExploreSection,
  AttractionExploreSummary,
  AttractionExploreTripContext,
} from '@/types/attraction-explore';
import { normalizeProposalWriteResponse } from './normalize-arrange-itinerary';

const TRANSPORT_LABELS: Record<string, string> = {
  self_drive: '自驾',
  driving: '自驾',
  public_transit: '公共交通',
  transit: '公共交通',
  mixed: '混合交通',
  walking: '步行',
};

const PACE_LABELS: Record<string, string> = {
  relaxed: '轻松节奏',
  moderate: '适中节奏',
  intensive: '紧凑节奏',
  fast: '紧凑节奏',
};

const CATEGORY_LABELS: Record<string, string> = {
  ATTRACTION: '景点',
  RESTAURANT: '餐饮',
  HOTEL: '住宿',
  ACTIVITY: '体验',
};

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function labelOrDash(value: unknown, labels?: Record<string, string>): string {
  const raw = asString(value);
  if (!raw) return '—';
  return labels?.[raw] ?? raw;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readFilterOptions(value: unknown): AttractionExploreFilterOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = readRecord(item);
      if (!record) return null;
      const id = asString(record.id);
      const label = asString(record.label);
      if (!id || !label) return null;
      return { id, label };
    })
    .filter(Boolean) as AttractionExploreFilterOption[];
}

function normalizeMetadata(raw: unknown): AttractionExploreMetadata {
  const record = readRecord(raw);
  if (!record) return {};

  return {
    stayMinutes: asNumber(record.stayMinutes ?? record.stay_minutes),
    detourMinutes: asNumber(record.detourMinutes ?? record.detour_minutes),
    physicalLevel:
      record.physicalLevel === 'low' ||
      record.physicalLevel === 'medium' ||
      record.physicalLevel === 'high'
        ? record.physicalLevel
        : record.physical_level === 'low' ||
            record.physical_level === 'medium' ||
            record.physical_level === 'high'
          ? record.physical_level
          : undefined,
    bookingRequired: Boolean(
      record.bookingRequired ??
        record.booking_required ??
        record.requiresReservation ??
        record.requires_reservation,
    ),
    distanceFromRouteKm: asNumber(record.distanceFromRouteKm ?? record.distance_from_route_km),
    detourMethod: normalizeDetourMethod(record.detourMethod ?? record.detour_method),
  };
}

function normalizeDetourMethod(
  raw: unknown,
): import('@/types/attraction-explore').AttractionExploreDetourMethod | undefined {
  const value = asString(raw);
  if (
    value === 'iceland_heuristic' ||
    value === 'generic_driving' ||
    value === 'live_route_api'
  ) {
    return value;
  }
  return undefined;
}

function normalizeExploreItem(raw: unknown): AttractionExploreItem | null {
  const record = readRecord(raw);
  if (!record) return null;

  const attractionId = asString(record.attractionId ?? record.attraction_id);
  const placeId = record.placeId ?? record.place_id;
  const id =
    attractionId ??
    (placeId != null ? String(placeId) : undefined) ??
    asString(record.id);
  const name = asString(record.name);
  if (!id || !name) return null;

  const categoryRaw = asString(record.categoryLabel ?? record.category_label ?? record.category);

  const metaSource = record.metadata ?? record.meta;
  const meta = normalizeMetadata(metaSource);
  let badge = asString(record.badge);
  if (!badge && meta.detourMinutes != null && meta.detourMinutes > 0) {
    badge = `绕路约 ${meta.detourMinutes} 分钟`;
  }

  return {
    id,
    placeId: placeId ?? undefined,
    name,
    nameEN: asString(record.nameEN ?? record.name_en),
    categoryLabel: categoryRaw ? (CATEGORY_LABELS[categoryRaw] ?? categoryRaw) : '景点',
    regionLabel: asString(record.regionLabel ?? record.region_label ?? record.region),
    description: asString(record.description) ?? '',
    imageUrl: asString(record.imageUrl ?? record.image_url),
    badge: badge ?? undefined,
    metadata: meta,
  };
}

function normalizeTripContext(raw: unknown): AttractionExploreTripContext {
  const record =
    readRecord(raw) ??
    ({
      departureLabel: '—',
      transportLabel: '—',
      paceLabel: '—',
      weatherLabel: '—',
    } satisfies AttractionExploreTripContext);

  const travelConditions = readRecord(record.travelConditions ?? record.travel_conditions);
  const tripContext = readRecord(record.tripContext ?? record.trip_context);

  const origin =
    travelConditions?.origin ??
    tripContext?.departureLabel ??
    tripContext?.departure_label ??
    record.origin;
  const transport =
    travelConditions?.transportMode ??
    travelConditions?.transport_mode ??
    tripContext?.transportLabel ??
    tripContext?.transport_label ??
    record.transportMode ??
    record.transport_mode;
  const pace =
    travelConditions?.pace ??
    tripContext?.paceLabel ??
    tripContext?.pace_label ??
    record.pace;
  const weather =
    travelConditions?.weatherHint ??
    travelConditions?.weather_hint ??
    tripContext?.weatherLabel ??
    tripContext?.weather_label ??
    record.weatherHint ??
    record.weather_hint;

  return {
    departureLabel: labelOrDash(origin),
    transportLabel: labelOrDash(transport, TRANSPORT_LABELS),
    paceLabel: labelOrDash(pace, PACE_LABELS),
    weatherLabel: labelOrDash(weather),
  };
}

function buildMemberSummary(
  raw: Record<string, unknown> | null,
  themes: AttractionExploreFilterOption[],
  suitabilities: AttractionExploreFilterOption[],
): { memberCount: number; memberInitials: string[]; summary: string } {
  const memberCount = asNumber(raw?.memberCount ?? raw?.member_count) ?? 0;
  const memberInitials = Array.isArray(raw?.memberInitials ?? raw?.member_initials)
    ? (raw?.memberInitials ?? raw?.member_initials)
        .map((item) => asString(item))
        .filter(Boolean) as string[]
    : [];

  const explicitSummary = asString(raw?.summary);
  if (explicitSummary) {
    return { memberCount, memberInitials, summary: explicitSummary };
  }

  const topThemes = asStringArray(raw?.topThemes ?? raw?.top_themes);
  const topSuitabilities = asStringArray(raw?.topSuitabilities ?? raw?.top_suitabilities);
  const themeLabels = topThemes.map((id) => themes.find((item) => item.id === id)?.label ?? id);
  const suitabilityLabels = topSuitabilities.map(
    (id) => suitabilities.find((item) => item.id === id)?.label ?? id,
  );
  const joined = [...themeLabels, ...suitabilityLabels].filter(Boolean);

  if (joined.length > 0) {
    return { memberCount, memberInitials, summary: joined.join(' · ') };
  }

  if (memberCount > 0) {
    return { memberCount, memberInitials, summary: `${memberCount} 位成员，偏好待补充` };
  }

  return { memberCount, memberInitials, summary: '暂无成员偏好信息' };
}

/** BFF `/trips/:id/attraction-explore/context` → 前端 Context 类型 */
export function normalizeAttractionExploreContext(data: unknown): AttractionExploreContextResponse {
  const record = readRecord(data) ?? {};
  const themes = readFilterOptions(record.themes);
  const suitability = readFilterOptions(
    record.suitability ?? record.suitabilities ?? record.suitabilityOptions,
  );
  const selectedFilters = readRecord(record.selectedFilters ?? record.selected_filters);
  const legacySelected = readRecord(record);
  const viewTabRaw = asString(selectedFilters?.viewTab ?? selectedFilters?.view_tab);
  const selectedViewTab =
    viewTabRaw === 'recommended' || viewTabRaw === 'map' || viewTabRaw === 'along_route'
      ? viewTabRaw
      : undefined;

  return {
    themes,
    suitability,
    selectedThemeIds: asStringArray(
      selectedFilters?.themeIds ??
        selectedFilters?.theme_ids ??
        legacySelected.selectedThemeIds ??
        legacySelected.selected_theme_ids,
    ),
    selectedSuitabilityIds: asStringArray(
      selectedFilters?.suitabilityIds ??
        selectedFilters?.suitability_ids ??
        legacySelected.selectedSuitabilityIds ??
        legacySelected.selected_suitability_ids,
    ),
    selectedViewTab,
    tripContext: normalizeTripContext(record),
    memberPreferences: buildMemberSummary(
      readRecord(record.memberPreferences ?? record.member_preferences),
      themes,
      suitability,
    ),
  };
}

function normalizeSections(data: unknown): AttractionExploreSection[] {
  const record = readRecord(data);
  const groups = Array.isArray(record?.groups)
    ? record.groups
    : Array.isArray(record?.sections)
      ? record.sections
      : [];

  const SECTION_DEFAULT_SUBTITLES: Record<string, string> = {
    experience_gap: '基于当前行程体验覆盖缺口推荐',
    along_route: '顺路可插入的景点',
    first_time_must_see: '综合兴趣、路线、成员与可插入性评分',
  };

  return groups
    .map((groupRaw) => {
      const group = readRecord(groupRaw);
      if (!group) return null;

      const itemsRaw = Array.isArray(group.items)
        ? group.items
        : Array.isArray(group.attractions)
          ? group.attractions
          : [];

      const items = itemsRaw
        .map((item) => normalizeExploreItem(item))
        .filter(Boolean) as AttractionExploreItem[];

      const id = asString(group.groupId ?? group.group_id ?? group.id);
      const title = asString(group.title);
      if (!id || !title) return null;

      const groupKind = id;

      return {
        id,
        title,
        subtitle: asString(group.subtitle) ?? SECTION_DEFAULT_SUBTITLES[groupKind],
        groupKind,
        items,
      };
    })
    .filter(Boolean) as AttractionExploreSection[];
}

/** BFF recommendations/search → 前端 sections */
export function normalizeAttractionExploreRecommendations(
  data: unknown,
): AttractionExploreRecommendationsResponse {
  const record = readRecord(data) ?? {};
  return {
    sections: normalizeSections(record),
    updatedAt: asString(record.updatedAt ?? record.updated_at),
    compiledIntent: normalizeCompiledIntent(record.compiledIntent ?? record.compiled_intent),
  };
}

function normalizeFilterOptions(raw: unknown): AttractionExploreFilterOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const record = readRecord(item);
      if (!record) return null;
      const id = asString(record.id);
      const label = asString(record.label);
      if (!id) return null;
      return { id, label: label ?? id };
    })
    .filter(Boolean) as AttractionExploreFilterOption[];
}

/** BFF explore-intent / compiledIntent → 前端结构化条件 */
export function normalizeCompiledIntent(
  raw: unknown,
): import('@/types/attraction-explore').AttractionExploreCompiledIntent | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;

  const themes = normalizeFilterOptions(record.themes ?? record.themeIds ?? record.theme_ids);
  const suitableFor = normalizeFilterOptions(
    record.suitableFor ??
      record.suitable_for ??
      record.suitability ??
      record.suitabilityIds ??
      record.suitability_ids,
  );
  const maxDetourMinutes = asNumber(record.maxDetourMinutes ?? record.max_detour_minutes);
  const weatherMode = asString(record.weatherMode ?? record.weather_mode);
  const routeContext = asString(record.routeContext ?? record.route_context);
  const query = asString(record.query);
  const sourceRaw = asString(record.source);
  const source =
    sourceRaw === 'rules' || sourceRaw === 'rules+llm' ? sourceRaw : undefined;

  if (
    themes.length === 0 &&
    suitableFor.length === 0 &&
    maxDetourMinutes == null &&
    !weatherMode &&
    !routeContext &&
    !query
  ) {
    return undefined;
  }

  return {
    query,
    themes: themes.length > 0 ? themes : undefined,
    suitableFor: suitableFor.length > 0 ? suitableFor : undefined,
    maxDetourMinutes: maxDetourMinutes ?? undefined,
    weatherMode,
    routeContext,
    source,
  };
}

export function normalizeExploreIntentResponse(
  data: unknown,
): import('@/types/attraction-explore').AttractionExploreExploreIntentResponse {
  const record = readRecord(data) ?? {};
  const compiled = normalizeCompiledIntent(record) ?? {};
  return {
    tripId: asString(record.tripId ?? record.trip_id),
    ...compiled,
  };
}

function normalizeCandidate(raw: unknown): AttractionExploreCandidate | null {
  const record = readRecord(raw);
  if (!record) return null;

  const id = asString(record.id);
  const name = asString(record.name);
  const priority = record.priority;
  const sortOrder = asNumber(record.sortOrder ?? record.sort_order);
  if (!id || !name || sortOrder == null) return null;
  if (priority !== 'must_go' && priority !== 'very_interested' && priority !== 'alternative') {
    return null;
  }

  return {
    id,
    placeId: record.placeId ?? record.place_id ?? undefined,
    attractionId: asString(record.attractionId ?? record.attraction_id),
    name,
    imageUrl: asString(record.imageUrl ?? record.image_url),
    priority,
    sortOrder,
    source: asString(record.source),
  };
}

function normalizeSummary(raw: unknown): AttractionExploreSummary {
  const record = readRecord(raw) ?? {};
  return {
    attractionCount: asNumber(record.attractionCount ?? record.attraction_count) ?? 0,
    estimatedDays: asNumber(record.estimatedDays ?? record.estimated_days) ?? 0,
    routeSpanKm: asNumber(record.routeSpanKm ?? record.route_span_km) ?? 0,
  };
}

function normalizePrecheck(raw: unknown): import('@/types/attraction-explore').AttractionExploreCandidatePrecheck | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;
  const warningsRaw = Array.isArray(record.warnings) ? record.warnings : [];
  return {
    feasible: record.feasible !== false,
    warnings: warningsRaw
      .map((item) => {
        const warning = readRecord(item);
        if (!warning) return null;
        const message = asString(warning.message);
        const code = asString(warning.code);
        if (!message || !code) return null;
        const severity = asString(warning.severity);
        return {
          code,
          message,
          severity:
            severity === 'warn' || severity === 'error' || severity === 'info'
              ? severity
              : undefined,
        };
      })
      .filter(Boolean) as import('@/types/attraction-explore').AttractionExploreCandidatePrecheckWarning[],
  };
}

/** BFF candidates → 前端候选清单 */
export function normalizeAttractionExploreCandidates(
  data: unknown,
): AttractionExploreCandidatesResponse {
  const record = readRecord(data) ?? {};
  const candidatesRaw = Array.isArray(record.candidates) ? record.candidates : [];

  return {
    candidates: candidatesRaw
      .map((item) => normalizeCandidate(item))
      .filter(Boolean) as AttractionExploreCandidate[],
    summary: normalizeSummary(record.summary),
    precheck: normalizePrecheck(record.precheck),
    copilotNextAction: normalizeCopilotNextAction(
      record.copilotNextAction ?? record.copilot_next_action,
    ),
  };
}

function normalizeCopilotNextAction(
  raw: unknown,
): import('@/types/attraction-explore').AttractionExploreCopilotNextAction | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;
  const action = asString(record.action);
  if (
    action !== 'draft_for_candidate' &&
    action !== 'draft_all_must_go' &&
    action !== 'fill_gaps' &&
    action !== 'execute_suggestion'
  ) {
    return undefined;
  }
  return {
    action,
    candidateId: asString(record.candidateId ?? record.candidate_id),
    suggestionId: asString(record.suggestionId ?? record.suggestion_id),
    endpoint: asString(record.endpoint),
  };
}

function normalizeInsertHint(
  raw: unknown,
): import('@/types/attraction-explore').AttractionExploreMapInsertHint | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;
  const suggestedDayIndex = asNumber(
    record.suggestedDayIndex ?? record.suggested_day_index ?? record.dayIndex ?? record.day_index,
  );
  if (suggestedDayIndex == null) return undefined;
  return {
    suggestedDayIndex,
    detourMinutes: asNumber(record.detourMinutes ?? record.detour_minutes) ?? undefined,
    startTime: asString(record.startTime ?? record.start_time),
    endTime: asString(record.endTime ?? record.end_time),
    detourMethod: normalizeDetourMethod(record.detourMethod ?? record.detour_method),
  };
}

function normalizeMapPoint(raw: unknown): AttractionExploreMapPoint | null {
  const record = readRecord(raw);
  if (!record) return null;

  const coordinates = readRecord(record.coordinates);
  const lat = asNumber(
    record.lat ??
      record.latitude ??
      coordinates?.lat ??
      coordinates?.latitude,
  );
  const lng = asNumber(
    record.lng ??
      record.longitude ??
      record.lon ??
      coordinates?.lng ??
      coordinates?.longitude ??
      coordinates?.lon,
  );
  const id =
    asString(record.id) ??
    asString(record.attractionId ?? record.attraction_id) ??
    (record.placeId != null ? String(record.placeId) : undefined) ??
    (record.place_id != null ? String(record.place_id) : undefined);
  const name = asString(record.name);

  if (!id || !name || lat == null || lng == null) return null;

  const kindRaw = asString(record.kind ?? record.type);
  const kind =
    kindRaw === 'candidate' ||
    kindRaw === 'recommended' ||
    kindRaw === 'route' ||
    kindRaw === 'lodging' ||
    kindRaw === 'lodging_suggestion'
      ? kindRaw
      : undefined;

  return {
    id,
    placeId: record.placeId ?? record.place_id ?? undefined,
    name,
    lat,
    lng,
    kind,
    dayIndex: asNumber(record.dayIndex ?? record.day_index) ?? undefined,
    lodgingRole:
      asString(record.lodgingRole ?? record.lodging_role) === 'overnight' ||
      asString(record.lodgingRole ?? record.lodging_role) === 'suggestion'
        ? (asString(record.lodgingRole ?? record.lodging_role) as 'overnight' | 'suggestion')
        : undefined,
    highlighted: record.highlighted === true,
    insertHint: normalizeInsertHint(record.insertHint ?? record.insert_hint),
  };
}

function normalizeLodgingLegEndpoint(
  raw: unknown,
): import('@/types/attraction-explore').AttractionExploreMapLodgingLegEndpoint | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;
  const label = asString(record.label);
  const placeId = record.placeId ?? record.place_id;
  const kind = asString(record.kind);
  if (!label && placeId == null && !kind) return undefined;
  return {
    kind,
    placeId: placeId ?? undefined,
    label,
  };
}

function normalizeLodgingLeg(raw: unknown): import('@/types/attraction-explore').AttractionExploreMapLodgingLeg | null {
  const record = readRecord(raw);
  if (!record) return null;
  const dayIndex = asNumber(
    record.dayIndex ?? record.day_index ?? record.nightIndex ?? record.night_index,
  );
  if (dayIndex == null) return null;

  const from = normalizeLodgingLegEndpoint(record.from);
  const to = normalizeLodgingLegEndpoint(record.to);

  const polylineRaw = record.polyline ?? record.path ?? record.coordinates;
  const polyline = Array.isArray(polylineRaw)
    ? polylineRaw
        .map((point) => {
          const item = readRecord(point);
          const lat = asNumber(item?.lat ?? item?.latitude);
          const lng = asNumber(item?.lng ?? item?.longitude ?? item?.lon);
          if (lat == null || lng == null) return null;
          return { lat, lng };
        })
        .filter(Boolean) as Array<{ lat: number; lng: number }>
    : [];

  const driveMinutes = asNumber(
    record.driveMinutes ??
      record.drive_minutes ??
      record.driveMinutesEstimate ??
      record.drive_minutes_estimate,
  );
  const distanceKm = asNumber(record.distanceKm ?? record.distance_km);
  const legKindRaw = asString(record.kind ?? record.legKind ?? record.leg_kind);
  const legKind =
    legKindRaw === 'approach' || legKindRaw === 'relocation' ? legKindRaw : undefined;

  const label =
    asString(record.label) ??
    (from?.label && to?.label ? `${from.label} → ${to.label}` : undefined);

  if (polyline.length === 0 && !from && !to && !label) return null;

  return {
    id: asString(record.id),
    dayIndex,
    nightIndex: asNumber(record.nightIndex ?? record.night_index),
    fromPointId:
      asString(record.fromPointId ?? record.from_point_id) ??
      (from?.placeId != null ? String(from.placeId) : undefined),
    toPointId:
      asString(record.toPointId ?? record.to_point_id) ??
      (to?.placeId != null ? String(to.placeId) : undefined),
    from,
    to,
    polyline: polyline.length > 0 ? polyline : undefined,
    label,
    driveMinutes,
    distanceKm,
    legKind,
  };
}

/** BFF map → 前端 map points */
export function normalizeAttractionExploreMap(data: unknown): AttractionExploreMapResponse {
  const record = readRecord(data) ?? {};
  const pointsRaw = Array.isArray(record.points)
    ? record.points
    : Array.isArray(record.pois)
      ? record.pois
      : [];

  const routePolylineRaw = record.routePolyline ?? record.route_polyline;
  const routePolyline = Array.isArray(routePolylineRaw)
    ? routePolylineRaw
        .map((point) => {
          const item = readRecord(point);
          const nested = readRecord(item?.coordinates);
          const lat = asNumber(
            item?.lat ?? item?.latitude ?? nested?.lat ?? nested?.latitude,
          );
          const lng = asNumber(
            item?.lng ??
              item?.longitude ??
              item?.lon ??
              nested?.lng ??
              nested?.longitude ??
              nested?.lon,
          );
          if (lat == null || lng == null) return null;
          return { lat, lng };
        })
        .filter(Boolean) as Array<{ lat: number; lng: number }>
    : undefined;

  return {
    points: pointsRaw
      .map((item) => normalizeMapPoint(item))
      .filter(Boolean) as AttractionExploreMapPoint[],
    routePolyline,
    lodgingLegs: (() => {
      const legsRaw = record.lodgingLegs ?? record.lodging_legs;
      if (!Array.isArray(legsRaw)) return undefined;
      const legs = legsRaw
        .map((item) => normalizeLodgingLeg(item))
        .filter(Boolean) as import('@/types/attraction-explore').AttractionExploreMapLodgingLeg[];
      return legs.length > 0 ? legs : undefined;
    })(),
  };
}

/** BFF auto-arrange → 前端 toast 文案 */
export function normalizeAttractionExploreAutoArrange(
  data: unknown,
): AttractionExploreAutoArrangeResponse {
  const record = readRecord(data) ?? {};
  const itemCount = asNumber(record.itemCount ?? record.item_count);
  const status = asString(record.status);
  const message = asString(record.message);

  return {
    taskId: asString(record.taskId ?? record.task_id),
    message:
      message ??
      (itemCount != null
        ? `已编排 ${itemCount} 个景点`
        : status === 'completed'
          ? '自动编排已完成'
          : undefined),
  };
}

function normalizeMapPlaceSuggestion(
  raw: unknown,
): import('@/types/attraction-explore').AttractionExploreMapPlaceSuggestion | null {
  const record = readRecord(raw);
  if (!record) return null;
  const dayIndex = asNumber(record.dayIndex ?? record.day_index);
  if (dayIndex == null) return null;
  const insertMode = asString(record.insertMode ?? record.insert_mode);
  return {
    dayIndex,
    startTime: asString(record.startTime ?? record.start_time),
    endTime: asString(record.endTime ?? record.end_time),
    detourMinutes: asNumber(record.detourMinutes ?? record.detour_minutes) ?? undefined,
    label: asString(record.label),
    insertMode:
      insertMode === 'append' || insertMode === 'before' || insertMode === 'after'
        ? insertMode
        : undefined,
    anchorItemId: asString(record.anchorItemId ?? record.anchor_item_id),
  };
}

/** BFF map/place-proposal → 插入建议 + PlanProposal 草案 */
export function normalizeMapPlaceProposal(
  data: unknown,
): import('@/types/attraction-explore').AttractionExploreMapPlaceProposalResponse {
  const record = readRecord(data) ?? {};
  const suggestionsRaw = Array.isArray(record.suggestions) ? record.suggestions : [];
  const proposalWrite = normalizeProposalWriteResponse(record);
  return {
    suggestions: suggestionsRaw
      .map((item) => normalizeMapPlaceSuggestion(item))
      .filter(Boolean) as import('@/types/attraction-explore').AttractionExploreMapPlaceSuggestion[],
    mode: 'proposal',
    tripId: proposalWrite.tripId,
    proposal: proposalWrite.proposal,
    orchestrationState: proposalWrite.orchestrationState,
    answer: proposalWrite.answer,
  };
}
