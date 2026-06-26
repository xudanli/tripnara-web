import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * 上下文块的来源信息
 */
export interface BlockProvenance {
  source: 'skill' | 'pack' | 'user' | 'system';
  identifier: string;
  timestamp: string;
}

/**
 * 上下文块类型
 */
export type ContextBlockType =
  | 'WORLD_MODEL'
  | 'COUNTRY_VISA'
  | 'COUNTRY_ROAD_RULES'
  | 'COUNTRY_SAFETY'
  | 'COUNTRY_WEATHER'
  | 'ABU_RULES'
  | 'DRDRE_RULES'
  | 'NEPTUNE_RULES'
  | 'PLAN_SUMMARY'
  | 'PLAN_DAY'
  | 'DECISION_LOG'
  | 'USER_PROFILE'
  | 'CONSTRAINTS'
  | 'DOMAIN_INFLUENCE_TEAM'
  | 'DOMAIN_INFLUENCE_PRIVATE'
  | 'WISHLIST_PRIVATE'
  | 'WISHLIST_TEAM';

/**
 * 上下文块
 */
export interface ContextBlock {
  key: string;
  type: ContextBlockType;
  text: string;
  priority: number;
  visibility: 'public' | 'private';
  provenance?: BlockProvenance;
  estimatedTokens?: number;
}

/**
 * 上下文包
 */
export interface ContextPackage {
  id: string;
  tripId?: string;
  phase: string;
  agent: string;
  userQuery: string;
  blocks: ContextBlock[];
  totalTokens: number;
  tokenBudget: number;
  compressed: boolean;
  createdAt: string;
  metadata?: {
    skillsCalled?: string[];
    cacheHit?: boolean;
  };
}

/**
 * POST /context/build 请求体 — 与后端 `BuildContextPackageDto` 对齐。
 *
 * @example 协作记忆（领域影响力 + 私密愿望）
 * ```json
 * {
 *   "tripId": "trip-123",
 *   "userId": "当前登录用户 id",
 *   "phase": "planning",
 *   "agent": "PLANNER",
 *   "userQuery": "...",
 *   "includePrivate": true
 * }
 * ```
 */
export interface BuildContextPackageRequest {
  tripId?: string;
  /**
   * 当前登录用户 ID。
   * 与 `includePrivate: true` 联用时注入：领域影响力 snapshot、愿望单私密块、负责人私密约束。
   * 后端缓存 key 含 userId，避免不同用户私密块互相命中。
   */
  userId?: string;
  phase: string;
  agent: string;
  userQuery: string;
  tokenBudget?: number;
  /**
   * 注入协作记忆私密块：`WISHLIST_PRIVATE`、`DOMAIN_INFLUENCE_PRIVATE`。
   * 仅传 `includePrivate: true` 而不传 `userId` 时，团队可见块
   *（`WISHLIST_TEAM`、`DOMAIN_INFLUENCE_TEAM`）仍可能部分生效，私密相关块不完整。
   */
  includePrivate?: boolean;
  requiredTopics?: string[];
  excludeTopics?: string[];
  useCache?: boolean;
}

/** @deprecated 使用 {@link BuildContextPackageRequest} */
export type BuildContextRequest = BuildContextPackageRequest;

/**
 * 构建上下文响应
 */
export interface BuildContextResponse {
  contextPackage: ContextPackage;
}

/**
 * 压缩策略
 */
export type CompressionStrategy = 'aggressive' | 'conservative' | 'balanced';

/**
 * 压缩上下文请求参数
 */
export interface CompressContextRequest {
  blocks: ContextBlock[];
  tokenBudget: number;
  strategy?: CompressionStrategy;
  preserveKeys?: string[];
}

/**
 * 压缩统计信息
 */
export interface CompressionStats {
  originalBlocks: number;
  compressedBlocks: number;
  originalTokens: number;
  compressedTokens: number;
  reductionRatio: number;
  removedKeys: string[];
}

/**
 * 压缩上下文响应
 */
export interface CompressContextResponse {
  compressedBlocks: ContextBlock[];
  stats: CompressionStats;
}

/**
 * 投影状态请求参数
 */
export interface ProjectStateRequest {
  state: Record<string, any>;
  includeFullState?: boolean;
  decisionLogLimit?: number;
  rejectionLogLimit?: number;
  tokenBudget?: number;
}

/**
 * 决策日志摘要项
 */
export interface DecisionLogSummaryItem {
  agent: string;
  action: string;
  reasonCode: string;
  explanation: string;
  timestamp: string;
}

/**
 * 计划摘要
 */
export interface PlanSummaryProjection {
  totalDays: number;
  totalSegments: number;
  keyHighlights: string[];
}

