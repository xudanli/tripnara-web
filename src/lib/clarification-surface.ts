/**
 * route_and_run 澄清路径：剥离 L3-PROOF / 审计标签，供结构化澄清卡展示。
 * 澄清场景气泡优先 payload.clarification_display.body_html / answer_html；
 * 选项仍用 clarificationQuestions[].options；短文案见 ui_state.current_step_detail。
 */

import type { ClarificationQuestion } from '@/types/clarification';
import type { RouteAndRunResponse } from '@/api/agent';
import { isClarifyResponse } from '@/lib/route-run-clarification';
import { normalizeRouteRunClarificationQuestions } from '@/utils/clarification';

export type RouteRunUISurface = 'clarification' | 'feasibility' | 'answer';

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

/** 去掉 `[L3-PROOF|…]` 机读块（可连续多块） */
export function stripL3Proof(text: string): string {
  let s = text.trim();
  for (let i = 0; i < 5; i++) {
    if (!/^\[L3-PROOF\|/i.test(s)) break;
    const end = s.indexOf(']');
    if (end <= 0) break;
    s = s.slice(end + 1).trim();
  }
  return s;
}

/** 去掉内部审计标签 【…】（仅行首） */
export function stripAuditTags(text: string): string {
  return text.replace(/^【[^】]{1,120}】\s*/g, '').trim();
}

export type SurfacedClarificationQuestion = {
  badge?: string;
  /** 短标题（冒号前一句，若有） */
  title?: string;
  body: string;
};

/** 澄清 question 展示用：badge 不进正文，L3 / 审计标签剥离 */
export function surfaceClarificationQuestion(raw: string): SurfacedClarificationQuestion {
  const trimmed = raw.trim();
  const badgeMatch = trimmed.match(/^【([^】]+)】/);
  const badge = badgeMatch?.[1];
  let rest = trimmed;
  if (badgeMatch) rest = rest.slice(badgeMatch[0].length).trim();
  rest = stripL3Proof(stripAuditTags(rest));

  const colonIdx = rest.search(/[：:]/);
  if (colonIdx > 0 && colonIdx < 80) {
    const title = rest.slice(0, colonIdx).trim();
    const body = rest.slice(colonIdx + 1).trim();
    if (title && body) return { badge, title, body };
  }

  return { badge, body: rest };
}

export function isStructuredClarificationPayload(payload: Record<string, unknown> | null | undefined): boolean {
  if (!payload) return false;
  const questions = normalizeRouteRunClarificationQuestions(payload.clarificationQuestions);
  if (questions.length === 0) return false;
  const needs =
    payload.needsUserConfirmation === true ||
    payload.needs_user_confirmation === true;
  if (needs) return true;
  /** 有结构化题集即走澄清卡（兼容未显式 needsUserConfirmation 的 NEED_MORE_INFO） */
  return true;
}

export function pickRouteRunSurface(options: {
  status: string;
  payload?: Record<string, unknown> | null;
  /** 传入完整响应时优先用 isClarifyResponse */
  response?: RouteAndRunResponse;
}): RouteRunUISurface {
  const payload = options.payload;
  const status = String(options.status ?? '').toUpperCase();

  if (options.response && isClarifyResponse(options.response)) {
    return 'clarification';
  }

  if (status === 'NEED_MORE_INFO' && isStructuredClarificationPayload(payload ?? undefined)) {
    return 'clarification';
  }

  const orch = asRecord(payload?.orchestrationResult ?? payload?.orchestration_result);
  const gate = asRecord(orch?.gate_result ?? orch?.gateResult);
  const violations = gate?.violations;
  const safety = asRecord(payload?.safety_surface ?? payload?.safetySurface);
  const verifyIssues = safety?.verify_issues ?? safety?.verifyIssues;

  if (
    (Array.isArray(violations) && violations.length > 0) ||
    (Array.isArray(verifyIssues) && verifyIssues.length > 0)
  ) {
    return 'feasibility';
  }

  return 'answer';
}

export type FeasibilityDisplayItem = {
  title: string;
  body: string;
  code?: string;
};

/** 门控 violations + safety_surface.verify_issues → 用户向标题/正文 */
export function extractFeasibilityDisplayItems(
  payload?: Record<string, unknown> | null
): FeasibilityDisplayItem[] {
  if (!payload) return [];
  const out: FeasibilityDisplayItem[] = [];

  const orch = asRecord(payload.orchestrationResult ?? payload.orchestration_result);
  const gate = asRecord(orch?.gate_result ?? orch?.gateResult);
  const violations = gate?.violations;
  if (Array.isArray(violations)) {
    for (const raw of violations) {
      const v = asRecord(raw);
      if (!v) continue;
      const title =
        pickStr(v, 'display_headline_zh', 'displayHeadlineZh', 'headline_zh', 'headlineZh') ??
        '可执行性提示';
      const body =
        pickStr(v, 'detail', 'detail_zh', 'detailZh', 'message', 'explanation') ?? '';
      const code = pickStr(v, 'code', 'violation_code', 'violationCode');
      if (!body.trim() && !code) continue;
      out.push({ title, body: body.trim() || title, code });
    }
  }

  const safety = asRecord(payload.safety_surface ?? payload.safetySurface);
  const verifyIssues = safety?.verify_issues ?? safety?.verifyIssues;
  if (Array.isArray(verifyIssues)) {
    for (const raw of verifyIssues) {
      const v = asRecord(raw);
      if (!v) continue;
      const title =
        pickStr(v, 'headline_zh', 'headlineZh', 'display_headline_zh', 'displayHeadlineZh') ??
        '可执行性提示';
      const body = pickStr(v, 'message', 'detail', 'suggestion') ?? '';
      const code = pickStr(v, 'code', 'issue_code', 'issueCode');
      if (!body.trim() && !code) continue;
      out.push({ title, body: body.trim() || title, code });
    }
  }

  return out;
}

/** 澄清卡固定黄条文案（约束冲突类澄清） */
/** payload.clarification_meta.suppress_chat_prose：气泡仅短句，长文走 question_html */
export function shouldSuppressClarificationChatProse(
  payload: Record<string, unknown> | undefined | null
): boolean {
  const meta = asRecord(payload?.clarification_meta ?? payload?.clarificationMeta);
  return meta?.suppress_chat_prose === true || meta?.suppressChatProse === true;
}

export function pickClarificationQuestionHtml(question: ClarificationQuestion): string | undefined {
  const raw =
    question.question_html ??
    (typeof question.metadata?.question_html === 'string'
      ? question.metadata.question_html
      : typeof question.metadata?.questionHtml === 'string'
        ? question.metadata.questionHtml
        : undefined);
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export function clarificationBannerTitle(
  questions: ClarificationQuestion[],
  reasoningGuidanceHint?: string
): string {
  if (reasoningGuidanceHint?.trim()) return reasoningGuidanceHint.trim();
  const hasConstraintTone = questions.some((q) => {
    const s = surfaceClarificationQuestion(q.question);
    return (
      s.badge?.includes('意图编译') ||
      s.badge?.includes('约束') ||
      s.body.includes('物理下界') ||
      s.body.includes('校验不通过')
    );
  });
  return hasConstraintTone ? '部分约束与当前方案冲突' : '需要您确认或补充信息';
}
