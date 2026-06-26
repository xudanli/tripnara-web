import type {
  FeasibilityIssueDto,
  FeasibilityIssuePriority,
  TripFeasibilityReportDto,
} from '@/types/trip-feasibility-report';
import { enrichTravelTimingIssueProofs } from '@/lib/feasibility-travel-timing-proofs';
import { enrichBookingIssueProofs } from '@/lib/feasibility-booking-proofs';
import { resolveFeasibilityVerdictSubheadline } from '@/lib/feasibility-verdict-copy';
import { normalizeFeasibilityIssue } from '@/lib/feasibility-issue-normalize';
import {
  longDriveRouteKey,
  mergeLongDriveIssues,
} from '@/lib/feasibility-ultra-long-drive';
import { resolveIssuePriority, resolveVerdictFromSummary } from '@/lib/feasibility-issue-priority';
import { reconcileFeasibilityDayTimeline } from '@/lib/feasibility-issue-day';

const PRIORITY_RANK: Record<FeasibilityIssuePriority, number> = {
  must_handle: 3,
  suggest_adjust: 2,
  pending_confirm: 1,
};

/** 同一跨天路段 / 同一语义问题，不因 priority 或文案细节重复展示 */
export function issueSemanticKey(issue: FeasibilityIssueDto): string {
  const longDriveKey = longDriveRouteKey(issue);
  if (longDriveKey) return longDriveKey;

  const msg = issue.message ?? '';
  const dayMatch = msg.match(/第\s*(\d+)\s*天/);
  const day = issue.affectedDays?.[0] ?? (dayMatch ? Number(dayMatch[1]) : undefined);

  const routeMatch = msg.match(/([^·→]+?)\s*(?:→|->)\s*([^·(（]+)/);
  if (routeMatch && /跨天/.test(msg)) {
    const from = routeMatch[1].replace(/^第\d+天\s*/i, '').trim();
    const to = routeMatch[2].trim();
    return `cross-day:${day ?? ''}:${from}:${to}`;
  }

  const normalized = msg
    .replace(/\s*\(约\s*[\d.,]+\s*km\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  return `${issue.category}:${day ?? ''}:${normalized}`;
}

export function dedupeFeasibilityIssues(issues: FeasibilityIssueDto[]): {
  issues: FeasibilityIssueDto[];
  idRemap: Map<string, string>;
} {
  const byKey = new Map<string, FeasibilityIssueDto>();
  const idRemap = new Map<string, string>();

  for (const issue of issues) {
    const key = issueSemanticKey(issue);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...issue });
      idRemap.set(issue.id, issue.id);
      continue;
    }

    idRemap.set(issue.id, existing.id);

    const merged =
      longDriveRouteKey(issue) || longDriveRouteKey(existing)
        ? mergeLongDriveIssues(existing, issue)
        : PRIORITY_RANK[issue.priority] >= PRIORITY_RANK[existing.priority]
          ? { ...issue, id: existing.id }
          : { ...existing };

    idRemap.set(issue.id, merged.id);
    for (const [oldId, mappedId] of idRemap.entries()) {
      if (mappedId === existing.id) idRemap.set(oldId, merged.id);
    }

    byKey.set(key, merged);
  }

  return { issues: Array.from(byKey.values()), idRemap };
}

/** 去重 issues、修正 dayTimeline 引用，并同步 summary / 维度计数 */
export function normalizeFeasibilityReport(
  report: TripFeasibilityReportDto,
): TripFeasibilityReportDto {
  const { issues: dedupedIssues, idRemap } = dedupeFeasibilityIssues(report.issues);
  const issues = dedupedIssues
    .map((issue) => normalizeFeasibilityIssue(issue))
    .map((issue) => ({
      ...issue,
      priority: resolveIssuePriority(issue),
    }))
    .map((issue) => enrichBookingIssueProofs(enrichTravelTimingIssueProofs(issue)));
  const issueIdSet = new Set(issues.map((i) => i.id));

  const dayTimeline = reconcileFeasibilityDayTimeline(
    report.dayTimeline.map((day) => {
      const issueIds = [
        ...new Set(
          day.issueIds
            .map((id) => idRemap.get(id) ?? id)
            .filter((id) => issueIdSet.has(id)),
        ),
      ];
      return { ...day, issueIds };
    }),
    issues,
  );

  const mustHandle = issues.filter((i) => i.priority === 'must_handle').length;
  const suggestAdjust = issues.filter((i) => i.priority === 'suggest_adjust').length;
  const pendingConfirm = issues.filter((i) => i.priority === 'pending_confirm').length;
  const summary = {
    ...report.summary,
    mustHandle,
    suggestAdjust,
    pendingConfirm,
    blockers: mustHandle,
  };

  const dimensions = report.dimensions.map((dim) => {
    const dimIssues = issues.filter((i) => i.category === dim.key);
    const blockerCount = dimIssues.filter((i) => i.priority === 'must_handle').length;
    return {
      ...dim,
      issueCount: dimIssues.length,
      blockerCount,
    };
  });

  const verdictBase = resolveVerdictFromSummary(summary, {
    hasValidatedReport: report.verdict.status !== 'UNKNOWN',
    isStale: report.isStale,
  });

  return {
    ...report,
    issues,
    dayTimeline,
    dimensions,
    summary,
    verdict: {
      ...report.verdict,
      status: report.isStale ? 'STALE' : verdictBase.status,
      headline: report.isStale ? report.verdict.headline : verdictBase.headline,
      subheadline: resolveFeasibilityVerdictSubheadline(report.verdict.subheadline, summary),
    },
  };
}
