import type { LucideIcon } from 'lucide-react';
import { Shield, UserRound, Users } from 'lucide-react';
import type { LockedSplitRuleDisplay } from '@/lib/split-consensus-wallet-bridge';
import { PAYMENT_RULE_LABEL } from '@/hooks/useTripBudgetProfile';
import type { PaymentRuleMode } from '@/types/trip-budget';
import type { SplitConsensusData, SplitMechanismMode } from '@/types/trip-decision-profiling';

export interface SplitRuleCardModel {
  id: 'aa' | 'family' | 'hybrid';
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconSurface: string;
  active: boolean;
}

function resolveActiveMode(
  splitConsensus: SplitConsensusData | null | undefined,
  paymentRuleMode: PaymentRuleMode | null | undefined,
): 'aa' | 'family' | 'hybrid' {
  const locked = splitConsensus?.lockedMode ?? splitConsensus?.selectedMode;
  if (locked === 'split_aa') return 'aa';
  if (locked === 'rotating_treat' || locked === 'proportional') return 'family';
  if (locked === 'hybrid') return 'hybrid';

  if (paymentRuleMode === 'split_aa') return 'aa';
  if (paymentRuleMode === 'one_pays') return 'family';
  if (paymentRuleMode === 'by_category' || paymentRuleMode === 'custom') return 'hybrid';
  return 'aa';
}

function optionSubtitle(
  splitConsensus: SplitConsensusData | null | undefined,
  mode: SplitMechanismMode,
  fallback: string,
): string {
  const option = splitConsensus?.options.find((o) => o.mode === mode);
  if (option?.description?.trim()) return option.description.trim();
  return fallback;
}

export function buildSplitRuleCards(
  splitConsensus: SplitConsensusData | null | undefined,
  paymentRuleMode: PaymentRuleMode | null | undefined,
  lockedRuleDisplay: LockedSplitRuleDisplay | null,
  isZh: boolean,
): SplitRuleCardModel[] {
  const active = resolveActiveMode(splitConsensus, paymentRuleMode);

  const familySubtitle =
    lockedRuleDisplay?.detailLines.find((line) => /住宿|accommodation|lodging/i.test(line)) ??
    lockedRuleDisplay?.detailLines[0] ??
    optionSubtitle(
      splitConsensus,
      'rotating_treat',
      isZh ? '爸妈支付住宿' : 'Parents pay lodging',
    );

  const hybridSubtitle =
    lockedRuleDisplay?.detailLines.find((line) => /活动|activities|参与/i.test(line)) ??
    optionSubtitle(splitConsensus, 'hybrid', isZh ? '活动按参与分摊' : 'Activities by participation');

  const aaSubtitle = paymentRuleMode
    ? isZh
      ? PAYMENT_RULE_LABEL[paymentRuleMode].zh
      : PAYMENT_RULE_LABEL[paymentRuleMode].en
    : optionSubtitle(splitConsensus, 'split_aa', isZh ? '默认均分' : 'Default equal split');

  return [
    {
      id: 'aa',
      title: isZh ? 'AA制' : 'Split AA',
      subtitle: active === 'aa' ? aaSubtitle : isZh ? '默认均分' : 'Default equal split',
      icon: Users,
      iconSurface: 'bg-primary/10 text-primary',
      active: active === 'aa',
    },
    {
      id: 'family',
      title: isZh ? '家庭代付' : 'Family pays',
      subtitle: familySubtitle,
      icon: UserRound,
      iconSurface: 'bg-gate-confirm/15 text-gate-confirm-foreground',
      active: active === 'family',
    },
    {
      id: 'hybrid',
      title: isZh ? '混合分摊' : 'Mixed split',
      subtitle: hybridSubtitle,
      icon: Shield,
      iconSurface: 'bg-gate-allow/15 text-gate-allow-foreground',
      active: active === 'hybrid',
    },
  ];
}

export function buildSplitRuleTags(
  paymentRuleMode: PaymentRuleMode | null | undefined,
  lockedRuleDisplay: LockedSplitRuleDisplay | null,
  isZh: boolean,
): string[] {
  const tags: string[] = [];

  if (!paymentRuleMode || paymentRuleMode === 'split_aa') {
    tags.push(
      isZh ? 'AA制（交通/活动/餐饮/租车）' : 'AA (transport/activities/dining/rental)',
    );
  } else if (paymentRuleMode === 'one_pays') {
    tags.push(isZh ? '一人代付' : 'One payer');
  } else if (paymentRuleMode === 'by_category') {
    tags.push(isZh ? '按类别分工' : 'By category');
  } else {
    tags.push(isZh ? '自定义分摊' : 'Custom split');
  }

  for (const line of lockedRuleDisplay?.detailLines ?? []) {
    if (/住宿|accommodation|lodging/i.test(line)) {
      tags.push(isZh ? '父母代付（住宿）' : 'Parents pay (lodging)');
      break;
    }
  }

  return tags.slice(0, 3);
}
