import type {
  ScoreBreakdownResponse,
  ScoreFinding,
  ScoreRisk,
} from '@/api/readiness';
import type { TripDetail } from '@/types/trip';
import type {
  FeasibilityAlternativeDto,
  FeasibilityDayStatusDto,
  FeasibilityDimensionKey,
  FeasibilityDimensionTileDto,
  FeasibilityIssueDto,
  FeasibilityProofAtomDto,
  FeasibilityVerdictStatus,
  TripFeasibilityReportDto,
} from '@/types/trip-feasibility-report';
import { refreshRoadClassTransportMessage } from '@/lib/trip-constraints.adapter';
import { resolveFeasibilityVerdictSubheadline } from '@/lib/feasibility-verdict-copy';
import { computeCanStartExecute } from '@/lib/feasibility-can-start-execute';
import { normalizeCoverageDisclosure } from '@/lib/coverage-disclosure.util';
import { normalizeFeasibilityReport } from '@/lib/feasibility-issue-dedupe';
import {
  countIssuePriorities,
  mapRiskPriority,
  resolveFindingPriority,
  resolveVerdictFromSummary,
} from '@/lib/feasibility-issue-priority';
import {
  buildItineraryItemsMapFromTrip,
  enrichDayTimelineAccommodation,
} from '@/lib/feasibility-day-accommodation';
import { format } from 'date-fns';

const DIMENSION_META: Record<
  FeasibilityDimensionKey,
  { label: string; scoreKey?: keyof ScoreBreakdownResponse['score'] }
> = {
  schedule: { label: '日程可行性', scoreKey: 'scheduleFeasibility' },
  transport: { label: '道路与交通', scoreKey: 'transportCertainty' },
  booking: { label: '开放与预订', scoreKey: 'evidenceCoverage' },
  environment: { label: '天气与环境', scoreKey: 'safetyRisk' },
  team_fit: { label: '团队成员适配' },
  itinerary_completeness: { label: '行程结构完整' },
};

function mapCategoryToDimension(
  category: ScoreFinding['category'] | string,
): FeasibilityDimensionKey {
  switch (category) {
    case 'schedule':
    case 'buffer':
      return 'schedule';
    case 'transport':
      return 'transport';
    case 'evidence':
      return 'booking';
    case 'safety':
      return 'environment';
    default:
      return 'schedule';
  }
}

function mapRiskToIssue(risk: ScoreRisk): FeasibilityIssueDto {
  return {
    id: risk.id,
    priority: mapRiskPriority(risk),
    category: 'environment',
    title: risk.type || '风险',
    message: risk.message,
    severity: risk.severity,
    proofs: risk.mitigation?.length
      ? [{ conclusion: risk.mitigation.join('；') }]
      : undefined,
  };
}

function findingToIssue(
  finding: ScoreFinding,
  maxSegmentDistanceKm?: number | null,
): FeasibilityIssueDto {
  const proofs: FeasibilityProofAtomDto[] = [];
  if (finding.actionRequired) {
    proofs.push({ conclusion: finding.actionRequired });
  }
  const issueKind =
    finding.issueKind ??
    (/long_distance|road_class/i.test(finding.message ?? '') ? 'road_class' : undefined);
  const message =
    issueKind === 'road_class' && maxSegmentDistanceKm != null
      ? refreshRoadClassTransportMessage(finding.message, maxSegmentDistanceKm)
      : finding.message;
  return {
    id: finding.id,
    priority: resolveFindingPriority(finding),
    category: mapCategoryToDimension(finding.category),
    title: finding.category,
    message,
    affectedDays: finding.affectedDays,
    actionRequired: finding.actionRequired,
    severity: finding.severity,
    issueKind,
    anchors: finding.anchors,
    uiHints: finding.uiHints,
    repairOptions: finding.repairOptions,
    proofs: proofs.length > 0 ? proofs : undefined,
  };
}

function dimensionStatusLabel(
  key: FeasibilityDimensionKey,
  score: number,
  blockerCount: number,
  issueCount: number,
): string {
  if (blockerCount > 0) return `${blockerCount}项阻塞`;
  if (issueCount === 0) return '正常';
  if (key === 'booking' && issueCount > 0) return `${issueCount}项待确认`;
  if (key === 'team_fit') return `${issueCount}项团队信号`;
  if (key === 'itinerary_completeness') return `${issueCount}项结构信号`;
  if (score >= 80) return '正常';
  return `${issueCount}项风险`;
}

