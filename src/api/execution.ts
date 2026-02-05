import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * 执行阶段操作类型
 */
export type ExecutionAction = 'remind' | 'handle_change' | 'fallback' | 'get_status';

/**
 * 提醒参数
 */
export interface RemindParams {
  reminderTypes?: string[];        // 提醒类型列表
  advanceHours?: number;           // 提前时间（小时，默认 24）
}

/**
 * 变更类型
 */
export type ChangeType = 
  | 'schedule_change' 
  | 'location_change' 
  | 'activity_cancelled' 
  | 'transport_delay' 
  | 'weather_impact' 
  | 'budget_overrun' 
  | 'user_request';

/**
 * 变更详情
 */
export interface ChangeDetails {
  itemId?: string;
  originalValue?: any;
  newValue?: any;
  reason?: string;
  delayMinutes?: number;            // ⚠️ 新增：延迟分钟数
}

/**
 * 变更参数
 */
export interface ChangeParams {
  changeType: ChangeType;
  changeDetails: ChangeDetails;
}

/**
 * 兜底参数
 */
export interface FallbackParams {
  triggerReason: string;           // 触发原因
  originalPlan?: any;              // 原计划（可选）
  itemId?: string;                 // ⚠️ 新增：指定要替换的行程项ID
}

/**
 * 执行执行阶段请求
 */
export interface ExecuteExecutionRequest {
  tripId: string;                    // 行程 ID（必填）
  action: ExecutionAction;            // 操作类型（必填）
  remindParams?: RemindParams;        // 提醒相关参数
  changeParams?: ChangeParams;         // 变更相关参数
  fallbackParams?: FallbackParams;    // 兜底相关参数
}

/**
 * 提醒项
 */
export interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string;
  triggerTime: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * 执行阶段状态
 */
export type ExecutionPhase = 'ON_TRIP' | 'CHANGE_HANDLING' | 'FALLBACK';

/**
 * 执行状态
 */
export interface ExecutionState {
  tripId: string;
  phase: ExecutionPhase;
  currentDay: number;
  currentDate: string;
  reminders: Reminder[];
  pendingChanges: any[];
  activeFallbacks: any[];
  lastUpdated: string;
}

/**
 * 执行状态 UI 输出
 */
export interface ExecutionStatusOutput {
  currentDay: number;
  currentDate: string;
  phase: string;
  activeIssues: number;
}

/**
 * 变更结果
 */
export interface ChangeResult {
  changeId?: string;
  changeType: string;
  success: boolean;
  message?: string;
  updatedSchedule?: {
    date: string;
    schedule: {
      items: Array<{
        placeId: number;
        placeName: string;
        startTime: string;
        endTime: string;
        status?: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
      }>;
    };
  };
}

/**
 * 修复方案
 */
export interface FallbackSolution {
  id: string;
  type: 'minimal' | 'experience' | 'safety';
  title: string;
  description: string;
  changes: Array<{
    itemId: string;
    action: 'modify' | 'remove' | 'add';
    newTime?: string;
    newPlace?: any;
  }>;
  impact: {
    arrivalTime: string;            // "10:15 (+15分钟)"
    missingPlaces: number;
    riskChange: 'low' | 'medium' | 'high';
  };
  recommended?: boolean;
}

/**
 * 修复方案计划
 */
export interface FallbackPlan {
  id: string;
  triggerReason: string;
  solutions: FallbackSolution[];
}

/**
 * UI 输出
 */
export interface ExecutionUIOutput {
  reminders?: Reminder[];
  changeResult?: ChangeResult;
  fallbackPlan?: FallbackPlan;
  status?: ExecutionStatusOutput;
}

/**
 * 执行执行阶段响应
 */
