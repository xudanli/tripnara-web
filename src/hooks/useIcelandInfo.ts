/**
 * 冰岛信息源 API Hook
 *
 * 提供冰岛官方信息源的 React Hook 封装，用于：
 * - 获取高地天气预报（vedur.is）
 * - 获取安全信息和旅行条件（safetravel.is）
 * - 获取F路路况信息（road.is）
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { icelandInfoApi } from '@/api/iceland-info';
import type {
  GetWeatherParams,
  WeatherData,
  GetSafetyParams,
  SafetyData,
  GetRoadConditionsParams,
  RoadConditionsData,
} from '@/types/iceland-info';
import { handleApiError } from '@/utils/errorHandler';

/**
 * Hook 返回类型
 */
export interface UseIcelandInfoReturn {
  // 天气相关
  weather: {
    data: WeatherData | null;
    loading: boolean;
    error: string | null;
    fetch: (params?: GetWeatherParams) => Promise<WeatherData | null>;
    refetch: () => Promise<WeatherData | null>;
  };
  
  // 安全信息相关
  safety: {
    data: SafetyData | null;
    loading: boolean;
    error: string | null;
    fetch: (params?: GetSafetyParams) => Promise<SafetyData | null>;
    refetch: () => Promise<SafetyData | null>;
  };
  
  // F路路况相关
  roadConditions: {
    data: RoadConditionsData | null;
    loading: boolean;
    error: string | null;
    fetch: (params?: GetRoadConditionsParams) => Promise<RoadConditionsData | null>;
    refetch: () => Promise<RoadConditionsData | null>;
  };
  
  // 综合方法：一次性获取所有信息
  fetchAll: (params?: {
    weather?: GetWeatherParams;
    safety?: GetSafetyParams;
    roadConditions?: GetRoadConditionsParams;
  }) => Promise<void>;
  
  // 重置所有状态
  reset: () => void;
}

/**
 * 冰岛信息源 API Hook
 * 
 * @param options 配置选项
 * @param options.autoFetch 是否自动获取数据（默认 false）
 * @param options.refreshInterval 自动刷新间隔（毫秒，默认 0 表示不自动刷新）
 */
export function useIcelandInfo(options: {
  autoFetch?: boolean;
  refreshInterval?: number;
} = {}): UseIcelandInfoReturn {
  const { autoFetch = false, refreshInterval = 0 } = options;
  
  // 天气状态
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherParams, setWeatherParams] = useState<GetWeatherParams | undefined>();
  
  // 安全信息状态
  const [safetyData, setSafetyData] = useState<SafetyData | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [safetyParams, setSafetyParams] = useState<GetSafetyParams | undefined>();
  
  // F路路况状态
  const [roadConditionsData, setRoadConditionsData] = useState<RoadConditionsData | null>(null);
  const [roadConditionsLoading, setRoadConditionsLoading] = useState(false);
  const [roadConditionsError, setRoadConditionsError] = useState<string | null>(null);
  const [roadConditionsParams, setRoadConditionsParams] = useState<GetRoadConditionsParams | undefined>();
  
  /**
   * 获取天气数据
   */
  const fetchWeather = useCallback(async (params?: GetWeatherParams): Promise<WeatherData | null> => {
    setWeatherLoading(true);
    setWeatherError(null);
    
    try {
      const data = await icelandInfoApi.getWeather(params);
      setWeatherData(data);
      if (params) {
        setWeatherParams(params);
      }
      return data;
    } catch (err) {
      const errorMessage = handleApiError(err);
      setWeatherError(errorMessage);
      return null;
    } finally {
      setWeatherLoading(false);
    }
  }, []);
  
  /**
   * 获取安全信息
   */
  const fetchSafety = useCallback(async (params?: GetSafetyParams): Promise<SafetyData | null> => {
    setSafetyLoading(true);
    setSafetyError(null);
    
    try {
      const data = await icelandInfoApi.getSafety(params);
      setSafetyData(data);
      if (params) {
        setSafetyParams(params);
      }
      return data;
    } catch (err) {
      const errorMessage = handleApiError(err);
      setSafetyError(errorMessage);
      return null;
    } finally {
      setSafetyLoading(false);
    }
  }, []);
  
  /**
   * 获取F路路况
   */
  const fetchRoadConditions = useCallback(async (params?: GetRoadConditionsParams): Promise<RoadConditionsData | null> => {
    setRoadConditionsLoading(true);
    setRoadConditionsError(null);
    
    try {
      const data = await icelandInfoApi.getRoadConditions(params);
      setRoadConditionsData(data);
      if (params) {
        setRoadConditionsParams(params);
      }
      return data;
    } catch (err) {
      const errorMessage = handleApiError(err);
      setRoadConditionsError(errorMessage);
      return null;
    } finally {
      setRoadConditionsLoading(false);
    }
  }, []);
  
  /**
   * 一次性获取所有信息
   */
  const fetchAll = useCallback(async (params?: {
    weather?: GetWeatherParams;
    safety?: GetSafetyParams;
    roadConditions?: GetRoadConditionsParams;
  }) => {
    await Promise.all([
      params?.weather !== undefined ? fetchWeather(params.weather) : Promise.resolve(),
      params?.safety !== undefined ? fetchSafety(params.safety) : Promise.resolve(),
      params?.roadConditions !== undefined ? fetchRoadConditions(params.roadConditions) : Promise.resolve(),
    ]);
  }, [fetchWeather, fetchSafety, fetchRoadConditions]);
  
  /**
   * 重置所有状态
   */
  const reset = useCallback(() => {
    setWeatherData(null);
    setWeatherError(null);
    setSafetyData(null);
    setSafetyError(null);
    setRoadConditionsData(null);
    setRoadConditionsError(null);
    setWeatherParams(undefined);
    setSafetyParams(undefined);
    setRoadConditionsParams(undefined);
  }, []);
  
  // 自动获取（如果启用）
  useEffect(() => {
    if (!autoFetch) {
      return;
    }
    
    // 初始获取（如果有参数）
    if (weatherParams || safetyParams || roadConditionsParams) {
      fetchAll({
        weather: weatherParams,
        safety: safetyParams,
        roadConditions: roadConditionsParams,
      });
    }
    
    // 设置自动刷新
    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchAll({
          weather: weatherParams,
          safety: safetyParams,
          roadConditions: roadConditionsParams,
        });
      }, refreshInterval);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [autoFetch, refreshInterval, weatherParams, safetyParams, roadConditionsParams, fetchAll]);
  
  return {
    weather: {
      data: weatherData,
      loading: weatherLoading,
      error: weatherError,
      fetch: fetchWeather,
      refetch: () => fetchWeather(weatherParams),
    },
    safety: {
      data: safetyData,
      loading: safetyLoading,
      error: safetyError,
      fetch: fetchSafety,
      refetch: () => fetchSafety(safetyParams),
    },
    roadConditions: {
      data: roadConditionsData,
      loading: roadConditionsLoading,
      error: roadConditionsError,
      fetch: fetchRoadConditions,
      refetch: () => fetchRoadConditions(roadConditionsParams),
    },
    fetchAll,
    reset,
  };
}

/**
 * 判断行程是否在冰岛
 */
export function useIsIcelandTrip(destination?: string | null): boolean {
  return useMemo(() => {
    if (!destination) return false;
    const code = destination.split(',')[0]?.trim().toUpperCase();
    return code === 'IS' || destination.toLowerCase().includes('iceland') || destination.includes('冰岛');
  }, [destination]);
}
