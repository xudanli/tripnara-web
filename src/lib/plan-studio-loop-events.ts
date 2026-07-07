/** apply / run 后通知 Decision Strip 刷新 Loop 读模型 */
export function notifyLoopReadinessChanged(tripId: string): void {
  window.dispatchEvent(
    new CustomEvent('plan-studio:loop-readiness-changed', { detail: { tripId } }),
  );
}

/** Loop run/apply 后刷新右侧 feasibility-report 读模型 */
export function notifyFeasibilityReportReload(tripId: string): void {
  window.dispatchEvent(
    new CustomEvent('plan-studio:feasibility-report-reload', { detail: { tripId } }),
  );
}

/** 从 Loop checklist / 外部引导聚焦报告内某类 issue */
export function notifyFeasibilityIssueFocus(
  tripId: string,
  detail: { category?: string; issueId?: string },
): void {
  window.dispatchEvent(
    new CustomEvent('plan-studio:feasibility-issue-focus', { detail: { tripId, ...detail } }),
  );
}

export function openDecisionProfilingSurface(
  tripId: string,
  surface: import('@/lib/decision-profiling-navigation').DecisionProfilingSurface,
  step?: import('@/types/trip-decision-profiling').DecisionProfilingStep,
): void {
  window.dispatchEvent(
    new CustomEvent('plan-studio:open-decision-profiling', {
      detail: { tripId, surface, step },
    }),
  );
}

/** feasibility validate / POI 反馈后刷新 decision validation 读模型 */
export function notifyDecisionValidationRefresh(
  tripId: string,
  detail?: { decisionId?: string },
): void {
  window.dispatchEvent(
    new CustomEvent('plan-studio:decision-validation-refresh', {
      detail: { tripId, ...detail },
    }),
  );
}
