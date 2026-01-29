/**
 * 路线模板 API Hook
 *
 * 提供路线模板的 React Hook 封装，用于：
 * - 查询路线模板列表
 * - 获取路线模板详情
 */

import { useState, useCallback, useEffect } from 'react';
import { routeDirectionsApi } from '@/api/route-directions';
import type {
  QueryRouteTemplatesParams,
  RouteTemplate,
} from '@/types/places-routes';
import { handleApiError } from '@/utils/errorHandler';

/**
 * Hook 返回类型 - 查询模板列表
 */
export interface UseRouteTemplatesReturn {
  templates: RouteTemplate[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook 返回类型 - 获取单个模板
 */
export interface UseRouteTemplateReturn {
  template: RouteTemplate | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 查询路线模板列表 Hook
 * 
 * @param params 查询参数
 * @param options 配置选项
 * @param options.enabled 是否启用自动获取（默认 true）
 * @param options.refreshInterval 自动刷新间隔（毫秒，默认 0 表示不自动刷新）
 */
export function useRouteTemplates(
  params?: QueryRouteTemplatesParams,
  options: {
    enabled?: boolean;
    refreshInterval?: number;
  } = {}
): UseRouteTemplatesReturn {
  const { enabled = true, refreshInterval = 0 } = options;
  
  const [templates, setTemplates] = useState<RouteTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * 获取模板列表
   */
  const fetchTemplates = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await routeDirectionsApi.queryTemplates(params);
      setTemplates(data);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [params, enabled]);
  
  /**
   * 手动刷新
   */
  const refetch = useCallback(async () => {
    await fetchTemplates();
  }, [fetchTemplates]);
  
  // 初始加载和自动刷新
  useEffect(() => {
    if (!enabled) return;
    
    // 立即获取一次
    fetchTemplates();
    
    // 设置自动刷新
    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchTemplates();
      }, refreshInterval);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [enabled, refreshInterval, fetchTemplates]);
  
  return {
    templates,
    loading,
    error,
    refetch,
  };
}

/**
 * 获取单个路线模板详情 Hook
 * 
 * @param id 模板ID
 * @param options 配置选项
 * @param options.enabled 是否启用自动获取（默认 true）
 * @param options.refreshInterval 自动刷新间隔（毫秒，默认 0 表示不自动刷新）
 */
export function useRouteTemplate(
  id: number | null,
  options: {
    enabled?: boolean;
    refreshInterval?: number;
  } = {}
): UseRouteTemplateReturn {
  const { enabled = true, refreshInterval = 0 } = options;
  
  const [template, setTemplate] = useState<RouteTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * 获取模板详情
   */
  const fetchTemplate = useCallback(async () => {
    if (!enabled || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await routeDirectionsApi.getTemplateById(id);
      setTemplate(data);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [id, enabled]);
  
  /**
   * 手动刷新
   */
  const refetch = useCallback(async () => {
    await fetchTemplate();
  }, [fetchTemplate]);
  
  // 初始加载和自动刷新
  useEffect(() => {
    if (!enabled || !id) return;
    
    // 立即获取一次
    fetchTemplate();
    
    // 设置自动刷新
    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchTemplate();
      }, refreshInterval);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [enabled, refreshInterval, id, fetchTemplate]);
  
  return {
    template,
    loading,
    error,
    refetch,
  };
}
