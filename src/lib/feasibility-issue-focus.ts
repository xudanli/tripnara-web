import { resolveFeasibilityIssueVisualCategory } from '@/lib/feasibility-issue-display';
import { dedupeFeasibilityIssues } from '@/lib/feasibility-issue-dedupe';
import { resolveFeasibilityIssueDayNumber } from '@/lib/feasibility-issue-day';
import type { FeasibilityIssueDto, TripFeasibilityReportDto } from '@/types/trip-feasibility-report';

export function issueMatchesCategory(issue: FeasibilityIssueDto, category: string): boolean {
  return issue.category === category || resolveFeasibilityIssueVisualCategory(issue) === category;
}

export function firstFeasibilityIssueForCategory(
  data: TripFeasibilityReportDto,
  category: string,
): { dayNumber: number; issueId: string } | null {
  const orphan = data.issues.find(
    (issue) => issueMatchesCategory(issue, category) && !issue.affectedDays?.length,
  );
  if (orphan) {
    const dayNumber =
      data.dayTimeline.find((day) => day.issueIds.includes(orphan.id))?.dayNumber ??
      data.dayTimeline[0]?.dayNumber ??
      1;
    return { dayNumber, issueId: orphan.id };
  }

  for (const day of data.dayTimeline) {
    for (const id of day.issueIds) {
      const issue = data.issues.find((item) => item.id === id);
      if (issue && issueMatchesCategory(issue, category)) {
        return { dayNumber: day.dayNumber, issueId: issue.id };
      }
    }
  }

  const any = data.issues.find((issue) => issueMatchesCategory(issue, category));
  if (any) {
    const dayNumber =
      resolveFeasibilityIssueDayNumber(any, data.dayTimeline) ??
      data.dayTimeline[0]?.dayNumber ??
      1;
    return { dayNumber, issueId: any.id };
  }

  return null;
}

function firstActionableIssueForReport(data: TripFeasibilityReportDto): {
  dayNumber: number;
  issueId: string;
} | null {
  const issueById = new Map(data.issues.map((issue) => [issue.id, issue]));
  for (const day of data.dayTimeline) {
    const dayIssues = day.issueIds
      .map((id) => issueById.get(id))
      .filter((issue): issue is FeasibilityIssueDto => issue != null);
    const deduped = dedupeFeasibilityIssues(dayIssues).issues;
    const must = deduped.find((issue) => issue.priority === 'must_handle');
    if (must) return { dayNumber: day.dayNumber, issueId: must.id };
  }
  for (const day of data.dayTimeline) {
    if (day.issueIds.length === 0) continue;
    const firstId = day.issueIds
      .map((id) => issueById.get(id))
      .find((issue): issue is FeasibilityIssueDto => issue != null)?.id;
    if (firstId) return { dayNumber: day.dayNumber, issueId: firstId };
  }
  return null;
}

/** 重新验证/刷新证据后：去掉失效筛选，尽量保留当前 issue 选中 */
export function syncFeasibilityReportSelection(
  report: TripFeasibilityReportDto,
  input: {
    categoryFilter: string | null;
    selectedIssueId: string | null;
    selectedDayNumber: number | null;
  },
): {
  categoryFilter: string | null;
  selectedIssueId: string | null;
  selectedDayNumber: number | null;
  clearedCategoryFilter: boolean;
} {
  let categoryFilter = input.categoryFilter;
  let selectedIssueId = input.selectedIssueId;
  let selectedDayNumber = input.selectedDayNumber;
  let clearedCategoryFilter = false;

  if (categoryFilter) {
    const hasAny = report.issues.some((issue) => issueMatchesCategory(issue, categoryFilter!));
    if (!hasAny) {
      categoryFilter = null;
      clearedCategoryFilter = true;
    }
  }

  if (selectedIssueId) {
    const issue = report.issues.find((item) => item.id === selectedIssueId);
    if (issue) {
      selectedDayNumber =
        resolveFeasibilityIssueDayNumber(issue, report.dayTimeline) ?? selectedDayNumber;
    } else {
      selectedIssueId = null;
    }
  }

  if (!selectedIssueId) {
    const next = categoryFilter
      ? firstFeasibilityIssueForCategory(report, categoryFilter)
      : firstActionableIssueForReport(report);
    if (next) {
      selectedIssueId = next.issueId;
      selectedDayNumber = next.dayNumber;
    }
  }

  return {
    categoryFilter,
    selectedIssueId,
    selectedDayNumber,
    clearedCategoryFilter,
  };
}
