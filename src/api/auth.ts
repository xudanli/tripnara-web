import apiClient from './client';

export interface AuthResponse {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    emailVerified: boolean | null;
  };
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface LogoutResponse {
  message: string;
}

export const authApi = {
  // 方案 1: Code Model - 使用授权码登录（推荐）
  loginWithCode: async (code: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/google/code', {
        code,
      });
      return response.data;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务器。请确保后端服务正在运行在 localhost:43000。');
      }
      // 处理 500 服务器错误
      if (error.response?.status === 500) {
        const errorMsg = error.response?.data?.message || 
                        error.response?.data?.error || 
                        '服务器内部错误。请检查后端服务日志。';
        throw new Error(errorMsg);
      }
      // 处理后端错误响应
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  // 方案 2: ID Token Model - 使用 ID Token 登录（One Tap / Button）
  loginWithIdToken: async (idToken: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/google/id-token', {
        idToken,
      });
      return response.data;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务器。请确保后端服务正在运行在 localhost:43000。');
      }
      // 处理 500 服务器错误
      if (error.response?.status === 500) {
        const errorMsg = error.response?.data?.message || 
                        error.response?.data?.error || 
                        '服务器内部错误。请检查后端服务日志。';
        throw new Error(errorMsg);
      }
      // 处理后端错误响应
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  // 刷新访问令牌
  refreshToken: async (): Promise<RefreshResponse> => {
    try {
      const response = await apiClient.post<RefreshResponse>('/auth/refresh');
      return response.data;
    } catch (error: any) {
      // refresh token 过期或无效
      if (error.response?.status === 401) {
        throw new Error('会话已过期，请重新登录');
      }
      throw error;
    }
  },

  // 登出
  logout: async (): Promise<LogoutResponse> => {
    try {
      const response = await apiClient.post<LogoutResponse>('/auth/logout');
      return response.data;
    } catch (error: any) {
      // 即使登出请求失败，也继续清除本地状态
      console.warn('登出请求失败，但已清除本地会话:', error);
      throw error;
    }
  },
};

