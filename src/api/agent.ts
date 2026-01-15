import apiClient from './client';
import type { ClarificationQuestion } from '@/types/clarification';

// ==================== 类型定义 ====================

/**
 * LLM 提供商
 */
export type LLMProvider = 'auto' | 'openai' | 'deepseek' | 'gemini' | 'anthropic';

/**
 * 路由类型
 */
export type RouteType = 'SYSTEM1_API' | 'SYSTEM1_RAG' | 'SYSTEM2_REASONING' | 'SYSTEM2_WEBBROWSE';

/**
 * 结果状态
 */
export type ResultStatus = 'OK' | 'NEED_MORE_INFO' | 'NEED_CONSENT' | 'NEED_CONFIRMATION' | 'FAILED' | 'TIMEOUT' | 'REDIRECT_REQUIRED';

/**
 * UI 状态
 */
export type UIStatus = 'thinking' | 'browsing' | 'verifying' | 'repairing' | 'awaiting_consent' | 'awaiting_confirmation' | 'awaiting_user_input' | 'done' | 'failed';

/**
 * 对话上下文
 */
export interface ConversationContext {
  recent_messages?: string[];
  locale?: string;
  timezone?: string;
}

/**
 * 入口来源标识
 */
export type EntryPoint = 'trip_detail_page' | 'trip_list_page' | 'dashboard' | 'planning_workbench';

/**
 * 智能体执行选项
 */
export interface AgentOptions {
  dry_run?: boolean;
  allow_webbrowse?: boolean;
  max_seconds?: number;
  max_steps?: number;
  max_browser_steps?: number;
  cost_budget_usd?: number;
  llm_provider?: LLMProvider;  // LLM 提供商，默认 'auto'
  // 新增字段
  entry_point?: EntryPoint;  // 入口来源标识，用于权限控制和操作限制
  readonly_mode?: boolean;  // 只读模式标志，true 时限制为查询类操作
}

/**
 * 路由决策信息
 */
export interface RouteDecision {
  route: RouteType;
  confidence: number;
  reasons: string[];
  required_capabilities: string[];
  consent_required: boolean;
  budget: {
    max_seconds: number;
    max_steps: number;
    max_browser_steps: number;
  };
  ui_hint: {
    mode: 'fast' | 'slow';
    status: UIStatus;
    message: string;
  };
}

/**
 * 路由并执行请求
 */
export interface RouteAndRunRequest {
  request_id: string;
  user_id: string;
  trip_id?: string | null;
  message: string;
  conversation_context?: ConversationContext;
  options?: AgentOptions;
}

/**
 * 编排步骤
 */
export type OrchestrationStep = 
  | 'INTAKE' 
  | 'RESEARCH' 
  | 'GATE_EVAL' 
  | 'PLAN_GEN' 
  | 'VERIFY' 
  | 'REPAIR' 
  | 'NARRATE' 
  | 'DONE' 
  | 'FAILED';

/**
 * 子智能体类型
 */
export type SubAgentType = 
  | 'Orchestrator' 
  | 'Planner' 
  | 'Gatekeeper' 
  | 'Compliance' 
  | 'LocalInsight' 
  | 'CoreDecision' 
  | 'Narrator';

/**
 * 三人格类型
 */
export type GuardianType = 'ABU' | 'DR_DRE' | 'NEPTUNE';

/**
 * 决策日志项（新格式 - 完整格式）
 */
export interface DecisionLogEntry {
  request_id: string;
  step: OrchestrationStep;
  actor: SubAgentType;
  inputs_summary: string;
  outputs_summary: string;
  evidence_refs: string[];
  timestamp: string;
  metadata?: {
    duration_ms?: number;
    tool_calls?: number;
    cost_est_usd?: number;
    alternatives_considered?: number;
    guardian?: GuardianType;
    [key: string]: any;
  };
}

/**
 * 决策日志项（旧格式 - 向后兼容）
 * @deprecated 使用 DecisionLogEntry 替代
 */
export interface DecisionLogItem {
  step: number;
  chosen_action: string;
  reason_code?: string;
  confidence?: number;
  facts?: Record<string, any>;
  policy_id?: string;
}

