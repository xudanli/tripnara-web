import type {
  FeasibilityIssueDto,
  FeasibilityIssuePriority,
  FeasibilityRepairOptionDto,
} from '@/types/trip-feasibility-report';
import { parseTravelRouteFromMessage } from '@/lib/feasibility-travel-route-parse';
import { isPlanClassAction } from '@/lib/feasibility-repair-plan-class';

/** 单日驾驶过长（默认 ≥300 km），应走拆段/挪天 Plan B，而非改时间 */
export const ULTRA_LONG_DRIVE_DISTANCE_METERS = 300_000;

const PRIORITY_RANK: Record<FeasibilityIssuePriority, number> = {
  must_handle: 3,
  suggest_adjust: 2,
  pending_confirm: 1,
};

function normalizePlaceLabel(label: string): string {
  return label.trim().replace(/\s+/g, '').toLowerCase();
}

export function isUltraLongDriveIssue(
  issue: FeasibilityIssueDto,
  view?: { travelDistanceMeters?: number } | null,
): boolean {
  if (issue.issueKind === 'road_class') return true;
  if (issue.uiHints?.primaryAction === 'open_repair') return true;

  const text = `${issue.title} ${issue.message} ${issue.actionRequired ?? ''}`;
  if (/超长距离|分段|中途住宿|>\s*300\s*km|超过\s*300/i.test(text)) return true;

  const parsed = parseTravelRouteFromMessage(issue.message);
  const distanceMeters =
    view?.travelDistanceMeters ??
    issue.anchors?.travelDistanceMeters ??
    (issue.anchors?.distanceKm != null
      ? Math.round(issue.anchors.distanceKm * 1000)
      : undefined) ??
    parsed?.distanceMeters;
  return distanceMeters != null && distanceMeters >= ULTRA_LONG_DRIVE_DISTANCE_METERS;
}

function isLongDriveRelatedIssue(issue: FeasibilityIssueDto): boolean {
  return (
    isUltraLongDriveIssue(issue) ||
    issue.id.includes('long_distance') ||
    /schedule-long-drive/i.test(issue.id)
  );
}

/** 同路段 gap / schedule / transport / same_day 超长 issue 合并键 */
export function longDriveRouteKey(issue: FeasibilityIssueDto): string | null {
  if (!isLongDriveRelatedIssue(issue)) return null;
  const parsed = parseTravelRouteFromMessage(issue.message);
  if (!parsed) return null;
  const day = issue.affectedDays?.[0] ?? parsed.dayNumber ?? '';
  return `long-drive-route:${day}:${normalizePlaceLabel(parsed.fromPlaceLabel)}:${normalizePlaceLabel(parsed.toPlaceLabel)}`;
}

function canonicalTransportIssueId(issue: FeasibilityIssueDto): string | null {
  return /issue-transport-seg-\d+-long_distance/.test(issue.id) ? issue.id : null;
}

export function resolveFeasibilityRepairIssueId(
  issue: FeasibilityIssueDto,
  allIssues: FeasibilityIssueDto[],
): string {
  const direct = canonicalTransportIssueId(issue);
  if (direct) return direct;

  const routeKey = longDriveRouteKey(issue);
  if (!routeKey) return issue.id;

  const canonical = allIssues.find(
    (candidate) =>
      canonicalTransportIssueId(candidate) != null &&
      longDriveRouteKey(candidate) === routeKey,
  );
  return canonical?.id ?? issue.id;
}

export function mergeLongDriveIssues(
  a: FeasibilityIssueDto,
  b: FeasibilityIssueDto,
): FeasibilityIssueDto {
  const group = [a, b];
  const transport = group.find((issue) => canonicalTransportIssueId(issue));
  const canonicalId = transport?.id ?? a.id;
  const priority = group.reduce(
    (best, issue) => (PRIORITY_RANK[issue.priority] > PRIORITY_RANK[best.priority] ? issue : best),
    a,
  ).priority;
  const anchors = group.find((issue) => issue.anchors)?.anchors ?? a.anchors ?? b.anchors;
  const message =
    group.find((issue) => /超长距离|分段|中途住宿/.test(issue.message))?.message ??
    (a.message.length >= b.message.length ? a.message : b.message);
  const uiHints =
    transport?.uiHints ??
    group.find((issue) => issue.uiHints?.primaryAction === 'open_repair')?.uiHints ??
    a.uiHints ??
    b.uiHints ??
    { primaryAction: 'open_repair' as const };

  return {
    ...(transport ?? a),
    id: canonicalId,
    priority,
    message,
    anchors,
    uiHints,
    issueKind: transport?.issueKind ?? a.issueKind ?? b.issueKind ?? 'road_class',
    affectedDays: [...new Set([...(a.affectedDays ?? []), ...(b.affectedDays ?? [])])],
    actionRequired: a.actionRequired ?? b.actionRequired,
    proofs: [...(a.proofs ?? []), ...(b.proofs ?? [])],
    repairOptions: a.repairOptions ?? b.repairOptions,
  };
}

export function preferStructuralLongDriveRepairOptions(
  options: FeasibilityRepairOptionDto[],
  issue?: FeasibilityIssueDto,
): FeasibilityRepairOptionDto[] {
  if (!issue || !isUltraLongDriveIssue(issue)) return options;
  const structural = options.filter(
    (option) =>
      isPlanClassAction(option.actionType) && option.actionType !== 'adjust_time',
  );
  const picked = structural.length > 0 ? structural : options.filter((o) => o.actionType !== 'refresh');
  return sortLongDriveRepairOptions(picked);
}

/** 后端 road_class 拆段方案推荐展示顺序 */
export const LONG_DRIVE_REPAIR_OPTION_ORDER = [
  'insert_midpoint_stay',
  'move_destination_day',
  'alternative_route',
  'reorder_split',
] as const;

export function sortLongDriveRepairOptions(
  options: FeasibilityRepairOptionDto[],
): FeasibilityRepairOptionDto[] {
  const rank = new Map(LONG_DRIVE_REPAIR_OPTION_ORDER.map((id, index) => [id, index]));
  return [...options].sort((a, b) => {
    const aRank = rank.get(a.id as (typeof LONG_DRIVE_REPAIR_OPTION_ORDER)[number]);
    const bRank = rank.get(b.id as (typeof LONG_DRIVE_REPAIR_OPTION_ORDER)[number]);
    if (aRank != null && bRank != null) return aRank - bRank;
    if (aRank != null) return -1;
    if (bRank != null) return 1;
    return a.label.localeCompare(b.label, 'zh-CN');
  });
}
