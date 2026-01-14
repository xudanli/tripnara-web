/**
 * Agent 错误类型工具
 * 
 * 用于推断错误类型和处理策略
 */

import type { ErrorType } from '@/api/agent';

/**
 * 错误处理策略
 */
export interface ErrorHandlingStrategy {
  shouldReject: boolean;              // 是否应该拒绝请求
  shouldShowClarification: boolean;   // 是否应该显示澄清消息
  allowRetry: boolean;                // 是否允许重试
  requiresUserConfirmation: boolean;  // 是否需要用户确认
  messageTemplate: string;            // 错误消息模板
  suggestedSolutions: string[];       // 建议的解决方案
}

/**
 * 推断错误类型
 */
export function inferErrorType(error: any): ErrorType {
  const errorMessage = error?.message || error?.clarificationMessage || '';
  const errorCode = error?.code || error?.errorType || '';

  // 根据错误代码推断
  if (errorCode === 'CRITICAL_DEPENDENCY_MISSING' || errorMessage.includes('关键依赖')) {
    return 'CRITICAL_DEPENDENCY_MISSING';
  }
  if (errorCode === 'MISSING_REQUIRED_PARAM' || 
      errorMessage.includes('缺少') || 
      errorMessage.includes('必需') ||
      errorMessage.includes('必须提供')) {  // 支持 "必须提供 world 或 tripId" 这样的错误消息
    return 'MISSING_REQUIRED_PARAM';
  }
  if (errorCode === 'INSUFFICIENT_PERMISSIONS' || errorMessage.includes('权限') || errorMessage.includes('permission')) {
    return 'INSUFFICIENT_PERMISSIONS';
  }
  if (errorCode === 'SERVICE_UNAVAILABLE' || errorMessage.includes('服务不可用') || errorMessage.includes('unavailable')) {
    return 'SERVICE_UNAVAILABLE';
  }
  if (errorCode === 'VALIDATION_ERROR' || errorMessage.includes('验证') || errorMessage.includes('validation')) {
    return 'VALIDATION_ERROR';
  }
  if (errorCode === 'TIMEOUT_ERROR' || errorMessage.includes('超时') || errorMessage.includes('timeout')) {
    return 'TIMEOUT_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * 获取错误处理策略
 */
export function getErrorHandlingStrategy(errorType: ErrorType): ErrorHandlingStrategy {
  const strategies: Record<ErrorType, ErrorHandlingStrategy> = {
    CRITICAL_DEPENDENCY_MISSING: {
      shouldReject: true,
      shouldShowClarification: true,
      allowRetry: false,
      requiresUserConfirmation: false,
      messageTemplate: '关键依赖服务不可用，无法继续执行',
      suggestedSolutions: [
        '检查服务状态',
        '联系系统管理员',
        '稍后重试',
      ],
    },
    MISSING_REQUIRED_PARAM: {
      shouldReject: false,
      shouldShowClarification: true,
      allowRetry: true,
      requiresUserConfirmation: false,
      messageTemplate: '缺少必需的信息，需要您提供更多详情',
      suggestedSolutions: [
        '请提供缺失的信息',
        '或使用已保存的行程 ID',
      ],
    },
    INSUFFICIENT_PERMISSIONS: {
      shouldReject: true,
      shouldShowClarification: true,
      allowRetry: false,
      requiresUserConfirmation: false,
      messageTemplate: '您没有执行该操作的权限',
      suggestedSolutions: [
        '请切换到有权限的页面',
        '或联系管理员',
      ],
    },
    SERVICE_UNAVAILABLE: {
      shouldReject: false,
      shouldShowClarification: true,
      allowRetry: true,
      requiresUserConfirmation: false,
      messageTemplate: '外部服务暂时不可用',
      suggestedSolutions: [
        '稍后重试',
        '检查网络连接',
      ],
    },
    VALIDATION_ERROR: {
      shouldReject: false,
      shouldShowClarification: true,
      allowRetry: true,
      requiresUserConfirmation: false,
      messageTemplate: '输入参数验证失败',
      suggestedSolutions: [
        '请检查输入参数',
        '按照提示修改后重试',
      ],
    },
    TIMEOUT_ERROR: {
      shouldReject: false,
      shouldShowClarification: true,
      allowRetry: true,
      requiresUserConfirmation: false,
      messageTemplate: '操作超时，请稍后重试',
      suggestedSolutions: [
        '稍后重试',
        '检查网络连接',
        '简化请求内容',
      ],
    },
    UNKNOWN_ERROR: {
      shouldReject: false,
      shouldShowClarification: true,
      allowRetry: true,
      requiresUserConfirmation: false,
      messageTemplate: '发生未知错误',
      suggestedSolutions: [
        '稍后重试',
        '联系技术支持',
      ],
    },
  };

  return strategies[errorType];
}
