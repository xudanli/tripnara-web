import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type {
  CoverageGap,
  CoverageMapPoi,
  CoverageMapResponse,
  CoverageMapSegment,
  PoiType,
} from '@/api/readiness';
import { getItineraryItemTypeDisplay, isItineraryItemType } from '@/lib/itinerary-item-type-display';
import type { ItineraryItemDetail, Place, TripDetail } from '@/types/trip';
import type {
  JourneyActivity,
  JourneyDataFeed,
  JourneyDay,
  JourneyDiversion,
  JourneyLayerKind,
  JourneyMapModel,
  JourneyMarkerIcon,
  JourneyMember,
  JourneyMemberGroup,
  JourneyRiskPoint,
  JourneyRouteSegment,
  JourneyStats,
} from '../types';
import { DAY_COLORS } from '../types';
import { normalizePoiType } from '../lib/journey-map-marker-icons';
import { decodeRoutePolyline } from '../lib/journey-map-route.util';
import {
  extractPlaceAddress,
  extractPlaceDetail,
  extractPlaceImageUrl,
  extractPoiMetadataAddress,
  extractPoiMetadataDetail,
  extractPoiMetadataImageUrl,
  safeHttpImageUrl,
} from '../lib/journey-map-place.util';

function placeCoords(place?: Place | null): { lng: number; lat: number } | null {
  if (!place) return null;
  const lat = place.latitude ?? place.lat;
  const lng = place.longitude ?? place.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lng, lat };
}

function poiKind(type: PoiType): JourneyLayerKind {
  if (type === 'hotel') return 'accommodation';
  if (type === 'transport') return 'transport';
  return 'activity';
}

function itemKind(type: string): JourneyLayerKind {
  const key = type.trim().toUpperCase();
  if (key === 'TRANSIT') return 'transport';
  if (key === 'REST') return 'accommodation';
  return 'activity';
}

const POI_MARKER_ICON: Record<PoiType, JourneyMarkerIcon> = {
  city: 'city',
  attraction: 'sightseeing',
  hotel: 'accommodation',
  restaurant: 'dining',
  transport: 'transport',
  other: 'default',
};

function extractHm(iso?: string | null): string | undefined {
  if (!iso?.trim()) return undefined;
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m?.[1];
}

function buildMembers(travelerCount: number): {
  members: JourneyMember[];
  memberGroups: JourneyMemberGroup[];
} {
  const count = Math.max(1, travelerCount);
  const members: JourneyMember[] = Array.from({ length: Math.min(count, 12) }, (_, i) => ({
    id: `traveler-${i + 1}`,
    name: count === 1 ? '旅行者' : `成员 ${i + 1}`,
    initials: count === 1 ? '我' : `M${i + 1}`,
    groupId: 'young' as const,
    avatarColor: DAY_COLORS[i % DAY_COLORS.length],
  }));

  return {
    members,
    memberGroups: [
      { id: 'young', label: '年轻人组', count: members.length },
      { id: 'elderly', label: '长者组', count: 0 },
      { id: 'children', label: '儿童组', count: 0 },
    ],
  };
}

function buildDateRangeLabel(trip: TripDetail): string | undefined {
  const sortedDays = [...(trip.TripDay ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  if (!sortedDays.length) return undefined;

  const formatDay = (dateStr: string) => {
    const normalized = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
    return format(new Date(normalized), 'M月d日 (EEE)', { locale: zhCN });
  };

  const first = sortedDays[0]!.date;
  const last = sortedDays[sortedDays.length - 1]!.date;
  if (sortedDays.length === 1) return formatDay(first);
  return `${formatDay(first)} - ${formatDay(last)}`;
}

function placeDisplayName(place?: Place | null): string {
  if (!place) return '';
  return (place.nameCN?.trim() || place.nameEN?.trim() || '').trim();
}

function compareItineraryOrder(a: ItineraryItemDetail, b: ItineraryItemDetail): number {
  const ai = a.displaySortIndex ?? a.crossDayInfo?.displaySortIndex;
  const bi = b.displaySortIndex ?? b.crossDayInfo?.displaySortIndex;
  if (typeof ai === 'number' && typeof bi === 'number' && ai !== bi) return ai - bi;
  if (typeof ai === 'number' && typeof bi !== 'number') return -1;
  if (typeof bi === 'number' && typeof ai !== 'number') return 1;
  return (a.startTime ?? '').localeCompare(b.startTime ?? '');
}

function segmentsForDay(segments: CoverageMapSegment[], dayNumber: number): CoverageMapSegment[] {
  return segments
    .filter((s) => s.day === dayNumber)
    .sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0));
}

