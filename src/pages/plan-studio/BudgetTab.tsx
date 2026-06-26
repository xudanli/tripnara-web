/**
 * Plan Studio 预算 Tab — 四层预算
 * @see docs/prd/travel-budget-four-layer-prd.md
 */

import { BudgetTabSkeleton } from '@/components/plan-studio/BudgetTabSkeleton';
import TripBudgetPanel from '@/components/budget/TripBudgetPanel';
import type { BudgetAddExpenseFormValues } from '@/components/budget/BudgetAddExpenseDialog';
import { toCreateLedgerRequest } from '@/components/budget/BudgetAddExpenseDialog';
import { useAuth } from '@/hooks/useAuth';
import { useSplitConsensus } from '@/hooks/useDecisionProfiling';
import { useTripBudgetProfile } from '@/hooks/useTripBudgetProfile';
import type { PaymentRuleMode } from '@/types/trip-budget';

interface BudgetTabProps {
  tripId: string;
}

export default function BudgetTab({ tripId }: BudgetTabProps) {
  const { user } = useAuth();
  const {
    profile,
    balances,
    unpaidItems,
    actualLineItems,
    loading,
    savingIntent,
    savingStructure,
    savingWalletRule,
    addingExpense,
    updatingItemCost,
    saveIntent,
    saveStructureFromAllocations,
    applyPersonaPreset,
    applyEqualSplit,
    saveWalletRule,
    addLedgerExpense,
    updateItemCost,
  } = useTripBudgetProfile(tripId);

  const walletMemberCount =
    profile?.wallet?.members?.length ?? profile?.wallet?.paymentRule?.splitBase ?? 0;
  const splitConsensusEnabled = walletMemberCount >= 2;
  const { data: splitConsensus, loading: splitConsensusLoading } = useSplitConsensus(tripId, {
    enabled: splitConsensusEnabled,
  });

  const handleSaveWalletRule = async (mode: PaymentRuleMode, splitBase: number) => {
    await saveWalletRule({ mode, splitBase });
  };

  const handleAddLedgerExpense = async (values: BudgetAddExpenseFormValues) => {
    await addLedgerExpense(toCreateLedgerRequest(values));
  };

  if (loading) {
    return <BudgetTabSkeleton />;
  }

  return (
    <TripBudgetPanel
      profile={profile}
      balances={balances}
      unpaidItems={unpaidItems}
      actualLineItems={actualLineItems}
      currentUserId={user?.id}
      savingIntent={savingIntent}
      savingStructure={savingStructure}
      savingWalletRule={savingWalletRule}
      addingExpense={addingExpense}
      updatingItemCost={updatingItemCost}
      onSaveIntent={saveIntent}
      onSaveStructure={saveStructureFromAllocations}
      onApplyPersonaPreset={applyPersonaPreset}
      onEqualSplit={applyEqualSplit}
      onSaveWalletRule={handleSaveWalletRule}
      onAddLedgerExpense={handleAddLedgerExpense}
      onUpdateItemCost={updateItemCost}
      splitConsensus={splitConsensusEnabled ? splitConsensus : null}
      splitConsensusLoading={splitConsensusEnabled && splitConsensusLoading}
    />
  );
}
