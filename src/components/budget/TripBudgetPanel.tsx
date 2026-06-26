import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import BudgetWalletSection from '@/components/budget/BudgetWalletSection';
import BudgetAddExpenseDialog, {
  type BudgetAddExpenseFormValues,
} from '@/components/budget/BudgetAddExpenseDialog';
import BudgetUnpaidSection from '@/components/budget/BudgetUnpaidSection';
import BudgetUnpaidCostDialog from '@/components/budget/BudgetUnpaidCostDialog';
import BudgetStructureDialog, { structureSummaryLine } from '@/components/budget/BudgetStructureDialog';
import BudgetIntentDialog from '@/components/budget/BudgetIntentDialog';
import { cn } from '@/lib/utils';
import type {
  BudgetActualLineItem,
  BudgetAllocations,
  PaymentRuleMode,
  TripBudgetProfile,
  WalletBalances,
} from '@/types/trip-budget';
import type { ItemCostRequest, UnpaidItem } from '@/types/trip';
import {
  SPENDING_PERSONA_LABEL,
  STRUCTURE_CATEGORY_META,
} from '@/lib/trip-budget-structure';
import { formatLedgerCategoryLabel } from '@/lib/trip-budget-expense';
import { formatCurrency } from '@/utils/format';
import type { SplitConsensusData } from '@/types/trip-decision-profiling';
import {
  buildLockedSplitRuleDisplay,
  deriveSplitConsensusWalletFootnote,
  openPlanStudioDecisionProfiling,
  type SplitConsensusWalletFootnote,
} from '@/lib/split-consensus-wallet-bridge';
import { ChevronDown, Layers3, ShieldAlert, Wallet } from 'lucide-react';

interface TripBudgetPanelProps {
  profile: TripBudgetProfile | null;
  balances: WalletBalances | null;
  unpaidItems: UnpaidItem[];
  actualLineItems?: BudgetActualLineItem[];
  currentUserId?: string;
  savingIntent: boolean;
  savingStructure: boolean;
  savingWalletRule: boolean;
  addingExpense: boolean;
  updatingItemCost: boolean;
  onSaveIntent: (total: number, currency?: string) => Promise<void>;
  onSaveStructure: (allocations: BudgetAllocations) => Promise<void>;
  onApplyPersonaPreset: (percentages: BudgetAllocations) => Promise<void>;
  onEqualSplit: () => Promise<void>;
  onSaveWalletRule: (mode: PaymentRuleMode, splitBase: number) => Promise<void>;
  onAddLedgerExpense: (values: BudgetAddExpenseFormValues) => Promise<void>;
  onUpdateItemCost: (itemId: string, data: ItemCostRequest) => Promise<void>;
  splitConsensus?: SplitConsensusData | null;
  splitConsensusLoading?: boolean;
}

function budgetPanelCard(className?: string) {
  return cn('rounded-lg border border-border/80 bg-card text-card-foreground shadow-sm', className);
}

