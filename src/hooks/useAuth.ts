import { useState, useEffect, useCallback } from 'react';
import { authApi, type AuthResponse, type RegisterWithEmailResponse, type LoginWithEmailResponse } from '@/api/auth';
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
      localStorage.removeItem('googleAccountInfo'); // 清除保存的Google账号信息
      
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

  // 登录（邮箱注册/登录）- 处理邮箱注册或登录响应
  const loginWithEmail = useCallback(async (authResponse: AuthResponse | RegisterWithEmailResponse | LoginWithEmailResponse) => {
    // 验证响应格式
    if (!authResponse) {
      console.error('登录响应为空');
      throw new Error('登录响应为空');
    }
    
    const { user: userData, accessToken: token } = authResponse;
    
    // 验证必要字段
    if (!token) {
      console.error('登录响应缺少 accessToken:', authResponse);
      throw new Error('登录响应缺少 accessToken');
    }
    
    if (!userData || !userData.id) {
      console.error('登录响应缺少 user 信息:', authResponse);
      throw new Error('登录响应缺少 user 信息');
    }
    
    // 存储 accessToken 到 sessionStorage
    sessionStorage.setItem('accessToken', token);
    console.log('✅ accessToken 已保存到 sessionStorage');
    
    // 存储用户信息到 localStorage（转换为 User 格式以确保兼容性）
    const userForStorage: User = {
      id: userData.id,
      email: userData.email || null,
      displayName: userData.displayName,
      avatarUrl: userData.avatarUrl,
      emailVerified: userData.emailVerified ?? null,
    };
    localStorage.setItem('user', JSON.stringify(userForStorage));
    console.log('✅ 用户信息已保存到 localStorage:', userForStorage);
    
    // 更新状态
    setUser(userForStorage);
    setAccessToken(token);
    console.log('✅ 认证状态已更新');
  }, []);

  return {
    user,
    loading,
    accessToken,
    loginWithGoogle,
    loginWithEmail,
    logout,
    refreshToken,
    isAuthenticated: !!user && !!accessToken,
  };
};

