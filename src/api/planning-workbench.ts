import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * 目的地信息
 */
export interface Destination {
  country?: string;      // 国家代码（如 "JP", "IS"）
  city?: string;         // 城市名称
  region?: string;       // 区域名称
}

/**
 * 预算约束
 */
export interface BudgetConstraint {
  total?: number;      // 总预算
  currency?: string;  // 货币单位（默认 "CNY"）
}

/**
 * 体力约束
 */
export interface FitnessConstraint {
  level?: 'low' | 'medium' | 'high';  // 体力水平
  maxDailyAscentM?: number;           // 最大日爬升（米）
  maxDailyDistanceKm?: number;        // 最大日距离（公里）
  restDayFrequency?: number;          // 休息日频率（每 N 天一个休息日）
}

/**
 * 住宿约束
 */
export interface AccommodationConstraint {
  level?: 'budget' | 'mid' | 'luxury';  // 住宿档位
  type?: string[];                       // 住宿类型
}

/**
 * 同伴约束
 */
export interface CompanionsConstraint {
  count?: number;      // 同伴数量
  ages?: number[];     // 同伴年龄
  specialNeeds?: string[];  // 特殊需求
}

/**
 * 约束条件
 */
export interface Constraints {
  budget?: BudgetConstraint;
  fitness?: FitnessConstraint;
  accommodation?: AccommodationConstraint;
  companions?: CompanionsConstraint;
}

/**
 * 规划上下文
 */
export interface PlanningContext {
  destination: Destination;
  days: number;            // 行程天数（必填）
  travelMode?: 'self_drive' | 'public_transit' | 'walking' | 'mixed';  // 交通模式
  mustDo?: string[];       // 必去地点/活动
  mustAvoid?: string[];    // 必避地点/活动
  constraints?: Constraints;
}

/**
 * 用户操作类型
 */
export type UserAction = 'generate' | 'compare' | 'commit' | 'adjust';

/**
 * 执行规划工作台请求
 */
export interface ExecutePlanningWorkbenchRequest {
  context: PlanningContext;
  tripId?: string;           // 行程 ID（可选，用于关联现有行程）
  existingPlanState?: any;   // 现有 PlanState（可选，用于增量更新）
  userAction?: UserAction;   // 用户操作
}

/**
 * 证据项
 */
export interface EvidenceItem {
  source: string;
  excerpt: string;
  relevance: string;
}

/**
 * 推荐项
 */
export interface RecommendationItem {
  action: string;
  reason: string;
  impact: string;
}

/**
 * Abu 人格决策类型
 */
export type AbuVerdict = 'ALLOW' | 'NEED_CONFIRM' | 'REJECT';

/**
 * Dr.Dre 人格决策类型
 */
export type DrDreVerdict = 'ALLOW' | 'ADJUST' | 'NEED_CONFIRM';

/**
 * Neptune 人格决策类型
 */
export type NeptuneVerdict = 'ALLOW' | 'REPLACE' | 'NEED_CONFIRM';

/**
 * 通用人格决策类型（用于类型兼容）
 */
export type PersonaVerdict = 'ALLOW' | 'NEED_CONFIRM' | 'REJECT' | 'ADJUST' | 'REPLACE';

/**
 * Abu 人格输出
 */
export interface AbuPersonaOutput {
  persona: 'ABU';
  icon: '🐻‍❄️';
  slogan: '我负责：这条路，真的能走吗？';
  verdict: AbuVerdict;
  explanation: string;  // 面向用户的解释（第一人称）
  evidence: EvidenceItem[];
  recommendations?: RecommendationItem[];
  confirmations?: string[];
}

/**
 * Dr.Dre 人格输出
 */
export interface DrDrePersonaOutput {
  persona: 'DR_DRE';
  icon: '🐕';
  slogan: '别太累，我会让每一天刚刚好。';
  verdict: DrDreVerdict;
  explanation: string;
  evidence: EvidenceItem[];
  recommendations?: RecommendationItem[];
}

/**
 * Neptune 人格输出
 */
export interface NeptunePersonaOutput {
  persona: 'NEPTUNE';
  icon: '🦦';
  slogan: '如果行不通，我会给你一个刚刚好的替代。';
  verdict: NeptuneVerdict;
  explanation: string;
  evidence: EvidenceItem[];
  recommendations?: RecommendationItem[];
}

