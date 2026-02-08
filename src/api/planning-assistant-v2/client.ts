/**
 * Planning Assistant V2 API 客户端
 * 
 * 基于现有 apiClient，配置 Planning Assistant V2 专用路径
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import apiClient from '../client';

// Planning Assistant V2 API 基础路径
const API_VERSION = 'v2';
const BASE_PATH = `/agent/planning-assistant/${API_VERSION}`;

/**
 * Planning Assistant V2 专用 API 客户端
 * 
 * 使用现有的 apiClient 配置（包括认证、错误处理等），
 * 但设置不同的 baseURL 路径
 */
export const planningAssistantV2Client: AxiosInstance = axios.create({
  baseURL: apiClient.defaults.baseURL + BASE_PATH,
  timeout: apiClient.defaults.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: apiClient.defaults.withCredentials,
  paramsSerializer: apiClient.defaults.paramsSerializer,
});

// 复用现有的请求拦截器逻辑
planningAssistantV2Client.interceptors.request.use(
  (config) => {
    // 添加认证Token（从 sessionStorage 读取）
    const accessToken = sessionStorage.getItem('accessToken');
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // 调试日志
    console.log('[Planning Assistant V2 API] 请求:', {
      url: config.url,
      method: config.method?.toUpperCase(),
      hasToken: !!accessToken,
    });
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 复用现有的响应拦截器逻辑
planningAssistantV2Client.interceptors.response.use(
  (response) => {
    // 成功响应日志
    console.log('[Planning Assistant V2 API] ✅ 响应成功:', {
      url: response.config.url,
      status: response.status,
    });
    return response;
  },
  async (error: AxiosError) => {
    // 处理错误（复用主客户端的错误处理逻辑）
    if (!error || !error.config) {
      console.error('[Planning Assistant V2 API] ❌ 错误对象无效:', error);
      return Promise.reject(error || new Error('未知错误'));
    }
    
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized
    const isUnauthorized = 
      error.response?.status === 401 || 
      error.code === 'UNAUTHORIZED' ||
      (error.response?.data as any)?.error?.code === 'UNAUTHORIZED';
    
    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');
    
    if (isUnauthorized && isRefreshRequest) {
      console.error('[Planning Assistant V2 API] ❌ Refresh token 已过期');
      sessionStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(new Error('会话已过期，请重新登录'));
    }
    
    if (isUnauthorized && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      const currentToken = sessionStorage.getItem('accessToken');
      if (!currentToken) {
        console.error('[Planning Assistant V2 API] ❌ 未找到 accessToken');
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('未授权：请先登录'));
      }

      try {
        // 尝试刷新 token
        console.log('[Planning Assistant V2 API] 🔄 尝试刷新 token...');
        const { authApi } = await import('../auth');
        const response = await authApi.refreshToken();
        
        sessionStorage.setItem('accessToken', response.accessToken);
        console.log('[Planning Assistant V2 API] ✅ Token 刷新成功，重试请求');
        
        originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
        return planningAssistantV2Client(originalRequest);
      } catch (refreshError) {
        console.error('[Planning Assistant V2 API] ❌ Token 刷新失败:', refreshError);
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // 处理其他错误
    if (error.response) {
      const errorData = error.response.data as any;
      const errorMessage = errorData?.message || errorData?.error || '请求失败';
      error.message = errorMessage;
      
      // 429 速率限制错误
      if (error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        error.message = `请求过于频繁，请 ${retryAfter || '稍后'} 重试`;
      }
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        error.message = '请求超时，请稍后重试';
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        error.message = '无法连接到服务器，请检查网络连接';
      } else {
        error.message = '网络错误，请检查网络连接';
      }
    }

    console.error('[Planning Assistant V2 API] ❌ 错误:', {
      url: error.config?.url,
      message: error.message,
      status: error.response?.status,
    });

    return Promise.reject(error);
  }
);

export default planningAssistantV2Client;
