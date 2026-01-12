import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * 行程详情页操作类型
 */
export type TripDetailAction = 
  | 'get_status' 
  | 'get_health' 
  | 'explain_decisions' 
  | 'show_evidence' 
  | 'get_full';

/**
 * 执行行程详情页请求
 */
export interface ExecuteTripDetailRequest {
  tripId: string;                    // 行程 ID（必填）
  action: TripDetailAction;          // 操作类型（必填）
  decisionId?: string;               // 决策 ID（explain_decisions 时使用）
  evidenceRefs?: string[];           // 证据引用（show_evidence 时使用）
}

/**
 * 健康度状态
 */
export type HealthStatus = 'healthy' | 'warning' | 'critical';

/**
 * 维度状态
 */
export interface DimensionStatus {
  status: string;
  score: number;                     // 0-100
  issues: string[];
}

/**
 * 健康度维度
 */
export interface HealthDimensions {
  schedule: DimensionStatus;
  budget: DimensionStatus;
  pace: DimensionStatus;
  feasibility: DimensionStatus;
}

/**
 * 健康度
 */
export interface Health {
  overall: HealthStatus;
  dimensions: HealthDimensions;
}

/**
 * 行程阶段
 */
export type TripPhase = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

/**
 * 进度信息
 */
export interface Progress {
  completed: number;
  total: number;
  percentage: number;
}

/**
 * 下一步
 */
export interface NextStep {
  step: string;
  priority: string;
  deadline?: string;
}

/**
 * 风险项
 */
export interface Risk {
  type: string;
  severity: string;
  description: string;
}

/**
 * 机会项
 */
export interface Opportunity {
  type: string;
  description: string;
  benefit: string;
}

/**
 * 状态理解
 */
export interface StatusUnderstanding {
  currentPhase: TripPhase;
  progress: Progress;
  nextSteps: NextStep[];
  risks: Risk[];
  opportunities: Opportunity[];
}

/**
 * 决策解释
 */
export interface DecisionExplanation {
  decisionId: string;
  decisionType: string;
  explanation: string;
  evidence: any[];
  persona: 'ABU' | 'DR_DRE' | 'NEPTUNE';
  timestamp: string;
}

/**
 * 证据项
 */
export interface EvidenceItem {
  id: string;
  source: string;
  excerpt: string;
  relevance: string;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * 详情状态
 */
export interface DetailState {
  tripId: string;
  health: Health;
  statusUnderstanding: StatusUnderstanding;
  decisionExplanations: DecisionExplanation[];
  evidence: EvidenceItem[];
  lastUpdated: string;
}

/**
 * UI 输出
 */
export interface TripDetailUIOutput {
  status?: StatusUnderstanding;
  health?: Health;
  explanations?: DecisionExplanation[];
  evidence?: EvidenceItem[];
}

/**
 * 执行行程详情页响应
 */
export interface ExecuteTripDetailResponse {
  detailState: DetailState;
  uiOutput: TripDetailUIOutput;
}

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
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

/**
 * 处理API响应
 */
function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    console.error('[Trip Detail API] 无效的API响应:', response);
    throw new Error('无效的API响应');
  }

  if (!response.data.success) {
    const errorData = (response.data as ErrorResponse).error;
    const errorMessage = 
      errorData?.message || 
      errorData?.code || 
      '请求失败';
    const errorCode = errorData?.code || 'UNKNOWN_ERROR';
    
    console.error('[Trip Detail API] API 返回错误:', {
      code: errorCode,
      message: errorMessage,
      fullError: errorData,
      fullResponse: response.data,
    });
    
    throw new Error(errorMessage);
  }

  return response.data.data;
}

// ==================== API 实现 ====================

export const tripDetailApi = {
  /**
   * 执行行程详情页流程
   * POST /api/trip-detail/execute
   * 
   * 行程详情页的 Agent，负责"理解与掌控旅行现状"。
   */
  execute: async (
    data: ExecuteTripDetailRequest
  ): Promise<ExecuteTripDetailResponse> => {
    try {
      console.log('[Trip Detail API] 发送 execute 请求:', {
        tripId: data.tripId,
        action: data.action,
      });

      // 行程详情页 API 可能需要较长的处理时间，设置 60 秒超时
      const response = await apiClient.post<ApiResponseWrapper<ExecuteTripDetailResponse>>(
        '/trip-detail/execute',
        data,
        {
          timeout: 60000, // 60 秒超时
        }
      );

      // 详细记录响应结构，便于调试
      console.log('[Trip Detail API] 收到 execute 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
        responseKeys: response.data ? Object.keys(response.data) : [],
      });

      // 处理包装在 ApiResponseWrapper 中的响应
      const wrappedResponse = handleResponse(response);
      console.log('[Trip Detail API] 解析后的响应:', {
        tripId: wrappedResponse.detailState?.tripId,
        healthOverall: wrappedResponse.detailState?.health?.overall,
        currentPhase: wrappedResponse.detailState?.statusUnderstanding?.currentPhase,
        explanationsCount: wrappedResponse.detailState?.decisionExplanations?.length || 0,
        evidenceCount: wrappedResponse.detailState?.evidence?.length || 0,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Trip Detail API] execute 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        request: {
          tripId: data.tripId,
          action: data.action,
        },
      });

      // 确保 Axios 错误消息能够正确传播
      if (error.message) {
        throw error;
      }
      // 如果没有消息，创建一个友好的错误消息
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，行程详情页处理时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '行程详情页请求失败，请稍后重试');
      }
    }
  },

  /**
   * 获取行程状态（GET 方式）
   * GET /api/trip-detail/:tripId/status
   * 
   * 理解当前行程状态（规划中/进行中/已完成）。
   */
  getStatus: async (tripId: string): Promise<StatusUnderstanding> => {
    try {
      console.log('[Trip Detail API] 发送 getStatus 请求:', {
        tripId,
      });

      const response = await apiClient.get<ApiResponseWrapper<StatusUnderstanding>>(
        `/trip-detail/${tripId}/status`,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Trip Detail API] 收到 getStatus 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Trip Detail API] 解析后的响应:', {
        tripId,
        currentPhase: wrappedResponse.currentPhase,
        progress: wrappedResponse.progress,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Trip Detail API] getStatus 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        tripId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '获取行程状态失败，请稍后重试');
      }
    }
  },

  /**
   * 获取行程健康度（GET 方式）
   * GET /api/trip-detail/:tripId/health
   * 
   * 分析行程健康度（时间、预算、节奏、可达性）。
   */
  getHealth: async (tripId: string): Promise<Health> => {
    try {
      console.log('[Trip Detail API] 发送 getHealth 请求:', {
        tripId,
      });

      const response = await apiClient.get<ApiResponseWrapper<Health>>(
        `/trip-detail/${tripId}/health`,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Trip Detail API] 收到 getHealth 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Trip Detail API] 解析后的响应:', {
        tripId,
        overall: wrappedResponse.overall,
        dimensions: Object.keys(wrappedResponse.dimensions || {}),
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Trip Detail API] getHealth 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        tripId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '获取行程健康度失败，请稍后重试');
      }
    }
  },
};
