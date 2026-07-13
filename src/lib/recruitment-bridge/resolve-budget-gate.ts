import type { BudgetRange, RecruitmentPostCard } from '@/types/match-square';
import type { VibeHardGates } from '@/types/vibe-llm';
import { formatBudgetFromCents } from './mock-data';

export const BUDGET_SUMMARY_PREFIX = '预算范围：';

/** hardGatesSummary 中「预算范围：…」行的展示文案（不含前缀） */
export function findBudgetSummaryContent(
  hardGatesSummary?: string[] | null,
  budgetRange?: BudgetRange | null
): string | null {
  const prefixed = hardGatesSummary?.find((line) => line.startsWith(BUDGET_SUMMARY_PREFIX));
  if (prefixed) return prefixed.slice(BUDGET_SUMMARY_PREFIX.length).trim() || null;
  return formatBudgetFromCents(budgetRange ?? null);
}

/** 列表 / 详情 Hard Gate · 预算展示（优先 hardGatesSummary，否则 budgetRange） */
export function resolveBudgetGateLabel(
  post: Pick<RecruitmentPostCard, 'budgetRange' | 'vibeLlm'>
): string | null {
  return findBudgetSummaryContent(post.vibeLlm?.hardGatesSummary, post.budgetRange);
}

/** §7.0.2 列表 Card — 💰 预算 · 🛡️ 组队风格 */
export function buildListCardHardGatesLine(
  post: Pick<RecruitmentPostCard, 'budgetRange' | 'vibeLlm' | 'teamworkStyleCapsule'>
): string | null {
  const parts: string[] = [];
  const budget = resolveBudgetGateLabel(post);
  if (budget) parts.push(`💰 ${budget}`);
  if (post.teamworkStyleCapsule?.trim()) parts.push(post.teamworkStyleCapsule.trim());
  return parts.length ? parts.join(' · ') : null;
}

function formatNumericBudgetGateLine(
  min?: number,
  max?: number
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${BUDGET_SUMMARY_PREFIX}¥${min}–${max} / 人`;
  if (min != null) return `${BUDGET_SUMMARY_PREFIX}¥${min}+ / 人`;
  return `${BUDGET_SUMMARY_PREFIX}≤ ¥${max} / 人`;
}

/** 发布页 parse · payload.hard_gates.budget_range（字符串或 { min, max }） */
export function resolveParseBudgetGateLine(
  gates: VibeHardGates | undefined,
  formBudget?: { min?: number; max?: number }
): string | null {
  if (!gates) return null;

  const raw = gates.budget_range;
  if (typeof raw === 'string' && raw.trim()) {
    const trimmed = raw.trim();
    return trimmed.startsWith(BUDGET_SUMMARY_PREFIX) ? trimmed : `${BUDGET_SUMMARY_PREFIX}${trimmed}`;
  }

  if (raw && typeof raw === 'object') {
    const min = raw.min ?? formBudget?.min;
    const max = raw.max ?? formBudget?.max;
    return formatNumericBudgetGateLine(min, max);
  }

  return formatNumericBudgetGateLine(formBudget?.min, formBudget?.max);
}

/** 从 budget_range 字符串推断 suggestedFields（API 未返回 cents 时兜底） */
export function inferBudgetCentsFromBudgetRangeString(
  budgetRange: string | undefined
): Pick<{ budgetMinCents?: number; budgetMaxCents?: number }, 'budgetMinCents' | 'budgetMaxCents'> {
  if (!budgetRange?.trim()) return {};

  const plusPerPerson = budgetRange.match(/¥?\s*(\d+)\s*\+?\s*\/\s*人/i);
  if (plusPerPerson) {
    return { budgetMinCents: Number(plusPerPerson[1]) * 100, budgetMaxCents: undefined };
  }

  const wanPlus = budgetRange.match(/(\d+)\s*[wW万]\s*\+/i);
  if (wanPlus) {
    return { budgetMinCents: Number(wanPlus[1]) * 10000 * 100, budgetMaxCents: undefined };
  }

  const range = budgetRange.match(/¥?\s*(\d+)\s*[-–~到至]\s*(\d+)/);
  if (range) {
    return {
      budgetMinCents: Number(range[1]) * 100,
      budgetMaxCents: Number(range[2]) * 100,
    };
  }

  return {};
}