/**
 * 可观测性指标
 */
export interface ObservabilityMetrics {
  latency_ms: number;
  router_ms: number;
  system_mode: 'SYSTEM1' | 'SYSTEM2' | 'REDIRECT';
  tool_calls: number;
  browser_steps: number;
  tokens_est: number;
  cost_est_usd: number;
  fallback_used: boolean;
}

/**
 * 审批挂起信息（当状态为 NEED_CONFIRMATION 时）
 */
export interface SuspensionInfo {
  approvalId: string;
  skillName: string;
  summary: string;
  payload: any;
}

/**
 * 错误类型
 */
export type ErrorType = 
  | 'CRITICAL_DEPENDENCY_MISSING'  // 关键依赖缺失：关键服务不可用，无法继续执行
  | 'MISSING_REQUIRED_PARAM'       // 缺少必需参数：缺少必需的信息，需要用户澄清
  | 'INSUFFICIENT_PERMISSIONS'     // 权限不足：用户没有执行该操作的权限
  | 'SERVICE_UNAVAILABLE'         // 服务不可用：外部服务暂时不可用
  | 'VALIDATION_ERROR'            // 验证错误：输入参数验证失败
  | 'TIMEOUT_ERROR'              // 超时错误：操作超时
  | 'UNKNOWN_ERROR';              // 未知错误：未分类的错误

/**
 * 重定向原因
 */
export type RedirectReason = 
  | 'READONLY_MODE_RESTRICTION'    // 只读模式限制
  | 'PLANNING_REQUEST_DETECTED'   // 检测到规划请求
  | 'INSUFFICIENT_PERMISSIONS'     // 权限不足
  | 'FEATURE_MIGRATED'            // 功能已迁移
  | 'MISSING_TRIP_ID';            // 缺少行程 ID

/**
 * 重定向信息
 */
export interface RedirectInfo {
  redirect_to: string;           // 重定向目标 URL（相对路径或绝对路径）
  redirect_reason: RedirectReason;  // 重定向原因
  original_request: {
    message: string;             // 原始请求消息（已脱敏，最多 200 字符）
    user_id: string;             // 原始用户 ID
    trip_id?: string;            // 原始行程 ID（如果存在）
  };
}

/**
 * 澄清信息（当状态为 NEED_MORE_INFO 时）
 */
export interface ClarificationInfo {
  needsUserConfirmation?: boolean;  // 是否需要用户确认
  clarificationMessage?: string;    // 用户友好的澄清消息（Markdown 格式）
  missingServices?: string[];       // 缺失的服务列表
  solutions?: string[];             // 解决方案列表
  errorType?: ErrorType;             // 错误类型
  impact?: string;                   // 影响说明（向后兼容）
  [key: string]: any;
}

/**
 * 路由并执行响应
 */