export default function TripBudgetPanel({
  profile,
  balances,
  unpaidItems,
  actualLineItems = [],
  currentUserId,
  savingIntent,
  savingStructure,
  savingWalletRule,
  addingExpense,
  updatingItemCost,
  onSaveIntent,
  onSaveStructure,
  onApplyPersonaPreset,
  onEqualSplit,
  onSaveWalletRule,
  onAddLedgerExpense,
  onUpdateItemCost,
  splitConsensus = null,
  splitConsensusLoading = false,
}: TripBudgetPanelProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const currency = profile?.intent?.currency ?? profile?.actuals?.currency ?? 'CNY';

  const [actualsOpen, setActualsOpen] = useState(false);

  useEffect(() => {
    if (actualLineItems.length > 0) {
      setActualsOpen(true);
    }
  }, [actualLineItems.length]);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [intentOpen, setIntentOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const [unpaidEditItem, setUnpaidEditItem] = useState<UnpaidItem | null>(null);

  const walletMembers = profile?.wallet?.members ?? [];
  const memberCount = walletMembers.length || profile?.wallet?.paymentRule?.splitBase || 0;
  const ruleLockedByConsensus = Boolean(splitConsensus?.lockedAt);
  const lockedRuleDisplay =
    splitConsensus?.lockedAt && splitConsensus.lockedMode
      ? buildLockedSplitRuleDisplay(
          splitConsensus,
          profile?.wallet?.paymentRule,
          walletMembers,
          isZh,
        )
      : null;
  const splitFootnote: SplitConsensusWalletFootnote | null = lockedRuleDisplay
    ? null
    : deriveSplitConsensusWalletFootnote(memberCount, splitConsensus);
  const openSplitConsensus = () => openPlanStudioDecisionProfiling(profile?.tripId ?? '');

  const intentTotal = profile?.intent?.total ?? 0;
  const usagePct = profile?.actuals?.budgetUsagePercent ?? 0;
  const persona = profile?.structure?.spendingPersona;
  const structureSummary =
    profile?.structure?.allocations && intentTotal > 0
      ? structureSummaryLine(profile.structure.allocations, intentTotal, isZh)
      : '';

  const structureMismatch = useMemo(() => {
    const vs = profile?.structureVsActual;
    if (!vs) return [];
    return STRUCTURE_CATEGORY_META.filter(
      (m) => m.key !== 'other' && (vs[m.key]?.variancePercent ?? 0) > 25,
    ).map((m) => (isZh ? m.labelZh : m.labelEn));
  }, [profile?.structureVsActual, isZh]);

  const needsConfirm =
    profile?.gateStatus?.verdict === 'NEED_CONFIRM' ||
    structureMismatch.length > 0;

  const hasActualsSummary =
    !!profile?.actuals &&
    (profile.actuals.totalEstimated > 0 || profile.actuals.totalActual > 0);
  const showActualsSection = hasActualsSummary || actualLineItems.length > 0;

  const usageTone =
    usagePct >= 90 || needsConfirm
      ? 'text-gate-confirm-foreground'
      : usagePct >= 75
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-muted-foreground';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* L1 + L2：预算意图与结构 */}
      <section className={budgetPanelCard('p-4 sm:p-5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/40">
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground tracking-wide">
                {isZh ? '总预算' : 'Total budget'}
              </p>
              {intentTotal > 0 ? (
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatCurrency(intentTotal, currency)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isZh ? '尚未设置总预算' : 'No total budget set'}
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 text-xs"
            onClick={() => setIntentOpen(true)}
          >
            {intentTotal ? (isZh ? '调整预算' : 'Edit budget') : isZh ? '设置预算' : 'Set budget'}
          </Button>
        </div>

        {intentTotal > 0 && profile?.actuals ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{isZh ? '行程预估占用' : 'Itinerary estimate'}</span>
              <span className={cn('font-medium tabular-nums', usageTone)}>
                {formatCurrency(profile.actuals.totalEstimated, currency)}
                <span className="text-muted-foreground font-normal ml-1.5">
                  · {Math.round(usagePct)}%
                </span>
              </span>
            </div>
            <Progress
              value={Math.min(usagePct, 100)}
              className="h-2 bg-muted"
            />
          </div>
        ) : null}

        {intentTotal > 0 ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/25 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Layers3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {isZh ? '消费结构' : 'Spending structure'}
                </p>
                <div className="flex items-center gap-2 mt-0.5 min-w-0">
                  {persona ? (
                    <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                      {isZh ? SPENDING_PERSONA_LABEL[persona].zh : SPENDING_PERSONA_LABEL[persona].en}
                    </Badge>
                  ) : null}
                  <p className="text-xs text-foreground truncate">
                    {structureSummary ||
                      (isZh ? '未设置消费偏好' : 'No spending preference yet')}
                  </p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground shrink-0"
              onClick={() => setStructureOpen(true)}
            >
              {profile?.structure ? (isZh ? '调整' : 'Edit') : isZh ? '设置' : 'Set'}
            </Button>
          </div>
        ) : null}
      </section>

      {needsConfirm ? (
        <div
          className="flex gap-3 rounded-lg border border-gate-confirm-border bg-gate-confirm px-4 py-3"
        >
          <ShieldAlert className="h-4 w-4 shrink-0 text-gate-confirm-foreground mt-0.5" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium text-gate-confirm-foreground">
              {isZh ? '需确认 · 预算与行程存在偏差' : 'Confirm · budget vs itinerary mismatch'}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile?.gateStatus?.message ??
                (structureMismatch.length
                  ? isZh
                    ? `${structureMismatch.join('、')} 超出意愿分配`
                    : `${structureMismatch.join(', ')} over allocation`
                  : isZh
                    ? '请核对结构后再继续规划'
                    : 'Review structure before planning')}
            </p>
          </div>
          {intentTotal > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0 border-gate-confirm-border"
              onClick={() => setStructureOpen(true)}
            >
              {isZh ? '核对结构' : 'Review'}
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* L3 付款与记账 */}
      <section className={budgetPanelCard('p-4 sm:p-5')}>
        <BudgetWalletSection
          embedded
          wallet={profile?.wallet}
          balances={balances}
          currency={currency}
          saving={savingWalletRule}
          onSaveRule={onSaveWalletRule}
          onAddExpense={() => setAddExpenseOpen(true)}
          splitConsensusFootnote={memberCount >= 2 ? splitFootnote : null}
          splitConsensusLoading={splitConsensusLoading}
          ruleLockedByConsensus={ruleLockedByConsensus}
          lockedRuleDisplay={memberCount >= 2 ? lockedRuleDisplay : null}
          onOpenSplitConsensus={memberCount >= 2 ? openSplitConsensus : undefined}
        />

        <BudgetUnpaidSection
          embedded
          items={unpaidItems}
          currency={currency}
          onEdit={(item) => setUnpaidEditItem(item)}
        />

        {showActualsSection ? (
          <Collapsible open={actualsOpen} onOpenChange={setActualsOpen} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-between px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <span>{isZh ? '实际发生' : 'Recorded actuals'}</span>
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', actualsOpen && 'rotate-180')}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-md border border-border/60 bg-muted/20 px-3 py-3 space-y-2">
                {hasActualsSummary ? (
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-md border border-border/50 bg-background px-2.5 py-2">
                      <p className="text-[10px] text-muted-foreground">{isZh ? '预估' : 'Estimated'}</p>
                      <p className="font-medium tabular-nums mt-0.5">
                        {formatCurrency(profile!.actuals!.totalEstimated, currency)}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/50 bg-background px-2.5 py-2">
                      <p className="text-[10px] text-muted-foreground">{isZh ? '实际' : 'Actual'}</p>
                      <p className="font-medium tabular-nums mt-0.5">
                        {formatCurrency(profile!.actuals!.totalActual, currency)}
                      </p>
                    </div>
                    {profile!.actuals!.unpaidCount > 0 ? (
                      <div className="rounded-md border border-border/50 bg-background px-2.5 py-2">
                        <p className="text-[10px] text-muted-foreground">{isZh ? '未支付' : 'Unpaid'}</p>
                        <p className="font-medium tabular-nums mt-0.5">{profile!.actuals!.unpaidCount}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {actualLineItems.length > 0 ? (
                  <ul
                    className={cn(
                      'space-y-1.5',
                      hasActualsSummary && 'border-t border-border/50 pt-2',
                    )}
                  >
                    {actualLineItems.map((item) => {
                      const amount = item.actual ?? item.estimated ?? 0;
                      const catLabel =
                        item.category &&
                        formatLedgerCategoryLabel(
                          item.category as keyof BudgetAllocations,
                          isZh,
                        );
                      const meta = [catLabel, item.date?.slice(5)].filter(Boolean).join(' · ');
                      return (
                        <li
                          key={`${item.source}-${item.id}`}
                          className="flex items-start justify-between gap-3 rounded-md border border-border/50 bg-background px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-snug truncate">{item.name}</p>
                            {meta ? (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{meta}</p>
                            ) : null}
                          </div>
                          <div className="text-right shrink-0 tabular-nums">
                            <p className="font-medium">
                              {formatCurrency(amount, item.currency || currency)}
                            </p>
                            {item.actual != null &&
                            item.estimated != null &&
                            item.actual !== item.estimated ? (
                              <p className="text-[10px] text-muted-foreground">
                                {isZh ? '估' : 'est.'}{' '}
                                {formatCurrency(item.estimated, item.currency || currency)}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </section>

      {profile?.valueSummary && profile.valueSummary.overallValueScore > 0 ? (
        <section className={budgetPanelCard('px-4 py-3 sm:px-5')}>
          <p className="text-xs font-medium text-muted-foreground">{isZh ? '价值感' : 'Value score'}</p>
          <p className="text-sm font-medium tabular-nums mt-1">
            {(profile.valueSummary.overallValueScore * 100).toFixed(0)}
            <span className="text-muted-foreground font-normal text-xs ml-1">
              {isZh ? '综合分' : 'overall'}
            </span>
          </p>
        </section>
      ) : null}

      <BudgetIntentDialog
        open={intentOpen}
        onOpenChange={setIntentOpen}
        currency={currency}
        currentTotal={intentTotal || undefined}
        saving={savingIntent}
        onSave={onSaveIntent}
      />

      <BudgetStructureDialog
        open={structureOpen}
        onOpenChange={setStructureOpen}
        intentTotal={intentTotal}
        currency={currency}
        structure={profile?.structure ?? null}
        structureVsActual={profile?.structureVsActual}
        saving={savingStructure}
        onSave={onSaveStructure}
        onApplyPersonaPreset={onApplyPersonaPreset}
        onEqualSplit={onEqualSplit}
      />

      <BudgetAddExpenseDialog
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        currency={currency}
        members={walletMembers}
        currentUserId={currentUserId}
        saving={addingExpense}
        onSubmit={async (values) => {
          await onAddLedgerExpense(values);
        }}
      />

      <BudgetUnpaidCostDialog
        item={unpaidEditItem}
        open={!!unpaidEditItem}
        onOpenChange={(open) => {
          if (!open) setUnpaidEditItem(null);
        }}
        currency={currency}
        members={walletMembers}
        currentUserId={currentUserId}
        saving={updatingItemCost}
        onSubmit={onUpdateItemCost}
      />
    </div>
  );
}
