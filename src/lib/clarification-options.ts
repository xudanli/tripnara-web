import type { ClarificationOptionItem, ClarificationQuestion } from '@/types/clarification';

/** 统一读取选项：优先 optionItems（含 value），否则 options 字符串 */
export function resolveClarificationChoices(q: ClarificationQuestion): ClarificationOptionItem[] {
  if (q.optionItems?.length) return q.optionItems;
  if (!q.options?.length) return [];
  return q.options.map((label) => ({ value: label, label }));
}

export function labelForClarificationValue(
  q: ClarificationQuestion,
  value: string
): string {
  const hit = resolveClarificationChoices(q).find((o) => o.value === value);
  return hit?.label ?? value;
}
