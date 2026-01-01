import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * LLM 提供商
 */
export type LLMProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'DEEPSEEK';

/**
 * 路由类型
 */
export type RouteType = 'SYSTEM1_API' | 'SYSTEM1_RAG' | 'SYSTEM2_REASONING' | 'SYSTEM2_WEBBROWSE';

/**
 * 结果状态
 */
export type ResultStatus = 'OK' | 'NEED_MORE_INFO' | 'NEED_CONSENT' | 'NEED_CONFIRMATION' | 'FAILED' | 'TIMEOUT';

/**
 * UI 状态
 */
export type UIStatus = 'thinking' | 'browsing' | 'verifying' | 'repairing' | 'awaiting_consent' | 'awaiting_confirmation' | 'done' | 'failed';

/**
 * 对话上下文
 */
export interface ConversationContext {
  recent_messages?: string[];
  locale?: string;
  timezone?: string;
}

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
 * 决策日志项
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
  system_mode: 'SYSTEM1' | 'SYSTEM2';
  tool_calls: number;
  browser_steps: number;
  tokens_est: number;
  cost_est_usd: number;
  fallback_used: boolean;
}

/**
 * 路由并执行响应
 */
export interface RouteAndRunResponse {
  request_id: string;
  route: RouteDecision;
  result: {
    status: ResultStatus;
    answer_text: string;
    payload: any;
  };
  explain: {
    decision_log: DecisionLogItem[];
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
    throw new Error('无效的API响应');
  }

  if (!response.data.success) {
    throw new Error(response.data.error?.message || '请求失败');
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
      // Agent API 可能需要更长的处理时间，设置 30 秒超时
      const response = await apiClient.post<ApiResponseWrapper<RouteAndRunResponse>>(
        '/agent/route_and_run',
        data,
        {
          timeout: 30000, // 30 秒超时
        }
      );
      return handleResponse(response);
    } catch (error: any) {
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

