import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import BudgetAddExpenseDialog, {
  type BudgetAddExpenseFormValues,
} from '@/components/budget/BudgetAddExpenseDialog';
import BudgetIntentDialog from '@/components/budget/BudgetIntentDialog';
import BudgetStructureDialog from '@/components/budget/BudgetStructureDialog';
import BudgetUnpaidCostDialog from '@/components/budget/BudgetUnpaidCostDialog';
import { PlanningBudgetConstraintsDialog } from '@/components/plan-studio/PlanningBudgetConstraintsDialog';
import {
  buildLockedSplitRuleDisplay,
  openPlanStudioDecisionProfiling,
} from '@/lib/split-consensus-wallet-bridge';
import { STRUCTURE_CATEGORY_META } from '@/lib/trip-budget-structure';
import type {
  BudgetActualLineItem,
  BudgetAllocations,
  TripBudgetProfile,
  WalletBalances,
} from '@/types/trip-budget';
import type { BudgetOptimizationSuggestion, ItemCostRequest, UnpaidItem } from '@/types/trip';
import type { SplitConsensusData } from '@/types/trip-decision-profiling';
import { BudgetPlanningLayout } from './BudgetPlanningLayout';
import { BudgetPlanningHeader } from './BudgetPlanningHeader';
import { BudgetPlanningSidebar } from './BudgetPlanningSidebar';
import { BudgetPlanningMainPanel } from './BudgetPlanningMainPanel';
import { BudgetCheckerPanel } from './BudgetCheckerPanel';
import {
  buildDailyBuckets,
  buildHotspots,
  buildLineRows,
  computeBudgetHealth,
  mapOptimizationsToSuggestions,
  resolveCheckerMembers,
  resolveMemberCount,
  scaleBudgetAmount,
  scaleBudgetBreakdown,
  type BudgetHotspot,
  type BudgetLineRow,
  type BudgetSuggestion,
  type BudgetViewMode,
} from './budget-planning.util';
import { buildAllocationSegments } from './BudgetAllocationOverview';
import { buildBudgetConstraintRows } from './budget-constraints-card.util';
import { buildSplitRuleCards, buildSplitRuleTags } from './budget-split-rules.util';
import type { TripConstraint } from '@/types/trip-constraints';
import type { BudgetComparisonRow } from '@/lib/budget-compare.util';
import type { BudgetPriceEvidence } from './budget-planning.util';

export interface BudgetPlanningWorkbenchProps {
  tripId: string;
  profile: TripBudgetProfile | null;
  balances: WalletBalances | null;
  unpaidItems: UnpaidItem[];
  actualLineItems: BudgetActualLineItem[];
  currentUserId?: string;
  tripDayCount?: number;
  tripDayDates?: string[];
  optimizations?: BudgetOptimizationSuggestion[];
  optimizationsLoading?: boolean;
  evaluationMessage?: string;
  evaluationHotspots?: BudgetHotspot[];
  evaluationSuggestions?: BudgetSuggestion[];
  evaluationEvidence?: Array<{ id: string; title: string; body: string; source?: string }>;
  priceEvidence?: BudgetPriceEvidence;
  comparisonRows?: BudgetComparisonRow[];
  comparisonLoading?: boolean;
  recommendedPlanId?: string | null;
  draftReady?: boolean;
  applyingOptimization?: boolean;
  savingIntent: boolean;
  savingStructure: boolean;
  addingExpense: boolean;
  updatingItemCost: boolean;
  onSaveIntent: (total: number, currency?: string) => Promise<void>;
  onSaveStructure: (allocations: BudgetAllocations) => Promise<void>;
  onApplyPersonaPreset: (percentages: BudgetAllocations) => Promise<void>;
  onEqualSplit: () => Promise<void>;
  onAddLedgerExpense: (values: BudgetAddExpenseFormValues) => Promise<void>;
  onUpdateItemCost: (itemId: string, data: ItemCostRequest) => Promise<void>;
  splitConsensus?: SplitConsensusData | null;
  splitConsensusLoading?: boolean;
  tripConstraints?: TripConstraint[];
  onGenerateOptimization?: () => void;
  onApplyAllOptimizations?: () => void;
  onApplyOptimization?: (optimizationId: string) => void;
  onDiscussWithNara?: () => void;
  onRefresh?: () => void;
}

