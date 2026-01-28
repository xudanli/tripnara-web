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
  total?: number;           // 总预算（必填，单位：CNY）
  currency?: string;        // 货币单位（默认 "CNY"）
  dailyBudget?: number;     // 日均预算（可选，自动计算或手动设置）
  categoryLimits?: {        // 分类预算限制（可选）
    accommodation?: number;
    transportation?: number;
    food?: number;
    activities?: number;
    other?: number;
  };
  alertThreshold?: number;  // 预警阈值（默认 0.8，即 80%）
  createdAt?: string;       // 创建时间
  updatedAt?: string;       // 更新时间
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
 * 提交方案选项
 */
export interface CommitPlanOptions {
  partialCommit?: boolean;      // 是否部分提交
  commitDays?: number[];         // 要提交的天数（如果部分提交）
}

/**
 * 提交方案请求
 */
export interface CommitPlanRequest {
  tripId: string;
  options?: CommitPlanOptions;
}

/**
 * 提交方案响应
 */
export interface CommitPlanResponse {
  tripId: string;
  planId: string;
  committedAt: string;
  changes: {
    added: number;
    modified: number;
    removed: number;
  };
}

/**
 * 方案摘要（用于列表展示）
 */
export interface PlanSummary {
  planId: string;
  planVersion: number;
  status: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
  createdAt: string;
  updatedAt: string;
  summary?: {
    itemCount: number;
    days: number;
    budget?: { total: number; currency: string };
    consolidatedDecision?: { status: string; summary: string };
    personas?: {
      abu?: { verdict: string };
      drdre?: { verdict: string };
      neptune?: { verdict: string };
    };
  };
}

/**
 * 当前方案信息
 */
export interface CurrentPlan {
  planId: string;
  planVersion: number;
  status: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
  planState: PlanState;
  uiOutput: UIOutput;
  createdAt: string;
  updatedAt: string;
}

/**
 * 行程工作台数据
 */
export interface TripWorkbench {
  tripId: string;
  currentPlan?: CurrentPlan;
  planHistory: PlanSummary[];
  workbenchStatus: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
}

/**
 * 方案列表响应
 */
export interface TripPlansResponse {
  plans: PlanSummary[];
  total: number;
  hasMore: boolean;
}

/**
 * 方案详情
 */
