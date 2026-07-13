import type { VibeLlmCardBlock } from '@/types/match-square';

/** §7.0.2 — 预算/费用语义走 Hard Gates；保留 🎯 队长全包指挥 等行中契约 chip */
const BUDGET_CHIP =
  /^(💰|预算范围|预算门槛|预算下限|预算上限|费用|¥|\d+[wW万]\s*\+?\s*\/\s*人)/;

export function filterExperienceChips(
  chips: VibeLlmCardBlock['chips'] | null | undefined
): NonNullable<VibeLlmCardBlock['chips']> {
  if (!chips?.length) return [];
  return chips.filter((chip) => {
    const compact = chip.label.replace(/\s/g, '');
    if (BUDGET_CHIP.test(compact)) return false;
    if (/^人均.*[wW万]/.test(compact)) return false;
    return true;
  });
}
