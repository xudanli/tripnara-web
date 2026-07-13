/** 行程详情页（默认规划 Tab） */
export function buildTripTravelStatusPath(tripId: string): string {
  return `/dashboard/trips/${tripId}`;
}

/** 规划中行程 · 规划工作台（默认编排行程首页） */
export function buildPlanningWorkbenchPath(
  tripId: string,
  options?: {
    tab?: 'schedule' | 'budget' | 'tasks';
    /** schedule 子模式；默认编排首页，传 diagnosis 打开行程诊断 */
    scheduleMode?: 'arrange' | 'diagnosis' | 'explore';
  },
): string {
  const tab = options?.tab ?? 'schedule';
  const params = new URLSearchParams({ tripId, tab });
  if (tab === 'schedule') {
    const mode = options?.scheduleMode ?? 'arrange';
    if (mode === 'diagnosis') params.set('itineraryDiagnosis', '1');
    else if (mode === 'explore') params.set('attractionExplore', '1');
    else params.set('arrangeItinerary', '1');
  }
  return `/dashboard/plan-studio?${params.toString()}`;
}

/** Plan Studio · AI 自动执行合同摘要（只读；编辑请用 buildTripAutomationAuthorizationPath） */
export function buildPlanStudioAutomationPath(tripId: string): string {
  const params = new URLSearchParams({
    tripId,
    tab: 'schedule',
    view: 'constraints',
    constraintId: 'automation',
  });
  return `/dashboard/plan-studio?${params.toString()}`;
}

/** 行程 · AI 自动执行授权中心 */
export function buildTripAutomationAuthorizationPath(tripId: string): string {
  return `/dashboard/trips/${tripId}/automation`;
}

/** 行程 · AI 活动记录（完整时间线） */
export function buildTripAiActivityLogPath(tripId: string): string {
  return `/dashboard/trips/${tripId}/ai-activity-log`;
}

/** BFF 深链 · 可行性 issue 修复选项 */
export function buildTripFeasibilityRepairOptionsPath(tripId: string, issueId: string): string {
  return `/dashboard/trips/${encodeURIComponent(tripId)}/feasibility-report/issues/${encodeURIComponent(issueId)}/repair-options`;
}

/** 将 BFF 返回的 /trips/... 路径转为 dashboard 内链 */
export function resolveTripDashboardHref(href?: string | null): string | null {
  if (!href) return null;
  if (href.startsWith('/dashboard/')) return href;
  if (href.startsWith('/trips/')) return `/dashboard${href}`;
  if (href.startsWith('/api/trips/')) return href.replace(/^\/api/, '/dashboard');
  return href;
}

/** Plan Studio · 约束控制台（三栏完整视图） */
export function buildPlanStudioConstraintsPath(tripId: string, constraintId?: string): string {
  const params = new URLSearchParams({
    tripId,
    tab: 'schedule',
    view: 'constraints',
  });
  if (constraintId) params.set('constraintId', constraintId);
  return `/dashboard/plan-studio?${params.toString()}`;
}

/** Context Snapshot 详情页（调试 / 查看依据） */
export function buildTripContextSnapshotPath(tripId: string): string {
  return `/dashboard/trips/${tripId}/context-snapshot`;
}