/** 与 plan-studio 日程一致：按 TripDay 内行程项起终点命名 */
function buildRouteLabelFromItinerary(
  tripDayId: string,
  items: ItineraryItemDetail[],
): string | null {
  const dayItems = items
    .filter((item) => {
      const dayId = item.tripDayId ?? item.TripDay?.id;
      return dayId === tripDayId && placeCoords(item.Place);
    })
    .filter((item) => item.type.trim().toUpperCase() !== 'TRANSIT')
    .sort(compareItineraryOrder);

  const named = dayItems
    .map((item) => placeDisplayName(item.Place))
    .filter((name) => name.length > 0);

  if (named.length >= 2) {
    return `${named[0]} → ${named[named.length - 1]}`;
  }
  if (named.length === 1) return named[0]!;
  return null;
}

function buildDayRouteOverrides(
  summaries: Array<{ day: number; routeLabel: string }>,
  tripDayCount: number,
): Map<number, string> {
  const map = new Map<number, string>();
  if (!summaries.length || tripDayCount <= 0) return map;

  const usesZeroBased = summaries.some((s) => s.day === 0);

  for (const summary of summaries) {
    const label = summary.routeLabel?.trim();
    if (!label) continue;
    const dayNumber = usesZeroBased ? summary.day + 1 : summary.day;
    if (dayNumber >= 1 && dayNumber <= tripDayCount) {
      map.set(dayNumber, label);
    }
  }
  return map;
}

function buildRouteLabelForDay(
  dayNumber: number,
  pois: CoverageMapPoi[],
  segments: CoverageMapSegment[],
  theme?: string,
  dateLabel?: string,
): string {
  const poiById = new Map(pois.map((p) => [p.id, p]));
  const daySegments = segmentsForDay(segments, dayNumber);

  if (daySegments.length > 0) {
    const first = daySegments[0]!;
    const last = daySegments[daySegments.length - 1]!;
    const from = poiById.get(first.fromPoiId)?.name;
    const to = poiById.get(last.toPoiId)?.name;
    if (from && to && from !== to) return `${from} → ${to}`;
    if (from && to) return from;
  }

  const dayPois = pois
    .filter((p) => p.day === dayNumber)
    .sort((a, b) => a.order - b.order);

  if (dayPois.length >= 2) {
    const from = dayPois[0]!.name;
    const to = dayPois[dayPois.length - 1]!.name;
    if (from !== to) return `${from} → ${to}`;
  }
  if (dayPois.length === 1) {
    return dayPois[0]!.name;
  }

  if (theme) return `${theme}${dateLabel ? ` · ${dateLabel}` : ''}`;
  if (dateLabel) return dateLabel;
  return `第 ${dayNumber} 天`;
}