export interface RouteAndRunResponse {
  request_id: string;
  route: RouteDecision;
  ui_state?: {
    phase?: OrchestrationStep;
    ui_status?: UIStatus;
    progress_percent?: number;
    message?: string;
    requires_user_action?: boolean;
  };
  result: {
    status: ResultStatus;
    answer_text: string;
    payload?: {
      suspensionInfo?: SuspensionInfo;  // 审批挂起信息（当 status === 'NEED_CONFIRMATION' 时）
      clarificationInfo?: ClarificationInfo;  // 澄清信息（当 status === 'NEED_MORE_INFO' 时，向后兼容）
      // 新增字段
      redirectInfo?: RedirectInfo;  // 重定向信息（当 status === 'REDIRECT_REQUIRED' 时）
      // 澄清消息相关字段（统一在 payload 中）
      needsUserConfirmation?: boolean;
      clarificationMessage?: string;  // 向后兼容：简单字符串格式
      clarificationQuestions?: ClarificationQuestion[];  // 结构化澄清问题（Phase 1）
      missingServices?: string[];
      solutions?: string[];
      errorType?: ErrorType;
      // 授权相关字段（当 status === 'NEED_CONSENT' 时）
      consentMessage?: string;  // 授权消息
      requiredPermissions?: string[];  // 需要的权限列表
      consentWarning?: string;  // 授权警告
      // 其他字段
      timeline?: any[];
      dropped_items?: any[];
      candidates?: any[];
      evidence?: any[];
      robustness?: number | null;
      orchestrationResult?: {
        state?: any;
        itinerary?: any;
        gate_result?: any;
        decision_log?: DecisionLogEntry[];
      };
      [key: string]: any;
    };
  };
  explain: {
    decision_log: DecisionLogEntry[] | DecisionLogItem[];  // 支持新旧两种格式
  };
  observability: ObservabilityMetrics;
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
    console.error('[Agent API] 无效的API响应:', response);
    throw new Error('无效的API响应');
  }

  if (!response.data.success) {
    // 尝试从多个可能的位置提取错误信息
    const errorData = (response.data as ErrorResponse).error;
    const errorMessage = 
      errorData?.message || 
      errorData?.code || 
      (typeof errorData === 'string' ? errorData : null) ||
      '请求失败';
    const errorCode = errorData?.code || 'UNKNOWN_ERROR';
    
    console.error('[Agent API] API 返回错误:', {
      code: errorCode,
      message: errorMessage,
      fullError: errorData,
      fullResponse: response.data,
      responseType: typeof response.data,
      hasError: !!errorData,
    });
    
    throw new Error(errorMessage);
  }

  return response.data.data;
}

// ==================== API 实现 ====================

export const agentApi = {
  /**
   * 智能体统一入口 - 路由并执行
   * POST /agent/route_and_run
   * 接口 44: 根据用户输入自动路由到 System 1 或 System 2
   */
  routeAndRun: async (data: RouteAndRunRequest): Promise<RouteAndRunResponse> => {
    try {
      console.log('[Agent API] 发送 route_and_run 请求:', {
        request_id: data.request_id,
        user_id: data.user_id,
        trip_id: data.trip_id,
        message: data.message,
        options: data.options,
      });

      // Agent API 可能需要更长的处理时间，设置 30 秒超时
      const response = await apiClient.post<ApiResponseWrapper<RouteAndRunResponse>>(
        '/agent/route_and_run',
        data,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      // 详细记录响应结构，便于调试
      const hasError = response.data && !response.data.success && 'error' in response.data;
      console.log('[Agent API] 收到 route_and_run 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
        hasError: hasError,
        responseKeys: response.data ? Object.keys(response.data) : [],
        fullResponse: response.data,
      });

      // 如果响应格式不符合预期，尝试直接返回
      if (response.data && !('success' in response.data)) {
        // 响应可能直接是 RouteAndRunResponse，而不是包装在 ApiResponseWrapper 中
        console.warn('[Agent API] 响应格式不符合预期，尝试直接解析:', response.data);
        // 检查是否包含 route 和 result 字段（RouteAndRunResponse 的特征）
        if ('route' in response.data && 'result' in response.data) {
          const directResponse = response.data as RouteAndRunResponse;
          console.log('[Agent API] 直接解析响应成功:', {
            request_id: directResponse.request_id,
            route: directResponse.route?.route,
            status: directResponse.result?.status,
            answer_text: directResponse.result?.answer_text,
          });
          return directResponse;
        }
      }

      // 处理包装在 ApiResponseWrapper 中的响应
      const wrappedResponse = handleResponse(response);
      console.log('[Agent API] 解析后的响应:', {
        request_id: wrappedResponse.request_id,
        route: wrappedResponse.route?.route,
        status: wrappedResponse.result?.status,
        answer_text: wrappedResponse.result?.answer_text,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Agent API] route_and_run 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        request: {
          request_id: data.request_id,
          user_id: data.user_id,
          trip_id: data.trip_id,
        },
      });

      // 确保 Axios 错误消息能够正确传播
      // client.ts 的拦截器已经设置了 error.message，直接抛出即可
      if (error.message) {
        throw error;
      }
      // 如果没有消息，创建一个友好的错误消息
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请检查后端服务是否正常运行');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '请求失败，请稍后重试');
      }
    }
  },
};

