/**
 * Context API Hook
 *
 * 提供 Context API 的 React Hook 封装，用于：
 * - 构建 Context Package
 * - 压缩 Context Package
 * - 投影状态
 * - 写入回写
 * - 获取指标
 */

import { useState, useCallback } from 'react';
import {
  contextApi,
  buildContextWithAutoCompress,
  blocksToPromptText,
  calculateTotalTokens,
  filterBlocksByPriority,
  filterBlocksByType,
  type BuildContextRequest,
  type CompressContextRequest,
  type ProjectStateRequest,
  type WriteBackRequest,
  type GetMetricsParams,
  type ContextPackage,
  type ContextBlock,
  type CompressContextResponse,
  type ProjectStateResponse,
  type WriteBackResponse,
  type GetMetricsResponse,
  type CompressionStrategy,
  type ContextBlockType,
} from '@/api/context';
import { handleApiError } from '@/utils/errorHandler';

/**
 * Hook 返回类型
 */
export interface UseContextApiReturn {
  // 状态
  contextPackage: ContextPackage | null;
  loading: boolean;
  error: string | null;

  // 构建上下文
  buildContext: (request: BuildContextRequest) => Promise<ContextPackage | null>;
  buildContextWithCompress: (
    request: BuildContextRequest,
    compressionOptions?: {
      strategy?: CompressionStrategy;
      preserveKeys?: string[];
    }
  ) => Promise<ContextPackage | null>;

  // 压缩上下文
  compressContext: (
    request: CompressContextRequest
  ) => Promise<CompressContextResponse | null>;

  // 投影状态
  projectState: (
    request: ProjectStateRequest
  ) => Promise<ProjectStateResponse | null>;

  // 写回
  writeBack: (request: WriteBackRequest) => Promise<WriteBackResponse | null>;

  // 获取指标
  getMetrics: (params?: GetMetricsParams) => Promise<GetMetricsResponse | null>;

  // 工具方法
  toPromptText: (blocks?: ContextBlock[]) => string;
  getTotalTokens: (blocks?: ContextBlock[]) => number;
  filterByPriority: (minPriority: number, blocks?: ContextBlock[]) => ContextBlock[];
  filterByType: (types: ContextBlockType[], blocks?: ContextBlock[]) => ContextBlock[];

  // 重置
  reset: () => void;
}

/**
 * Context API Hook
 */
export function useContextApi(): UseContextApiReturn {
  // 状态
  const [contextPackage, setContextPackage] = useState<ContextPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 构建上下文
   */
  const buildContext = useCallback(
    async (request: BuildContextRequest): Promise<ContextPackage | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await contextApi.build(request);
        setContextPackage(response.contextPackage);
        return response.contextPackage;
      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 构建上下文（自动压缩）
   */
  const buildContextWithCompress = useCallback(
    async (
      request: BuildContextRequest,
      compressionOptions?: {
        strategy?: CompressionStrategy;
        preserveKeys?: string[];
      }
    ): Promise<ContextPackage | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await buildContextWithAutoCompress(request, compressionOptions);
        setContextPackage(result);
        return result;
      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 压缩上下文
   */
  const compressContext = useCallback(
    async (
      request: CompressContextRequest
    ): Promise<CompressContextResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await contextApi.compress(request);

        // 如果有当前 contextPackage，更新它
        if (contextPackage) {
          setContextPackage({
            ...contextPackage,
            blocks: response.compressedBlocks,
            totalTokens: response.stats.compressedTokens,
            compressed: true,
          });
        }

        return response;
      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [contextPackage]
  );

  /**
   * 投影状态
   */
  const projectState = useCallback(
    async (
      request: ProjectStateRequest
    ): Promise<ProjectStateResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await contextApi.projectState(request);
        return response;
      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 写回
   */
  const writeBack = useCallback(
    async (request: WriteBackRequest): Promise<WriteBackResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await contextApi.writeBack(request);
        return response;
      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 获取指标
   */
  const getMetrics = useCallback(
    async (params?: GetMetricsParams): Promise<GetMetricsResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await contextApi.getMetrics(params);
        return response;
      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 转换为 prompt 文本
   */
  const toPromptText = useCallback(
    (blocks?: ContextBlock[]): string => {
      const targetBlocks = blocks || contextPackage?.blocks || [];
      return blocksToPromptText(targetBlocks);
    },
    [contextPackage]
  );

  /**
   * 获取总 Token 数
   */
  const getTotalTokens = useCallback(
    (blocks?: ContextBlock[]): number => {
      const targetBlocks = blocks || contextPackage?.blocks || [];
      return calculateTotalTokens(targetBlocks);
    },
    [contextPackage]
  );

  /**
   * 按优先级过滤
   */
  const filterByPriority = useCallback(
    (minPriority: number, blocks?: ContextBlock[]): ContextBlock[] => {
      const targetBlocks = blocks || contextPackage?.blocks || [];
      return filterBlocksByPriority(targetBlocks, minPriority);
    },
    [contextPackage]
  );

  /**
   * 按类型过滤
   */
  const filterByType = useCallback(
    (types: ContextBlockType[], blocks?: ContextBlock[]): ContextBlock[] => {
      const targetBlocks = blocks || contextPackage?.blocks || [];
      return filterBlocksByType(targetBlocks, types);
    },
    [contextPackage]
  );

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setContextPackage(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    // 状态
    contextPackage,
    loading,
    error,

    // 方法
    buildContext,
    buildContextWithCompress,
    compressContext,
    projectState,
    writeBack,
    getMetrics,

    // 工具方法
    toPromptText,
    getTotalTokens,
    filterByPriority,
    filterByType,

    // 重置
    reset,
  };
}

/**
 * 指标监控 Hook
 *
 * 专门用于监控 Context 指标的 Hook。
 */
export interface UseContextMetricsReturn {
  metrics: GetMetricsResponse | null;
  loading: boolean;
  error: string | null;
  refresh: (params?: GetMetricsParams) => Promise<GetMetricsResponse | null>;
}

export function useContextMetrics(
  initialParams?: GetMetricsParams
): UseContextMetricsReturn {
  const [metrics, setMetrics] = useState<GetMetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (params?: GetMetricsParams): Promise<GetMetricsResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await contextApi.getMetrics(params || initialParams);
        setMetrics(response);
        return response;
      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [initialParams]
  );

  return {
    metrics,
    loading,
    error,
    refresh,
  };
}