export interface PlanDetail {
  planId: string;
  planVersion: number;
  tripId: string;
  status: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
  planState: PlanState;
  uiOutput: UIOutput;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * 对比方案请求
 */
export interface ComparePlansRequest {
  planIds: string[];              // 要对比的方案 ID 列表（至少 2 个）
  compareFields?: string[];      // 要对比的字段（可选）
}

/**
 * 方案差异
 */
export interface PlanDifference {
  field: string;
  plan1Value: any;
  plan2Value: any;
  impact: 'low' | 'medium' | 'high';
  description?: string;
}

/**
 * 对比摘要
 */
export interface CompareSummary {
  bestBudget?: string;
  bestRoute?: string;
  bestTime?: string;
  recommendations?: string[];
}

/**
 * 对比方案响应
 */
export interface ComparePlansResponse {
  plans: Array<{
    planId: string;
    planVersion: number;
    planState: PlanState;
    uiOutput: UIOutput;
  }>;
  differences: PlanDifference[];
  summary: CompareSummary;
}

/**
 * 调整类型
 */
export type AdjustmentType = 'add_place' | 'remove_place' | 'modify_constraint' | 'change_day' | 'modify_budget';

/**
 * 调整项
 */
export interface Adjustment {
  type: AdjustmentType;
  data: any;
}

/**
 * 调整方案请求
 */
export interface AdjustPlanRequest {
  adjustments: Adjustment[];
  regenerate?: boolean;  // 是否重新生成方案，默认 true
}

/**
 * 变更项
 */
export interface PlanChange {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

/**
 * 调整方案响应
 */
export interface AdjustPlanResponse {
  newPlanId: string;
  newPlanVersion: number;
  planState: PlanState;
  uiOutput: UIOutput;
  changes: PlanChange[];
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

// ==================== 准备度入口类型定义 ====================

/**
 * 准备度发现项
 */
export interface ReadinessFindingItem {
  id?: string;
  message: string;
  category?: string;
  tasks?: string[];
  evidence?: string;
}

/**
 * 准备度发现
 */
export interface ReadinessFinding {
  destinationId: string;
  packId: string;
  blockers: ReadinessFindingItem[];
  must: ReadinessFindingItem[];
  should: ReadinessFindingItem[];
  optional: ReadinessFindingItem[];
}

/**
 * 准备度汇总
 */
export interface ReadinessSummary {
  totalBlockers: number;
  totalMust: number;
  totalShould: number;
  totalOptional: number;
}

/**
 * 准备度快捷链接
 */
export interface ReadinessQuickLinks {
  personalizedChecklist: string;
  riskWarnings: string;
  readinessScore: string;
  coverageMap: string;
}

/**
 * 行程准备度响应
 */
export interface TripReadinessResponse {
  findings: ReadinessFinding[];
  summary: ReadinessSummary;
  readinessUrl: string;
  quickLinks: ReadinessQuickLinks;
}

/**
 * 行程准备度分数链接响应
 */
export interface TripReadinessScoreLinksResponse {
  message: string;
  readinessScoreUrl: string;
  readinessChecklistUrl: string;
  readinessRiskWarningsUrl: string;
  readinessCoverageMapUrl: string;
}

/**
 * 天气数据获取结果项
 */
export interface WeatherFetchResultItem {
  placeId: number;
  placeName: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  weatherData?: {
    temperature: number;
    condition: string;
    source: string;
  };
}

/**
 * 天气数据获取响应
 */
export interface FetchWeatherResponse {
  totalPlaces: number;
  processedPlaces: number;
  successCount: number;
  failedCount: number;
  results: WeatherFetchResultItem[];
}

/**
 * 证据类型
 */
export type EvidenceType = 'weather' | 'road_closure' | 'opening_hours';

/**
 * 证据数据获取结果项
 */
export interface EvidenceFetchResultItem {
  placeId: number;
  placeName: string;
  evidenceTypes: EvidenceType[];
  status: 'success' | 'partial' | 'failed';
  errors?: Record<string, string>; // 错误信息，key 为证据类型
  fetched?: {
    weather?: {
      temperature: number;
      condition: string;
      source: string;
    };
    road_closure?: {
      isOpen: boolean;
      riskLevel: number;
      source: string;
    };
    opening_hours?: {
      hours: string;
      isOpen: boolean;
      source: string;
    };
  };
}

/**
 * 证据数据获取响应
 */
export interface FetchEvidenceResponse {
  totalPlaces: number;
  processedPlaces: number;
  successCount: number;
  partialCount: number;
  failedCount: number;
  requestedEvidenceTypes: EvidenceType[];
  results: EvidenceFetchResultItem[];
}

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

  /**
   * 提交方案到行程
   * POST /api/planning-workbench/plans/:planId/commit
   * 
   * 将规划方案提交并保存到行程。
   */
  commitPlan: async (
    planId: string,
    data: CommitPlanRequest
  ): Promise<CommitPlanResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 commitPlan 请求:', {
        planId,
        tripId: data.tripId,
        options: data.options,
      });

