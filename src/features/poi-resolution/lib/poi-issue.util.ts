import type { ConsumerIssueView } from '@/features/exploration/api/types';
import type { CprePoiIssueContext, ResolvedPoi } from '../types';

export const POI_CONFIRMATION_ISSUE_PREFIX = 'cpre-poi-';

export function isPoiConfirmationIssue(issue: Pick<ConsumerIssueView, 'issueId' | 'cprePoi'>): boolean {
  return Boolean(issue.cprePoi) || issue.issueId.startsWith(POI_CONFIRMATION_ISSUE_PREFIX);
}

export function resolvePoiFromConsumerIssue(issue: ConsumerIssueView): ResolvedPoi {
  const ctx = issue.cprePoi;
  const headlineName = issue.headline?.replace(/^请确认地点[：:]\s*/u, '').trim();
  const queryName =
    ctx?.queryName ??
    (headlineName || undefined) ??
    decodePoiIssueIdSlug(issue.issueId) ??
    issue.issueId;

  return {
    name: queryName,
    canonicalName: ctx?.canonicalName,
    poiId: ctx?.poiId,
    confidence: ctx?.confidence,
    status: ctx?.status ?? 'NEEDS_CONFIRMATION',
    candidates: ctx?.candidates,
  };
}

export function resolvePoiConfirmCountryCode(issue: ConsumerIssueView): string {
  return issue.cprePoi?.countryCode ?? 'IS';
}

export function resolvePoiConfirmLocale(issue: ConsumerIssueView): string {
  return issue.cprePoi?.locale ?? 'zh';
}

export function resolvePoiConfirmRouteId(issue: ConsumerIssueView, fallbackRouteId?: string): string | undefined {
  return issue.cprePoi?.routeId ?? fallbackRouteId;
}

function decodePoiIssueIdSlug(issueId: string): string | undefined {
  if (!issueId.startsWith(POI_CONFIRMATION_ISSUE_PREFIX)) return undefined;
  const slug = issueId.slice(POI_CONFIRMATION_ISSUE_PREFIX.length);
  if (!slug) return undefined;
  return slug.replace(/-/g, ' ');
}

export function buildPoiIssueFromProblemId(problemId: string): ConsumerIssueView | null {
  if (!isPoiConfirmationIssue({ issueId: problemId })) return null;
  const queryName = decodePoiIssueIdSlug(problemId) ?? problemId;
  return {
    issueId: problemId,
    severity: 'VERIFY',
    headline: `请确认地点：${queryName}`,
    decisionRequired: true,
    source: {
      gatewayAssessmentBatchId: '',
      canonicalIssueId: problemId,
      tripId: '',
      tripVersion: 0,
    },
  };
}
