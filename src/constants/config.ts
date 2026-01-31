export const CONFIG = {
  // API baseURL: 默认使用同域 /api，可通过 VITE_API_BASE_URL 环境变量覆盖
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || '',
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
  API: {
    TIMEOUT: 60000, // API 请求超时时间（毫秒）- 默认 60 秒
    TIMEOUT_LONG: 120000, // 长时间操作的超时时间（毫秒）- 120 秒，用于自然语言创建行程等耗时操作
  },
} as const;

