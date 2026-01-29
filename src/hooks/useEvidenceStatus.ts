/**
 * 证据状态检查 Hook
 * 
 * 用于检查行程的证据获取状态，判断是否需要获取证据数据
 */

import { useState, useCallback, useEffect } from 'react';
import { readinessApi } from '@/api/readiness';

export interface EvidenceStatus {
  /** 缺失的证据数量 */
  missingCount: number;
  /** 是否已有天气证据 */
  hasWeather: boolean;
  /** 是否已有开放时间证据 */
  hasOpeningHours: boolean;
  /** 是否已有道路封闭证据 */
  hasRoadClosure: boolean;
  /** 总计证据数量 */
  totalCount: number;
  /** 已获取证据数量 */
  fetchedCount: number;
  /** 获取中证据数量 */
  fetchingCount: number;
  /** 失败证据数量 */
  failedCount: number;
}

export interface UseEvidenceStatusReturn {
  /** 证据状态 */
  status: EvidenceStatus | null;
  /** 是否正在检查 */
  checking: boolean;
  /** 检查状态 */
  checkStatus: () => Promise<void>;
  /** 错误信息 */
  error: string | null;
}

/**
 * 检查行程的证据状态
 * 
 * @param tripId 行程ID
 * @param options 配置选项
 * @param options.autoCheck 是否自动检查（默认 true）
 * @param options.refreshInterval 自动刷新间隔（毫秒，默认 0 表示不自动刷新）
 */
export function useEvidenceStatus(
  tripId: string | null,
  options: {
    autoCheck?: boolean;
    refreshInterval?: number;
  } = {}
): UseEvidenceStatusReturn {
  const { autoCheck = true, refreshInterval = 0 } = options;
  
  const [status, setStatus] = useState<EvidenceStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!tripId) {
      setStatus(null);
      return;
    }

    setChecking(true);
    setError(null);

    try {
      // 获取覆盖地图数据，包含证据状态摘要
      const coverageData = await readinessApi.getCoverageMapData(tripId);
      
      if (coverageData?.summary) {
        const summary = coverageData.summary;
        // 兼容不同的字段名称
        const evidenceStatus = coverageData.evidenceStatusSummary || {};
        
        // 检查 gaps 中是否有天气相关的缺失
        const gaps = coverageData.gaps || [];
        const hasWeatherGap = gaps.some(gap => 
          gap.missingEvidence?.includes('weather')
        );
        const hasOpeningHoursGap = gaps.some(gap => 
          gap.missingEvidence?.includes('opening_hours')
        );
        const hasRoadClosureGap = gaps.some(gap => 
          gap.missingEvidence?.includes('road_closure')
        );
        
        setStatus({
          missingCount: summary.missing || 0,
          // 如果没有对应的 gap，且已获取数量大于0，则认为已有证据
          hasWeather: !hasWeatherGap && (evidenceStatus.fetched || summary.fetched || 0) > 0,
          hasOpeningHours: !hasOpeningHoursGap,
          hasRoadClosure: !hasRoadClosureGap,
          totalCount: evidenceStatus.total || summary.total || 0,
          fetchedCount: evidenceStatus.fetched || summary.fetched || 0,
          fetchingCount: evidenceStatus.fetching || 0,
          failedCount: evidenceStatus.failed || summary.failed || 0,
        });
      } else {
        // 如果没有数据，假设需要获取证据
        setStatus({
          missingCount: 1,
          hasWeather: false,
          hasOpeningHours: false,
          hasRoadClosure: false,
          totalCount: 0,
          fetchedCount: 0,
          fetchingCount: 0,
          failedCount: 0,
        });
      }
    } catch (err: any) {
      console.error('[useEvidenceStatus] 检查证据状态失败:', err);
      setError(err.message || '检查证据状态失败');
      // 出错时假设需要获取证据
      setStatus({
        missingCount: 1,
        hasWeather: false,
        hasOpeningHours: false,
        hasRoadClosure: false,
        totalCount: 0,
        fetchedCount: 0,
        fetchingCount: 0,
        failedCount: 0,
      });
    } finally {
      setChecking(false);
    }
  }, [tripId]);

  // 自动检查
  useEffect(() => {
    if (autoCheck && tripId) {
      checkStatus();
    }
  }, [autoCheck, tripId, checkStatus]);

  // 自动刷新（如果需要）
  useEffect(() => {
    if (refreshInterval > 0 && tripId) {
      const intervalId = setInterval(() => {
        checkStatus();
      }, refreshInterval);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [refreshInterval, tripId, checkStatus]);

  return {
    status,
    checking,
    checkStatus,
    error,
  };
}
