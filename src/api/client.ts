import axios from 'axios';

const apiClient = axios.create({
  // 使用相对路径，通过 Vite Proxy 转发，避免 CORS 预检
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // 重要：包含 cookies（用于 refresh_token）
  withCredentials: true,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available (从 sessionStorage 读取)
    const accessToken = sessionStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - token 过期
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 尝试刷新 token（refresh_token 在 cookie 中，会自动发送）
        const { authApi } = await import('./auth');
        const response = await authApi.refreshToken();
        
        // 保存新的 accessToken
        sessionStorage.setItem('accessToken', response.accessToken);
        
        // 使用新 token 重试原请求
        originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // 刷新失败，清除会话并跳转登录
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
      error.message = '网络错误，请检查网络连接';
    }

    return Promise.reject(error);
  }
);

export default apiClient;

