import type { DecisionDnaSignalTier } from '@/types/decision-os';

export function decisionDnaSignalTierLabel(tier: DecisionDnaSignalTier): string {
  switch (tier) {
    case 'EXPLICIT':
      return '显式（始终允许）';
    case 'IMPLICIT_WITH_CONSENT':
      return '隐式（需 opt-in）';
    case 'FORBIDDEN':
      return '禁止';
  }
}

export const DECISION_DNA_SIGNAL_TIER_ENTRIES = [
  { key: 'USER_CONFIRMED_CHOICE', label: '用户主动确认的选择' },
  { key: 'ROLLBACK_AGGREGATE', label: '回滚行为聚合' },
  { key: 'INFERRED_TRAIT', label: '推断特质' },
] as const;