export interface ExecuteExecutionResponse {
  executionState: ExecutionState;
  uiOutput: ExecutionUIOutput;
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
    console.error('[Execution API] 无效的API响应:', response);
    throw new Error('无效的API响应');
  }

  if (!response.data.success) {
    const errorData = (response.data as ErrorResponse).error;
    const errorMessage = 
      errorData?.message || 
      errorData?.code || 
      '请求失败';
    const errorCode = errorData?.code || 'UNKNOWN_ERROR';
    
    console.error('[Execution API] API 返回错误:', {
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

/**
 * 重新排序请求
 */
export interface ReorderRequest {
  tripId: string;
  dayId: string;
  newOrder: string[];
  reason?: string;
}

/**
 * 重新排序响应
 */
export interface ReorderResponse {
  success: boolean;
  message?: string;
  updatedSchedule: {
    date: string;
    schedule: {
      items: Array<{
        placeId: number;
        placeName: string;
        startTime: string;
        endTime: string;
      }>;
    };
  };
  impact?: {
    timeAdjustments: Array<{
      itemId: string;
      originalTime: string;
      newTime: string;
    }>;
    conflicts?: Array<{
      type: string;
      message: string;
    }>;
  };
}

/**
 * 应用修复方案请求
 */
export interface ApplyFallbackRequest {
  tripId: string;
  solutionId: string;
  confirm?: boolean;
}

/**
 * 应用修复方案响应
 */
export interface ApplyFallbackResponse {
  success: boolean;
  message?: string;
  appliedChanges: Array<{
    itemId: string;
    action: 'modified' | 'removed' | 'added';
    details: any;
  }>;
  updatedSchedule: {
    date: string;
    schedule: {
      items: Array<{
        placeId: number;
        placeName: string;
        startTime: string;
        endTime: string;
      }>;
    };
  };
  impact: {
    arrivalTime: string;
    missingPlaces: number;
    riskChange: 'low' | 'medium' | 'high';
  };
}

/**
 * 预览修复方案响应
 */
export interface PreviewFallbackResponse {
  solutionId: string;
  type: 'minimal' | 'experience' | 'safety';
  title: string;
  description: string;
  changes: Array<{
    itemId: string;
    action: 'modify' | 'remove' | 'add';
    original?: {
      placeName: string;
      startTime: string;
      endTime: string;
    };
    modified?: {
      placeName: string;
      startTime: string;
      endTime: string;
    };
    reason?: string;
  }>;
  impact: {
    arrivalTime: string;
    missingPlaces: number;
    riskChange: 'low' | 'medium' | 'high';
  };
  timeline: {
    date: string;
    schedule: {
      items: Array<{
        placeId: number;
        placeName: string;
        startTime: string;
        endTime: string;
        status: 'unchanged' | 'modified' | 'new' | 'removed';
      }>;
    };
  };
}

export const executionApi = {
  /**
   * 执行执行阶段流程
   * POST /api/execution/execute
   * 
   * 执行阶段的 Agent，负责"贴心管家式的提醒、变更与兜底"。
   */
  execute: async (
    data: ExecuteExecutionRequest
  ): Promise<ExecuteExecutionResponse> => {
    try {
      console.log('[Execution API] 发送 execute 请求:', {
        tripId: data.tripId,
        action: data.action,
      });

      // ⚠️ 根据 action 类型设置不同的超时时间
      // - get_status: 60秒（快速响应）
      // - remind: 60秒（通常不需要 LLM）
      // - handle_change: 120秒（需要 LLM，可能较慢）
      // - fallback: 120秒（需要 LLM，可能较慢）
      const getTimeoutForAction = (action: ExecutionAction): number => {
        switch (action) {
          case 'get_status':
          case 'remind':
            return 60000; // 60 秒
          case 'handle_change':
          case 'fallback':
            return 120000; // 120 秒
          default:
            return 60000; // 默认 60 秒
        }
      };
      
      const timeout = getTimeoutForAction(data.action);
      
      const response = await apiClient.post<ApiResponseWrapper<ExecuteExecutionResponse>>(
        '/execution/execute',
        data,
        {
          timeout,
        }
      );

      // 详细记录响应结构，便于调试
      console.log('[Execution API] 收到 execute 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
        responseKeys: response.data ? Object.keys(response.data) : [],
      });

      // 处理包装在 ApiResponseWrapper 中的响应
      const wrappedResponse = handleResponse(response);
      console.log('[Execution API] 解析后的响应:', {
        tripId: wrappedResponse.executionState?.tripId,
        phase: wrappedResponse.executionState?.phase,
        currentDay: wrappedResponse.executionState?.currentDay,
        remindersCount: wrappedResponse.executionState?.reminders?.length || 0,
        pendingChangesCount: wrappedResponse.executionState?.pendingChanges?.length || 0,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Execution API] execute 请求失败:', {
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
        const timeoutSeconds = error.config?.timeout ? Math.round(error.config.timeout / 1000) : 60;
        const actionName = data.action === 'get_status' ? '获取状态' :
                          data.action === 'remind' ? '获取提醒' :
                          data.action === 'handle_change' ? '处理变更' :
                          data.action === 'fallback' ? '触发修复' : '执行操作';
        throw new Error(`请求超时（已等待 ${timeoutSeconds} 秒）。${actionName}操作可能需要较长时间，请稍后重试或检查后端服务状态`);
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '执行阶段请求失败，请稍后重试');
      }
    }
  },

  /**
   * 重新排序行程
   * POST /api/execution/reorder
   */
  reorder: async (
    data: ReorderRequest
  ): Promise<ReorderResponse> => {
    try {
      const response = await apiClient.post<ApiResponseWrapper<ReorderResponse>>(
        '/execution/reorder',
        data
      );
      return handleResponse(response);
    } catch (error: any) {
      console.error('[Execution API] reorder 请求失败:', error);
      throw error;
    }
  },

  /**
   * 应用修复方案
   * POST /api/execution/apply-fallback
   */
  applyFallback: async (
    data: ApplyFallbackRequest
  ): Promise<ApplyFallbackResponse> => {
    try {
      const response = await apiClient.post<ApiResponseWrapper<ApplyFallbackResponse>>(
        '/execution/apply-fallback',
        data
      );
      return handleResponse(response);
    } catch (error: any) {
      console.error('[Execution API] applyFallback 请求失败:', error);
      throw error;
    }
  },

  /**
   * 预览修复方案
   * GET /api/execution/fallback/:solutionId/preview
   */
  previewFallback: async (
    solutionId: string
  ): Promise<PreviewFallbackResponse> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<PreviewFallbackResponse>>(
        `/execution/fallback/${solutionId}/preview`
      );
      return handleResponse(response);
    } catch (error: any) {
      console.error('[Execution API] previewFallback 请求失败:', error);
      throw error;
    }
  },
};
