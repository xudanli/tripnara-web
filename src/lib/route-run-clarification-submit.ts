import type { ClarificationAnswer, ClarificationQuestion } from '@/types/clarification';
import { labelForClarificationValue } from '@/lib/clarification-options';

/** 选项 value 为 snake_case 时视为结构化回传，message 应留空 */
function isStructuredOptionValue(value: string): boolean {
  return /^[a-z][a-z0-9_]*$/i.test(value.trim());
}

/**
 * route_and_run 澄清提交用的 message：勿把整段 question / answer_text 回声给后端。
 * 结构化单选（如 guardian_debate accept_neptune_alternative）→ 空串，仅 clarification_answers。
 */
export function buildRouteRunMessageForClarificationSubmit(
  questions: ClarificationQuestion[],
  answers: ClarificationAnswer[]
): string {
  if (!answers.length) return '';

  const allStructuredSingleChoice = answers.every((a) => {
    const q = questions.find((x) => x.id === a.questionId);
    if (!q || q.type !== 'single_choice') return false;
    if (typeof a.value !== 'string') return false;
    return isStructuredOptionValue(a.value);
  });

  if (allStructuredSingleChoice) {
    return '';
  }

  const parts: string[] = [];
  for (const a of answers) {
    const q = questions.find((x) => x.id === a.questionId);
    if (!q || a.value == null) continue;

    if (typeof a.value === 'string' && isStructuredOptionValue(a.value)) {
      continue;
    }

    const label = labelForClarificationValue(q, String(a.value));
    if (label.trim()) parts.push(label.trim());
    else if (typeof a.value === 'string' && a.value.trim()) parts.push(a.value.trim());
  }

  if (parts.length === 0) return '';

  const joined = parts.join('；');
  return joined.length <= 120 ? joined : joined.slice(0, 120);
}

/** 气泡展示用：选项文案，不含题干 */
export function buildClarificationUserDisplayLabel(
  questions: ClarificationQuestion[],
  answers: ClarificationAnswer[]
): string {
  const labels = answers
    .map((a) => {
      const q = questions.find((x) => x.id === a.questionId);
      if (!q) return '';
      return labelForClarificationValue(q, String(a.value ?? ''));
    })
    .filter(Boolean);
  return labels.join('、') || '已确认选项';
}