export function BudgetPlanningWorkbench({
  tripId,
  profile,
  balances: _balances,
  unpaidItems,
  actualLineItems,
  currentUserId,
  tripDayCount = 0,
  tripDayDates = [],
  optimizations = [],
  optimizationsLoading = false,
  evaluationMessage,
  evaluationHotspots = [],
  evaluationSuggestions = [],
  evaluationEvidence = [],
  priceEvidence,
  comparisonRows = [],
  comparisonLoading = false,
  recommendedPlanId = null,
  draftReady = false,
  applyingOptimization = false,
  savingIntent,
  savingStructure,
  addingExpense,
  updatingItemCost,
  onSaveIntent,
  onSaveStructure,
  onApplyPersonaPreset,
  onEqualSplit,
  onAddLedgerExpense,
  onUpdateItemCost,
  splitConsensus = null,
  splitConsensusLoading = false,
  tripConstraints = [],
  onGenerateOptimization,
  onApplyAllOptimizations,
  onApplyOptimization,
  onDiscussWithNara,
  onRefresh,
}: BudgetPlanningWorkbenchProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  const [viewMode, setViewMode] = useState<BudgetViewMode>('per_capita');
  const [selectedCategory, setSelectedCategory] = useState<keyof BudgetAllocations | 'all'>('all');
  const [intentOpen, setIntentOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [constraintsDialogOpen, setConstraintsDialogOpen] = useState(false);
  const [unpaidEditItem, setUnpaidEditItem] = useState<UnpaidItem | null>(null);

  const currency = profile?.intent?.currency ?? profile?.actuals?.currency ?? 'CNY';
  const memberCount = resolveMemberCount(profile);
  const intentTotal = profile?.intent?.total ?? 0;
  const estimatedTotal = profile?.actuals?.totalEstimated ?? 0;
  const usagePercent = profile?.actuals?.budgetUsagePercent ?? (intentTotal > 0 ? (estimatedTotal / intentTotal) * 100 : 0);
  const remainingTotal = intentTotal - estimatedTotal;
  const bufferRate = intentTotal > 0 ? (remainingTotal / intentTotal) * 100 : 0;

  const displayTotal = scaleBudgetAmount(intentTotal, memberCount, viewMode);
  const displayRemaining = scaleBudgetAmount(remainingTotal, memberCount, viewMode);
  const displayEstimated = scaleBudgetAmount(estimatedTotal, memberCount, viewMode);

  const health = computeBudgetHealth(usagePercent, bufferRate);
  const healthLabel = isZh ? health.labelZh : health.labelEn;

  const walletMembers = profile?.wallet?.members ?? [];
  const checkerMembers = useMemo(
    () => resolveCheckerMembers(walletMembers, splitConsensus),
    [walletMembers, splitConsensus],
  );
  const memberNames = checkerMembers.map((m) => m.displayName);
  const hasActuals =
    (profile?.actuals?.totalActual ?? 0) > 0 || actualLineItems.some((item) => (item.actual ?? 0) > 0);
  const actualTotal = profile?.actuals?.totalActual ?? 0;
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

  const perCapita = viewMode === 'per_capita' && memberCount > 1;

  const constraintRows = useMemo(
    () =>
      buildBudgetConstraintRows(tripConstraints, profile, {
        isZh,
        perCapita,
        memberCount,
        displayTotal,
        currency,
        spendingPersona: profile?.structure?.spendingPersona ?? null,
      }),
    [
      tripConstraints,
      profile,
      isZh,
      perCapita,
      memberCount,
      displayTotal,
      currency,
    ],
  );

  const splitRuleCards = useMemo(
    () =>
      buildSplitRuleCards(
        splitConsensus,
        profile?.wallet?.paymentRule?.mode ?? null,
        lockedRuleDisplay,
        isZh,
      ),
    [splitConsensus, profile?.wallet?.paymentRule?.mode, lockedRuleDisplay, isZh],
  );

  const splitRuleTags = useMemo(
    () =>
      buildSplitRuleTags(
        profile?.wallet?.paymentRule?.mode ?? null,
        lockedRuleDisplay,
        isZh,
      ),
    [profile?.wallet?.paymentRule?.mode, lockedRuleDisplay, isZh],
  );

  const structureMismatch = useMemo(() => {
    const vs = profile?.structureVsActual;
    if (!vs) return [];
    return STRUCTURE_CATEGORY_META.filter(
      (m) => m.key !== 'other' && (vs[m.key]?.variancePercent ?? 0) > 25,
    ).map((m) => (isZh ? m.labelZh : m.labelEn));
  }, [profile?.structureVsActual, isZh]);

  const alertMessage = useMemo(() => {
    if (evaluationMessage) return evaluationMessage;
    if (profile?.gateStatus?.message) return profile.gateStatus.message;
    if (structureMismatch.length > 0) {
      return isZh
        ? `当前预算整体可控，但 ${structureMismatch.join('、')} 超出意愿分配。`
        : `Budget is mostly on track, but ${structureMismatch.join(', ')} exceed allocation.`;
    }
    const overDays = buildDailyBuckets(
      actualLineItems,
      intentTotal,
      tripDayCount,
      profile?.intent?.dailyBudget,
      tripDayDates,
      isZh,
    ).filter((b) => b.overBudget);
    if (overDays.length > 0) {
      return isZh
        ? `当前预算整体可控，但 ${overDays.map((d) => d.label).join('、')} 存在超支压力。`
        : `Budget is mostly on track, but ${overDays.map((d) => d.label).join(', ')} show overspend pressure.`;
    }
    return null;
  }, [
    actualLineItems,
    intentTotal,
    isZh,
    profile?.gateStatus?.message,
    evaluationMessage,
    profile?.intent?.dailyBudget,
    structureMismatch,
    tripDayCount,
    tripDayDates,
  ]);

  const { allocationSegments, allocationSource } = useMemo(() => {
    const breakdown = profile?.actuals?.categoryBreakdown;
    const scaled = breakdown
      ? scaleBudgetBreakdown(breakdown, memberCount, viewMode)
      : undefined;
    const scaledStructure = profile?.structure?.allocations
      ? scaleBudgetBreakdown(profile.structure.allocations, memberCount, viewMode)
      : undefined;
    const scaledIntent = scaleBudgetAmount(intentTotal, memberCount, viewMode);
    const scaledEstimated = scaleBudgetAmount(estimatedTotal, memberCount, viewMode);
    const result = buildAllocationSegments(
      scaled,
      scaledIntent,
      scaledEstimated,
      isZh,
      scaledStructure,
    );
    return {
      allocationSegments: result.segments,
      allocationSource: result.source,
    };
  }, [
    profile?.actuals?.categoryBreakdown,
    profile?.structure?.allocations,
    memberCount,
    viewMode,
    intentTotal,
    estimatedTotal,
    isZh,
  ]);

  const dailyBuckets = useMemo(
    () =>
      buildDailyBuckets(
        actualLineItems,
        intentTotal,
        tripDayCount,
        profile?.intent?.dailyBudget,
        tripDayDates,
        isZh,
      ).map((bucket) => ({
        ...bucket,
        amount: scaleBudgetAmount(bucket.amount, memberCount, viewMode),
        dailyBudget:
          bucket.dailyBudget != null
            ? scaleBudgetAmount(bucket.dailyBudget, memberCount, viewMode)
            : undefined,
      })),
    [actualLineItems, intentTotal, isZh, memberCount, profile?.intent?.dailyBudget, tripDayCount, tripDayDates, viewMode],
  );

  const lineRows = useMemo(() => {
    const rows = buildLineRows(actualLineItems, unpaidItems, memberCount);
    const filtered =
      selectedCategory === 'all'
        ? rows
        : rows.filter((row) => row.category === selectedCategory);
    return filtered.map((row) => ({
      ...row,
      plannedAmount: scaleBudgetAmount(row.plannedAmount, memberCount, viewMode),
    }));
  }, [actualLineItems, memberCount, selectedCategory, unpaidItems, viewMode]);

  const hotspots = useMemo(() => {
    const base = buildHotspots(profile, dailyBuckets, actualLineItems, isZh);
    if (evaluationHotspots.length === 0) return base;
    const seen = new Set(base.map((item) => item.id));
    return [...evaluationHotspots, ...base.filter((item) => !seen.has(item.id))];
  }, [actualLineItems, dailyBuckets, evaluationHotspots, isZh, profile]);

  const suggestions = useMemo(() => {
    const base = mapOptimizationsToSuggestions(optimizations);
    if (evaluationSuggestions.length === 0) return base;
    const seen = new Set(base.map((item) => item.id));
    return [...evaluationSuggestions, ...base.filter((item) => !seen.has(item.id))];
  }, [evaluationSuggestions, optimizations]);

  const riskLevel: 'low' | 'medium' | 'high' =
    usagePercent >= 95 || bufferRate < 0
      ? 'high'
      : usagePercent >= 80 || hotspots.some((h) => h.risk === 'high')
        ? 'medium'
        : 'low';

  const handleEditRow = (row: BudgetLineRow) => {
    if (row.source === 'unpaid') {
      const item = unpaidItems.find((u) => u.id === row.id);
      if (item) setUnpaidEditItem(item);
      return;
    }
    toast.message(isZh ? '请在时间轴编辑行程项费用' : 'Edit itinerary item costs on the schedule tab.');
  };

  const openWallet = () => {
    if (memberCount >= 2 && !ruleLockedByConsensus) {
      openPlanStudioDecisionProfiling(tripId);
      return;
    }
    setAddExpenseOpen(true);
  };

  return (
    <>
      <BudgetPlanningLayout
        header={
          <BudgetPlanningHeader
            isZh={isZh}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            currency={currency}
            alertMessage={alertMessage}
            onViewOptimization={onGenerateOptimization}
          />
        }
        sidebar={
          <BudgetPlanningSidebar
            isZh={isZh}
            memberCount={memberCount}
            memberNames={memberNames}
            viewMode={viewMode}
            displayTotal={displayTotal}
            displayRemaining={displayRemaining}
            usagePercent={usagePercent}
            bufferRate={bufferRate}
            healthLevel={health.level}
            healthLabel={healthLabel}
            currency={currency}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            paymentRuleMode={profile?.wallet?.paymentRule?.mode}
            spendingPersona={profile?.structure?.spendingPersona ?? null}
            hasActuals={hasActuals}
            actualTotal={actualTotal}
            onOpenIntent={() => setIntentOpen(true)}
            onOpenStructure={() => setStructureOpen(true)}
            onOpenWallet={openWallet}
            onOpenActuals={() => setAddExpenseOpen(true)}
            constraintRows={constraintRows}
            splitRuleCards={splitRuleCards}
            onEditConstraints={() => setConstraintsDialogOpen(true)}
            onViewSplitDetails={
              memberCount >= 2 ? () => openPlanStudioDecisionProfiling(tripId) : undefined
            }
          />
        }
        main={
          <BudgetPlanningMainPanel
            isZh={isZh}
            currency={currency}
            viewMode={viewMode}
            memberCount={memberCount}
            displayTotal={displayTotal}
            displayRemaining={displayRemaining}
            bufferRate={bufferRate}
            estimatedTotal={displayEstimated}
            usagePercent={usagePercent}
            riskLevel={riskLevel}
            allocationSegments={allocationSegments}
            allocationSource={allocationSource}
            dailyBuckets={dailyBuckets}
            lineRows={lineRows}
            comparisonRows={comparisonRows}
            comparisonLoading={comparisonLoading}
            recommendedPlanId={recommendedPlanId}
            onEditRow={handleEditRow}
          />
        }
        checker={
          <BudgetCheckerPanel
            isZh={isZh}
            currency={currency}
            hotspots={hotspots}
            suggestions={suggestions}
            members={checkerMembers}
            perCapitaShare={memberCount > 0 ? (displayEstimated > 0 ? displayEstimated : displayTotal) : 0}
            splitRuleTags={splitRuleTags}
            budgetEvidence={evaluationEvidence}
            priceEvidence={priceEvidence}
            loadingOptimizations={optimizationsLoading || splitConsensusLoading}
            applyingOptimization={applyingOptimization}
            draftReady={draftReady}
            onRefresh={onRefresh}
            onGenerateDraft={onGenerateOptimization}
            onApplyAllOptimizations={onApplyAllOptimizations}
            onApplyOptimization={onApplyOptimization}
            onDiscussWithNara={onDiscussWithNara}
            onViewSplitDetails={
              memberCount >= 2 ? () => openPlanStudioDecisionProfiling(tripId) : undefined
            }
          />
        }
      />

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
        onSubmit={onAddLedgerExpense}
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

      <PlanningBudgetConstraintsDialog
        tripId={tripId}
        open={constraintsDialogOpen}
        onOpenChange={setConstraintsDialogOpen}
      />
    </>
  );
}
