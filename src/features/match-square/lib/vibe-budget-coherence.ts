import type { BudgetRange, RecruitmentPostCard } from '@/types/match-square';
import { resolveBudgetGateLabel } from './resolve-budget-gate';
import { resolveVibeChipLabels } from './vibe-llm/to-card-view';

/** 人均预算下限超过此值时，不宜再称「穷游」 */
const BUDGET_NOT_BUDGET_TRAVEL_MIN_CENTS = 800_000;

/** 炊事/均摊 vibe 与高额预算冲突时，详情 Hard Gates 展示的对齐区间 */
const COOKING_TRIP_DISPLAY_BUDGET = '¥3000–6000 / 人';

function hasCookingVibe(post: Pick<RecruitmentPostCard, 'vibeLlm' | 'vibeParse'>): boolean {
  return resolveVibeChipLabels(post).some((chip) => /炊事|做饭|🍳|💰/.test(chip));
}

function isHighBudgetForCookingTrip(range: BudgetRange | null | undefined): boolean {
  const min = range?.minCents;
  return typeof min === 'number' && min >= BUDGET_NOT_BUDGET_TRAVEL_MIN_CENTS;
}

export function vibeBudgetCopyConflictsWithRange(
  post: Pick<RecruitmentPostCard, 'budgetRange' | 'vibeLlm' | 'vibeParse'>
): boolean {
  return hasCookingVibe(post) && isHighBudgetForCookingTrip(post.budgetRange);
}

/** 将「穷游」等表述与白领长途自驾预算对齐 */
export function sanitizeVibeBudgetCopy(
  text: string,
  post: Pick<RecruitmentPostCard, 'budgetRange' | 'vibeLlm' | 'vibeParse'>
): string {
  if (!text.trim()) return text;
  if (!vibeBudgetCopyConflictsWithRange(post) && !/穷游/.test(text)) return text;

  return text
    .replace(/穷游/g, '精打细算')
    .replace(/便宜穷游/g, '精打细算')
    .replace(/省钱穷游/g, '精打细算');
}

/** Hard Gates · 预算展示：炊事 vibe + 高额预算时对齐为合理自驾做饭区间 */
export function resolveDisplayBudgetLabel(
  post: Pick<RecruitmentPostCard, 'budgetRange' | 'vibeLlm' | 'vibeParse'>
): string | null {
  if (vibeBudgetCopyConflictsWithRange(post)) {
    return COOKING_TRIP_DISPLAY_BUDGET;
  }
  return resolveBudgetGateLabel(post);
}
