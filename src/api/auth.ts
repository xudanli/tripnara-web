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

// 发送邮箱验证码
export interface SendVerificationCodeRequest {
  email: string;
}

export interface SendVerificationCodeResponse {
  message: string;
}

// 邮箱验证码注册
export interface RegisterWithEmailRequest {
  email: string;
  code: string;
  displayName?: string;
}

export interface RegisterWithEmailResponse {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
  };
  accessToken: string;
}

// 邮箱验证码登录
export interface LoginWithEmailRequest {
  email: string;
  code: string;
}

export interface LoginWithEmailResponse {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
  };
  accessToken: string;
}

export const authApi = {
  // 方案 1: Code Model - 使用授权码登录（推荐）
  loginWithCode: async (code: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/google/code', {
        code,
      });
      // 处理可能的响应格式：{ success: true, data: {...} } 或直接返回 {...}
      const data = response.data as any;
      if (data.success && data.data) {
        return data.data;
      }
      return data;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务器。请确保后端服务正在运行在 localhost:3000。');
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
      // 处理可能的响应格式：{ success: true, data: {...} } 或直接返回 {...}
      const data = response.data as any;
      if (data.success && data.data) {
        return data.data;
      }
      return data;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务器。请确保后端服务正在运行在 localhost:3000。');
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

  // 发送邮箱验证码
  sendVerificationCode: async (email: string): Promise<SendVerificationCodeResponse> => {
    try {
      const response = await apiClient.post<SendVerificationCodeResponse>(
        '/auth/email/send-code',
        { email }
      );
      return response.data;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }
      // 处理后端错误响应
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('发送验证码失败，请稍后重试');
    }
  },

  // 邮箱验证码注册
  registerWithEmail: async (
    email: string,
    code: string,
    displayName?: string
  ): Promise<RegisterWithEmailResponse> => {
    try {
      const response = await apiClient.post<any>(
        '/auth/email/register',
        { email, code, displayName }
      );
      
      // 处理可能的响应格式
      let data = response.data;
      
      // 如果响应被包装在 success/data 中，提取 data
      if (data && typeof data === 'object' && 'success' in data && data.success && data.data) {
        data = data.data;
      }
      
      // 验证响应格式
      if (!data || !data.accessToken) {
        console.error('注册响应格式错误:', data);
        throw new Error('注册响应格式错误：缺少 accessToken');
      }
      
      if (!data.user) {
        console.error('注册响应格式错误:', data);
        throw new Error('注册响应格式错误：缺少 user 信息');
      }
      
      return data as RegisterWithEmailResponse;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }
      // 处理后端错误响应
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('注册失败，请稍后重试');
    }
  },

  // 邮箱验证码登录
  loginWithEmailCode: async (
    email: string,
    code: string
  ): Promise<LoginWithEmailResponse> => {
    try {
      const response = await apiClient.post<any>(
        '/auth/email/login',
        { email, code }
      );
      
      // 处理可能的响应格式
      let data = response.data;
      
      // 如果响应被包装在 success/data 中，提取 data
      if (data && typeof data === 'object' && 'success' in data && data.success && data.data) {
        data = data.data;
      }
      
      // 验证响应格式
      if (!data || !data.accessToken) {
        console.error('登录响应格式错误:', data);
        throw new Error('登录响应格式错误：缺少 accessToken');
      }
      
      if (!data.user) {
        console.error('登录响应格式错误:', data);
        throw new Error('登录响应格式错误：缺少 user 信息');
      }
      
      return data as LoginWithEmailResponse;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }
      // 处理 400 错误（验证码错误、邮箱未注册等）
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || '登录失败';
        throw new Error(errorMessage);
      }
      // 处理后端错误响应
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('登录失败，请稍后重试');
    }
  },
};

