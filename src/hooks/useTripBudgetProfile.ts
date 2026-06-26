import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { tripBudgetApi } from '@/api/trip-budget';
import { tripsApi, itineraryItemsApi } from '@/api/trips';
import { buildActualLineItems } from '@/lib/trip-budget-actual-items';
import type { ItemCostRequest, UnpaidItem } from '@/types/trip';
import type {
  BudgetActualLineItem,
  BudgetAllocations,
  CreateLedgerEntryRequest,
  PaymentRuleMode,
  PutPaymentRuleRequest,
  TripBudgetProfile,
  WalletBalances,
} from '@/types/trip-budget';
import {
  allocationsFromPercentages,
  equalAllocations,
} from '@/lib/trip-budget-structure';

export function useTripBudgetProfile(tripId: string | null | undefined) {
  const [profile, setProfile] = useState<TripBudgetProfile | null>(null);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [unpaidItems, setUnpaidItems] = useState<UnpaidItem[]>([]);
  const [actualLineItems, setActualLineItems] = useState<BudgetActualLineItem[]>([]);
  const [loading, setLoading] = useState(!!tripId);
  const [savingIntent, setSavingIntent] = useState(false);
  const [savingStructure, setSavingStructure] = useState(false);
  const [savingWalletRule, setSavingWalletRule] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [updatingItemCost, setUpdatingItemCost] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const [data, unpaid, trip, ledger] = await Promise.all([
        tripBudgetApi.getProfile(tripId),
        itineraryItemsApi.getUnpaidItems(tripId).catch(() => [] as UnpaidItem[]),
        tripsApi.getById(tripId).catch(() => null),
        tripBudgetApi.getLedgerEntries(tripId).catch(() => ({
          items: [],
          total: 0,
          limit: 50,
          offset: 0,
        })),
      ]);
      setProfile(data);
      setUnpaidItems(unpaid);
      setActualLineItems(buildActualLineItems(trip, ledger.items));

      const memberCount = data.wallet?.members?.length ?? 0;
      if (memberCount >= 1 || data.wallet?.paymentRule) {
        try {
          const b = await tripBudgetApi.getWalletBalances(tripId);
          setBalances(b);
        } catch {
          setBalances(null);
        }
      } else {
        setBalances(null);
      }
    } catch (e) {
      console.error('[useTripBudgetProfile] load failed', e);
      toast.error('加载预算失败');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (!tripId) {
      setProfile(null);
      setBalances(null);
      setUnpaidItems([]);
      setActualLineItems([]);
      setLoading(false);
      return;
    }
    reload();
  }, [tripId, reload]);

  const saveIntent = useCallback(
    async (total: number, currency?: string) => {
      if (!tripId) return;
      try {
        setSavingIntent(true);
        await tripBudgetApi.putIntent(tripId, { total, currency });
        await reload();
        toast.success('总预算已保存');
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code;
        if (code === 'STRUCTURE_OVERFLOW') {
          toast.error('分类结构总和超过新总预算，请先调整结构');
        } else {
          toast.error((e as Error).message || '保存总预算失败');
        }
        throw e;
      } finally {
        setSavingIntent(false);
      }
    },
    [tripId, reload],
  );

  const saveStructureFromAllocations = useCallback(
    async (allocations: BudgetAllocations) => {
      if (!tripId || !profile?.intent?.total) {
        toast.error('请先设置总预算');
        return;
      }
      try {
        setSavingStructure(true);
        await tripBudgetApi.putStructure(
          tripId,
          { mode: 'absolute', allocations },
          profile.intent.total,
        );
        await reload();
        toast.success('预算结构已保存');
      } catch (e) {
        toast.error((e as Error).message || '保存预算结构失败');
        throw e;
      } finally {
        setSavingStructure(false);
      }
    },
    [tripId, profile?.intent?.total, reload],
  );

  const applyPersonaPreset = useCallback(
    async (percentages: BudgetAllocations) => {
      if (!profile?.intent?.total) {
        toast.error('请先设置总预算');
        return;
      }
      const allocations = allocationsFromPercentages(profile.intent.total, percentages);
      setProfile((prev) =>
        prev?.structure
          ? { ...prev, structure: { ...prev.structure, allocations } }
          : prev,
      );
      await saveStructureFromAllocations(allocations);
    },
    [profile?.intent?.total, saveStructureFromAllocations],
  );

  const applyEqualSplit = useCallback(async () => {
    if (!profile?.intent?.total) {
      toast.error('请先设置总预算');
      return;
    }
    await saveStructureFromAllocations(equalAllocations(profile.intent.total));
  }, [profile?.intent?.total, saveStructureFromAllocations]);

  const saveWalletRule = useCallback(
    async (body: PutPaymentRuleRequest) => {
      if (!tripId) return;
      try {
        setSavingWalletRule(true);
        await tripBudgetApi.putWalletRule(tripId, body);
        await reload();
        toast.success('付款规则已保存');
      } catch (e) {
        toast.error((e as Error).message || '保存付款规则失败');
        throw e;
      } finally {
        setSavingWalletRule(false);
      }
    },
    [tripId, reload],
  );

  const addLedgerExpense = useCallback(
    async (body: CreateLedgerEntryRequest) => {
      if (!tripId) return;
      try {
        setAddingExpense(true);
        await tripBudgetApi.postLedgerEntry(tripId, body);
        await reload();
        toast.success('已记账');
      } catch (e) {
        toast.error((e as Error).message || '记账失败');
        throw e;
      } finally {
        setAddingExpense(false);
      }
    },
    [tripId, reload],
  );

  const updateItemCost = useCallback(
    async (itemId: string, data: ItemCostRequest) => {
      if (!tripId) return;
      try {
        setUpdatingItemCost(true);
        await itineraryItemsApi.updateCost(itemId, data);
        await reload();
        toast.success('费用已更新');
      } catch (e) {
        toast.error((e as Error).message || '更新费用失败');
        throw e;
      } finally {
        setUpdatingItemCost(false);
      }
    },
    [tripId, reload],
  );

  return {
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
    reload,
    saveIntent,
    saveStructureFromAllocations,
    applyPersonaPreset,
    applyEqualSplit,
    saveWalletRule,
    addLedgerExpense,
    updateItemCost,
  };
}

export const PAYMENT_RULE_LABEL: Record<PaymentRuleMode, { zh: string; en: string }> = {
  split_aa: { zh: '均摊 AA', en: 'Split AA' },
  one_pays: { zh: '一人买单', en: 'One pays' },
  by_category: { zh: '按类分工', en: 'By category' },
  custom: { zh: '逐笔指定', en: 'Custom' },
};
