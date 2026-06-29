import { dispatchPlanStudioSelectScheduleDay } from '@/lib/plan-studio-schedule-navigation';
import type { PersonaAlert, PersonaAlertDeepLink } from '@/types/trip';
import type { Suggestion } from '@/types/suggestion';

/** 与后端 reasonCodesDisplayZh 对齐的常见码 → 短中文（legacy fallback） */
export const REASON_CODE_DISPLAY_ZH: Record<string, string> = {
  HALLUCINATION_DETECTION: '叙述内容事实核查',
  FEEDBACK: '决策质量回传',
  REPAIR: '自动修复步骤',
  GUARDIAN_NEPTUNE: 'Neptune 路线与空间方案',
  USER_ACTION: '系统处理记录',
  ABU_FATAL_REJECT: '安全门控拒绝',
  HIGH_WIND_DRIVING: '大风不宜自驾',
  CLOSURE_RISK: '闭园风险',
  PACE_OVERLOAD: '行程节奏过紧',
  BUFFER_INSUFFICIENT: '转场缓冲不足',
  INTENT_REPAIR: '需结构修复',
};

const PIPELINE_REASON_CODES = new Set([
  'HALLUCINATION_DETECTION',
  'FEEDBACK',
  'REPAIR',
  'GUARDIAN_NEPTUNE',
  'USER_ACTION',
]);

const INTERNAL_ALERT_PATTERNS = [
  /ResearchPatch\s+scope\s+violation/i,
  /\bscope\s+violation\b/i,
  /\bkey=cost_estimate\b/i,
  /\bpersona\s+closure\b/i,
  /\bstop=[A-Z0-9_]+\b/i,
  /\brechecks=\d+\b/i,
  /\bstack\b/i,
  /\btrace\b/i,
];

const PERSONA_MARKETING_TITLE =
  /守护者|安全守护者|节奏设计师|结构修复|Abu|Dr\.?\s*Dre|Neptune|北极熊|🐼|🐻/i;

export function reasonCodeToDisplayZh(code: string): string {
  const c = code?.trim();
  if (!c) return '';
  return REASON_CODE_DISPLAY_ZH[c] ?? c;
}

export function formatReasonCodesDisplayZh(codes: string[]): string {
  return codes.map(reasonCodeToDisplayZh).filter(Boolean).join('、');
}

/** 去掉 message 末尾「相关原因：…」等技术拼接 */
export function stripPersonaMessageTechnicalTail(text: string): string {
  if (!text?.trim()) return '';
  let s = text.trim();
  s = s.replace(/\s*相关原因\s*[:：][\s\S]*$/u, '').trim();
  s = s.replace(/\s*Related\s+reasons?\s*[:：][\s\S]*$/iu, '').trim();
  return s;
}

export function looksLikeDebugPersonaAlertText(text: string): boolean {
  if (!text?.trim()) return true;
  return INTERNAL_ALERT_PATTERNS.some((pattern) => pattern.test(text));
}

export function isPersonaMarketingTitle(title: string): boolean {
  return PERSONA_MARKETING_TITLE.test(title.trim());
}

export function getPersonaAlertUserTitle(alert: Pick<
  PersonaAlert,
  'title' | 'explanation' | 'presentation'
>): string {
  const headline = alert.presentation?.headline?.trim();
  const title = alert.title?.trim();
  const picked = headline || title;
  if (picked && !isPersonaMarketingTitle(picked)) return picked;

  const explanation = alert.explanation?.trim();
  if (explanation) {
    const firstSentence = explanation.split(/[。！？\n]/)[0]?.trim();
    if (firstSentence) return firstSentence.slice(0, 40);
  }
  return '需要查看详情';
}

