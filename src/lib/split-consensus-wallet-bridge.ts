import { PAYMENT_RULE_LABEL } from '@/hooks/useTripBudgetProfile';
import { SPLIT_MODE_LABELS } from '@/lib/decision-profiling-labels';
import type { PaymentRule, PaymentRuleMode, WalletMember } from '@/types/trip-budget';
import type {
  HybridBreakdown,
  SplitConsensusData,
  SplitMechanismMode,
} from '@/types/trip-decision-profiling';

const HYBRID_DOMAIN_LABELS: Record<string, { zh: string; en: string }> = {
  transportation: { zh: '交通', en: 'Transport' },
  accommodation: { zh: '住宿', en: 'Lodging' },
  dining: { zh: '餐饮', en: 'Dining' },
  activities: { zh: '活动', en: 'Activities' },
};

const MECHANISM_SNIPPET: Record<string, { zh: string; en: string }> = {
  split_aa: { zh: 'AA', en: 'AA' },
  rotating_treat: { zh: '轮流请客', en: 'Rotating treat' },
  proportional: { zh: '按比例', en: 'Proportional' },
  one_pays: { zh: '一人买单', en: 'One pays' },
  by_category: { zh: '按类分工', en: 'By category' },
  custom: { zh: '逐笔指定', en: 'Custom' },
};

export interface LockedSplitRuleDisplay {
  consensusLabel: string;
  consensusMode: SplitMechanismMode;
  walletModeLabel: string;
  walletMode: PaymentRuleMode;
  splitBase: number;
  detailLines: string[];
  /** 共识模式与钱包 mode 是否为简单 1:1（仅 split_aa） */
  modesDirectMatch: boolean;
}

function mechanismSnippet(value: string | undefined, isZh: boolean): string {
  if (!value) return '';
  const hit = MECHANISM_SNIPPET[value];
  return hit ? (isZh ? hit.zh : hit.en) : value;
}

function formatHybridBreakdown(breakdown: HybridBreakdown, isZh: boolean): string[] {
  return Object.entries(breakdown)
    .filter(([, v]) => v)
    .map(([domain, mechanism]) => {
      const domainLabel = HYBRID_DOMAIN_LABELS[domain];
      const label = domainLabel ? (isZh ? domainLabel.zh : domainLabel.en) : domain;
      return `${label}：${mechanismSnippet(String(mechanism), isZh)}`;
    });
}

function formatCategoryRules(
  categoryRules: Record<string, unknown> | undefined,
  members: WalletMember[],
  isZh: boolean,
): string[] {
  if (!categoryRules || typeof categoryRules !== 'object') return [];

  const nameOf = (userId: string) =>
    members.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 6);

  return Object.entries(categoryRules).map(([category, raw]) => {
    const domainLabel = HYBRID_DOMAIN_LABELS[category];
    const label = domainLabel ? (isZh ? domainLabel.zh : domainLabel.en) : category;
    if (raw && typeof raw === 'object') {
      const rec = raw as Record<string, unknown>;
      const type = typeof rec.type === 'string' ? rec.type : undefined;
      const userId = typeof rec.userId === 'string' ? rec.userId : undefined;
      if (type === 'one_pays' && userId) {
        return isZh
          ? `${label}：${nameOf(userId)} 买单`
          : `${label}: ${nameOf(userId)} pays`;
      }
      return `${label}：${mechanismSnippet(type, isZh)}`;
    }
    return `${label}：${String(raw)}`;
  });
}

export function buildLockedSplitRuleDisplay(
  split: SplitConsensusData,
  paymentRule: PaymentRule | null | undefined,
  members: WalletMember[],
  isZh: boolean,
): LockedSplitRuleDisplay | null {
  if (!split.lockedAt || !split.lockedMode) return null;

  const walletMode = paymentRule?.mode ?? 'split_aa';
  const consensusLabel = SPLIT_MODE_LABELS[split.lockedMode];
  const walletModeLabel = isZh
    ? PAYMENT_RULE_LABEL[walletMode].zh
    : PAYMENT_RULE_LABEL[walletMode].en;

  const lockedOption = split.options.find((o) => o.mode === split.lockedMode);
  const detailFromHybrid = lockedOption?.hybridBreakdown
    ? formatHybridBreakdown(lockedOption.hybridBreakdown, isZh)
    : [];
  const detailFromCategories = formatCategoryRules(
    paymentRule?.categoryRules as Record<string, unknown> | undefined,
    members,
    isZh,
  );
  const detailLines =
    detailFromHybrid.length > 0 ? detailFromHybrid : detailFromCategories;

  if (detailLines.length === 0 && lockedOption?.description) {
    detailLines.push(lockedOption.description);
  }

  return {
    consensusLabel,
    consensusMode: split.lockedMode,
    walletModeLabel,
    walletMode,
    splitBase: paymentRule?.splitBase ?? members.length,
    detailLines,
    modesDirectMatch: split.lockedMode === 'split_aa' && walletMode === 'split_aa',
  };
}

export type SplitConsensusWalletFootnoteKind =
  | 'locked_synced'
  | 'pending_confirm'
  | 'in_progress'
  | 'not_started';

export interface SplitConsensusWalletFootnote {
  kind: SplitConsensusWalletFootnoteKind;
  lockedModeLabel?: string;
  unconfirmedCount?: number;
}

export function deriveSplitConsensusWalletFootnote(
  memberCount: number,
  split: SplitConsensusData | null | undefined,
): SplitConsensusWalletFootnote | null {
  if (memberCount < 2) return null;

  if (split?.lockedAt && split.lockedMode) {
    return {
      kind: 'locked_synced',
      lockedModeLabel: SPLIT_MODE_LABELS[split.lockedMode],
    };
  }

  if (split?.selectedMode) {
    const unconfirmedCount = split.confirmations.filter((c) => !c.confirmedAt).length;
    return {
      kind: 'pending_confirm',
      lockedModeLabel: SPLIT_MODE_LABELS[split.selectedMode],
      unconfirmedCount,
    };
  }

  if (split?.recommendedMode) {
    return { kind: 'in_progress' };
  }

  return { kind: 'not_started' };
}

export function openPlanStudioDecisionProfiling(tripId: string) {
  window.dispatchEvent(
    new CustomEvent('plan-studio:open-decision-profiling', { detail: { tripId } }),
  );
}
