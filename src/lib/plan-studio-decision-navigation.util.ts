/** Plan Studio 深链：打开决策空间并定位决策问题 */
export function buildPlanStudioDecisionProblemPath(
  tripId: string,
  problemId: string,
  options?: { tab?: string; fromTravel?: boolean },
): string {
  const params = new URLSearchParams({
    tripId,
    problemId,
    tab: options?.tab ?? 'schedule',
    decisionSpace: '1',
  });
  if (options?.fromTravel) params.set('from', 'travel');
  return `/dashboard/plan-studio?${params.toString()}`;
}

export function buildPlanStudioPlanningInboxPath(tripId: string): string {
  const params = new URLSearchParams({
    tripId,
    tab: 'tasks',
    planningInbox: '1',
  });
  return `/dashboard/plan-studio?${params.toString()}`;
}

export function buildPlanStudioDecisionSpacePath(
  tripId: string,
  options?: { conflictId?: string },
): string {
  const params = new URLSearchParams({
    tripId,
    tab: 'schedule',
    decisionSpace: '1',
  });
  if (options?.conflictId) params.set('conflictId', options.conflictId);
  return `/dashboard/plan-studio?${params.toString()}`;
}

/** Plan Studio 深链：打开决策记录抽屉 */
export function buildPlanStudioDecisionRecordPath(
  tripId: string,
  decisionId: string,
  options?: { tab?: string; problemId?: string },
): string {
  const params = new URLSearchParams({
    tripId,
    decisionId,
    tab: options?.tab ?? 'schedule',
  });
  if (options?.problemId) params.set('problemId', options.problemId);
  return `/dashboard/plan-studio?${params.toString()}`;
}

export function readDecisionRecordIdFromSearchParams(
  params: URLSearchParams,
): string | null {
  const id = params.get('decisionId')?.trim();
  return id || null;
}

export function readDecisionProblemIdFromSearchParams(
  params: URLSearchParams,
): string | null {
  const id = params.get('problemId')?.trim();
  return id || null;
}
