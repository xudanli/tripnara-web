/**
 * Planning Assistant V2 API
 * 
 * 统一导出所有 API 接口和类型
 */

// API 接口
export { sessionsApi } from './sessions';
export { chatApi } from './chat';
export { recommendationsApi } from './recommendations';
export { plansApi } from './plans';
export { tripsApi } from './trips';

// API 客户端
export { default as planningAssistantV2Client } from './client';

// 类型定义
export type {
  // 会话管理
  CreateSessionRequest,
  CreateSessionResponse,
  SessionState,
  Message,
  ChatHistoryResponse,
  // 对话
  ChatRequest,
  ChatResponse,
  RoutingTarget,
  // 推荐
  RecommendationParams,
  Recommendation,
  RecommendationsResponse,
  // 方案
  GeneratePlanRequest,
  Plan,
  GeneratePlanResponse,
  AsyncTaskResponse,
  TaskStatusResponse,
  ComparePlansParams,
  ComparePlansResponse,
  OptimizePlanRequest,
  ConfirmPlanRequest,
  ConfirmPlanResponse,
  // 行程
  OptimizeTripRequest,
  RefineTripRequest,
  TripOperationResponse,
  Suggestion,
  SuggestionsResponse,
  // MCP 服务数据类型
  Hotel,
  AirbnbListing,
  Restaurant,
  WeatherInfo,
  SearchResult,
  Flight,
  RailRoute,
  TranslationResult,
  CurrencyConversion,
  ImageResult,
  // 错误
  ErrorResponse,
} from './types';
