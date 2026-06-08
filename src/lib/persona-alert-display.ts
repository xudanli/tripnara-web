import type { Suggestion } from '@/types/suggestion';

/** 与后端 reasonCodesDisplayZh 对齐的常见码 → 短中文 */
export const REASON_CODE_DISPLAY_ZH: Record<string, string> = {
  HALLUCINATION_DETECTION: '叙述内容事实核查',
  FEEDBACK: '决策质量回传',
  REPAIR: '自动修复步骤',
  GUARDIAN_NEPTUNE: 'Neptune 路线与空间方案',
  USER_ACTION: '系统处理记录',
};

const PIPELINE_REASON_CODES = new Set([
  'HALLUCINATION_DETECTION',
  'FEEDBACK',
  'REPAIR',
  'GUARDIAN_NEPTUNE',
  'USER_ACTION',
]);

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

export function getPersonaAlertUserBody(alert: {
  message: string;
  explanation?: string;
}): string {
  const raw = (alert.explanation?.trim() || alert.message || '').trim();
  return stripPersonaMessageTechnicalTail(raw);
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
