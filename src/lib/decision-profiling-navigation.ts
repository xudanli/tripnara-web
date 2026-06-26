import type { NavigateFunction } from 'react-router-dom';
import type { RouteAndRunResponse } from '@/api/agent';
import { isDecisionProfilingReuseEnabled } from '@/lib/decision-profiling-reuse-feature';
import { pickDecisionProfilingFromPayload } from '@/lib/normalize-decision-profiling';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';
import type { DecisionProfilingPayload } from '@/types/trip-decision-profiling';

/** 决策画像 Hub 内要展开的面板 */
export type DecisionProfilingSurface =
  | 'hub'
  | 'quiz'
  | 'friction'
  | 'split_consensus'
  | 'team_styles'
  | 'reuse';

export function pickDecisionProfilingFromRouteRun(
  response: RouteAndRunResponse,
): DecisionProfilingPayload | null {
  const payload = response.result?.payload;
  if (!payload || typeof payload !== 'object') return null;
  return pickDecisionProfilingFromPayload(payload as Record<string, unknown>);
}

export function isDecisionProfilingReuseAction(payload: DecisionProfilingPayload): boolean {
  return (
    isDecisionProfilingReuseEnabled() &&
    (payload.clientNavigation?.action === 'reuse_profile' ||
      payload.onboarding?.reuse?.eligible === true)
  );
}

/** route_and_run 气泡内 CTA 文案 */
export function decisionProfilingCtaLabel(payload: DecisionProfilingPayload): string {
  if (isDecisionProfilingReuseAction(payload) && payload.clientNavigation?.action === 'reuse_profile') {
    return '沿用上次调查';
  }

  const step = payload.clientNavigation?.step ?? payload.nextStep;
  const isReminder = payload.promptKind === 'reminder';

  if (step === 'money_dna') {
    return isReminder ? '继续填写消费 DNA' : '填写消费 DNA';
  }
  if (step === 'travel_style') {
    return isReminder ? '继续填写旅行风格' : '开始填写旅行风格';
  }
  if (step === 'overview') {
    return '查看调查进度';
  }
  return isReminder ? '继续完成行前调查' : '开始行前调查';
}

export function buildDecisionProfilingQuizUrl(payload: DecisionProfilingPayload): string | null {
  const nav = payload.clientNavigation;
  const tripId = nav?.tripId ?? payload.tripId;
  if (!tripId) return null;

  const step = nav?.step ?? payload.nextStep ?? 'travel_style';
  const params = new URLSearchParams();
  if (step && step !== 'overview') params.set('step', step);

  const query = params.toString();
  return `/dashboard/trips/${encodeURIComponent(tripId)}/decision-profiling/quiz${query ? `?${query}` : ''}`;
}

/** 规划工作台：打开决策画像 Hub（可选沿用 / 调查 / 指定面板） */
export function buildPlanStudioDecisionProfilingUrl(
  tripId: string,
  options?: {
    openQuiz?: boolean;
    step?: string;
    reuse?: boolean;
    surface?: DecisionProfilingSurface;
  },
): string {
  const params = new URLSearchParams();
  params.set('openDecisionProfiling', '1');
  if (options?.reuse) params.set('decisionProfilingAction', 'reuse');
  if (options?.surface) params.set('decisionProfilingSurface', options.surface);
  if (options?.step) params.set('decisionProfilingStep', options.step);
  if (options?.openQuiz && !options?.reuse) {
    params.set('decisionProfilingSurface', options.surface ?? 'quiz');
    params.set('decisionProfilingStep', options.step ?? 'travel_style');
  }
  return `/dashboard/trips/${encodeURIComponent(tripId)}/plan-studio?${params.toString()}`;
}

/** 可执行证明页：打开决策画像（Sheet / 全页内嵌 Hub） */
export function buildFeasibilityDecisionProfilingUrl(
  tripId: string,
  options?: { surface?: DecisionProfilingSurface; step?: DecisionProfilingStep },
): string {
  const params = new URLSearchParams({ tripId, openDecisionProfiling: '1' });
  if (options?.surface) params.set('decisionProfilingSurface', options.surface);
  if (options?.step) params.set('decisionProfilingStep', options.step);
  return `/dashboard/feasibility?${params.toString()}`;
}

/** Agent 触发决策风格调查：导航至调查深链页（完成后回到规划工作台团队 Tab） */
export function navigateToDecisionProfilingQuiz(
  navigate: NavigateFunction,
  payload: DecisionProfilingPayload,
): boolean {
  const url = buildDecisionProfilingQuizUrl(payload);
  if (!url) return false;
  navigate(url);
  return true;
}

/** Agent：导航至规划工作台并沿用 / 打开调查 */
export function navigateToDecisionProfilingHub(
  navigate: NavigateFunction,
  payload: DecisionProfilingPayload,
): boolean {
  const tripId = payload.clientNavigation?.tripId ?? payload.tripId;
  if (!tripId) return false;

  const reuse =
    isDecisionProfilingReuseEnabled() &&
    payload.clientNavigation?.action === 'reuse_profile' &&
    payload.onboarding?.reuse?.eligible;

  const step = payload.clientNavigation?.step ?? payload.nextStep;
  navigate(
    buildPlanStudioDecisionProfilingUrl(tripId, {
      reuse,
      step: step && step !== 'overview' ? step : undefined,
      openQuiz: !reuse,
    }),
  );
  return true;
}

export function applyDecisionProfilingFromRouteRun(
  response: RouteAndRunResponse,
  navigate: NavigateFunction,
): DecisionProfilingPayload | null {
  const dp = pickDecisionProfilingFromRouteRun(response);
  if (!dp?.triggered) return null;
  navigateToDecisionProfilingHub(navigate, dp);
  return dp;
}
