import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * 文档集合类型
 */
export type CollectionType =
  | 'travel_guides'
  | 'compliance_rules'
  | 'rail_pass_rules'
  | 'trail_access_rules'
  | 'local_insights';

/**
 * RAG 检索请求参数
 */
export interface RagRetrievalRequest {
  query: string;
  collection: CollectionType;
  countryCode?: string;
  limit?: number;
  tags?: string; // 逗号分隔的标签字符串
  minScore?: number;
}

/**
 * RAG 搜索请求参数（POST /rag/search）
 */
export interface RagSearchRequest {
  query: string;
  collection: string;
  countryCode?: string;
  tags?: string[];
  limit?: number;
  minScore?: number;
}

/**
 * RAG 检索结果项
 */
export interface RagRetrievalResult {
  id: string;
  title?: string;
  content: string;
  source?: string;
  score: number; // 0-1，相似度分数
  metadata?: {
    author?: string;
    publishedDate?: string;
    updatedAt?: string;
    category?: string;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Rail Pass 规则请求
 */
export interface RailPassRuleRequest {
  passType: string;
  countryCode: string;
}

/**
 * Rail Pass 规则响应
 */
export interface RailPassRule {
  passType: string;
  countryCode: string;
  requiresReservation: boolean;
  reservationFee?: string;
  validTrainTypes?: string[];
  restrictions?: string;
  source: string;
}

/**
 * Trail Access 规则请求
 */
export interface TrailAccessRuleRequest {
  trailId: string;
  countryCode: string;
}

/**
 * Trail Access 规则响应
 */
export interface TrailAccessRule {
  trailId: string;
  countryCode: string;
  permitRequired: boolean;
  seasonalRestrictions?: string;
  bookingRequired: boolean;
  maxGroupSize?: number;
  source: string;
}

/**
 * 路线叙事响应
 */
export interface RouteNarrative {
  routeDirectionId: string;
  narrative: {
    title: string;
    description: string;
    highlights: string[];
    tips: string[];
  };
  localInsights?: LocalInsight[];
}

/**
 * 当地洞察
 */
export interface LocalInsight {
  content: string;
  tags: string[];
  confidence?: number;
}

/**
 * 当地洞察请求参数
 */
export interface LocalInsightRequest {
  countryCode: string;
  tags: string | string[]; // 逗号分隔或数组
  region?: string;
}

/**
 * 当地洞察响应
 */
export interface LocalInsightResponse {
  countryCode: string;
  region?: string;
  insights: LocalInsight[];
}

/**
 * 目的地深度信息响应
 */
export interface DestinationInsights {
  placeId: string;
  insights: {
    tips: Array<{
      content: string;
      source: string;
      score: number;
    }>;
    localInsights: Array<{
      content: string;
      tags: string[];
    }>;
    routeInsights?: {
      answer: string;
      source: string;
    };
  };
  credibility: {
    ragSources: number;
    localInsightsCount: number;
    hasRouteContext: boolean;
  };
}

/**
 * 目的地深度信息请求参数
 */
export interface DestinationInsightsRequest {
  placeId: string;
  tripId?: string;
  countryCode?: string;
}

/**
 * 合规规则类型
 */
export type ComplianceRuleType = 'VISA' | 'TRANSPORT' | 'ENTRY' | 'EXIT';

/**
 * 提取合规规则请求
 */
export interface ExtractComplianceRulesRequest {
  tripId: string;
  countryCodes: string[];
  ruleTypes?: ComplianceRuleType[];
}

/**
 * 合规清单项
 */
export interface ComplianceChecklistItem {
  description: string;
  required: boolean;
  deadline?: string;
  source: string;
}

/**
 * 合规清单分类
 */
export interface ComplianceChecklistCategory {
  category: string;
  items: ComplianceChecklistItem[];
}

/**
 * 提取合规规则响应
 */
export interface ExtractComplianceRulesResponse {
  tripId: string;
  countryCodes: string[];
  rules: any[]; // 具体规则结构由后端定义
  checklist: ComplianceChecklistCategory[];
  summary: {
    totalRules: number;
    totalChecklistItems: number;
    categories: string[];
  };
}

/**
 * 回答路线问题请求
 */
export interface AnswerRouteQuestionRequest {
  question: string;
  routeDirectionId?: string;
  countryCode?: string;
  segmentId?: string;
  dayIndex?: number;
  tripId?: string;
}

/**
 * 回答路线问题响应
 */
export interface AnswerRouteQuestionResponse {
  answer: string;
  sources: Array<{
    content: string;
    source: string;
    score: number;
  }>;
  confidence: number;
}

/**
 * 解释路线选择请求
 */
export interface ExplainRouteSelectionRequest {
  selectedRouteId: string;
  alternativeRouteId: string;
  countryCode?: string;
}

/**
 * 路线比较信息
 */
export interface RouteComparison {
  name: string;
  pros: string[];
  cons: string[];
}

/**
 * 解释路线选择响应
 */
export interface ExplainRouteSelectionResponse {
  explanation: string;
  comparison: {
    selectedRoute: RouteComparison;
    alternativeRoute: RouteComparison;
  };
}

/**
 * 成功响应格式
 */
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * 错误响应格式
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

/**
 * 处理API响应
 */
function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的API响应');
  }

