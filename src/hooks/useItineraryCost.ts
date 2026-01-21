/**
 * 行程项费用管理 Hook
 * 
 * 提供行程项费用相关的功能，包括：
 * - 获取费用信息
 * - 更新费用
 * - 批量更新费用
 * - 获取费用汇总
 * - 获取未支付项
 */

import { useState, useCallback } from 'react';
import { itineraryItemsApi } from '@/api/trips';
import type {
  ItemCostRequest,
  ItemCostResponse,
  UpdateItemCostResponse,
  BatchUpdateCostRequest,
  BatchUpdateCostResponse,
  TripCostSummary,
  UnpaidItem,
} from '@/types/trip';

export interface UseItineraryCostReturn {
  // 获取费用信息
  costLoading: boolean;
  costError: string | null;
  getCost: (itemId: string) => Promise<ItemCostResponse | null>;
  
  // 更新费用
  updatingCost: boolean;
  updateCostError: string | null;
  updateCost: (itemId: string, data: ItemCostRequest) => Promise<UpdateItemCostResponse | null>;
  
  // 批量更新费用
  batchUpdatingCost: boolean;
  batchUpdateCostError: string | null;
  batchUpdateCost: (data: BatchUpdateCostRequest) => Promise<BatchUpdateCostResponse | null>;
  
  // 获取费用汇总
  summaryLoading: boolean;
  summaryError: string | null;
  getCostSummary: (tripId: string) => Promise<TripCostSummary | null>;
  
  // 获取未支付项
  unpaidLoading: boolean;
  unpaidError: string | null;
  getUnpaidItems: (tripId: string) => Promise<UnpaidItem[] | null>;
  
  // 重置错误
  resetErrors: () => void;
}

/**
 * 行程项费用管理 Hook
 */
export function useItineraryCost(): UseItineraryCostReturn {
  const [costLoading, setCostLoading] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const [updatingCost, setUpdatingCost] = useState(false);
  const [updateCostError, setUpdateCostError] = useState<string | null>(null);
  const [batchUpdatingCost, setBatchUpdatingCost] = useState(false);
  const [batchUpdateCostError, setBatchUpdateCostError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [unpaidLoading, setUnpaidLoading] = useState(false);
  const [unpaidError, setUnpaidError] = useState<string | null>(null);

  /**
   * 获取行程项费用信息
   */
  const getCost = useCallback(async (itemId: string): Promise<ItemCostResponse | null> => {
    try {
      setCostLoading(true);
      setCostError(null);
      
      const result = await itineraryItemsApi.getCost(itemId);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || '获取费用信息失败，请稍后重试';
      setCostError(errorMessage);
      console.error('[Itinerary Cost] 获取费用信息失败:', error);
      return null;
    } finally {
      setCostLoading(false);
    }
  }, []);

  /**
   * 更新行程项费用
   */
  const updateCost = useCallback(async (
    itemId: string,
    data: ItemCostRequest
  ): Promise<UpdateItemCostResponse | null> => {
    try {
      setUpdatingCost(true);
      setUpdateCostError(null);
      
      const result = await itineraryItemsApi.updateCost(itemId, data);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || '更新费用失败，请稍后重试';
      setUpdateCostError(errorMessage);
      console.error('[Itinerary Cost] 更新费用失败:', error);
      return null;
    } finally {
      setUpdatingCost(false);
    }
  }, []);

  /**
   * 批量更新费用
   */
  const batchUpdateCost = useCallback(async (
    data: BatchUpdateCostRequest
  ): Promise<BatchUpdateCostResponse | null> => {
    try {
      setBatchUpdatingCost(true);
      setBatchUpdateCostError(null);
      
      const result = await itineraryItemsApi.batchUpdateCost(data);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || '批量更新费用失败，请稍后重试';
      setBatchUpdateCostError(errorMessage);
      console.error('[Itinerary Cost] 批量更新费用失败:', error);
      return null;
    } finally {
      setBatchUpdatingCost(false);
    }
  }, []);

  /**
   * 获取行程费用汇总
   */
  const getCostSummary = useCallback(async (
    tripId: string
  ): Promise<TripCostSummary | null> => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      
      const result = await itineraryItemsApi.getCostSummary(tripId);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || '获取费用汇总失败，请稍后重试';
      setSummaryError(errorMessage);
      console.error('[Itinerary Cost] 获取费用汇总失败:', error);
      return null;
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  /**
   * 获取未支付的行程项
   */
  const getUnpaidItems = useCallback(async (
    tripId: string
  ): Promise<UnpaidItem[] | null> => {
    try {
      setUnpaidLoading(true);
      setUnpaidError(null);
      
      const result = await itineraryItemsApi.getUnpaidItems(tripId);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || '获取未支付项失败，请稍后重试';
      setUnpaidError(errorMessage);
      console.error('[Itinerary Cost] 获取未支付项失败:', error);
      return null;
    } finally {
      setUnpaidLoading(false);
    }
  }, []);

  /**
   * 重置所有错误
   */
  const resetErrors = useCallback(() => {
    setCostError(null);
    setUpdateCostError(null);
    setBatchUpdateCostError(null);
    setSummaryError(null);
    setUnpaidError(null);
  }, []);

  return {
    costLoading,
    costError,
    getCost,
    updatingCost,
    updateCostError,
    updateCost,
    batchUpdatingCost,
    batchUpdateCostError,
    batchUpdateCost,
    summaryLoading,
    summaryError,
    getCostSummary,
    unpaidLoading,
    unpaidError,
    getUnpaidItems,
    resetErrors,
  };
}

/**
 * 根据 ItemType 自动推荐 CostCategory
 */
export function getDefaultCostCategory(itemType: string): string {
  const mapping: Record<string, string> = {
    'ACTIVITY': 'ACTIVITIES',
    'REST': 'OTHER',
    'MEAL_ANCHOR': 'FOOD',
    'MEAL_FLOATING': 'FOOD',
    'TRANSIT': 'TRANSPORTATION',
  };
  
  return mapping[itemType] || 'OTHER';
}

/**
 * 格式化费用金额
 */
export function formatCost(amount: number | null | undefined, currency: string = 'CNY'): string {
  if (amount === null || amount === undefined) {
    return '-';
  }
  
  const currencySymbols: Record<string, string> = {
    'CNY': '¥',
    'USD': '$',
    'EUR': '€',
    'JPY': '¥',
    'GBP': '£',
  };
  
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * 格式化费用分类显示名称
 */
export function formatCostCategory(category: string | null | undefined): string {
  const names: Record<string, string> = {
    'ACCOMMODATION': '住宿',
    'TRANSPORTATION': '交通',
    'FOOD': '餐饮',
    'ACTIVITIES': '活动/门票',
    'SHOPPING': '购物',
    'OTHER': '其他',
  };
  
  return names[category || 'OTHER'] || '其他';
}