function buildDimensionTiles(
  scoreBreakdown: ScoreBreakdownResponse,
  issues: FeasibilityIssueDto[],
): FeasibilityDimensionTileDto[] {
  return (Object.keys(DIMENSION_META) as FeasibilityDimensionKey[]).map((key) => {
    const meta = DIMENSION_META[key];
    const rawScore = meta.scoreKey ? scoreBreakdown.score[meta.scoreKey] : undefined;
    const score =
      key === 'environment'
        ? Math.max(0, Math.min(100, 100 - (scoreBreakdown.score.safetyRisk ?? 0)))
        : key === 'team_fit' || key === 'itinerary_completeness'
          ? rawScore ?? 100
          : rawScore ?? 0;
    const dimIssues = issues.filter((i) => i.category === key);
    const blockerCount = dimIssues.filter((i) => i.priority === 'must_handle').length;
    const issueCount = dimIssues.length;
    return {
      key,
      label: meta.label,
      score,
      statusLabel: dimensionStatusLabel(key, score, blockerCount, issueCount),
      issueCount,
      blockerCount,
    };
  });
}

function buildDayTimeline(
  trip: TripDetail | null | undefined,
  issues: FeasibilityIssueDto[],
): FeasibilityDayStatusDto[] {
  const days = trip?.TripDay ?? [];
  if (days.length === 0) {
    const dayNumbers = new Set<number>();
    issues.forEach((i) => i.affectedDays?.forEach((d) => dayNumbers.add(d)));
    return Array.from(dayNumbers)
      .sort((a, b) => a - b)
      .map((dayNumber) => {
        const dayIssues = issues.filter((i) => i.affectedDays?.includes(dayNumber));
        const hasBlocker = dayIssues.some((i) => i.priority === 'must_handle');
        const hasWarn = dayIssues.some((i) => i.priority === 'suggest_adjust');
        return {
          dayNumber,
          status: hasBlocker ? 'blocked' : hasWarn ? 'warning' : 'ok',
          summary: dayIssues[0]?.message,
          issueIds: dayIssues.map((i) => i.id),
        };
      });
  }

  return enrichDayTimelineAccommodation(
    trip,
    days.map((day, index) => {
      const dayNumber = index + 1;
      const dayIssues = issues.filter((i) => i.affectedDays?.includes(dayNumber));
      const hasBlocker = dayIssues.some((i) => i.priority === 'must_handle');
      const hasWarn = dayIssues.some((i) => i.priority === 'suggest_adjust');
      return {
        dayNumber,
        tripDayId: day.id,
        status: hasBlocker ? 'blocked' : hasWarn ? 'warning' : 'ok',
        summary: dayIssues[0]?.message,
        issueIds: dayIssues.map((i) => i.id),
      };
    }),
    trip ? buildItineraryItemsMapFromTrip(trip) : undefined,
  );
}

function resolveVerdict(
  scoreBreakdown: ScoreBreakdownResponse | null,
  isStale: boolean,
  summary: ReturnType<typeof countIssuePriorities>,
): { status: FeasibilityVerdictStatus; headline: string; subheadline?: string } {
  const base = resolveVerdictFromSummary(summary, {
    hasValidatedReport: scoreBreakdown != null,
    isStale,
  });

  if (base.status === 'UNKNOWN') {
    return { status: 'UNKNOWN', headline: '尚未完成验证' };
  }
  if (base.status === 'STALE') {
    return {
      status: 'STALE',
      headline: '报告已过期',
      subheadline: '行程已修改，需要重新验证',
    };
  }

  return {
    status: base.status,
    headline: base.headline,
    subheadline: base.status === 'EXECUTABLE' ? '未发现阻塞级问题' : undefined,
  };
}

function tripVersionLabel(updatedAt?: string): string | undefined {
  if (!updatedAt) return undefined;
  try {
    const d = new Date(updatedAt);
    return `V${format(d, 'yyyyMMddHHmm')}`;
  } catch {
    return updatedAt;
  }
}

function resolveTripVersionLabel(trip: TripDetail | null | undefined): string | undefined {
  if (!trip) return undefined;
  if (trip.revisionLabel) return trip.revisionLabel;
  if (trip.revision != null) return `V${trip.revision}`;
  const metaRevision = trip.metadata?.revision;
  if (typeof metaRevision === 'number') return `V${metaRevision}`;
  return tripVersionLabel(trip.updatedAt);
}

function resolveVerifiedSnapshot(
  trip: TripDetail | null | undefined,
  scoreCalculatedAt?: string,
): { verifiedAt?: string; verifiedForTripVersion?: string } {
  const snapshot = trip?.metadata?.feasibilityReportSnapshot;
  if (snapshot?.verifiedAt || snapshot?.verifiedForTripVersion) {
    return {
      verifiedAt: snapshot.verifiedAt,
      verifiedForTripVersion: snapshot.verifiedForTripVersion,
    };
  }
  if (scoreCalculatedAt) {
    return {
      verifiedAt: scoreCalculatedAt,
      verifiedForTripVersion: tripVersionLabel(scoreCalculatedAt),
    };
  }
  return {};
}