/**
 * 三人格输出
 */
export interface PersonasOutput {
  abu: AbuPersonaOutput | null;
  drdre: DrDrePersonaOutput | null;
  neptune: NeptunePersonaOutput | null;
}

/**
 * 综合决策状态
 */
export type ConsolidatedDecisionStatus = 'ALLOW' | 'NEED_CONFIRM' | 'REJECT';

/**
 * 综合决策
 */
export interface ConsolidatedDecision {
  status: ConsolidatedDecisionStatus;
  summary: string;
  nextSteps: string[];
}

/**
 * UI 输出
 */
export interface UIOutput {
  personas: PersonasOutput;
  consolidatedDecision: ConsolidatedDecision;
  timestamp: string;
}

/**
 * 规划状态
 */
export interface PlanState {
  plan_id: string;
  plan_version: number;
  constraints: any;
  itinerary: any;
  mobility: any;
  budget: any;
  pace: any;
  gate: any;
  evidence_refs: any[];
  decision_log_refs: any[];
  status: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
}

/**
 * 执行规划工作台响应
 */
export interface ExecutePlanningWorkbenchResponse {
  planState: PlanState;
  uiOutput: UIOutput;
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
    console.error('[Planning Workbench API] 无效的API响应:', response);
    throw new Error('无效的API响应');
  }

  if (!response.data.success) {
    const errorData = (response.data as ErrorResponse).error;
    const errorMessage = 
      errorData?.message || 
      errorData?.code || 
      '请求失败';
    const errorCode = errorData?.code || 'UNKNOWN_ERROR';
    
    console.error('[Planning Workbench API] API 返回错误:', {
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

export const planningWorkbenchApi = {
  /**
   * 执行规划工作台流程
   * POST /api/planning-workbench/execute
   * 
   * 规划工作台的主入口，支持生成方案、对比方案、提交方案、调整方案等操作。
   */
  execute: async (
    data: ExecutePlanningWorkbenchRequest
  ): Promise<ExecutePlanningWorkbenchResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 execute 请求:', {
        context: data.context,
        tripId: data.tripId,
        userAction: data.userAction,
      });

      // 规划工作台 API 可能需要更长的处理时间，设置 60 秒超时
      const response = await apiClient.post<ApiResponseWrapper<ExecutePlanningWorkbenchResponse>>(
        '/planning-workbench/execute',
        data,
        {
          timeout: 60000, // 60 秒超时
        }
      );

      // 详细记录响应结构，便于调试
      console.log('[Planning Workbench API] 收到 execute 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
        responseKeys: response.data ? Object.keys(response.data) : [],
      });

      // 处理包装在 ApiResponseWrapper 中的响应
      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        planId: wrappedResponse.planState?.plan_id,
        planVersion: wrappedResponse.planState?.plan_version,
        status: wrappedResponse.planState?.status,
        personas: {
          abu: wrappedResponse.uiOutput?.personas?.abu?.verdict,
          drdre: wrappedResponse.uiOutput?.personas?.drdre?.verdict,
          neptune: wrappedResponse.uiOutput?.personas?.neptune?.verdict,
        },
        consolidatedDecision: wrappedResponse.uiOutput?.consolidatedDecision?.status,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] execute 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        request: {
          context: data.context,
          tripId: data.tripId,
          userAction: data.userAction,
        },
      });

      // 确保 Axios 错误消息能够正确传播
      if (error.message) {
        throw error;
      }
      // 如果没有消息，创建一个友好的错误消息
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，规划工作台处理时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '规划工作台请求失败，请稍后重试');
      }
    }
  },

  /**
   * 获取规划状态
   * GET /api/planning-workbench/state/:planId
   * 
   * 根据 planId 获取当前的 PlanState（待实现）。
   */
  getState: async (planId: string): Promise<PlanState> => {
    try {
      console.log('[Planning Workbench API] 发送 getState 请求:', {
        planId,
      });

      const response = await apiClient.get<ApiResponseWrapper<PlanState>>(
        `/planning-workbench/state/${planId}`,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getState 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        planId: wrappedResponse.plan_id,
        planVersion: wrappedResponse.plan_version,
        status: wrappedResponse.status,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] getState 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '获取规划状态失败，请稍后重试');
      }
    }
  },
};
