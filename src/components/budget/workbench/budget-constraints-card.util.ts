import type { TripConstraint } from '@/types/trip-constraints';
import type { SpendingPersona, TripBudgetProfile } from '@/types/trip-budget';
import { SPENDING_PERSONA_LABEL } from '@/lib/trip-budget-structure';
import { formatCurrency } from '@/utils/format';

export type BudgetConstraintTone = 'hard' | 'soft';

export interface BudgetConstraintRow {
  id: string;
  tone: BudgetConstraintTone;
  label: string;
}

const PERSONA_SOFT_HINT: Partial<Record<SpendingPersona, { zh: string; en: string }>> = {
  experience: { zh: '体验优先于购物', en: 'Experience over shopping' },
  quality: { zh: '住宿品质优先于频次', en: 'Stay quality over quantity' },
  frugal: { zh: '控制非必要消费', en: 'Limit non-essential spend' },
  efficiency: { zh: '时间效率优先于绕路省钱', en: 'Time efficiency over detour savings' },
};

function constraintLabel(item: TripConstraint): string {
  if (item.displayValue?.trim()) return item.displayValue.trim();
  if (item.name?.trim()) return item.name.trim();
  return '未命名约束';
}

function isBudgetRelatedConstraint(item: TripConstraint): boolean {
  if (item.category === 'BUDGET') return true;
  const blob = `${item.name ?? ''} ${item.displayValue ?? ''}`.toLowerCase();
  return /预算|budget|住宿|accommodation|消费|购物|体验/.test(blob);
}

export function buildBudgetConstraintRows(
  constraints: TripConstraint[] | undefined,
  profile: TripBudgetProfile | null,
  opts: {
    isZh: boolean;
    perCapita: boolean;
    memberCount: number;
    displayTotal: number;
    currency: string;
    spendingPersona?: SpendingPersona | null;
  },
): BudgetConstraintRow[] {
  const rows: BudgetConstraintRow[] = [];
  const seen = new Set<string>();

  const push = (row: BudgetConstraintRow) => {
    const key = `${row.tone}:${row.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  for (const item of constraints ?? []) {
    if (item.enabled === false) continue;
    if (!isBudgetRelatedConstraint(item)) continue;
    push({
      id: item.id,
      tone: item.type === 'SOFT' ? 'soft' : 'hard',
      label: constraintLabel(item),
    });
  }

  const intentTotal = profile?.intent?.total ?? 0;
  if (intentTotal > 0) {
    const amount = opts.perCapita && opts.memberCount > 1 ? opts.displayTotal : intentTotal;
    const suffix = opts.perCapita && opts.memberCount > 1 ? (opts.isZh ? ' /人' : ' /pp') : '';
    push({
      id: 'intent-total',
      tone: 'hard',
      label: opts.isZh
        ? `总预算 ≤ ${formatCurrency(amount, opts.currency)}${suffix}`
        : `Total budget ≤ ${formatCurrency(amount, opts.currency)}${suffix}`,
    });
  }

  const persona = opts.spendingPersona;
  if (persona) {
    const hint = PERSONA_SOFT_HINT[persona];
    if (hint) {
      push({
        id: `persona-${persona}`,
        tone: 'soft',
        label: opts.isZh ? hint.zh : hint.en,
      });
    } else {
      const label = opts.isZh
        ? SPENDING_PERSONA_LABEL[persona].zh
        : SPENDING_PERSONA_LABEL[persona].en;
      push({
        id: `persona-${persona}`,
        tone: 'soft',
        label: opts.isZh ? `消费偏好：${label}` : `Spending preference: ${label}`,
      });
    }
  }

  return rows.slice(0, 6);
}
