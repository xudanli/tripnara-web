/**
 * RAG API Hook
 *
 * 提供 RAG API 的 React Hook 封装，用于：
 * - 搜索和检索文档
 * - 获取目的地深度信息
 * - 获取当地洞察
 * - 提取合规规则
 * - 生成路线叙事
 */

import { useState, useCallback } from 'react';
import {
  ragApi,
  type RagSearchRequest,
  type RagRetrievalRequest,
  type ChunkRetrievalRequest,
  type DestinationInsightsRequest,
  type LocalInsightRequest,
  type ExtractComplianceRulesRequest,
  type AnswerRouteQuestionRequest,
  type ExplainRouteSelectionRequest,
  type RagRetrievalResult,
  type ChunkRetrievalResult,
  type DestinationInsights,
  type LocalInsightResponse,
  type ExtractComplianceRulesResponse,
  type AnswerRouteQuestionResponse,
  type ExplainRouteSelectionResponse,
  type RouteNarrative,
} from '@/api/rag';
import { handleApiError } from '@/utils/errorHandler';

/**
 * Hook 返回类型
 */
export interface UseRagReturn {
  // 状态
  loading: boolean;
  error: string | null;

  // 🆕 Chunk 检索（推荐使用）
  retrieveChunks: (request: ChunkRetrievalRequest) => Promise<ChunkRetrievalResult[] | null>;
  
  // ⚠️ 搜索和检索（已废弃，保留以兼容旧代码）
  search: (request: RagSearchRequest) => Promise<RagRetrievalResult[] | null>;
  retrieve: (request: RagRetrievalRequest) => Promise<RagRetrievalResult[] | null>;

  // 目的地和洞察
  getDestinationInsights: (
    request: DestinationInsightsRequest
  ) => Promise<DestinationInsights | null>;
  getLocalInsight: (request: LocalInsightRequest) => Promise<LocalInsightResponse | null>;

  // 合规规则
  extractComplianceRules: (
    request: ExtractComplianceRulesRequest
  ) => Promise<ExtractComplianceRulesResponse | null>;

  // 路线相关
  getRouteNarrative: (
    routeDirectionId: string,
    params?: { countryCode?: string; includeLocalInsights?: boolean }
  ) => Promise<RouteNarrative | null>;
  answerRouteQuestion: (
    request: AnswerRouteQuestionRequest
  ) => Promise<AnswerRouteQuestionResponse | null>;
  explainRouteSelection: (
    request: ExplainRouteSelectionRequest
  ) => Promise<ExplainRouteSelectionResponse | null>;

  // 重置
  reset: () => void;
}

/**
 * RAG API Hook
 */