function computeIsStale(
  trip: TripDetail | null | undefined,
  verifiedForTripVersion?: string,
  verifiedAt?: string,
): boolean {
  const current = resolveTripVersionLabel(trip);
  if (verifiedForTripVersion && current) {
    return verifiedForTripVersion !== current;
  }
  if (verifiedAt && trip?.updatedAt) {
    return new Date(trip.updatedAt).getTime() > new Date(verifiedAt).getTime() + 1000;
  }
  return false;
}

function formatDateRange(trip: TripDetail | null | undefined): string {
  if (!trip?.startDate || !trip?.endDate) return '';
  try {
    const start = format(new Date(trip.startDate), 'M月d日');
    const end = format(new Date(trip.endDate), 'M月d日');
    return `${start}—${end}`;
  } catch {
    return `${trip.startDate}—${trip.endDate}`;
  }
}

export function buildTripFeasibilityReport(
  tripId: string,
  scoreBreakdown: ScoreBreakdownResponse | null,
  trip: TripDetail | null | undefined,
  alternatives?: FeasibilityAlternativeDto[],
  options?: { maxSegmentDistanceKm?: number | null },
): TripFeasibilityReportDto {
  const maxSegmentDistanceKm = options?.maxSegmentDistanceKm ?? null;
  const findingIssues = (scoreBreakdown?.findings ?? []).map((finding) =>
    findingToIssue(finding, maxSegmentDistanceKm),
  );
  const riskIssues = (scoreBreakdown?.risks ?? []).map(mapRiskToIssue);
  const issues = [...findingIssues, ...riskIssues];

  const verifiedSnapshot = resolveVerifiedSnapshot(trip, scoreBreakdown?.calculatedAt);
  const verifiedAt = verifiedSnapshot.verifiedAt ?? scoreBreakdown?.calculatedAt;
  const verifiedForTripVersion = verifiedSnapshot.verifiedForTripVersion;
  const currentTripVersion = resolveTripVersionLabel(trip);
  const isStale = computeIsStale(trip, verifiedForTripVersion, verifiedAt);

  const prioritySummary = countIssuePriorities(issues);
  const { mustHandle, suggestAdjust, pendingConfirm } = prioritySummary;
  const verdict = resolveVerdict(scoreBreakdown, isStale, prioritySummary);
  const overallScore = scoreBreakdown?.score?.overall ?? 0;

  const blockers = mustHandle;

  const tripTitle =
    trip?.name?.trim() ||
    (trip?.destination
      ? `${trip.destination} ${trip.TripDay?.length ?? ''}日`
      : '行程');

  return normalizeFeasibilityReport({
    tripId,
    tripTitle,
    dateRangeLabel: formatDateRange(trip),
    verdict: {
      ...verdict,
      subheadline: resolveFeasibilityVerdictSubheadline(verdict.subheadline, {
          mustHandle,
          suggestAdjust,
          pendingConfirm,
          blockers,
        }),
    },
    overallScore,
    verifiedAt,
    verifiedForTripVersion,
    currentTripVersion,
    isStale,
    dimensions: scoreBreakdown
      ? buildDimensionTiles(scoreBreakdown, issues)
      : [],
    dayTimeline: buildDayTimeline(trip, issues),
    issues,
    alternatives: alternatives ?? [
      {
        id: 'current',
        name: '当前方案',
        score: overallScore / 100,
        executabilityRate: verdict.status === 'EXECUTABLE' ? 100 : verdict.status === 'ADJUST_REQUIRED' ? 82 : 0,
        isCurrent: true,
      },
    ],
    summary: {
      mustHandle,
      suggestAdjust,
      pendingConfirm,
      blockers,
    },
    phaseHint: scoreBreakdown?.phaseHint,
    daysUntilStart: scoreBreakdown?.daysUntilStart,
    coverageDisclosure:
      normalizeCoverageDisclosure(scoreBreakdown?.coverageDisclosure) ?? undefined,
  });
}

/** adapter 路径：在 normalize 后补 canStartExecute */
export function finalizeAdapterFeasibilityReport(
  report: TripFeasibilityReportDto,
): TripFeasibilityReportDto {
  return {
    ...report,
    canStartExecute: computeCanStartExecute(report),
  };
}

export function feasibilityVerdictBadgeLabel(status: FeasibilityVerdictStatus): string {
  switch (status) {
    case 'EXECUTABLE':
      return '可执行';
    case 'ADJUST_REQUIRED':
      return '需要调整';
    case 'NOT_EXECUTABLE':
      return '不可执行';
    case 'STALE':
      return '报告已过期';
    case 'UNKNOWN':
      return '尚未验证';
    default:
      return '未知';
  }
}
