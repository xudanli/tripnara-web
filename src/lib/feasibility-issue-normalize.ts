import type {
  FeasibilityIssueAnchorsDto,
  FeasibilityIssueDto,
} from '@/types/trip-feasibility-report';

function isTransportLongDistanceIssueId(id: string): boolean {
  return /issue-transport-seg-\d+-long_distance/.test(id);
}

export function normalizeIssueAnchors(
  anchors?: FeasibilityIssueAnchorsDto | Record<string, unknown> | null,
): FeasibilityIssueAnchorsDto | undefined {
  if (!anchors || typeof anchors !== 'object') return undefined;

  const raw = anchors as Record<string, unknown>;
  const distanceKm =
    (raw.distanceKm as number | undefined) ??
    (raw.distance_km as number | undefined);
  const travelDistanceMeters =
    (raw.travelDistanceMeters as number | undefined) ??
    (raw.travel_distance_meters as number | undefined) ??
    (distanceKm != null ? Math.round(distanceKm * 1000) : undefined);

  const normalized: FeasibilityIssueAnchorsDto = {
    fromItemId: String(raw.fromItemId ?? raw.from_item_id ?? ''),
    toItemId: String(raw.toItemId ?? raw.to_item_id ?? ''),
    fromDayNumber: Number(raw.fromDayNumber ?? raw.from_day_number ?? 0),
    toDayNumber: Number(raw.toDayNumber ?? raw.to_day_number ?? 0),
    fromPlaceLabel: String(raw.fromPlaceLabel ?? raw.from_place_label ?? ''),
    toPlaceLabel: String(raw.toPlaceLabel ?? raw.to_place_label ?? ''),
    segmentId: (raw.segmentId ?? raw.segment_id) as string | undefined,
    distanceKm,
    travelMode: (raw.travelMode ?? raw.travel_mode) as string | undefined,
    travelMinutes: Number(raw.travelMinutes ?? raw.travel_minutes ?? 0),
    travelDistanceMeters,
    departAt: (raw.departAt ?? raw.depart_at) as string | undefined,
    arriveAt: (raw.arriveAt ?? raw.arrive_at) as string | undefined,
    activityStartAt: (raw.activityStartAt ?? raw.activity_start_at) as string | undefined,
    fromTime: (raw.fromTime ?? raw.from_time) as string | undefined,
    toTime: (raw.toTime ?? raw.to_time) as string | undefined,
    suggestedTime: (raw.suggestedTime ?? raw.suggested_time) as string | undefined,
    gapMinutes:
      raw.gapMinutes != null || raw.gap_minutes != null
        ? Number(raw.gapMinutes ?? raw.gap_minutes)
        : undefined,
    shortfallMinutes:
      raw.shortfallMinutes != null || raw.shortfall_minutes != null
        ? Number(raw.shortfallMinutes ?? raw.shortfall_minutes)
        : undefined,
    isStartTooEarly: (raw.isStartTooEarly ?? raw.is_start_too_early) as boolean | undefined,
    timingSource: (raw.timingSource ?? raw.timing_source) as
      | FeasibilityIssueAnchorsDto['timingSource']
      | undefined,
  };

  return normalized;
}

export function normalizeFeasibilityIssue(issue: FeasibilityIssueDto): FeasibilityIssueDto {
  const anchors = normalizeIssueAnchors(issue.anchors);
  const isRoadClassTransport = isTransportLongDistanceIssueId(issue.id);

  const issueKind =
    issue.issueKind ?? (isRoadClassTransport ? 'road_class' : undefined);
  const uiHints =
    issue.uiHints ??
    (isRoadClassTransport ? { primaryAction: 'open_repair' as const } : undefined);

  const next: FeasibilityIssueDto = {
    ...issue,
    ...(anchors ? { anchors } : {}),
    ...(issueKind ? { issueKind } : {}),
    ...(uiHints ? { uiHints } : {}),
  };

  if (
    next.anchors === issue.anchors &&
    next.issueKind === issue.issueKind &&
    next.uiHints === issue.uiHints
  ) {
    return issue;
  }

  return next;
}
