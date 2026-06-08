/**
 * POST /api/agent/route_and_run 前端最小渲染分支（单源、去重）。
 * 与产品清单对齐：澄清仅澄清卡；OK+timeline 以时间轴为主；answer_text 兜底。
 */

import type { RouteAndRunResponse } from '@/api/agent';
import type { ClarificationQuestion } from '@/types/clarification';
import { isClarifyResponse, pickPrimaryClarificationQuestion } from '@/lib/route-run-clarification';

export type RouteRunViewMode = 'clarification' | 'trip_timeline' | 'answer_fallback';

export { pickPrimaryClarificationQuestion };

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

function pickStr(o: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function timelineLength(payload: Record<string, unknown> | undefined): number {
  if (!payload) return 0;
  const tl = payload.timeline;
  return Array.isArray(tl) ? tl.length : 0;
}

/** 四行决策：澄清 / OK+timeline / 其它 */
export function resolveRouteRunViewMode(response: RouteAndRunResponse): RouteRunViewMode {
  const status = String(response.result?.status ?? '').toUpperCase();
  const payload = asRecord(response.result?.payload);

  if (isClarifyResponse(response)) {
    return 'clarification';
  }

  const uiStatus = String(response.ui_state?.ui_status ?? '').toLowerCase();
  if (uiStatus === 'awaiting_confirmation' && hasClarificationQuestions(payload)) {
    return 'clarification';
  }

  if (status === 'OK' && timelineLength(payload) > 0) {
    return 'trip_timeline';
  }

  return 'answer_fallback';
}

function hasClarificationQuestions(payload: Record<string, unknown> | undefined): boolean {
  const qs = payload?.clarificationQuestions ?? payload?.clarification_questions;
  return Array.isArray(qs) && qs.length > 0;
}

export function resolveRouteRunViewModeFromParts(options: {
  status?: string;
  routeRunSurface?: string;
  clarificationQuestionCount?: number;
  timelineDayCount?: number;
  uiStatus?: string;
}): RouteRunViewMode {
  const status = String(options.status ?? '').toUpperCase();
  const uiStatus = String(options.uiStatus ?? '').toLowerCase();
  const hasQuestions = (options.clarificationQuestionCount ?? 0) > 0;

  if (
    options.routeRunSurface === 'clarification' ||
    (status === 'NEED_MORE_INFO' && hasQuestions) ||
    (uiStatus === 'awaiting_confirmation' && hasQuestions)
  ) {
    return 'clarification';
  }

  if (status === 'OK' && (options.timelineDayCount ?? 0) > 0) {
    return 'trip_timeline';
  }

  return 'answer_fallback';
}

/** 门控 HARD → safety_surface.verify_issues[0]；勿并排两套英文码 */
export function pickFeasibilityHeadline(
  payload?: Record<string, unknown> | null
): string | undefined {
  if (!payload) return undefined;

  const orch = asRecord(payload.orchestrationResult ?? payload.orchestration_result);
  const gate = asRecord(orch?.gate_result ?? orch?.gateResult);
  const violations = gate?.violations;
  if (Array.isArray(violations)) {
    const hard = violations
      .map((raw) => asRecord(raw))
      .find((v) => v && String(v.severity ?? '').toUpperCase() === 'HARD');
    if (hard) {
      return (
        pickStr(hard, 'display_headline_zh', 'displayHeadlineZh', 'headline_zh', 'headlineZh') ??
        pickStr(hard, 'detail', 'detail_zh', 'detailZh', 'message')
      );
    }
  }

  const safety = asRecord(payload.safety_surface ?? payload.safetySurface);
  const verifyIssues = safety?.verify_issues ?? safety?.verifyIssues;
  if (Array.isArray(verifyIssues) && verifyIssues.length > 0) {
    const top = asRecord(verifyIssues[0]);
    if (top) {
      return (
        pickStr(top, 'headline_zh', 'headlineZh', 'display_headline_zh', 'displayHeadlineZh') ??
        pickStr(top, 'message', 'detail', 'suggestion')
      );
    }
  }

  return undefined;
}

export function truncateAnswerTextForBubble(text: string, maxLen = 120): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

/** 澄清态不展示；有 timeline 时仅短截断或隐藏 */
export function shouldSuppressRouteRunAnswerText(options: {
  viewMode: RouteRunViewMode;
  uiSurface?: string;
  debugUiDefaults?: boolean;
}): boolean {
  if (options.debugUiDefaults) return false;
  if (options.viewMode === 'clarification') return true;
  if (options.viewMode === 'trip_timeline') return true;
  return false;
}

/** 有 timeline 时允许 ≤120 字聊天气泡一句 */
export function shouldShowTruncatedAnswerBubble(options: {
  viewMode: RouteRunViewMode;
  answerText: string;
  uiSurface?: string;
}): boolean {
  if (options.viewMode !== 'trip_timeline') return false;
  if (options.uiSurface?.toLowerCase() === 'consultation') return false;
  return options.answerText.trim().length > 0;
}

export function shouldAttachSimplifiedExplanation(debugUiDefaults?: boolean): boolean {
  return debugUiDefaults === true;
}

export function shouldShowGuardianPersonasInUi(debugUiDefaults?: boolean): boolean {
  return debugUiDefaults === true;
}

/** 澄清卡仅渲染一题（辩论题优先） */
export function clarificationQuestionsForRender(
  questions: ClarificationQuestion[]
): ClarificationQuestion[] {
  const primary = pickPrimaryClarificationQuestion(questions);
  return primary ? [primary] : [];
}