      const response = await apiClient.post<ApiResponseWrapper<CommitPlanResponse>>(
        `/planning-workbench/plans/${planId}/commit`,
        data,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 commitPlan 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        tripId: wrappedResponse.tripId,
        planId: wrappedResponse.planId,
        committedAt: wrappedResponse.committedAt,
        changes: wrappedResponse.changes,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] commitPlan 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId,
        tripId: data.tripId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '提交方案失败，请稍后重试');
      }
    }
  },

  /**
   * 获取指定行程的规划工作台数据
   * GET /api/planning-workbench/trips/:tripId
   * 
   * 获取工作台数据，包括当前方案和方案历史列表。
   */
  getTripWorkbench: async (tripId: string): Promise<TripWorkbench> => {
    try {
      console.log('[Planning Workbench API] 发送 getTripWorkbench 请求:', {
        tripId,
      });

      const response = await apiClient.get<ApiResponseWrapper<TripWorkbench>>(
        `/planning-workbench/trips/${tripId}`,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getTripWorkbench 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        tripId: wrappedResponse.tripId,
        hasCurrentPlan: !!wrappedResponse.currentPlan,
        planHistoryCount: wrappedResponse.planHistory.length,
        workbenchStatus: wrappedResponse.workbenchStatus,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] getTripWorkbench 请求失败:', {
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
        throw new Error(error.message || '获取工作台数据失败，请稍后重试');
      }
    }
  },

  /**
   * 获取指定行程的所有规划方案列表
   * GET /api/planning-workbench/trips/:tripId/plans
   * 
   * 获取方案列表，支持状态筛选和分页。
   */
  getTripPlans: async (
    tripId: string,
    params?: {
      status?: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
      limit?: number;
      offset?: number;
    }
  ): Promise<TripPlansResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 getTripPlans 请求:', {
        tripId,
        params,
      });

      const response = await apiClient.get<ApiResponseWrapper<TripPlansResponse>>(
        `/planning-workbench/trips/${tripId}/plans`,
        {
          params,
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getTripPlans 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        plansCount: wrappedResponse.plans.length,
        total: wrappedResponse.total,
        hasMore: wrappedResponse.hasMore,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] getTripPlans 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        tripId,
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
        throw new Error(error.message || '获取方案列表失败，请稍后重试');
      }
    }
  },

  /**
   * 获取指定方案的详细信息
   * GET /api/planning-workbench/plans/:planId
   * 
   * 获取方案的完整信息，包括 planState 和 uiOutput。
   */
  getPlan: async (planId: string): Promise<PlanDetail> => {
    try {
      console.log('[Planning Workbench API] 发送 getPlan 请求:', {
        planId,
      });

      const response = await apiClient.get<ApiResponseWrapper<PlanDetail>>(
        `/planning-workbench/plans/${planId}`,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getPlan 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        planId: wrappedResponse.planId,
        planVersion: wrappedResponse.planVersion,
        tripId: wrappedResponse.tripId,
        status: wrappedResponse.status,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] getPlan 请求失败:', {
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
        throw new Error(error.message || '获取方案详情失败，请稍后重试');
      }
    }
  },

  /**
   * 对比多个规划方案
   * POST /api/planning-workbench/plans/compare
   * 
   * 对比多个方案，生成差异列表和摘要。
   */
  comparePlans: async (data: ComparePlansRequest): Promise<ComparePlansResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 comparePlans 请求:', {
        planIds: data.planIds,
        compareFields: data.compareFields,
      });

      const response = await apiClient.post<ApiResponseWrapper<ComparePlansResponse>>(
        '/planning-workbench/plans/compare',
        data,
        {
          timeout: 60000, // 60 秒超时（对比可能需要较长时间）
        }
      );

      console.log('[Planning Workbench API] 收到 comparePlans 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        plansCount: wrappedResponse.plans.length,
        differencesCount: wrappedResponse.differences.length,
        hasSummary: !!wrappedResponse.summary,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] comparePlans 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planIds: data.planIds,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，对比处理时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '对比方案失败，请稍后重试');
      }
    }
  },

  /**
   * 基于现有方案进行调整
   * POST /api/planning-workbench/plans/:planId/adjust
   * 
   * 调整方案并可选地重新生成。
   */
  adjustPlan: async (
    planId: string,
    data: AdjustPlanRequest
  ): Promise<AdjustPlanResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 adjustPlan 请求:', {
        planId,
        adjustments: data.adjustments,
        regenerate: data.regenerate,
      });

      const response = await apiClient.post<ApiResponseWrapper<AdjustPlanResponse>>(
        `/planning-workbench/plans/${planId}/adjust`,
        data,
        {
          timeout: 60000, // 60 秒超时（调整可能需要重新生成）
        }
      );

      console.log('[Planning Workbench API] 收到 adjustPlan 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        newPlanId: wrappedResponse.newPlanId,
        newPlanVersion: wrappedResponse.newPlanVersion,
        changesCount: wrappedResponse.changes.length,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] adjustPlan 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId,
        adjustments: data.adjustments,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，调整处理时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '调整方案失败，请稍后重试');
      }
    }
  },

  /**
   * 预算合理性评估（Should-Exist Gate）
   * POST /planning-workbench/budget/evaluate
   */
  evaluateBudget: async (
    data: {
      planId: string;
      tripId: string;
      estimatedCost: number;
      categoryBreakdown: {
        accommodation: number;
        transportation: number;
        food: number;
        activities: number;
        other: number;
      };
      budgetConstraint: BudgetConstraint;
    }
  ): Promise<import('@/types/trip').BudgetEvaluationResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 evaluateBudget 请求:', {
        planId: data.planId,
        tripId: data.tripId,
        estimatedCost: data.estimatedCost,
      });

      const response = await apiClient.post<ApiResponseWrapper<import('@/types/trip').BudgetEvaluationResponse>>(
        '/planning-workbench/budget/evaluate',
        data,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 evaluateBudget 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        verdict: wrappedResponse.verdict,
        confidence: wrappedResponse.confidence,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] evaluateBudget 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId: data.planId,
        tripId: data.tripId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '预算评估失败，请稍后重试');
      }
    }
  },

  /**
   * 获取预算决策日志
   * GET /planning-workbench/budget/decision-log
   */
  getBudgetDecisionLog: async (
    planId: string,
    tripId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<import('@/types/trip').BudgetDecisionLogResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 getBudgetDecisionLog 请求:', {
        planId,
        tripId,
        params,
      });

      const response = await apiClient.get<ApiResponseWrapper<import('@/types/trip').BudgetDecisionLogResponse>>(
        '/planning-workbench/budget/decision-log',
        {
          params: {
            planId,
            tripId,
            ...(params?.limit !== undefined && { limit: params.limit }),
            ...(params?.offset !== undefined && { offset: params.offset }),
          },
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getBudgetDecisionLog 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        total: wrappedResponse.total,
        itemsCount: wrappedResponse.items.length,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] getBudgetDecisionLog 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId,
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
        throw new Error(error.message || '获取预算决策日志失败，请稍后重试');
      }
    }
  },

  /**
   * 应用预算优化建议
   * POST /planning-workbench/budget/apply-optimization
   */
  applyBudgetOptimization: async (
    data: import('@/types/trip').ApplyBudgetOptimizationRequest
  ): Promise<import('@/types/trip').ApplyBudgetOptimizationResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 applyBudgetOptimization 请求:', {
        planId: data.planId,
        tripId: data.tripId,
        optimizationIds: data.optimizationIds,
        autoCommit: data.autoCommit,
      });

      const response = await apiClient.post<ApiResponseWrapper<import('@/types/trip').ApplyBudgetOptimizationResponse>>(
        '/planning-workbench/budget/apply-optimization',
        data,
        {
          timeout: 60000, // 60 秒超时（优化可能需要较长时间）
        }
      );

      console.log('[Planning Workbench API] 收到 applyBudgetOptimization 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        planId: wrappedResponse.planId,
        newPlanId: wrappedResponse.newPlanId,
        totalSavings: wrappedResponse.totalSavings,
        newEstimatedCost: wrappedResponse.newEstimatedCost,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] applyBudgetOptimization 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId: data.planId,
        tripId: data.tripId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，优化处理时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '应用预算优化失败，请稍后重试');
      }
    }
  },

  /**
   * 获取规划方案预算评估结果
   * GET /planning-workbench/plans/:planId/budget-evaluation
   */
  getPlanBudgetEvaluation: async (
    planId: string
  ): Promise<import('@/types/trip').PlanBudgetEvaluationResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 getPlanBudgetEvaluation 请求:', {
        planId,
      });

      const response = await apiClient.get<ApiResponseWrapper<import('@/types/trip').PlanBudgetEvaluationResponse>>(
        `/planning-workbench/plans/${planId}/budget-evaluation`,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getPlanBudgetEvaluation 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        planId: wrappedResponse.planId,
        verdict: wrappedResponse.budgetEvaluation.verdict,
        personaOutput: wrappedResponse.personaOutput?.persona,
      });

      return wrappedResponse;
    } catch (error: any) {
      // 区分不同类型的错误
      const errorMessage = error?.message || '';
      const isNotFoundError = 
        errorMessage.includes('未找到') || 
        errorMessage.includes('not found') ||
        errorMessage.includes('不存在') ||
        error?.code === 'NOT_FOUND' ||
        error?.response?.status === 404;
      
      if (isNotFoundError) {
        // "未找到"错误使用警告级别，因为预算评估是可选的
        console.warn('[Planning Workbench API] ⚠️ 预算评估结果不存在（方案可能尚未进行预算评估）:', {
          planId,
          message: errorMessage,
        });
      } else {
        // 其他错误使用错误级别
        console.error('[Planning Workbench API] ❌ getPlanBudgetEvaluation 请求失败:', {
          error,
          message: errorMessage,
          code: error.code,
          response: error.response?.data,
          planId,
        });
      }

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '获取预算评估结果失败，请稍后重试');
      }
    }
  },

  // ==================== 准备度入口 API ====================

  /**
   * 获取行程准备度检查结果
   * GET /api/planning-workbench/trips/:tripId/readiness
   * 
   * 从规划工作台获取指定行程的准备度检查结果
   */
  getTripReadiness: async (tripId: string, lang?: 'en' | 'zh'): Promise<TripReadinessResponse> => {
    try {
      const params = lang ? { lang } : {};
      const response = await apiClient.get<ApiResponseWrapper<TripReadinessResponse>>(
        `/planning-workbench/trips/${tripId}/readiness`,
        { params }
      );
      return handleResponse(response);
    } catch (error: any) {
      console.error('[Planning Workbench API] ❌ getTripReadiness 请求失败:', {
        error,
        tripId,
        lang,
      });
      throw error;
    }
  },

  /**
   * 获取行程准备度分数链接
   * GET /api/planning-workbench/trips/:tripId/readiness/score
   * 
   * 获取准备度分数相关的 API 链接
   */
  getTripReadinessScoreLinks: async (tripId: string): Promise<TripReadinessScoreLinksResponse> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<TripReadinessScoreLinksResponse>>(
        `/planning-workbench/trips/${tripId}/readiness/score`
      );
      return handleResponse(response);
    } catch (error: any) {
      console.error('[Planning Workbench API] ❌ getTripReadinessScoreLinks 请求失败:', {
        error,
        tripId,
      });
      throw error;
    }
  },

  // ==================== 证据数据获取 API ====================

  /**
   * 批量获取行程地点的所有类型证据数据（推荐）
   * POST /api/planning-workbench/trips/:tripId/fetch-evidence
   * 
   * 为指定行程的地点批量获取所有类型的证据数据（天气、道路封闭、开放时间），
   * 证据数据会自动更新到 Place 的 metadata 中
   * 
   * @param tripId 行程 ID
   * @param options 选项
   * @param options.placeIds 指定要获取证据的地点 ID 列表，不提供则处理所有缺少证据的地点
   * @param options.evidenceTypes 要获取的证据类型，不提供则获取所有类型
   * @param options.forceRefresh 是否强制刷新已有证据数据，默认为 false
   */
  fetchEvidence: async (
    tripId: string,
    options?: {
      placeIds?: number[];
      evidenceTypes?: EvidenceType[];
      forceRefresh?: boolean;
    }
  ): Promise<FetchEvidenceResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 fetchEvidence 请求:', {
        tripId,
        options,
      });

      const params: Record<string, string> = {};
      if (options?.placeIds && options.placeIds.length > 0) {
        params.placeIds = options.placeIds.join(',');
      }
      if (options?.evidenceTypes && options.evidenceTypes.length > 0) {
        params.evidenceTypes = options.evidenceTypes.join(',');
      }
      if (options?.forceRefresh) {
        params.forceRefresh = 'true';
      }
      
      const response = await apiClient.post<ApiResponseWrapper<FetchEvidenceResponse>>(
        `/planning-workbench/trips/${tripId}/fetch-evidence`,
        {},
        { 
          params,
          timeout: 60000, // 60 秒超时（批量获取可能需要较长时间）
        }
      );

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] ✅ fetchEvidence 成功:', {
        totalPlaces: wrappedResponse.totalPlaces,
        processedPlaces: wrappedResponse.processedPlaces,
        successCount: wrappedResponse.successCount,
        partialCount: wrappedResponse.partialCount,
        failedCount: wrappedResponse.failedCount,
        requestedEvidenceTypes: wrappedResponse.requestedEvidenceTypes,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] ❌ fetchEvidence 请求失败:', {
        error,
        tripId,
        options,
        message: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  },

  /**
   * 批量获取行程地点的天气数据
   * POST /api/planning-workbench/trips/:tripId/fetch-weather
   * 
   * 为指定行程的地点批量获取天气数据，天气数据会自动更新到 Place 的 metadata 中
   * 
   * @deprecated 推荐使用 fetchEvidence 接口，可以一次性获取所有类型的证据数据
   */
  fetchWeather: async (
    tripId: string,
    options?: {
      placeIds?: number[];
      forceRefresh?: boolean;
    }
  ): Promise<FetchWeatherResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 fetchWeather 请求:', {
        tripId,
        options,
      });

      const params: Record<string, string> = {};
      if (options?.placeIds && options.placeIds.length > 0) {
        params.placeIds = options.placeIds.join(',');
      }
      if (options?.forceRefresh) {
        params.forceRefresh = 'true';
      }
      
      const response = await apiClient.post<ApiResponseWrapper<FetchWeatherResponse>>(
        `/planning-workbench/trips/${tripId}/fetch-weather`,
        {},
        { 
          params,
          timeout: 60000, // 60 秒超时
        }
      );

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] ✅ fetchWeather 成功:', {
        totalPlaces: wrappedResponse.totalPlaces,
        processedPlaces: wrappedResponse.processedPlaces,
        successCount: wrappedResponse.successCount,
        failedCount: wrappedResponse.failedCount,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] ❌ fetchWeather 请求失败:', {
        error,
        tripId,
        options,
        message: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  },
};
