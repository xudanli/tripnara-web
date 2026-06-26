import type {
  FeasibilityDimensionTileDto,
  FeasibilityItineraryCompletenessSummaryDto,
  FeasibilityTeamFitSummaryDto,
  TripFeasibilityReportDto,
} from '@/types/trip-feasibility-report';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export const FEASIBILITY_DIMENSION_LABELS: Record<string, string> = {
  schedule: '日程可行性',
  transport: '道路与交通',
  booking: '开放与预订',
  environment: '天气与环境',
  team_fit: '团队成员适配',
  itinerary_completeness: '行程结构完整',
};

export function feasibilityDimensionLabel(key: string, fallback?: string): string {
  return FEASIBILITY_DIMENSION_LABELS[key] ?? fallback ?? key;
}

/** 六维条带栅格：动态列数，最多 3 列 */
export function feasibilityDimensionGridClass(count: number): string {
  if (count <= 2) return 'grid-cols-2';
  if (count <= 4) return 'grid-cols-2 lg:grid-cols-4';
  return 'grid-cols-2 sm:grid-cols-3';
}

export function normalizeFeasibilityDimensionTiles(raw: unknown): FeasibilityDimensionTileDto[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const tiles: FeasibilityDimensionTileDto[] = [];
  for (const item of raw) {
    const o = asRecord(item);
    if (!o) continue;
    const key = asString(o.key);
    if (!key) continue;
    const score = asNumber(o.score) ?? 0;
    const issueCount = asNumber(o.issueCount ?? o.issue_count) ?? 0;
    const blockerCount = asNumber(o.blockerCount ?? o.blocker_count) ?? 0;
    const label = asString(o.label) ?? feasibilityDimensionLabel(key);
    const statusLabel =
      asString(o.statusLabel ?? o.status_label) ??
      (blockerCount > 0
        ? `${blockerCount}项阻塞`
        : issueCount > 0
          ? `${issueCount}项待处理`
          : '正常');
    tiles.push({ key, label, score, statusLabel, issueCount, blockerCount });
  }
  return tiles.length > 0 ? tiles : undefined;
}

function normalizeTeamFitSummary(raw: unknown): FeasibilityTeamFitSummaryDto | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;
  const score = asNumber(o.score);
  const memberCount = asNumber(o.memberCount ?? o.member_count);
  const profilingCompletedCount = asNumber(
    o.profilingCompletedCount ?? o.profiling_completed_count,
  );
  if (score == null || memberCount == null || profilingCompletedCount == null) return undefined;
  return { score, memberCount, profilingCompletedCount };
}

function normalizeItineraryCompletenessSummary(
  raw: unknown,
): FeasibilityItineraryCompletenessSummaryDto | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;
  const score = asNumber(o.score);
  const signalCount = asNumber(o.signalCount ?? o.signal_count);
  if (score == null || signalCount == null) return undefined;
  return { score, signalCount };
}

/** BFF 原始字段归一化（dimensions 六维、扩展摘要） */
export function normalizeFeasibilityReportFromApi(
  report: TripFeasibilityReportDto,
  raw?: Record<string, unknown> | null,
): TripFeasibilityReportDto {
  const o = raw ?? (report as unknown as Record<string, unknown>);
  const dimensions =
    normalizeFeasibilityDimensionTiles(o.dimensions) ??
    normalizeFeasibilityDimensionTiles(report.dimensions) ??
    report.dimensions;

  const teamFitSummary =
    normalizeTeamFitSummary(o.teamFitSummary ?? o.team_fit_summary) ?? report.teamFitSummary;
  const itineraryCompletenessSummary =
    normalizeItineraryCompletenessSummary(
      o.itineraryCompletenessSummary ?? o.itinerary_completeness_summary,
    ) ?? report.itineraryCompletenessSummary;

  return {
    ...report,
    dimensions: dimensions.map((dim) => ({
      ...dim,
      label: dim.label || feasibilityDimensionLabel(String(dim.key)),
    })),
    ...(teamFitSummary ? { teamFitSummary } : {}),
    ...(itineraryCompletenessSummary ? { itineraryCompletenessSummary } : {}),
  };
}