export function getPersonaAlertUserBody(alert: Pick<
  PersonaAlert,
  'message' | 'explanation' | 'presentation'
>): string {
  const fromExplanation = alert.explanation?.trim();
  if (fromExplanation) {
    return stripPersonaMessageTechnicalTail(fromExplanation);
  }

  const fromPresentation =
    alert.presentation?.briefLines?.find((line) => line?.trim())?.trim() ||
    alert.presentation?.narrative?.trim();
  if (fromPresentation) {
    return stripPersonaMessageTechnicalTail(fromPresentation);
  }

  const fromMessage = alert.message?.trim();
  if (!fromMessage || looksLikeDebugPersonaAlertText(fromMessage)) return '';
  return stripPersonaMessageTechnicalTail(fromMessage);
}

export function formatPersonaAlertReasonSummary(alert: Pick<PersonaAlert, 'metadata'>): string {
  const fromBff = alert.metadata?.reasonCodesDisplayZh?.filter(Boolean);
  if (fromBff?.length) return fromBff.join('、');
  if (alert.metadata?.reasonCodes?.length) {
    return formatReasonCodesDisplayZh(alert.metadata.reasonCodes);
  }
  return '';
}

export function isUserVisiblePersonaAlert(alert: Pick<
  PersonaAlert,
  'persona' | 'severity' | 'name' | 'title' | 'message' | 'explanation' | 'presentation' | 'metadata'
>): boolean {
  if (alert.metadata?.audience === 'internal') return false;
  if (alert.persona === 'USER_ACTION') return false;
  if (alert.severity === 'success') return false;

  const body = getPersonaAlertUserBody(alert);
  if (alert.metadata?.audience === 'user') {
    return Boolean(body.trim());
  }

  const rawBody = `${alert.name || ''}\n${alert.title || ''}\n${alert.explanation || ''}\n${alert.message || ''}`;
  if (!rawBody.trim()) return false;
  if (INTERNAL_ALERT_PATTERNS.some((pattern) => pattern.test(rawBody))) return false;
  if (alert.metadata?.reasonCodes?.some((code) => PIPELINE_REASON_CODES.has(code))) return false;
  return Boolean(body.trim());
}

export function getPersonaAlertSupportingPreview(
  alert: Pick<PersonaAlert, 'presentation'>,
): string | undefined {
  const line = alert.presentation?.supportingLines?.find((item) => item.text?.trim());
  return line?.text.trim();
}

export function isPersonaAlertHardBlocked(alert: Pick<PersonaAlert, 'presentation'>): boolean {
  return alert.presentation?.hardConstraintBlocked === true;
}

export function dispatchPersonaAlertDeepLink(deepLink?: PersonaAlertDeepLink | null) {
  if (deepLink?.type === 'feasibility') {
    window.dispatchEvent(
      new CustomEvent('plan-studio:open-feasibility', {
        detail: { issueId: deepLink.issueId },
      }),
    );
    return;
  }

  if (deepLink?.type === 'decision_checker') {
    window.dispatchEvent(
      new CustomEvent('plan-studio:open-decision-checker', {
        detail: {
          issueId: deepLink.issueId,
          dayIndex: deepLink.dayIndex,
        },
      }),
    );
    return;
  }

  if (deepLink?.type === 'schedule_day' && deepLink.dayIndex != null) {
    dispatchPlanStudioSelectScheduleDay({ dayNumber: deepLink.dayIndex });
    return;
  }

  window.dispatchEvent(new CustomEvent('plan-studio:open-feasibility', { detail: {} }));
}

export function normalizeSuggestionForDisplay(suggestion: Suggestion): Suggestion {
  return {
    ...suggestion,
    summary: stripPersonaMessageTechnicalTail(suggestion.summary || ''),
    description: stripPersonaMessageTechnicalTail(suggestion.description || ''),
  };
}

export function personaSuggestionReasonCodesDebugEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem('tripnara.debug.personaReasonCodes') === '1';
  } catch {
    return false;
  }
}

export function shouldHideOptimizationSuggestionActions(reasonCodes?: string[]): boolean {
  if (!reasonCodes?.length) return false;
  return reasonCodes.some((code) => PIPELINE_REASON_CODES.has(code));
}