  if (!response.data.success) {
    throw new Error(response.data.error?.message || '请求失败');
  }

  return response.data.data;
}

// ==================== API 实现 ====================

export const ragApi = {
  /**
   * RAG 搜索
   * POST /rag/search
   * 从 RAG 知识库中搜索相关文档，支持更复杂的查询参数
   */
  search: async (data: RagSearchRequest): Promise<RagRetrievalResult[]> => {
    try {
      console.log('[RAG API] 发送 search 请求:', {
        query: data.query?.substring(0, 50) + '...',
        collection: data.collection,
        countryCode: data.countryCode,
        tags: data.tags,
        limit: data.limit,
      });

      const response = await apiClient.post<ApiResponseWrapper<RagRetrievalResult[]>>(
        '/rag/search',
        data,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[RAG API] 收到 search 响应:', {
        resultsCount: response.data?.success ? response.data.data?.length : 0,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[RAG API] search 请求失败:', {
        error,
        message: error.message,
        request: data,
      });
      throw error;
    }
  },

  /**
   * RAG 文档检索
   * GET /rag/retrieve
   * 从 RAG 知识库中检索相关文档（简单版本）
   */
  retrieve: async (params: RagRetrievalRequest): Promise<RagRetrievalResult[]> => {
    try {
      console.log('[RAG API] 发送 retrieve 请求:', {
        query: params.query?.substring(0, 50) + '...',
        collection: params.collection,
        countryCode: params.countryCode,
        limit: params.limit,
      });

      const response = await apiClient.get<ApiResponseWrapper<RagRetrievalResult[]>>(
        '/rag/retrieve',
        { params }
      );

      console.log('[RAG API] 收到 retrieve 响应:', {
        resultsCount: response.data?.success ? response.data.data?.length : 0,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[RAG API] retrieve 请求失败:', {
        error,
        message: error.message,
        params,
      });
      throw error;
    }
  },

  /**
   * 提取 Rail Pass 规则
   * POST /rag/compliance/rail-pass
   * 从文档中提取铁路通票相关的合规规则
   */
  extractRailPassRules: async (data: RailPassRuleRequest): Promise<RailPassRule[]> => {
    try {
      console.log('[RAG API] 发送 extractRailPassRules 请求:', {
        passType: data.passType,
        countryCode: data.countryCode,
      });

      const response = await apiClient.post<ApiResponseWrapper<RailPassRule[]>>(
        '/rag/compliance/rail-pass',
        data,
        {
          timeout: 30000,
        }
      );

      console.log('[RAG API] 收到 extractRailPassRules 响应:', {
        rulesCount: response.data?.success ? response.data.data?.length : 0,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[RAG API] extractRailPassRules 请求失败:', {
        error,
        message: error.message,
        request: data,
      });
      throw error;
    }
  },

  /**
   * 提取 Trail Access 规则
   * POST /rag/compliance/trail-access
   * 从文档中提取步道访问相关的合规规则
   */
  extractTrailAccessRules: async (data: TrailAccessRuleRequest): Promise<TrailAccessRule> => {
    try {
      console.log('[RAG API] 发送 extractTrailAccessRules 请求:', {
        trailId: data.trailId,
        countryCode: data.countryCode,
      });

      const response = await apiClient.post<ApiResponseWrapper<TrailAccessRule>>(
        '/rag/compliance/trail-access',
        data,
        {
          timeout: 30000,
        }
      );

      console.log('[RAG API] 收到 extractTrailAccessRules 响应:', {
        permitRequired: response.data?.success ? response.data.data?.permitRequired : undefined,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[RAG API] extractTrailAccessRules 请求失败:', {
        error,
        message: error.message,
        request: data,
      });
      throw error;
    }
  },

  /**
   * 生成路线叙事
   * GET /rag/route-narrative/:routeDirectionId
   * 为指定路线生成丰富的叙事内容
   */
  getRouteNarrative: async (
    routeDirectionId: string,
    params?: {
      countryCode?: string;
      includeLocalInsights?: boolean;
    }
  ): Promise<RouteNarrative> => {
    try {
      console.log('[RAG API] 发送 getRouteNarrative 请求:', {
        routeDirectionId,
        countryCode: params?.countryCode,
        includeLocalInsights: params?.includeLocalInsights,
      });

      const response = await apiClient.get<ApiResponseWrapper<RouteNarrative>>(
        `/rag/route-narrative/${routeDirectionId}`,
        {
          params: {
            ...(params?.countryCode && { countryCode: params.countryCode }),
            ...(params?.includeLocalInsights !== undefined && {
              includeLocalInsights: params.includeLocalInsights,
            }),
          },
          timeout: 30000,
        }
      );

      console.log('[RAG API] 收到 getRouteNarrative 响应:', {
        hasNarrative: !!response.data?.success && !!response.data.data?.narrative,
        highlightsCount: response.data?.success
          ? response.data.data?.narrative?.highlights?.length
          : 0,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[RAG API] getRouteNarrative 请求失败:', {
        error,
        message: error.message,
        routeDirectionId,
        params,
      });
      throw error;
    }
  },

  /**
   * 获取当地洞察
   * GET /rag/local-insight
   * 获取指定地区的当地洞察信息
   */
  getLocalInsight: async (params: LocalInsightRequest): Promise<LocalInsightResponse> => {
    try {
      console.log('[RAG API] 发送 getLocalInsight 请求:', {
        countryCode: params.countryCode,
        tags: Array.isArray(params.tags) ? params.tags : params.tags,
        region: params.region,
      });

      // 处理 tags 参数：如果是数组，转换为逗号分隔的字符串
      const queryParams: Record<string, any> = {
        countryCode: params.countryCode,
        ...(params.region && { region: params.region }),
      };

      if (Array.isArray(params.tags)) {
        queryParams.tags = params.tags.join(',');
      } else {
        queryParams.tags = params.tags;
      }

      const response = await apiClient.get<ApiResponseWrapper<LocalInsightResponse>>(
        '/rag/local-insight',
        {
          params: queryParams,
          timeout: 30000,
        }
      );

      console.log('[RAG API] 收到 getLocalInsight 响应:', {
        insightsCount: response.data?.success ? response.data.data?.insights?.length : 0,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[RAG API] getLocalInsight 请求失败:', {
        error,
        message: error.message,
        params,
      });
      throw error;
    }
  },

  /**
   * 获取目的地深度信息
   * GET /rag/destination-insights
   * 获取行程中目的地的特色贴士和隐藏攻略
   */
  getDestinationInsights: async (
    params: DestinationInsightsRequest
  ): Promise<DestinationInsights> => {
    try {
      console.log('[RAG API] 发送 getDestinationInsights 请求:', {
        placeId: params.placeId,
        tripId: params.tripId,
        countryCode: params.countryCode,
      });

      const response = await apiClient.get<ApiResponseWrapper<DestinationInsights>>(
        '/rag/destination-insights',
        {
          params: {
            placeId: params.placeId,
            ...(params.tripId && { tripId: params.tripId }),
            ...(params.countryCode && { countryCode: params.countryCode }),
          },
          timeout: 30000,
        }
      );

      console.log('[RAG API] 收到 getDestinationInsights 响应:', {
        hasInsights: !!response.data?.success && !!response.data.data?.insights,
        tipsCount: response.data?.success
          ? response.data.data?.insights?.tips?.length
          : 0,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[RAG API] getDestinationInsights 请求失败:', {
        error,
        message: error.message,
        params,
      });
      throw error;
    }
  },

  /**
   * 提取行程合规规则
   * POST /rag/extract-compliance-rules
   * 自动获取行程涉及的签证和交通合规信息，生成合规清单
   */
  extractComplianceRules: async (
    data: ExtractComplianceRulesRequest
  ): Promise<ExtractComplianceRulesResponse> => {
    try {
      console.log('[RAG API] 发送 extractComplianceRules 请求:', {
        tripId: data.tripId,
        countryCodes: data.countryCodes,
        ruleTypes: data.ruleTypes,
      });

      const response = await apiClient.post<ApiResponseWrapper<ExtractComplianceRulesResponse>>(
        '/rag/extract-compliance-rules',
        data,
        {
          timeout: 60000, // 60 秒超时，提取合规规则可能需要较长时间
        }
      );

      console.log('[RAG API] 收到 extractComplianceRules 响应:', {
        totalRules: response.data?.success ? response.data.data?.summary?.totalRules : 0,
        checklistCategories: response.data?.success
          ? response.data.data?.summary?.categories?.length
          : 0,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[RAG API] extractComplianceRules 请求失败:', {
        error,
        message: error.message,
        request: data,
      });
      throw error;
    }
  },

  /**
   * 回答路线问题
   * POST /rag/chat/answer-route-question
   * 使用增强对话功能回答关于路线的问题
   */
  answerRouteQuestion: async (
    data: AnswerRouteQuestionRequest
  ): Promise<AnswerRouteQuestionResponse> => {
    try {
      console.log('[RAG API] 发送 answerRouteQuestion 请求:', {
        question: data.question?.substring(0, 50) + '...',
        routeDirectionId: data.routeDirectionId,
        countryCode: data.countryCode,
        segmentId: data.segmentId,
        dayIndex: data.dayIndex,
        tripId: data.tripId,
      });

      const response = await apiClient.post<ApiResponseWrapper<AnswerRouteQuestionResponse>>(
        '/rag/chat/answer-route-question',
        data,
        {
          timeout: 30000,
        }
      );

      console.log('[RAG API] 收到 answerRouteQuestion 响应:', {
        hasAnswer: !!response.data?.success && !!response.data.data?.answer,
        sourcesCount: response.data?.success ? response.data.data?.sources?.length : 0,
        confidence: response.data?.success ? response.data.data?.confidence : undefined,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[RAG API] answerRouteQuestion 请求失败:', {
        error,
        message: error.message,
        request: data,
      });
      throw error;
    }
  },

  /**
   * 解释路线选择
   * POST /rag/chat/explain-why-not-other-route
   * 解释为什么选择了当前路线而不是另一条
   */
  explainRouteSelection: async (
    data: ExplainRouteSelectionRequest
  ): Promise<ExplainRouteSelectionResponse> => {
    try {
      console.log('[RAG API] 发送 explainRouteSelection 请求:', {
        selectedRouteId: data.selectedRouteId,
        alternativeRouteId: data.alternativeRouteId,
        countryCode: data.countryCode,
      });

      const response = await apiClient.post<ApiResponseWrapper<ExplainRouteSelectionResponse>>(
        '/rag/chat/explain-why-not-other-route',
        data,
        {
          timeout: 30000,
        }
      );

      console.log('[RAG API] 收到 explainRouteSelection 响应:', {
        hasExplanation: !!response.data?.success && !!response.data.data?.explanation,
        hasComparison: !!response.data?.success && !!response.data.data?.comparison,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[RAG API] explainRouteSelection 请求失败:', {
        error,
        message: error.message,
        request: data,
      });
      throw error;
    }
  },
};