/**
 * 世界模型摘要
 */
export interface WorldSummary {
  countryCode?: string;
  season?: string;
  [key: string]: any;
}

/**
 * 公开投影数据
 */
export interface PublicProjection {
  user_intent?: string;
  world_summary?: WorldSummary;
  planning_phase?: string;
  decisionLogSummary?: DecisionLogSummaryItem[];
  planSummary?: PlanSummaryProjection;
  [key: string]: any;
}

/**
 * 私有投影数据
 */
export interface PrivateProjection {
  fullState?: Record<string, any>;
  toolRawOutputs?: Record<string, string>;
  debugLogs?: string[];
  longLists?: Record<string, string>;
  [key: string]: any;
}

/**
 * 投影元数据
 */
export interface ProjectionMetadata {
  projectedAt: string;
  tokenCount: number;
  truncated: boolean;
}

/**
 * 状态投影
 */
export interface StateProjection {
  public: PublicProjection;
  private: PrivateProjection;
  metadata: ProjectionMetadata;
}

/**
 * 投影状态响应
 */
export interface ProjectStateResponse {
  projection: StateProjection;
}

/**
 * Scratchpad 内容
 */
export interface Scratchpad {
  planOutline?: string;
  openQuestions?: string[];
  constraintsAssumed?: string[];
  nextActions?: string[];
  failureNotes?: string;
}

/**
 * 写回请求参数
 */
export interface WriteBackRequest {
  tripRunId: string;
  attemptNumber: number;
  scratchpad: Scratchpad;
  decisionLogDelta?: any[];
  artifactsRefs?: Record<string, string>;
}

/**
 * 写回响应
 */
export interface WriteBackResponse {
  message: string;
}

/**
 * 获取指标请求参数
 */
export interface GetMetricsParams {
  tripId?: string;
  phase?: string;
  agent?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

/**
 * 质量等级
 */
export type QualityLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

/**
 * 块类型统计
 */
export interface BlockTypeCount {
  type: string;
  count: number;
}

/**
 * 指标摘要
 */
export interface MetricsSummary {
  timeRange: {
    start: string;
    end: string;
  };
  totalRecords: number;
  avgTokens: number;
  avgCompressionRate: number;
  avgHitRate: number;
  avgNoiseRate: number;
  cacheHitRate: number;
  avgBuildTimeMs: number;
  qualityDistribution: Record<QualityLevel, number>;
  topBlockTypes: BlockTypeCount[];
}

/**
 * Token 使用统计
 */
export interface TokenStats {
  total: number;
  budget: number;
  overBudget: boolean;
  overBudgetRate: number;
}

/**
 * 块统计
 */
export interface BlockStats {
  total: number;
  public: number;
  private: number;
  compressed: boolean;
}

/**
 * 质量统计
 */
export interface QualityStats {
  hitRate: number;
  noiseRate: number;
  relevanceScore: number;
  quality: QualityLevel;
}

/**
 * 性能统计
 */
export interface PerformanceStats {
  buildTimeMs: number;
  cacheHit: boolean;
  skillsCalled: string[];
}

/**
 * 单条指标记录
 */
export interface MetricsRecord {
  id: string;
  tripId?: string;
  phase: string;
  agent: string;
  timestamp: string;
  tokens: TokenStats;
  blocks: BlockStats;
  quality: QualityStats;
  performance: PerformanceStats;
}

/**
 * 获取指标响应
 */
export interface GetMetricsResponse {
  summary: MetricsSummary;
  recent: MetricsRecord[];
}

// ==================== API 响应包装类型 ====================

/**
 * 成功响应包装
 */
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * 错误响应
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

/**
 * 处理 API 响应
 */
function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    console.error('[Context API] 无效的 API 响应:', response);
    throw new Error('无效的 API 响应');
  }

  if (!response.data.success) {
    const errorData = (response.data as ErrorResponse).error;
    const errorMessage = errorData?.message || errorData?.code || '请求失败';
    const errorCode = errorData?.code || 'UNKNOWN_ERROR';

    console.error('[Context API] API 返回错误:', {
      code: errorCode,
      message: errorMessage,
      details: errorData?.details,
      fullError: errorData,
      fullResponse: response.data,
    });

    throw new Error(errorMessage);
  }

  return response.data.data;
}

// ==================== API 实现 ====================

