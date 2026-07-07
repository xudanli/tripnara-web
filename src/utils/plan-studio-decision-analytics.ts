/**
 * Decision Center 漏斗埋点（与前端 MVP 同步）
 */

export const DECISION_ANALYTICS_EVENTS = {
  CENTER_VIEWED: 'decision_center_viewed',
  PROBLEM_VIEWED: 'decision_problem_viewed',
  OPTION_VIEWED: 'decision_option_viewed',
  OPTION_SELECTED: 'decision_option_selected',
  PREVIEW_REQUESTED: 'decision_preview_requested',
  PREVIEW_SUCCEEDED: 'decision_preview_succeeded',
  PREVIEW_BLOCKED: 'decision_preview_blocked',
  SUBMIT_REQUESTED: 'decision_submit_requested',
  APPLIED: 'decision_applied',
  PARTIALLY_APPLIED: 'decision_partially_applied',
  ROLLED_BACK: 'decision_rolled_back',
  FAILED: 'decision_failed',
  VALIDATION_VIEWED: 'decision_validation_viewed',
} as const;

export interface DecisionAnalyticsContext {
  tripId: string;
  problemId?: string;
  decisionId?: string;
  optionId?: string;
  primaryEnforcement?: string;
  detectedBy?: string;
  executionCapability?: string;
  tripVersion?: string;
  semanticKey?: string;
  result?: string;
  failureReason?: string;
}

function track(eventName: string, properties?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[DecisionAnalytics]', eventName, properties);
  }
  if (typeof window !== 'undefined' && (window as unknown as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

function baseProps(ctx: DecisionAnalyticsContext): Record<string, unknown> {
  return {
    trip_id: ctx.tripId,
    problem_id: ctx.problemId,
    decision_id: ctx.decisionId,
    option_id: ctx.optionId,
    primary_enforcement: ctx.primaryEnforcement,
    detected_by: ctx.detectedBy,
    execution_capability: ctx.executionCapability,
    trip_version: ctx.tripVersion,
    semantic_key: ctx.semanticKey,
    result: ctx.result,
    failure_reason: ctx.failureReason,
  };
}

export function trackDecisionCenterViewed(ctx: DecisionAnalyticsContext & { overviewState?: string }): void {
  track(DECISION_ANALYTICS_EVENTS.CENTER_VIEWED, {
    ...baseProps(ctx),
    overview_state: ctx.overviewState,
  });
}

export function trackDecisionProblemViewed(ctx: DecisionAnalyticsContext): void {
  track(DECISION_ANALYTICS_EVENTS.PROBLEM_VIEWED, baseProps(ctx));
}

export function trackDecisionOptionViewed(
  ctx: DecisionAnalyticsContext & { optionCount?: number },
): void {
  track(DECISION_ANALYTICS_EVENTS.OPTION_VIEWED, {
    ...baseProps(ctx),
    option_count: ctx.optionCount,
  });
}

export function trackDecisionOptionSelected(ctx: DecisionAnalyticsContext): void {
  track(DECISION_ANALYTICS_EVENTS.OPTION_SELECTED, baseProps(ctx));
}

export function trackDecisionPreviewRequested(ctx: DecisionAnalyticsContext): void {
  track(DECISION_ANALYTICS_EVENTS.PREVIEW_REQUESTED, baseProps(ctx));
}

export function trackDecisionPreviewSucceeded(ctx: DecisionAnalyticsContext): void {
  track(DECISION_ANALYTICS_EVENTS.PREVIEW_SUCCEEDED, baseProps(ctx));
}

export function trackDecisionPreviewBlocked(
  ctx: DecisionAnalyticsContext & { reason?: string },
): void {
  track(DECISION_ANALYTICS_EVENTS.PREVIEW_BLOCKED, {
    ...baseProps(ctx),
    block_reason: ctx.reason,
  });
}

export function trackDecisionSubmitRequested(ctx: DecisionAnalyticsContext): void {
  track(DECISION_ANALYTICS_EVENTS.SUBMIT_REQUESTED, baseProps(ctx));
}

export function trackDecisionApplied(ctx: DecisionAnalyticsContext): void {
  track(DECISION_ANALYTICS_EVENTS.APPLIED, baseProps(ctx));
}

export function trackDecisionPartiallyApplied(ctx: DecisionAnalyticsContext): void {
  track(DECISION_ANALYTICS_EVENTS.PARTIALLY_APPLIED, baseProps(ctx));
}

export function trackDecisionRolledBack(ctx: DecisionAnalyticsContext): void {
  track(DECISION_ANALYTICS_EVENTS.ROLLED_BACK, baseProps(ctx));
}

export function trackDecisionFailed(ctx: DecisionAnalyticsContext): void {
  track(DECISION_ANALYTICS_EVENTS.FAILED, baseProps(ctx));
}

export function trackDecisionValidationViewed(ctx: DecisionAnalyticsContext): void {
  track(DECISION_ANALYTICS_EVENTS.VALIDATION_VIEWED, baseProps(ctx));
}

/** 根据 execution classification variant 映射结果埋点 */
export function trackDecisionExecutionOutcome(
  ctx: DecisionAnalyticsContext,
  variant: string,
): void {
  switch (variant) {
    case 'success':
    case 'neutral_replay':
      trackDecisionApplied(ctx);
      break;
    case 'warning_needs_repair':
      trackDecisionPartiallyApplied(ctx);
      break;
    case 'error_rolled_back':
      trackDecisionRolledBack(ctx);
      break;
    case 'error_failed':
    case 'blocked_stale_evidence':
      trackDecisionFailed({ ...ctx, failureReason: variant });
      break;
    default:
      break;
  }
}