function buildDays(
  trip: TripDetail,
  segments: CoverageMapSegment[],
  pois: CoverageMapPoi[],
  itineraryItems: ItineraryItemDetail[],
  dayRouteOverrides?: Map<number, string>,
): JourneyDay[] {
  const sortedDays = [...(trip.TripDay ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return sortedDays.map((day, dayIndex) => {
    const dayNumber = dayIndex + 1;
    const daySegments = segmentsForDay(segments, dayNumber);
    const routeCoordinates: [number, number][] = [];

    for (const seg of daySegments) {
      if (seg.polyline) {
        routeCoordinates.push(...decodeRoutePolyline(seg.polyline));
      }
    }

    const distanceKm = Math.round(
      daySegments.reduce((sum, s) => sum + (s.distance ?? 0), 0) / 1000,
    ) || 0;

    const theme = day.theme?.trim();
    const dateLabel = day.date
      ? format(new Date(day.date.includes('T') ? day.date : `${day.date}T12:00:00`), 'M月d日', {
          locale: zhCN,
        })
      : '';

    const routeFromItinerary = buildRouteLabelFromItinerary(day.id, itineraryItems);
    const overrideLabel = dayRouteOverrides?.get(dayNumber);
    const routeFromCoverage = buildRouteLabelForDay(
      dayNumber,
      pois,
      segments,
      theme,
      dateLabel,
    );

    return {
      id: day.id,
      dayIndex,
      label: dateLabel ? `Day ${dayNumber} · ${dateLabel}` : `Day ${dayNumber}`,
      routeLabel: routeFromItinerary ?? overrideLabel ?? routeFromCoverage,
      theme: theme || undefined,
      distanceKm: distanceKm || 0,
      color: DAY_COLORS[dayIndex % DAY_COLORS.length]!,
      routeCoordinates,
    };
  });
}

function buildRouteSegments(
  segments: CoverageMapSegment[],
  pois: CoverageMapPoi[],
  days: JourneyDay[],
): JourneyRouteSegment[] {
  const poiById = new Map(pois.map((p) => [p.id, p]));
  const colorByDay = new Map(days.map((d) => [d.dayIndex, d.color]));
  const result: JourneyRouteSegment[] = [];

  for (const seg of segments) {
    let coordinates = decodeRoutePolyline(seg.polyline);
    if (coordinates.length < 2) {
      const from = poiById.get(seg.fromPoiId);
      const to = poiById.get(seg.toPoiId);
      if (from && to) {
        coordinates = [
          [from.coordinates.lng, from.coordinates.lat],
          [to.coordinates.lng, to.coordinates.lat],
        ];
      }
    }
    if (coordinates.length < 2) continue;

    const dayIndex = Math.max(0, seg.day - 1);
    result.push({
      id: seg.id,
      dayIndex,
      dayNumber: seg.day,
      coordinates,
      color: colorByDay.get(dayIndex) ?? DAY_COLORS[dayIndex % DAY_COLORS.length]!,
      coverageStatus: seg.coverageStatus,
    });
  }

  return result;
}

export function buildRouteSegmentsFromDays(days: JourneyDay[]): JourneyRouteSegment[] {
  return days
    .filter((d) => d.routeCoordinates.length >= 2)
    .map((d) => ({
      id: `day-route-${d.id}`,
      dayIndex: d.dayIndex,
      dayNumber: d.dayIndex + 1,
      coordinates: d.routeCoordinates,
      color: d.color,
    }));
}

function normalizeDiversionActivityId(activityId: string): string {
  if (activityId.startsWith('item-') || activityId.startsWith('poi-')) {
    return activityId;
  }
  return `item-${activityId}`;
}

function resolveActivityParticipantIds(
  item: ItineraryItemDetail,
  fallbackMemberIds: string[],
): string[] {
  if (item.participantIds?.length) {
    return [...item.participantIds];
  }
  return [...fallbackMemberIds];
}

function resolveTrunkSegmentIds(
  diversion: JourneyDiversion,
  segments: CoverageMapSegment[],
): string[] | undefined {
  if (diversion.trunkSegmentIds?.length) return diversion.trunkSegmentIds;
  if (!diversion.forkAfterSegmentId) return undefined;

  const dayNumber = diversion.dayIndex + 1;
  const daySegs = segmentsForDay(segments, dayNumber);
  const forkIdx = daySegs.findIndex((s) => s.id === diversion.forkAfterSegmentId);
  if (forkIdx < 0) return undefined;
  return daySegs.slice(0, forkIdx + 1).map((s) => s.id);
}

function normalizeDiversions(
  diversions: JourneyDiversion[],
  segments: CoverageMapSegment[],
): JourneyDiversion[] {
  if (!diversions.length) return diversions;
  return diversions.map((d) => {
    const trunkSegmentIds = resolveTrunkSegmentIds(d, segments);
    if (!trunkSegmentIds || trunkSegmentIds === d.trunkSegmentIds) return d;
    return { ...d, trunkSegmentIds };
  });
}

function applyDiversionEnrichment(
  activities: JourneyActivity[],
  diversions: JourneyDiversion[],
  memberIds: string[],
): JourneyActivity[] {
  if (!diversions.length) return activities;

  const byId = new Map(activities.map((a) => [a.id, a]));

  for (const diversion of diversions) {
    (['A', 'B'] as const).forEach((groupKey) => {
      const group = groupKey === 'A' ? diversion.groupA : diversion.groupB;
      const activityId = normalizeDiversionActivityId(group.activityId);
      const activity = byId.get(activityId);
      if (!activity) return;

      const participants =
        group.participantIds?.length ? group.participantIds : activity.participantIds;

      activity.participantIds = [...participants];
      activity.nonParticipantIds = memberIds.filter((id) => !participants.includes(id));
      activity.diversionGroup = groupKey;
      activity.diversionLabel = group.label;
      activity.markerLabel = group.label;
      activity.kind = 'diversion';
    });
  }

  return activities;
}

function itineraryItemToPoiType(type: string): PoiType {
  const key = type.trim().toUpperCase();
  if (key === 'TRANSIT') return 'transport';
  if (key === 'REST') return 'hotel';
  return 'attraction';
}

function buildActivitiesFromPois(
  pois: CoverageMapPoi[],
  memberIds: string[],
): JourneyActivity[] {
  return pois.map((poi) => {
    const md = poi.metadata;
    const imageUrl = safeHttpImageUrl(extractPoiMetadataImageUrl(md));
    const address = extractPoiMetadataAddress(md);
    const placeDetail = extractPoiMetadataDetail(md);

    return {
      id: `poi-${poi.id}`,
      dayIndex: Math.max(0, poi.day - 1),
      title: poi.name,
      kind: poiKind(poi.type),
      lng: poi.coordinates.lng,
      lat: poi.coordinates.lat,
      poiType: normalizePoiType(poi.type),
      markerIcon: POI_MARKER_ICON[poi.type] ?? 'default',
      participantIds: [...memberIds],
      address,
      location: address,
      imageUrl,
      placeDetail,
      summary:
        placeDetail ??
        (poi.coverageStatus === 'uncovered'
          ? '覆盖不足，建议补充证据或调整安排。'
          : poi.coverageStatus === 'partial'
            ? '部分证据已覆盖，仍有缺口。'
            : undefined),
    };
  });
}

function enrichActivityFromItineraryItem(
  activity: JourneyActivity,
  item: ItineraryItemDetail,
  dayIdToIndex: Map<string, number>,
  memberIds: string[],
): void {
  const place = item.Place;
  const address = extractPlaceAddress(place);
  const imageUrl = safeHttpImageUrl(extractPlaceImageUrl(place));
  const placeDetail = extractPlaceDetail(place, item.note);

  activity.startTime = extractHm(item.startTime) ?? activity.startTime;
  activity.endTime = extractHm(item.endTime) ?? activity.endTime;
  activity.address = address ?? activity.address;
  activity.location = activity.location ?? address ?? place?.nameCN ?? activity.title;
  activity.imageUrl = imageUrl ?? activity.imageUrl;
  activity.placeDetail = placeDetail ?? activity.placeDetail;
  activity.summary = activity.summary ?? placeDetail;
  activity.participantIds = resolveActivityParticipantIds(item, memberIds);
  activity.poiType =
    activity.poiType ?? normalizePoiType(itineraryItemToPoiType(item.type));

  const dayIndex = item.tripDayId ? (dayIdToIndex.get(item.tripDayId) ?? activity.dayIndex) : activity.dayIndex;
  activity.dayIndex = dayIndex;
}

function createActivityFromItineraryItem(
  item: ItineraryItemDetail,
  dayIdToIndex: Map<string, number>,
  memberIds: string[],
): JourneyActivity | null {
  const coords = placeCoords(item.Place);
  if (!coords) return null;

  const dayIndex = item.tripDayId ? (dayIdToIndex.get(item.tripDayId) ?? 0) : 0;
  const typeKey = isItineraryItemType(item.type) ? item.type : 'ACTIVITY';
  const display = getItineraryItemTypeDisplay(typeKey);
  const placeName = item.Place?.nameCN ?? item.Place?.nameEN ?? display.label;
  const address = extractPlaceAddress(item.Place);
  const imageUrl = safeHttpImageUrl(extractPlaceImageUrl(item.Place));
  const placeDetail = extractPlaceDetail(item.Place, item.note);

  return {
    id: `item-${item.id}`,
    dayIndex,
    title: placeName,
    kind: itemKind(item.type),
    lng: coords.lng,
    lat: coords.lat,
    startTime: extractHm(item.startTime),
    endTime: extractHm(item.endTime),
    location: address ?? placeName,
    address,
    imageUrl,
    placeDetail,
    poiType: normalizePoiType(itineraryItemToPoiType(item.type)),
    markerIcon:
      typeKey === 'TRANSIT'
        ? 'transport'
        : typeKey === 'REST'
          ? 'accommodation'
          : 'hiking',
    participantIds: resolveActivityParticipantIds(item, memberIds),
    summary: placeDetail,
  };
}

function mergeItineraryIntoActivities(
  activities: JourneyActivity[],
  items: ItineraryItemDetail[],
  trip: TripDetail,
  memberIds: string[],
): JourneyActivity[] {
  const sortedDays = [...(trip.TripDay ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const dayIdToIndex = new Map(sortedDays.map((d, i) => [d.id, i]));
  const byCoord = new Map<string, JourneyActivity>();

  for (const activity of activities) {
    byCoord.set(`${activity.lat.toFixed(4)},${activity.lng.toFixed(4)}`, activity);
  }

  const extras: JourneyActivity[] = [];

  for (const item of items) {
    const coords = placeCoords(item.Place);
    if (!coords) continue;

    const key = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
    const existing = byCoord.get(key);

    if (existing) {
      enrichActivityFromItineraryItem(existing, item, dayIdToIndex, memberIds);
      continue;
    }

    const created = createActivityFromItineraryItem(item, dayIdToIndex, memberIds);
    if (!created) continue;

    byCoord.set(key, created);
    extras.push(created);
  }

  return [...activities, ...extras];
}

function buildRiskPoints(gaps: CoverageGap[]): JourneyRiskPoint[] {
  return gaps
    .filter((g) => g.severity === 'high' || g.severity === 'medium')
    .map((g) => ({
      id: `gap-${g.id}`,
      dayIndex: Math.max(0, (g.affectedDays?.[0] ?? 1) - 1),
      title: g.type === 'segment' ? '路段风险' : '覆盖缺口',
      lng: g.coordinates.lng,
      lat: g.coordinates.lat,
      severity: g.severity,
      description: g.message,
    }));
}

function buildDataFeeds(coverage: CoverageMapResponse | null): JourneyDataFeed[] {
  const freshness = coverage?.dataFreshness;
  const formatTs = (iso?: string) => {
    if (!iso) return '—';
    try {
      return format(new Date(iso), 'M/d HH:mm', { locale: zhCN });
    } catch {
      return '—';
    }
  };

  const inventoryTs = formatTs(freshness?.inventory ?? coverage?.calculatedAt);

  return [
    {
      id: 'weather',
      label: '天气',
      updatedAt: formatTs(freshness?.weather),
      status: freshness?.weather ? 'fresh' : 'stale',
    },
    {
      id: 'road',
      label: '道路状况',
      updatedAt: formatTs(freshness?.roadClosure),
      status: freshness?.roadClosure ? 'fresh' : 'stale',
    },
    {
      id: 'hours',
      label: '开放时间',
      updatedAt: formatTs(freshness?.openingHours),
      status: freshness?.openingHours ? 'fresh' : 'stale',
    },
    {
      id: 'inventory',
      label: '住宿库存',
      updatedAt: inventoryTs,
      status: freshness?.inventory || coverage?.calculatedAt ? 'fresh' : 'stale',
    },
  ];
}

function buildStats(
  trip: TripDetail,
  coverage: CoverageMapResponse | null,
  activities: JourneyActivity[],
  diversions: JourneyDiversion[],
  bffStats?: Partial<JourneyStats>,
): JourneyStats {
  const totalDistanceKm = coverage?.segments?.length
    ? Math.round(
        coverage.segments.reduce((sum, s) => sum + (s.distance ?? 0), 0) / 1000,
      )
    : 0;

  const activityCount = activities.filter((a) => a.kind === 'activity').length;

  return {
    totalDays: bffStats?.totalDays ?? trip.TripDay?.length ?? trip.statistics?.totalDays ?? 0,
    totalDistanceKm: bffStats?.totalDistanceKm ?? totalDistanceKm,
    activityCount:
      bffStats?.activityCount ??
      (activityCount || trip.statistics?.totalActivities || 0),
    diversionCount: bffStats?.diversionCount ?? diversions.length,
  };
}

export interface JourneyMapBffProjection {
  members?: JourneyMember[];
  memberGroups?: JourneyMemberGroup[];
  diversions?: JourneyDiversion[];
  stats?: Partial<JourneyStats>;
  dataFeeds?: JourneyDataFeed[];
  daySummaries?: Array<{ day: number; routeLabel: string }>;
}

export interface BuildJourneyMapModelInput {
  trip: TripDetail;
  coverage: CoverageMapResponse | null;
  itineraryItems: ItineraryItemDetail[];
  feasibilityScore: number | null;
  travelerCount?: number;
  bff?: JourneyMapBffProjection;
}

export function buildJourneyMapModelFromApi(input: BuildJourneyMapModelInput): JourneyMapModel {
  const { trip, coverage, itineraryItems, feasibilityScore, travelerCount = 1, bff } = input;
  const segments = coverage?.segments ?? [];
  const pois = coverage?.pois ?? [];
  const gaps = coverage?.gaps ?? [];

  const sortedTripDays = [...(trip.TripDay ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const dayRouteOverrides = buildDayRouteOverrides(
    bff?.daySummaries ?? [],
    sortedTripDays.length,
  );

  const fallbackMembers = buildMembers(travelerCount);
  const members =
    bff?.members?.length ? bff.members : fallbackMembers.members;
  const memberGroups =
    bff?.memberGroups?.length ? bff.memberGroups : fallbackMembers.memberGroups;
  const memberIds = members.map((m) => m.id);

  const days = buildDays(trip, segments, pois, itineraryItems, dayRouteOverrides);
  const routeSegmentsRaw = buildRouteSegments(segments, pois, days);
  const routeSegments =
    routeSegmentsRaw.length > 0 ? routeSegmentsRaw : buildRouteSegmentsFromDays(days);

  let activities = buildActivitiesFromPois(pois, memberIds);
  activities = mergeItineraryIntoActivities(activities, itineraryItems, trip, memberIds);

  const diversions = normalizeDiversions(bff?.diversions ?? [], segments);
  activities = applyDiversionEnrichment(activities, diversions, memberIds);
  const riskPoints = buildRiskPoints(gaps);

  const center: [number, number] = coverage?.center
    ? [coverage.center.lng, coverage.center.lat]
    : activities[0]
      ? [activities[0].lng, activities[0].lat]
      : [-21.94, 64.15];

  const tripTitle =
    trip.name?.trim() ||
    `${trip.destination} · ${trip.TripDay?.length ?? trip.statistics?.totalDays ?? ''}天行程`;

  return {
    id: trip.id,
    tripTitle,
    tripSubtitle: 'Route · Activity · Participants · Diversion · Risk at a glance',
    dateRangeLabel: buildDateRangeLabel(trip),
    feasibilityScore: feasibilityScore ?? 0,
    mapCenter: center,
    mapZoom: coverage?.zoom ?? 8,
    days,
    routeSegments,
    activities,
    diversions,
    riskPoints,
    members,
    memberGroups,
    stats: buildStats(trip, coverage, activities, diversions, bff?.stats),
    dataFeeds: bff?.dataFeeds?.length ? bff.dataFeeds : buildDataFeeds(coverage),
  };
}

/** 真实数据不足以渲染地图时（无坐标/无路段） */
export function isJourneyMapModelRenderable(model: JourneyMapModel): boolean {
  const hasRoutes = model.days.some((d) => d.routeCoordinates.length >= 2);
  const hasMarkers = model.activities.length > 0;
  return hasRoutes || hasMarkers;
}
