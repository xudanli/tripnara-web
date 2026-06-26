import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { PaymentRuleMode, TravelWallet, WalletBalances } from '@/types/trip-budget';
import type { SplitConsensusWalletFootnote } from '@/lib/split-consensus-wallet-bridge';
import type { LockedSplitRuleDisplay } from '@/lib/split-consensus-wallet-bridge';
import { BudgetLockedSplitRuleCard } from '@/components/budget/BudgetLockedSplitRuleCard';
import { BudgetSplitConsensusFootnote } from '@/components/budget/BudgetSplitConsensusFootnote';
import { PAYMENT_RULE_LABEL } from '@/hooks/useTripBudgetProfile';
import { formatCurrency } from '@/utils/format';
import { Plus, Users } from 'lucide-react';

interface BudgetWalletSectionProps {
  wallet: TravelWallet | null | undefined;
  balances: WalletBalances | null;
  currency: string;
  saving: boolean;
  onSaveRule: (mode: PaymentRuleMode, splitBase: number) => Promise<void>;
  onAddExpense: () => void;
  /** 嵌入付款卡片内：无额外 section 分隔 */
  embedded?: boolean;
  splitConsensusFootnote?: SplitConsensusWalletFootnote | null;
  splitConsensusLoading?: boolean;
  ruleLockedByConsensus?: boolean;
  lockedRuleDisplay?: LockedSplitRuleDisplay | null;
  onOpenSplitConsensus?: () => void;
}

export default function BudgetWalletSection({
  wallet,
  balances,
  currency,
  saving,
  onSaveRule,
  onAddExpense,
  embedded = false,
  splitConsensusFootnote = null,
  splitConsensusLoading = false,
  ruleLockedByConsensus = false,
  lockedRuleDisplay = null,
  onOpenSplitConsensus,
}: BudgetWalletSectionProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const members = wallet?.members ?? [];
  const rule = wallet?.paymentRule;
  const memberCount = members.length || rule?.splitBase || 0;
  const isGroup = memberCount >= 2;

  const memberName = (userId: string) =>
    members.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 6);

  return (
    <section className={cn(!embedded && 'space-y-2 border-t border-border/80 pt-3', embedded && 'space-y-3')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-none">
              {isZh ? '付款与记账' : 'Payment & expenses'}
            </p>
            {wallet?.ledgerSummary?.unsettledCount ? (
              <p className="text-[11px] text-muted-foreground mt-1">
                {isZh
                  ? `${wallet.ledgerSummary.unsettledCount} 笔待结清`
                  : `${wallet.ledgerSummary.unsettledCount} unsettled`}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">
                {isZh ? '记录实际花费与团队分摊' : 'Log spend and splits'}
              </p>
            )}
          </div>
          {wallet?.ledgerSummary?.unsettledCount ? (
            <Badge variant="secondary" className="text-[10px] font-normal shrink-0 hidden sm:inline-flex">
              {wallet.ledgerSummary.unsettledCount}
            </Badge>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs shrink-0"
          onClick={onAddExpense}
        >
          <Plus className="h-3.5 w-3.5" />
          {isZh ? '记一笔' : 'Add expense'}
        </Button>
      </div>

      {!isGroup && !rule ? (
        <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2">
          {isZh ? '单人行程可直接记账；邀请队友后可设置分摊规则' : 'Solo trips: log expenses; groups: set split rules'}
        </p>
      ) : null}

      {onOpenSplitConsensus && !lockedRuleDisplay ? (
        <BudgetSplitConsensusFootnote
          footnote={splitConsensusFootnote}
          loading={splitConsensusLoading}
          isZh={isZh}
          onOpenConsensus={onOpenSplitConsensus}
        />
      ) : null}

      {isGroup || rule ? (
        lockedRuleDisplay ? (
          <BudgetLockedSplitRuleCard display={lockedRuleDisplay} isZh={isZh} />
        ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
          <span className="text-[11px] text-muted-foreground shrink-0">
            {isZh ? '分摊方式' : 'Split'}
          </span>
          <Select
            value={rule?.mode ?? 'split_aa'}
            onValueChange={(v) =>
              onSaveRule(v as PaymentRuleMode, rule?.splitBase ?? Math.max(memberCount, 2))
            }
            disabled={saving || ruleLockedByConsensus}
          >
            <SelectTrigger className="h-8 w-[min(100%,10rem)] text-xs border-border/80 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PAYMENT_RULE_LABEL) as PaymentRuleMode[]).map((mode) => (
                <SelectItem key={mode} value={mode} className="text-xs">
                  {isZh ? PAYMENT_RULE_LABEL[mode].zh : PAYMENT_RULE_LABEL[mode].en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground tabular-nums">
            {memberCount} {isZh ? '人' : 'people'}
          </span>
          {ruleLockedByConsensus ? (
            <span className="text-[10px] text-muted-foreground">
              {isZh ? '已锁定' : 'Locked'}
            </span>
          ) : null}
        </div>
        )
      ) : null}

      {balances?.edges?.length ? (
        <ul className="space-y-1.5">
          {balances.edges.slice(0, 4).map((edge, i) => (
            <li
              key={`${edge.fromUserId}-${edge.toUserId}-${i}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-xs"
            >
              <span className="text-muted-foreground truncate">
                {memberName(edge.fromUserId)}
                <span className="mx-1 text-border">→</span>
                {memberName(edge.toUserId)}
              </span>
              <span className="font-medium tabular-nums shrink-0">
                {formatCurrency(edge.amount, edge.currency || currency)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
