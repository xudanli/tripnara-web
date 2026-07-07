export const CONFIG = {
  /**
   * 全局 API 基路径（与后端 `app.setGlobalPrefix('api')` 对齐）。
   * axios `baseURL` 即为此前缀，故封装里应写 `/trips/...`、`/readiness/...`，勿写死无前缀或重复 `/api/api`。
   */
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  MAPBOX_TOKEN:
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
    import.meta.env.VITE_MAPBOX_TOKEN ||
    '',
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  FEATURES: {
    /** 与后端 TRAVEL_COMPILER_ENABLED 对齐；为 true 时 route_and_run 默认传 enable_travel_compiler */
    TRAVEL_COMPILER_ENABLED: import.meta.env.VITE_TRAVEL_COMPILER_ENABLED,
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
  API: {
    TIMEOUT: 60000, // API 请求超时时间（毫秒）- 默认 60 秒
    TIMEOUT_LONG: 300000, // 长时间操作的超时时间（毫秒）- 300 秒，用于自然语言创建行程等耗时操作
    /** POST /agent/route_and_run 默认超时（酒店+多轮 LLM 常 >30s；勿低于 60s，否则会先于后端 200 触发 ECONNABORTED） */
    ROUTE_AND_RUN_TIMEOUT: 120000,
    /**
     * 传给 route_and_run `options.max_seconds`：检索 + MCP + 长文（如推荐酒店、租车等），建议区间 60～90s。
     */
    ROUTE_AND_RUN_SENSOR_MAX_SECONDS: 90,
    /** route_and_run 异步轮询间隔（毫秒），建议 1.5–2s */
    ROUTE_RUN_ASYNC_POLL_INTERVAL_MS: 1750,
  },
} as const;

