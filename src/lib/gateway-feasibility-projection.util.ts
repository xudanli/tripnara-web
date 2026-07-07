import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';
import type { GatewayExclusiveFeasibilityDomain } from '@/types/decision-runtime-capabilities';
import { GATEWAY_EXCLUSIVE_FEASIBILITY_DOMAINS } from '@/types/decision-runtime-capabilities';
import {
  isConstraintPlanVerifyProjectionFromRuntime,
  isGatewayDomainRulesExclusiveFromRuntime,
} from '@/lib/decision-runtime-capabilities.store';

const GATEWAY_EVIDENCE_SOURCES = [
  'decision-gateway',
  'unified-decision',
  'ConstraintEvaluationGateway',
  'gateway-projection',
] as const;

export function resolveFeasibilityIssueGatewayDomain(
  issue: Pick<FeasibilityIssueDto, 'issueKind' | 'category' | 'conflictType' | 'title' | 'message'>,
): GatewayExclusiveFeasibilityDomain | null {
  const kind = (issue.issueKind ?? '').toLowerCase();
  if (kind === 'daily_drive' || kind === 'no_night_drive') return 'guardian';
  if (kind.startsWith('poi_access')) return 'poi_access';
  if (kind.startsWith('guardian') || kind.includes('guardian')) return 'guardian';

  const text = `${issue.title ?? ''} ${issue.message ?? ''}`.toLowerCase();
  if (/guardian|三人格|persona/.test(text)) return 'guardian';

  if (
    issue.category === 'schedule' ||
    kind.includes('schedule') ||
    kind.includes('buffer') ||
    kind.includes('timing') ||
    /time_conflict|buffer_insufficient|schedule_change/i.test(issue.conflictType ?? '')
  ) {
    return 'schedule';
  }

  if (kind.startsWith('poi_access') || /reservation|预约|准入/.test(text)) {
    return 'poi_access';
  }

  return null;
}

export function isGatewayProjectedFeasibilityIssue(
  issue: Pick<FeasibilityIssueDto, 'decisionProblemId' | 'proofs' | 'id'>,
): boolean {
  if (issue.decisionProblemId?.trim()) return true;
  return (issue.proofs ?? []).some((proof) => {
    const source = proof.evidenceSource?.trim() ?? '';
    if (!source) return false;
    return GATEWAY_EVIDENCE_SOURCES.some(
      (marker) => source === marker || source.toLowerCase().includes(marker.toLowerCase()),
    );
  });
}

export function isLegacyGatewayDomainFeasibilityIssue(issue: FeasibilityIssueDto): boolean {
  const domain = resolveFeasibilityIssueGatewayDomain(issue);
  if (!domain) return false;
  return !isGatewayProjectedFeasibilityIssue(issue);
}

/**
 * gatewayDomainRulesExclusive=true 时，poi_access / schedule / guardian 域以 Gateway 投影为准，
 * 剥离 legacy readiness / conflicts 同域重复 issue。
 */
export function filterGatewayExclusiveFeasibilityIssues(
  issues: FeasibilityIssueDto[],
  options?: {
    gatewayDomainRulesExclusive?: boolean;
    constraintPlanVerifyProjection?: boolean;
  },
): FeasibilityIssueDto[] {
  const exclusive =
    options?.gatewayDomainRulesExclusive ?? isGatewayDomainRulesExclusiveFromRuntime();
  const planVerify =
    options?.constraintPlanVerifyProjection ?? isConstraintPlanVerifyProjectionFromRuntime();

  if (!exclusive) return issues;

  const activeDomains = planVerify
    ? GATEWAY_EXCLUSIVE_FEASIBILITY_DOMAINS
    : GATEWAY_EXCLUSIVE_FEASIBILITY_DOMAINS;

  return issues.filter((issue) => {
    const domain = resolveFeasibilityIssueGatewayDomain(issue);
    if (!domain || !activeDomains.includes(domain)) return true;
    return isGatewayProjectedFeasibilityIssue(issue);
  });
}

export function applyGatewayFeasibilityProjection(
  report: import('@/types/trip-feasibility-report').TripFeasibilityReportDto,
): import('@/types/trip-feasibility-report').TripFeasibilityReportDto {
  const filtered = filterGatewayExclusiveFeasibilityIssues(report.issues);
  if (filtered.length === report.issues.length) return report;
  return { ...report, issues: filtered };
}
