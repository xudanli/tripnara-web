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
    let fullUrl = config.url || '';
    if (config.baseURL) {
      fullUrl = `${config.baseURL}${fullUrl}`;
    }
    if (config.params && Object.keys(config.params).length > 0) {
      try {
        const params = new URLSearchParams();
        Object.entries(config.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
        fullUrl += `?${params.toString()}`;
      } catch (err) {
        console.warn('[API Client] 构建查询参数失败:', err);
      }
    }
    
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
    let fullUrl = response.config.url || '';
    if (response.config.baseURL) {
      fullUrl = `${response.config.baseURL}${fullUrl}`;
    }
    if (response.config.params && Object.keys(response.config.params).length > 0) {
      try {
        const params = new URLSearchParams();
        Object.entries(response.config.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
        fullUrl += `?${params.toString()}`;
      } catch (err) {
        console.warn('[API Client] 构建查询参数失败:', err);
      }
    }
    
    // 🆕 检查响应体中的 success 字段
    // 即使 HTTP 状态码是 2xx，如果响应体 success: false，也应该当作错误处理
    // 防御性检查：确保 response.data 存在且是对象
    if (response.data && typeof response.data === 'object' && response.data !== null && 'success' in response.data) {
      if (response.data.success === false) {
        const errorData = response.data.error;
        const errorCode = errorData?.code || 'UNKNOWN_ERROR';
        const errorMessage = errorData?.message || '请求失败';
        
        // 如果是 UNAUTHORIZED 错误，需要特殊处理（即使状态码是 201）
        if (errorCode === 'UNAUTHORIZED' || errorMessage.includes('登录') || errorMessage.includes('认证')) {
          console.error('[API Client] ❌ 响应体显示未授权错误（状态码可能是 2xx）:', {
            url: response.config.url,
            status: response.status,
            errorCode,
            errorMessage,
            responseData: response.data,
          });
          
          // 创建一个类似 401 的错误对象，触发认证流程
          const authError = new Error(errorMessage) as any;
          authError.response = {
            status: 401, // 强制设置为 401，触发认证处理
            data: response.data,
          };
          authError.config = response.config;
          authError.code = 'UNAUTHORIZED';
          
          // 跳转到错误处理流程
          return Promise.reject(authError);
        }
        
        // 其他业务错误，也当作错误处理
        // 区分不同类型的错误，使用不同的日志级别
        const isNotFoundError = 
          errorCode === 'NOT_FOUND' || 
          errorCode === 'RESOURCE_NOT_FOUND' ||
          errorMessage.includes('未找到') || 
          errorMessage.includes('not found') ||
          errorMessage.includes('不存在');
        
        if (isNotFoundError) {
          // "未找到"类型的错误使用警告级别，因为可能是正常的业务场景（资源不存在）
          console.warn('[API Client] ⚠️ 资源不存在（状态码可能是 2xx）:', {
            url: response.config.url,
            status: response.status,
            errorCode,
            errorMessage,
          });
        } else {
          // 其他业务错误使用错误级别
          console.error('[API Client] ❌ 响应体显示失败（状态码可能是 2xx）:', {
            url: response.config.url,
            status: response.status,
            errorCode,
            errorMessage,
          });
        }
        
        const businessError = new Error(errorMessage) as any;
        businessError.response = {
          status: response.status,
          data: response.data,
        };
        businessError.config = response.config;
        businessError.code = errorCode;
        
        return Promise.reject(businessError);
      }
    }
    
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
    // 防御性检查：确保 error.config 存在
    if (!error || !error.config) {
      console.error('[API Client] ❌ 错误对象无效，缺少 config:', error);
      return Promise.reject(error || new Error('未知错误'));
    }
    
    const originalRequest = error.config;

    // Handle 401 Unauthorized - token 过期或缺失
    // 包括从响应拦截器转换来的 UNAUTHORIZED 错误（状态码可能是 2xx）
    const isUnauthorized = 
      error.response?.status === 401 || 
      error.code === 'UNAUTHORIZED' ||
      (error.response?.data?.error?.code === 'UNAUTHORIZED');
    
    if (isUnauthorized && !originalRequest._retry) {
      originalRequest._retry = true;

      // 调试日志
      console.error('[API Client] ❌ 401/UNAUTHORIZED 未授权错误:', {
        url: originalRequest.url,
        method: originalRequest.method,
        hasToken: !!originalRequest.headers.Authorization,
        tokenInHeader: originalRequest.headers.Authorization ? '存在' : '不存在',
        tokenPreview: originalRequest.headers.Authorization 
          ? `${originalRequest.headers.Authorization.substring(0, 30)}...` 
          : '不存在',
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        errorCode: error.code,
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

    // 忽略 AbortError（请求被取消是正常行为，如组件卸载）
    if (error?.name === 'AbortError' || 
        error?.code === 'ERR_CANCELED' || 
        error?.message?.includes('aborted') ||
        error?.message?.includes('canceled')) {
      // 静默处理，不打印错误日志
      return Promise.reject(error);
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
        error.message = '无法连接到后端服务，请检查网络连接或联系管理员';
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

