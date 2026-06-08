import type { RouteAndRunResponse } from '@/api/agent';
import type { ClarificationQuestion } from '@/types/clarification';
import type {
  ClarificationRendererKind,
  DebateFeasibilityVerdict,
  GuardianDebateQuestionMeta,
} from '@/types/route-and-run';

function payloadOf(res: RouteAndRunResponse): Record<string, unknown> | undefined {
  const p = res.result?.payload;
  return p && typeof p === 'object' ? (p as Record<string, unknown>) : undefined;
}

/** 何时进入澄清模式（结构化 clarificationQuestions 为主数据源） */
export function isClarifyResponse(res: RouteAndRunResponse): boolean {
  const payload = res.result?.payload;
  if (!payload || typeof payload !== 'object') return false;

  const hasQuestions =
    Array.isArray(payload.clarificationQuestions) && payload.clarificationQuestions.length > 0;

  if (
    res.result?.status === 'NEED_MORE_INFO' &&
    payload.needsUserConfirmation === true &&
    hasQuestions
  ) {
    return true;
  }

  const uiStateStatus = String(res.ui_state?.ui_status ?? '').toLowerCase();
  if (uiStateStatus === 'awaiting_confirmation' && hasQuestions) return true;

  const uiHint = String(res.route?.ui_hint?.status ?? '').toUpperCase();
  if (uiHint === 'AWAITING_CONFIRMATION' && hasQuestions) return true;

  const orch = payload.orchestrationResult as Record<string, unknown> | undefined;
  const state = orch?.state as Record<string, unknown> | undefined;
  if (String(state?.verdict ?? '').toUpperCase() === 'CLARIFY' && hasQuestions) {
    return true;
  }

  return false;
}

export function resolveClarificationRenderer(q: ClarificationQuestion): ClarificationRendererKind {
  const meta = q.metadata as Record<string, unknown> | undefined;
  const p = meta?.presentation as string | undefined;
  const id = q.id;

  if (id === 'guardian_debate_abu_reject_v1' || p === 'structured_debate_v1') {
    return 'guardian_debate';
  }
  if (p === 'structured_peak_season_v1' || id === 'peak_season_midnight_sun_whale_v1') {
    return 'peak_season';
  }
  if (p === 'structured_froad_v1' || id === 'froad_2wd_compliance_v1') {
    return 'froad';
  }
  if (p?.startsWith('structured_intake') || id === 'marathon_continuous_drive_v1') {
    return 'structured_intake';
  }
  if (id === 'itinerary_slot_placement_v1') return 'generic';
  return 'generic';
}

export type GuardianDebateSections = {
  intentEcho?: string;
  feasibilitySummary?: string;
  verdict?: DebateFeasibilityVerdict;
  councilBullets: string[];
};

/** 解析三人格澄清正文：优先 metadata.user_intent_feasibility */
export function parseGuardianDebateSections(q: ClarificationQuestion): GuardianDebateSections {
  const meta = q.metadata as GuardianDebateQuestionMeta | undefined;
  const feasibility = meta?.user_intent_feasibility;

  if (feasibility && meta?.show_user_intent_feasibility === true) {
    const rest = q.question
      .replace(feasibility.echo_zh, '')
      .replace(feasibility.summary_zh, '')
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(
        (s) =>
          s &&
          !/^按您本轮诉求/.test(s) &&
          !/^针对该诉求的可行性/.test(s)
      );
    return {
      intentEcho: feasibility.echo_zh,
      feasibilitySummary: feasibility.summary_zh,
      verdict: feasibility.verdict,
      councilBullets: rest,
    };
  }

  const parts = q.question.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return {
    intentEcho: parts
      .find((p) => p.startsWith('按您本轮诉求'))
      ?.replace(/^按您本轮诉求[：:]\s*/, ''),
    feasibilitySummary: parts
      .find((p) => p.startsWith('针对该诉求的可行性'))
      ?.replace(/^针对该诉求的可行性[：:]\s*/, ''),
    verdict: undefined,
    councilBullets: parts.filter((p) => /^安全节奏|^可行替代|^租车/.test(p)),
  };
}

/** 澄清主卡：辩论题优先，否则首题 */
export function pickPrimaryClarificationQuestion(
  questions: ClarificationQuestion[]
): ClarificationQuestion | undefined {
  if (!questions.length) return undefined;
  return (
    questions.find((x) => x.id === 'guardian_debate_abu_reject_v1') ?? questions[0]
  );
}

export function clarificationTitleFromQuestion(q: ClarificationQuestion): string {
  const meta = q.metadata as GuardianDebateQuestionMeta | undefined;
  const structuredTitle = (
    meta?.structured_clarification as { title?: string } | undefined
  )?.title;
  if (structuredTitle?.trim()) return structuredTitle.trim();
  if (q.hint?.trim()) return q.hint.trim();
  return '需要您确认';
}

/** 澄清场景下勿渲染空行程时间轴 */
export function shouldHideItineraryForClarify(res: RouteAndRunResponse): boolean {
  return isClarifyResponse(res);
}

export function pickDebateGateFusionBadge(res: RouteAndRunResponse): string | undefined {
  const payload = payloadOf(res);
  const orch = payload?.orchestrationResult as Record<string, unknown> | undefined;
  const state = orch?.state as Record<string, unknown> | undefined;
  const meta = state?.metadata as Record<string, unknown> | undefined;
  const fusion = meta?.debate_gate_fusion;
  return typeof fusion === 'string' && fusion.trim() ? fusion.trim() : undefined;
}
