/**
 * 自动获取证据 Hook
 * 
 * 自动检测并获取缺失的证据数据，用于解决"天气已显示但证据缺失"的问题
 * 
 * 使用场景：
 * - 行程加载时自动获取证据
 * - 静默模式：后台获取，不打断用户操作
 * - 智能缓存：避免重复调用
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import { useEvidenceStatus, type EvidenceStatus } from './useEvidenceStatus';
import { toast } from 'sonner';

export interface UseAutoFetchEvidenceOptions {
  /** 是否启用自动获取（默认 true） */
  enabled?: boolean;
  /** 静默模式：不显示加载状态和成功提示（默认 true） */
  silent?: boolean;
  /** 延迟执行时间（毫秒，默认 1000ms，避免阻塞页面加载） */
  delay?: number;
  /** 需要获取的证据类型（默认获取所有类型） */
  evidenceTypes?: Array<'weather' | 'opening_hours' | 'road_closure'>;
}

export interface UseAutoFetchEvidenceReturn {
  /** 是否正在获取证据 */
  fetching: boolean;
  /** 证据状态 */
  status: EvidenceStatus | null;
  /** 是否正在检查状态 */
  checking: boolean;
  /** 手动触发获取 */
  fetch: () => Promise<void>;
  /** 错误信息 */
  error: string | null;
}

/**
 * 自动获取证据 Hook
 * 
 * @param tripId 行程ID
 * @param options 配置选项
 */
export function useAutoFetchEvidence(
  tripId: string | null,
  options: UseAutoFetchEvidenceOptions = {}
): UseAutoFetchEvidenceReturn {
  const {
    enabled = true,
    silent = true,
    delay = 1000,
    evidenceTypes,
  } = options;

  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { status, checking, checkStatus } = useEvidenceStatus(tripId, {
    autoCheck: enabled,
  });

  /**
   * 检查是否应该获取证据
   */
  const shouldFetchEvidence = (currentStatus: EvidenceStatus | null): boolean => {
    if (!currentStatus) return false;
    
    // 如果已经有所有需要的证据，不需要获取
    if (currentStatus.missingCount === 0) return false;
    
    // 如果指定了证据类型，检查是否缺少这些类型
    if (evidenceTypes) {
      if (evidenceTypes.includes('weather') && !currentStatus.hasWeather) {
        return true;
      }
      if (evidenceTypes.includes('opening_hours') && !currentStatus.hasOpeningHours) {
        return true;
      }
      if (evidenceTypes.includes('road_closure') && !currentStatus.hasRoadClosure) {
        return true;
      }
      return false;
    }
    
    // 默认：如果缺少任何证据，都需要获取
    return currentStatus.missingCount > 0;
  };

  /**
   * 获取证据数据
   */
  const fetchEvidence = useCallback(async (): Promise<void> => {
    if (!tripId || fetching || hasFetchedRef.current) {
      return;
    }

    // 检查 sessionStorage，避免重复调用
    const cacheKey = `evidence-fetched-${tripId}`;
    const alreadyFetched = sessionStorage.getItem(cacheKey);
    
    if (alreadyFetched) {
      console.log('[useAutoFetchEvidence] 本次会话已获取证据，跳过');
      return;
    }

    setFetching(true);
    setError(null);

    try {
      console.log('[useAutoFetchEvidence] 开始自动获取证据数据，tripId:', tripId);
      
      const result = await planningWorkbenchApi.fetchEvidence(tripId, {
        evidenceTypes,
        forceRefresh: false, // 不强制刷新，使用缓存
      });

      console.log('[useAutoFetchEvidence] 证据数据获取完成:', {
        totalPlaces: result.totalPlaces,
        successCount: result.successCount,
        partialCount: result.partialCount,
        failedCount: result.failedCount,
      });

      // 标记为已获取
      hasFetchedRef.current = true;
      sessionStorage.setItem(cacheKey, 'true');

      // 刷新状态
      await checkStatus();

      // 非静默模式显示提示
      if (!silent) {
        if (result.successCount > 0) {
          toast.success(`已自动获取 ${result.successCount} 个地点的证据数据`, {
            duration: 2000,
          });
        }
        if (result.failedCount > 0) {
          toast.warning(`${result.failedCount} 个地点证据获取失败`, {
            duration: 3000,
          });
        }
      }
    } catch (err: any) {
      console.error('[useAutoFetchEvidence] 获取证据数据失败:', err);
      const errorMessage = err?.response?.data?.error?.message || err?.message || '获取证据数据失败';
      setError(errorMessage);
      
      // 非静默模式显示错误
      if (!silent) {
        toast.error(`自动获取证据失败: ${errorMessage}`, {
          duration: 3000,
        });
      }
      // 静默模式：记录错误但不打扰用户
    } finally {
      setFetching(false);
    }
  }, [tripId, fetching, evidenceTypes, silent, checkStatus]);

  /**
   * 手动触发获取
   */
  const manualFetch = async (): Promise<void> => {
    hasFetchedRef.current = false;
    sessionStorage.removeItem(`evidence-fetched-${tripId || ''}`);
    await fetchEvidence();
  };

  // 自动获取证据
  useEffect(() => {
    if (!enabled || !tripId || !status) {
      return;
    }

    // 清除之前的定时器
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
    }

    // 检查是否需要获取证据
    if (shouldFetchEvidence(status) && !hasFetchedRef.current) {
      // 延迟执行，避免阻塞页面加载
      fetchTimerRef.current = setTimeout(() => {
        fetchEvidence();
      }, delay);
    }

    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
        fetchTimerRef.current = null;
      }
    };
  }, [tripId, status?.missingCount, status?.hasWeather, status?.hasOpeningHours, status?.hasRoadClosure, enabled, delay, fetchEvidence]);

  // 清理：组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
    };
  }, []);

  return {
    fetching,
    status,
    checking,
    fetch: manualFetch,
    error,
  };
}
