import { useState, useEffect, useCallback } from 'react';
import { authApi, type AuthResponse } from '@/api/auth';
import { googleAuthService } from '@/services/googleAuth';

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // 从存储恢复用户状态
  useEffect(() => {
    // accessToken 存储在 sessionStorage（关闭浏览器后清除）
    const token = sessionStorage.getItem('accessToken');
    // 用户信息存储在 localStorage（持久化）
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        setAccessToken(token);
        setUser(JSON.parse(userStr));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        // 数据损坏，清除
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // 清理本地状态
      setUser(null);
      setAccessToken(null);
      sessionStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      
      // 禁用 Google 自动选择
      try {
        await googleAuthService.disableAutoSelect();
      } catch (err) {
        console.warn('Failed to disable auto select:', err);
      }
    }
  }, []);

  // 刷新 token
  const refreshToken = useCallback(async () => {
    try {
      const response = await authApi.refreshToken();
      setAccessToken(response.accessToken);
      sessionStorage.setItem('accessToken', response.accessToken);
      return response.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // 清理状态
      setUser(null);
      setAccessToken(null);
      sessionStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      throw error;
    }
  }, []);

  // 登录（Google）- 处理完整的认证响应
  const loginWithGoogle = useCallback(async (authResponse: AuthResponse) => {
    const { user: userData, accessToken: token } = authResponse;
    
    // 存储 accessToken 到 sessionStorage
    sessionStorage.setItem('accessToken', token);
    // 存储用户信息到 localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    
    // 更新状态
    setUser(userData);
    setAccessToken(token);
  }, []);

  return {
    user,
    loading,
    accessToken,
    loginWithGoogle,
    logout,
    refreshToken,
    isAuthenticated: !!user && !!accessToken,
  };
};