export function useRag(): UseRagReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 🆕 Chunk 检索（推荐使用）
   */
  const retrieveChunks = useCallback(
    async (request: ChunkRetrievalRequest): Promise<ChunkRetrievalResult[] | null> => {
      setLoading(true);
      setError(null);

      try {
        const results = await ragApi.retrieveChunks(request);
        return results;
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
   * ⚠️ RAG 搜索（已废弃，内部迁移到 retrieveChunks）
   * @deprecated 请使用 retrieveChunks 接口
   */
  const search = useCallback(
    async (request: RagSearchRequest): Promise<RagRetrievalResult[] | null> => {
      console.warn('[useRag] ⚠️ search 方法已废弃，请使用 retrieveChunks');
      setLoading(true);
      setError(null);

      try {
        // 🆕 迁移到新接口：将旧参数转换为新格式
        const chunkResults = await ragApi.retrieveChunks({
          query: request.query,
          limit: request.limit ?? 10,
          credibilityMin: request.minScore ?? 0.5,
          ...(request.category && { category: request.category }),
          // 根据 collection 映射到 chunkCategory（如果可能）
          ...(request.collection === 'compliance_rules' && { chunkCategory: 'RULES' }),
          useHybridSearch: true, // 默认启用混合检索
        });

        // 将 ChunkRetrievalResult 转换为 RagRetrievalResult 格式以保持兼容性
        const results: RagRetrievalResult[] = chunkResults.map((chunk) => ({
          id: chunk.id,
          content: chunk.content,
          source: chunk.sourceFile,
          score: chunk.similarity,
          metadata: {
            ...chunk.metadata,
            category: chunk.type,
            tags: chunk.keywords,
          },
        }));

        return results;
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
   * ⚠️ RAG 检索（已废弃，内部迁移到 retrieveChunks）
   * @deprecated 请使用 retrieveChunks 接口
   */
  const retrieve = useCallback(
    async (request: RagRetrievalRequest): Promise<RagRetrievalResult[] | null> => {
      console.warn('[useRag] ⚠️ retrieve 方法已废弃，请使用 retrieveChunks');
      setLoading(true);
      setError(null);

      try {
        // 🆕 迁移到新接口：将旧参数转换为新格式
        const chunkResults = await ragApi.retrieveChunks({
          query: request.query,
          limit: request.limit ?? 10,
          credibilityMin: request.minScore ?? 0.5,
          ...(request.tags && { category: request.tags }), // tags 可能对应 category
          // 根据 collection 映射到 chunkCategory（如果可能）
          ...(request.collection === 'compliance_rules' && { chunkCategory: 'RULES' }),
          ...(request.collection === 'travel_guides' && { chunkCategory: 'POI_INFO' }),
          useHybridSearch: true, // 默认启用混合检索
        });

        // 将 ChunkRetrievalResult 转换为 RagRetrievalResult 格式以保持兼容性
        const results: RagRetrievalResult[] = chunkResults.map((chunk) => ({
          id: chunk.id,
          content: chunk.content,
          source: chunk.sourceFile,
          score: chunk.similarity,
          metadata: {
            ...chunk.metadata,
            category: chunk.type,
            tags: chunk.keywords,
          },
        }));

        return results;
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
   * 获取目的地深度信息
   */
  const getDestinationInsights = useCallback(
    async (request: DestinationInsightsRequest): Promise<DestinationInsights | null> => {
      setLoading(true);
      setError(null);

      try {
        const insights = await ragApi.getDestinationInsights(request);
        return insights;
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
   * 获取当地洞察
   */
  const getLocalInsight = useCallback(
    async (request: LocalInsightRequest): Promise<LocalInsightResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const insights = await ragApi.getLocalInsight(request);
        return insights;
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
   * 提取合规规则
   */
  const extractComplianceRules = useCallback(
    async (
      request: ExtractComplianceRulesRequest
    ): Promise<ExtractComplianceRulesResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const rules = await ragApi.extractComplianceRules(request);
        return rules;
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
   * 获取路线叙事
   */
  const getRouteNarrative = useCallback(
    async (
      routeDirectionId: string,
      params?: { countryCode?: string; includeLocalInsights?: boolean }
    ): Promise<RouteNarrative | null> => {
      setLoading(true);
      setError(null);

      try {
        const narrative = await ragApi.getRouteNarrative(routeDirectionId, params);
        return narrative;
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
   * 回答路线问题
   */
  const answerRouteQuestion = useCallback(
    async (
      request: AnswerRouteQuestionRequest
    ): Promise<AnswerRouteQuestionResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const answer = await ragApi.answerRouteQuestion(request);
        return answer;
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
   * 解释路线选择
   */
  const explainRouteSelection = useCallback(
    async (
      request: ExplainRouteSelectionRequest
    ): Promise<ExplainRouteSelectionResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const explanation = await ragApi.explainRouteSelection(request);
        return explanation;
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
   * 重置状态
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    retrieveChunks, // 🆕 新接口
    search, // ⚠️ 已废弃
    retrieve, // ⚠️ 已废弃
    getDestinationInsights,
    getLocalInsight,
    extractComplianceRules,
    getRouteNarrative,
    answerRouteQuestion,
    explainRouteSelection,
    reset,
  };
}