export const contextApi = {
  /**
   * 构建 Context Package
   * POST /context/build
   *
   * 根据 tripId、phase、agent、userQuery 构建 Context Package。
   * 多人行程需传 `userId` + `includePrivate: true` 以注入完整协作记忆块。
   */
  build: async (data: BuildContextPackageRequest): Promise<BuildContextResponse> => {
    try {
      if (data.includePrivate && !data.userId) {
        console.warn(
          '[Context API] includePrivate 未传 userId：WISHLIST_TEAM / DOMAIN_INFLUENCE_TEAM 可能部分生效，私密块不完整'
        );
      }
      console.log('[Context API] 发送 build 请求:', {
        tripId: data.tripId,
        userId: data.userId,
        phase: data.phase,
        agent: data.agent,
        userQuery: data.userQuery?.substring(0, 50) + '...',
        tokenBudget: data.tokenBudget,
        includePrivate: data.includePrivate,
        requiredTopics: data.requiredTopics,
        useCache: data.useCache,
      });

      const response = await apiClient.post<ApiResponseWrapper<BuildContextResponse>>(
        '/context/build',
        data,
        {
          timeout: 60000, // 60 秒超时，构建可能需要较长时间
        }
      );

      console.log('[Context API] 收到 build 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
        responseKeys: response.data ? Object.keys(response.data) : [],
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Context API] 解析后的响应:', {
        contextPackageId: wrappedResponse.contextPackage?.id,
        totalTokens: wrappedResponse.contextPackage?.totalTokens,
        blocksCount: wrappedResponse.contextPackage?.blocks?.length,
        compressed: wrappedResponse.contextPackage?.compressed,
        cacheHit: wrappedResponse.contextPackage?.metadata?.cacheHit,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Context API] build 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        request: {
          tripId: data.tripId,
          phase: data.phase,
          agent: data.agent,
        },
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，上下文构建时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '构建上下文失败，请稍后重试');
      }
    }
  },

  /**
   * 压缩 Context Package
   * POST /context/compress
   *
   * 压缩 Context Package 中的 blocks，使其符合 Token 预算。
   * 支持三种压缩策略：aggressive、conservative、balanced。
   */
  compress: async (data: CompressContextRequest): Promise<CompressContextResponse> => {
    try {
      console.log('[Context API] 发送 compress 请求:', {
        blocksCount: data.blocks?.length,
        tokenBudget: data.tokenBudget,
        strategy: data.strategy || 'balanced',
        preserveKeys: data.preserveKeys,
      });

      const response = await apiClient.post<ApiResponseWrapper<CompressContextResponse>>(
        '/context/compress',
        data,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Context API] 收到 compress 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Context API] 解析后的响应:', {
        compressedBlocksCount: wrappedResponse.compressedBlocks?.length,
        originalTokens: wrappedResponse.stats?.originalTokens,
        compressedTokens: wrappedResponse.stats?.compressedTokens,
        reductionRatio: wrappedResponse.stats?.reductionRatio,
        removedKeysCount: wrappedResponse.stats?.removedKeys?.length,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Context API] compress 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        request: {
          blocksCount: data.blocks?.length,
          tokenBudget: data.tokenBudget,
          strategy: data.strategy,
        },
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '压缩上下文失败，请稍后重试');
      }
    }
  },

  /**
   * 投影状态
   * POST /context/project-state
   *
   * 将全量 State（TripState 或 LangGraphState）投影为 Public/Private 两部分。
   * 用于 LangGraph 节点中，确保 prompt 只包含必要信息。
   */
  projectState: async (data: ProjectStateRequest): Promise<ProjectStateResponse> => {
    try {
      console.log('[Context API] 发送 projectState 请求:', {
        hasState: !!data.state,
        stateKeys: data.state ? Object.keys(data.state) : [],
        includeFullState: data.includeFullState,
        decisionLogLimit: data.decisionLogLimit,
        rejectionLogLimit: data.rejectionLogLimit,
        tokenBudget: data.tokenBudget,
      });

      const response = await apiClient.post<ApiResponseWrapper<ProjectStateResponse>>(
        '/context/project-state',
        data,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Context API] 收到 projectState 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Context API] 解析后的响应:', {
        hasPublic: !!wrappedResponse.projection?.public,
        hasPrivate: !!wrappedResponse.projection?.private,
        tokenCount: wrappedResponse.projection?.metadata?.tokenCount,
        truncated: wrappedResponse.projection?.metadata?.truncated,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Context API] projectState 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '投影状态失败，请稍后重试');
      }
    }
  },

  /**
   * 写入回写
   * POST /context/write-back
   *
   * 保存节点的 scratchpad、decisionLogDelta、artifactsRefs。
   * 用于 LangGraph 节点结束时调用。
   */
  writeBack: async (data: WriteBackRequest): Promise<WriteBackResponse> => {
    try {
      console.log('[Context API] 发送 writeBack 请求:', {
        tripRunId: data.tripRunId,
        attemptNumber: data.attemptNumber,
        hasScratchpad: !!data.scratchpad,
        scratchpadKeys: data.scratchpad ? Object.keys(data.scratchpad) : [],
        decisionLogDeltaCount: data.decisionLogDelta?.length || 0,
        artifactsRefsKeys: data.artifactsRefs ? Object.keys(data.artifactsRefs) : [],
      });

      const response = await apiClient.post<ApiResponseWrapper<WriteBackResponse>>(
        '/context/write-back',
        data,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Context API] 收到 writeBack 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Context API] 解析后的响应:', {
        message: wrappedResponse.message,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Context API] writeBack 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        request: {
          tripRunId: data.tripRunId,
          attemptNumber: data.attemptNumber,
        },
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '写入回写失败，请稍后重试');
      }
    }
  },

  /**
   * 获取 Context 指标
   * GET /context/metrics
   *
   * 获取 Context Package 的质量和性能指标。
   * 包括 Token 使用、压缩率、命中率、缓存命中率、质量分布等。
   */
  getMetrics: async (params?: GetMetricsParams): Promise<GetMetricsResponse> => {
    try {
      console.log('[Context API] 发送 getMetrics 请求:', {
        tripId: params?.tripId,
        phase: params?.phase,
        agent: params?.agent,
        startTime: params?.startTime,
        endTime: params?.endTime,
        limit: params?.limit,
      });

      const response = await apiClient.get<ApiResponseWrapper<GetMetricsResponse>>(
        '/context/metrics',
        {
          params: {
            ...(params?.tripId && { tripId: params.tripId }),
            ...(params?.phase && { phase: params.phase }),
            ...(params?.agent && { agent: params.agent }),
            ...(params?.startTime && { startTime: params.startTime }),
            ...(params?.endTime && { endTime: params.endTime }),
            ...(params?.limit && { limit: params.limit }),
          },
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Context API] 收到 getMetrics 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Context API] 解析后的响应:', {
        totalRecords: wrappedResponse.summary?.totalRecords,
        avgTokens: wrappedResponse.summary?.avgTokens,
        cacheHitRate: wrappedResponse.summary?.cacheHitRate,
        recentCount: wrappedResponse.recent?.length,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Context API] getMetrics 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        params,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '获取指标失败，请稍后重试');
      }
    }
  },
};

