import apiClient from './client';

/**
 * 第三方集成授权 API
 * 响应格式：{ success: true, data: T }
 */

// ==================== 类型定义 ====================

/**
 * 集成服务类型
 */
export type IntegrationService = 'google-calendar' | 'browserbase';

/**
 * 授权状态
 */
export type AuthStatus = 'authorized' | 'unauthorized' | 'expired' | 'pending';

/**
 * 集成授权信息
 */
export interface IntegrationAuth {
  service: IntegrationService;
  status: AuthStatus;
  authorizedAt?: string;
  expiresAt?: string;
  connectionId?: string; // Browserbase 专用
}

/**
 * 授权 URL 响应
 */
export interface AuthUrlResponse {
  authUrl: string;
  state?: string; // OAuth state 参数
  status?: AuthStatus; // 已授权时后端可能返回 status: 'authorized'
  message?: string;
}

/**
 * 授权验证响应
 */
export interface AuthVerifyResponse {
  success: boolean;
  status: AuthStatus;
  message?: string;
}

// ==================== API 错误类 ====================

export class IntegrationApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'IntegrationApiError';
  }
}

// ==================== API 方法 ====================

/** 后端标准响应格式 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

/**
 * 集成授权 API
 * 响应格式：{ success: true, data: T }
 */
export const integrationsApi = {
  /**
   * 获取授权状态
   */
  async getAuthStatus(service: IntegrationService): Promise<IntegrationAuth> {
    try {
      const response = await apiClient.get<ApiResponse<Partial<IntegrationAuth>>>(
        `/integrations/${service}/auth/status`
      );
      const raw = response.data;
      const data = raw?.success && raw?.data != null ? raw.data : (raw as any);
      return { service, status: 'unauthorized', ...data } as IntegrationAuth;
    } catch (error: any) {
      if (error.response) {
        const statusCode = error.response.status;
        const message =
          error.response.data?.message || '获取授权状态失败';
        throw new IntegrationApiError(message, 'FETCH_ERROR', statusCode);
      }
      throw new IntegrationApiError(
        error.message || '获取授权状态失败',
        'NETWORK_ERROR'
      );
    }
  },

  /**
   * 获取授权 URL
   */
  async getAuthUrl(service: IntegrationService): Promise<AuthUrlResponse> {
    try {
      const response = await apiClient.get<ApiResponse<AuthUrlResponse>>(
        `/integrations/${service}/auth/url`
      );
      const raw = response.data;
      const data = raw?.success && raw?.data != null ? raw.data : (raw as any);
      return {
        authUrl: data?.authUrl ?? data?.authorizationUrl ?? '',
        state: data?.state,
        status: data?.status,
        message: data?.message,
      } as AuthUrlResponse;
    } catch (error: any) {
      if (error.response) {
        const statusCode = error.response.status;
        const message = error.response.data?.message || '获取授权 URL 失败';
        throw new IntegrationApiError(message, 'FETCH_ERROR', statusCode);
      }
      throw new IntegrationApiError(
        error.message || '获取授权 URL 失败',
        'NETWORK_ERROR'
      );
    }
  },

  /**
   * 验证授权
   */
  async verifyAuth(
    service: IntegrationService,
    code?: string,
    state?: string
  ): Promise<AuthVerifyResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AuthVerifyResponse>>(
        `/integrations/${service}/auth/verify`,
        { code, state }
      );
      const raw = response.data;
      const data = raw?.success && raw?.data != null ? raw.data : (raw as any);
      return { success: true, status: data?.status ?? 'authorized', message: data?.message } as AuthVerifyResponse;
    } catch (error: any) {
      if (error.response) {
        const statusCode = error.response.status;
        const message = error.response.data?.message || '验证授权失败';
        throw new IntegrationApiError(message, 'VERIFY_ERROR', statusCode);
      }
      throw new IntegrationApiError(
        error.message || '验证授权失败',
        'NETWORK_ERROR'
      );
    }
  },

  /**
   * 撤销授权
   */
  async revokeAuth(service: IntegrationService): Promise<void> {
    try {
      await apiClient.delete(`/integrations/${service}/auth`);
    } catch (error: any) {
      if (error.response) {
        const statusCode = error.response.status;
        const message = error.response.data?.message || '撤销授权失败';
        throw new IntegrationApiError(message, 'REVOKE_ERROR', statusCode);
      }
      throw new IntegrationApiError(
        error.message || '撤销授权失败',
        'NETWORK_ERROR'
      );
    }
  },

  /**
   * 批量获取所有服务的授权状态
   */
  async getAllAuthStatuses(): Promise<IntegrationAuth[]> {
    try {
      const services: IntegrationService[] = [
        'google-calendar',
        'browserbase',
      ];
      const promises = services.map((service) =>
        this.getAuthStatus(service).catch(() => ({
          service,
          status: 'unauthorized' as AuthStatus,
        }))
      );
      return Promise.all(promises);
    } catch (error: any) {
      throw new IntegrationApiError(
        error.message || '获取授权状态失败',
        'FETCH_ERROR'
      );
    }
  },
};
