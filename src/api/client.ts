import axios from 'axios';
import { CONFIG } from '@/constants/config';

// 声明全局类型，支持从 config.js 读取配置
declare global {
  interface Window {
    __CONFIG__?: { apiBaseUrl?: string };
  }
}

// API baseURL 配置优先级：
// 1. window.__CONFIG__.apiBaseUrl (从 /config.js 动态加载)
// 2. VITE_API_BASE_URL 环境变量
// 3. 默认使用同域 /api（推荐，避免 Mixed Content，需要 Nginx 反代）
const runtimeBase =
  window.__CONFIG__?.apiBaseUrl ||
  (window as any).__CONFIG__?.apiBaseUrl; // 防御不同写法

// ✅ 默认用同域 /api，避免 Mixed Content
// 这样前端在 https://tripnara.com 下请求会变成 https://tripnara.com/api/...
const baseURL = runtimeBase || import.meta.env.VITE_API_BASE_URL || '/api';

// 调试日志：显示最终使用的 baseURL
console.log('[API Client] 初始化配置:', {
  windowConfig: window.__CONFIG__,
  runtimeBase,
  viteEnv: import.meta.env.VITE_API_BASE_URL,
  finalBaseURL: baseURL,
});

const apiClient = axios.create({
  baseURL,
  timeout: CONFIG.API.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  // 重要：包含 cookies（用于 refresh_token）
  withCredentials: true,
  // ✅ 配置 paramsSerializer，确保中文和特殊字符正确编码
  // 使用 URLSearchParams 自动处理编码，避免双重编码问题
  paramsSerializer: {
    encode: (value) => {
      // URLSearchParams 会自动处理编码，包括中文字符
      // 这里返回原始值，让 URLSearchParams 处理编码
      return value;
    },
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available (从 sessionStorage 读取)
    const accessToken = sessionStorage.getItem('accessToken');
    
    // 构建完整的请求 URL（包括查询参数）
    const fullUrl = config.baseURL 
      ? `${config.baseURL}${config.url}${config.params ? '?' + new URLSearchParams(config.params).toString() : ''}`
      : config.url;
    
    // 调试日志（使用 console.log 确保在控制台可见）
    console.log('[API Client] 请求:', {
      url: config.url,
      fullUrl: fullUrl, // 完整 URL（包括 baseURL 和查询参数）
      baseURL: config.baseURL,
      params: config.params, // 查询参数对象
      method: config.method?.toUpperCase(),
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'none',
    });
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      console.log('[API Client] ✅ 已添加 Authorization header');
    } else {
      // 警告：需要认证的接口但没有 token（登录/注册接口除外）
      const publicEndpoints = ['/auth/email/send-code', '/auth/email/login', '/auth/email/register', '/auth/google', '/auth/refresh'];
      const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint));
      if (!isPublicEndpoint) {
        console.warn('[API Client] ⚠️ 请求需要认证但未找到 accessToken:', config.url);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // 构建完整的请求 URL（包括查询参数）
    const fullUrl = response.config.baseURL 
      ? `${response.config.baseURL}${response.config.url}${response.config.params ? '?' + new URLSearchParams(response.config.params).toString() : ''}`
      : response.config.url;
    
    // 成功响应日志
    console.log('[API Client] ✅ 响应成功:', {
      url: response.config.url,
      fullUrl: fullUrl, // 完整 URL（包括 baseURL 和查询参数）
      params: response.config.params, // 查询参数对象
      method: response.config.method?.toUpperCase(),
      status: response.status,
      statusText: response.statusText,
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - token 过期或缺失
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // 调试日志
      console.error('[API Client] ❌ 401 未授权错误:', {
        url: originalRequest.url,
        method: originalRequest.method,
        hasToken: !!originalRequest.headers.Authorization,
        tokenInHeader: originalRequest.headers.Authorization ? '存在' : '不存在',
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        sessionStorageToken: sessionStorage.getItem('accessToken') ? '存在' : '不存在',
      });

      // 检查是否有 token，如果没有，直接跳转登录
      const currentToken = sessionStorage.getItem('accessToken');
      if (!currentToken) {
        console.error('[API Client] ❌ 未找到 accessToken，跳转登录页');
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('未授权：请先登录'));
      }

      try {
        // 尝试刷新 token（refresh_token 在 cookie 中，会自动发送）
        console.log('[API Client] 🔄 尝试刷新 token...');
        const { authApi } = await import('./auth');
        const response = await authApi.refreshToken();
        
        // 保存新的 accessToken
        sessionStorage.setItem('accessToken', response.accessToken);
        console.log('[API Client] ✅ Token 刷新成功，重试请求');
        
        // 使用新 token 重试原请求
        originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // 刷新失败，清除会话并跳转登录
        console.error('[API Client] ❌ Token 刷新失败:', refreshError);
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        
        // 避免在登录页面重定向
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // 处理其他错误
    if (error.response) {
      // 后端错误格式: { statusCode, message, error }
      const errorData = error.response.data;
      const errorMessage = errorData?.message || errorData?.error || '请求失败';
      error.message = errorMessage;
    } else if (error.request) {
      // 请求已发送但没有收到响应
      if (error.code === 'ECONNABORTED') {
        // 超时错误
        console.error('[API Client] ❌ 请求超时:', {
          url: error.config?.url,
          timeout: error.config?.timeout,
          message: '请求超时，可能是后端服务响应太慢或未运行',
        });
        error.message = '请求超时，请检查后端服务是否正常运行';
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        // 网络连接错误
        console.error('[API Client] ❌ 网络连接错误:', {
          url: error.config?.url,
          code: error.code,
          message: '无法连接到后端服务，请确认后端服务是否运行',
        });
        error.message = '无法连接到后端服务，请确认后端服务是否在运行（端口 3000）';
      } else {
        console.error('[API Client] ❌ 网络错误:', {
          url: error.config?.url,
          code: error.code,
          error,
        });
        error.message = '网络错误，请检查网络连接';
      }
    } else {
      // 请求配置错误
      console.error('[API Client] ❌ 请求配置错误:', error);
      error.message = error.message || '请求失败';
    }

    return Promise.reject(error);
  }
);

export default apiClient;

