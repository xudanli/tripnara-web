import type { DecisionQueueItem, DecisionQueueSeverity } from '@/api/travel-status.types';
import type { ConsumerIssueView, ConsumerRepairOption } from '@/features/exploration/api/types';
import type { DecisionsViewData } from '@/travel-context/views/travel-context-views.types';

const CLOSED_STATUSES = new Set(['COMPLETED', 'RESOLVED', 'CLOSED']);

function pickRecommendedOption(
  options?: ConsumerRepairOption[],
): ConsumerRepairOption | undefined {
  if (!options?.length) return undefined;
  return options.find((o) => o.canApply !== false) ?? options[0];
}

function mapOptionToRecommendation(
  option?: ConsumerRepairOption,
): DecisionQueueItem['recommendation'] {
  if (!option) {
    return { title: '推荐方案', summary: '', keeps: [], costs: [] };
  }
  return {
    title: option.title,
    summary: option.summary ?? '',
    keeps: option.preserves ?? [],
    costs: option.sacrifices ?? [],
  };
}

function resolveProblemId(problem: NonNullable<DecisionsViewData['problems']>[number]): string {
  return problem.problemId;
}

function mapIssueSeverity(severity?: ConsumerIssueView['severity']): DecisionQueueSeverity {
  if (
    severity === 'BLOCK' ||
    severity === 'CONFLICT' ||
    severity === 'VERIFY' ||
    severity === 'OPTIMIZE'
  ) {
    return severity;
  }
  return 'VERIFY';
}

function mapProblemToQueueItem(
  problem: NonNullable<DecisionsViewData['problems']>[number],
  issue?: ConsumerIssueView,
): DecisionQueueItem | null {
  if (problem.status && CLOSED_STATUSES.has(problem.status)) return null;

  const recommended = pickRecommendedOption(problem.options);
  const optionCount = problem.options?.length ?? 0;

  return {
    problemId: resolveProblemId(problem),
    headline: issue?.headline ?? recommended?.title ?? '待处理事项',
    impact: issue?.consequence ?? issue?.explanation ?? recommended?.summary ?? '',
    recommendation: mapOptionToRecommendation(recommended),
    severity: mapIssueSeverity(issue?.severity),
    affectedDayNumbers: issue?.affectedDay != null ? [issue.affectedDay] : undefined,
    actions: {
      acceptRecommended: { enabled: Boolean(recommended && recommended.canApply !== false) },
      viewAlternatives: { enabled: optionCount > 1 },
      keepOriginal: { enabled: false },
      defer: { enabled: true },
    },
  };
}

function mapIssueToQueueItem(issue: ConsumerIssueView): DecisionQueueItem {
  return {
    problemId: issue.source?.canonicalIssueId ?? issue.issueId,
    headline: issue.headline,
    impact: issue.consequence ?? issue.explanation ?? '',
    recommendation: { title: '推荐方案', summary: '', keeps: [], costs: [] },
    severity: mapIssueSeverity(issue.severity),
    affectedDayNumbers: issue.affectedDay != null ? [issue.affectedDay] : undefined,
    actions: {
      acceptRecommended: { enabled: true },
      viewAlternatives: { enabled: true },
      keepOriginal: { enabled: false },
      defer: { enabled: true },
    },
  };
}

/** decisions view → BFF 兼容的 DecisionQueueItem 列表 */
export function mapDecisionsViewToQueueItems(view?: DecisionsViewData): DecisionQueueItem[] {
  if (!view) return [];

  const issueById = new Map((view.displayedIssues ?? []).map((issue) => [issue.issueId, issue]));
  const seen = new Set<string>();
  const items: DecisionQueueItem[] = [];

  for (const problem of view.problems ?? []) {
    const issue = problem.issueId ? issueById.get(problem.issueId) : undefined;
    const item = mapProblemToQueueItem(problem, issue);
    if (!item || seen.has(item.problemId)) continue;
    seen.add(item.problemId);
    items.push(item);
  }

  for (const issue of view.displayedIssues ?? []) {
    if (!issue.decisionRequired) continue;
    const problemId = issue.source?.canonicalIssueId ?? issue.issueId;
    if (seen.has(problemId)) continue;
    seen.add(problemId);
    items.push(mapIssueToQueueItem(issue));
  }

  return items;
}

/** TC 就绪时优先 decisions view；BFF 仅作兜底 */
export function resolveUnifiedDecisionQueueItems(input: {
  travelContextEnabled: boolean;
  travelContextReady: boolean;
  decisionsView?: DecisionsViewData;
  bffItems: DecisionQueueItem[];
}): DecisionQueueItem[] {
  const { travelContextEnabled, travelContextReady, decisionsView, bffItems } = input;
  if (!travelContextEnabled || !travelContextReady) {
    return bffItems;
  }

  const tcItems = mapDecisionsViewToQueueItems(decisionsView);
  if (tcItems.length > 0) return tcItems;

  const tcOpenCount =
    decisionsView?.openDecisionCount ??
    decisionsView?.problems?.filter((p) => p.status && !CLOSED_STATUSES.has(p.status)).length ??
    0;

  if (tcOpenCount === 0) return [];
  return bffItems;
}

export function findRecommendedOptionForProblem(
  decisionsView: DecisionsViewData | undefined,
  problemId: string,
): ConsumerRepairOption | undefined {
  const problem = decisionsView?.problems?.find((p) => p.problemId === problemId);
  return pickRecommendedOption(problem?.options);
}
