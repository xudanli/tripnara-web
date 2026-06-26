import type { NLClarificationQuestion } from '@/types/trip';

export const CONFIRM_INFERRED_INFO_ID = 'confirm_inferred_info';

const SHORT_CONFIRM_REGEX =
  /^(确认无误|确认|没问题|对的|可以|好的[，,]?确认|信息无误|无误)$/;

/** 阶段 1：推断信息确认问题 */
export function findConfirmInferredQuestion(
  questions?: NLClarificationQuestion[],
): NLClarificationQuestion | undefined {
  if (!questions?.length) return undefined;
  return questions.find(
    (q) =>
      q.id === CONFIRM_INFERRED_INFO_ID ||
      q.metadata?.fieldName === CONFIRM_INFERRED_INFO_ID,
  );
}

export function getConfirmInferredAnswer(
  questionAnswers?: Record<string, string | string[] | number | boolean | null>,
): string | undefined {
  if (!questionAnswers) return undefined;
  const raw = questionAnswers[CONFIRM_INFERRED_INFO_ID];
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return undefined;
}

/** 是否存在未回答的 confirm_inferred_info */
export function isConfirmInferredPending(message: {
  clarificationQuestions?: NLClarificationQuestion[];
  questionAnswers?: Record<string, string | string[] | number | boolean | null>;
  showConfirmCard?: boolean;
  needsConfirmation?: boolean;
}): boolean {
  const q = findConfirmInferredQuestion(message.clarificationQuestions);
  if (q) {
    return !getConfirmInferredAnswer(message.questionAnswers);
  }
  // 仅有确认卡片、无结构化问题卡时，仍视为待确认
  if (message.showConfirmCard || message.needsConfirmation) {
    return !getConfirmInferredAnswer(message.questionAnswers);
  }
  return false;
}

/** 输入是否为简短确认语（可映射为「确认无误」） */
export function matchShortConfirmPhrase(text: string): '确认无误' | null {
  const t = text.trim();
  if (!t) return null;
  if (SHORT_CONFIRM_REGEX.test(t)) return '确认无误';
  if (t.length <= 16 && /确认无误|信息无误/.test(t)) return '确认无误';
  return null;
}

/**
 * 阶段 1 待确认时，是否应阻止仅发送长段自由文本（未点选确认选项）。
 * 允许：点选后 auto-submit、简短「确认无误」、providedAnswers 已含 confirm。
 */
export function shouldBlockFreeTextDuringConfirmPhase(
  text: string,
  pending: boolean,
  providedAnswers?: Record<string, string | string[] | number | boolean | null>,
): boolean {
  if (!pending) return false;
  if (providedAnswers && getConfirmInferredAnswer(providedAnswers)) return false;
  if (matchShortConfirmPhrase(text)) return false;
  const len = text.trim().length;
  return len > 24;
}

export const CONFIRM_PHASE_INPUT_PLACEHOLDER =
  '请点选上方确认选项，或输入「确认无误」';

export const CONFIRM_PHASE_BANNER =
  '阶段 1：请先点选上方确认选项（或通过 PUT 提交答案）。不要只输入长段描述；确认无误可输入「确认无误」或点「确认创建」。';
