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
  originalPlan: any;               // 原计划
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
 * UI 输出
 */
export interface ExecutionUIOutput {
  reminders?: Reminder[];
  changeResult?: any;
  fallbackPlan?: any;
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

      // 执行阶段 API 可能需要较长的处理时间，设置 60 秒超时
      const response = await apiClient.post<ApiResponseWrapper<ExecuteExecutionResponse>>(
        '/execution/execute',
        data,
        {
          timeout: 60000, // 60 秒超时
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
        throw new Error('请求超时，执行阶段处理时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '执行阶段请求失败，请稍后重试');
      }
    }
  },
};