// ==================== 便捷 Hook 辅助函数 ====================

/**
 * 构建 Context Package 并自动处理压缩
 *
 * 如果构建的 Context Package 超出 Token 预算，自动进行压缩。
 */
export async function buildContextWithAutoCompress(
  request: BuildContextRequest,
  compressionOptions?: {
    strategy?: CompressionStrategy;
    preserveKeys?: string[];
  }
): Promise<ContextPackage> {
  const buildResult = await contextApi.build(request);
  const contextPackage = buildResult.contextPackage;

  // 检查是否需要压缩
  if (contextPackage.totalTokens > contextPackage.tokenBudget && !contextPackage.compressed) {
    console.log('[Context API] 上下文超出预算，自动压缩:', {
      totalTokens: contextPackage.totalTokens,
      tokenBudget: contextPackage.tokenBudget,
    });

    const compressResult = await contextApi.compress({
      blocks: contextPackage.blocks,
      tokenBudget: contextPackage.tokenBudget,
      strategy: compressionOptions?.strategy || 'balanced',
      preserveKeys: compressionOptions?.preserveKeys,
    });

    // 返回压缩后的 Context Package
    return {
      ...contextPackage,
      blocks: compressResult.compressedBlocks,
      totalTokens: compressResult.stats.compressedTokens,
      compressed: true,
    };
  }

  return contextPackage;
}

/**
 * 将 Context Package 的 blocks 转换为 prompt 文本
 */
export function blocksToPromptText(blocks: ContextBlock[]): string {
  return blocks
    .filter((block) => block.visibility === 'public')
    .sort((a, b) => b.priority - a.priority)
    .map((block) => {
      const header = `[${block.type}]`;
      return `${header}\n${block.text}`;
    })
    .join('\n\n---\n\n');
}

/**
 * 计算 blocks 的总 Token 数
 */
export function calculateTotalTokens(blocks: ContextBlock[]): number {
  return blocks.reduce((total, block) => total + (block.estimatedTokens || 0), 0);
}

/**
 * 按优先级过滤 blocks
 */
export function filterBlocksByPriority(
  blocks: ContextBlock[],
  minPriority: number
): ContextBlock[] {
  return blocks.filter((block) => block.priority >= minPriority);
}

/**
 * 按类型过滤 blocks
 */
export function filterBlocksByType(
  blocks: ContextBlock[],
  types: ContextBlockType[]
): ContextBlock[] {
  return blocks.filter((block) => types.includes(block.type));
}
