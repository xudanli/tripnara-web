import { useState, useEffect, useCallback, useMemo } from 'react';
import { weatherApi } from '@/api/weather';
import type { CurrentWeather, GetCurrentWeatherParams } from '@/types/weather';

/**
 * 天气数据状态
 */
interface WeatherState {
  /** 天气数据 */
  data: CurrentWeather | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 获取天气数据的 Hook
 * 
 * @param params 请求参数（如果为 null，则不发起请求）
 * @param options 选项
 * @param options.enabled 是否启用自动获取（默认 true）
 * @param options.refreshInterval 自动刷新间隔（毫秒，默认 5 分钟）
 * 
 * @example
 * ```typescript
 * // 基本用法
 * const { data, loading, error, refetch } = useWeather({
 *   lat: 64.1466,
 *   lng: -21.9426,
 *   includeWindDetails: true
 * });
 * 
 * // 禁用自动获取
 * const { data, loading, error } = useWeather(
 *   { lat: 64.1466, lng: -21.9426 },
 *   { enabled: false }
 * );
 * 
 * // 自定义刷新间隔（10 分钟）
 * const { data, loading, error } = useWeather(
 *   { lat: 64.1466, lng: -21.9426 },
 *   { refreshInterval: 10 * 60 * 1000 }
 * );
 * ```
 */
export function useWeather(
  params: GetCurrentWeatherParams | null,
  options: {
    enabled?: boolean;
    refreshInterval?: number;
  } = {}
) {
  const { enabled = true, refreshInterval = 5 * 60 * 1000 } = options;

  const [state, setState] = useState<WeatherState>({
    data: null,
    loading: false,
    error: null,
  });

  // 使用 useMemo 稳定 params 的引用，避免不必要的重新计算
  const stableParams = useMemo(() => {
    if (!params) return null;
    return {
      lat: params.lat,
      lng: params.lng,
      includeWindDetails: params.includeWindDetails,
      includeAuroraInfo: params.includeAuroraInfo,
    };
  }, [params?.lat, params?.lng, params?.includeWindDetails, params?.includeAuroraInfo]);

  /**
   * 获取天气数据
   */
  const fetchWeather = useCallback(async () => {
    if (!stableParams) {
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await weatherApi.getCurrent(stableParams);
      setState({ data, loading: false, error: null });
    } catch (err: any) {
      setState({
        data: null,
        loading: false,
        error: err.message || '获取天气数据失败',
      });
    }
  }, [stableParams]);

  /**
   * 手动刷新
   */
  const refetch = useCallback(() => {
    if (stableParams) {
      fetchWeather();
    }
  }, [fetchWeather, stableParams]);

  // 初始加载和自动刷新
  useEffect(() => {
    // ⚠️ 重要：必须在 useEffect 内部检查，确保 hooks 调用顺序一致
    if (!enabled || !stableParams) {
      return;
    }

    // 立即获取一次
    fetchWeather();

    // 设置自动刷新
    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchWeather();
      }, refreshInterval);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [enabled, stableParams, fetchWeather, refreshInterval]);

  return {
    /** 天气数据 */
    data: state.data,
    /** 加载状态 */
    loading: state.loading,
    /** 错误信息 */
    error: state.error,
    /** 手动刷新 */
    refetch,
  };
}
