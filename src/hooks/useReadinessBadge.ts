/**
 * useReadinessBadge - 获取准备度阻塞数量徽章
 * 
 * 用于在侧边栏导航中显示阻塞项数量
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { readinessApi } from '@/api/readiness';

interface ReadinessBadgeData {
  blockers: number;
  warnings: number;
  loading: boolean;
  error: string | null;
}

export function useReadinessBadge(): ReadinessBadgeData {
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  
  const [data, setData] = useState<ReadinessBadgeData>({
    blockers: 0,
    warnings: 0,
    loading: false,
    error: null,
  });

  const fetchReadinessData = useCallback(async () => {
    if (!tripId) {
      setData(prev => ({ ...prev, blockers: 0, warnings: 0, loading: false, error: null }));
      return;
    }

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await readinessApi.getScoreBreakdown(tripId);
      setData({
        blockers: response.summary?.blockers || 0,
        warnings: response.summary?.warnings || 0,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      // 静默处理错误，不影响 UI
      console.warn('[useReadinessBadge] Failed to fetch readiness data:', err.message);
      setData(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, [tripId]);

  useEffect(() => {
    fetchReadinessData();
  }, [fetchReadinessData]);

  return data;
}

export default useReadinessBadge;
