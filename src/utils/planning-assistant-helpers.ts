/**
 * Planning Assistant V2 - 工具函数
 * 
 * 提供快捷操作消息生成、路由检查等功能
 */

import type { ChatResponse, RoutingTarget } from '@/api/planning-assistant-v2';

/**
 * 生成快捷操作消息
 * 
 * 根据操作类型生成明确的消息内容，确保路由正确
 */
export function generateQuickActionMessage(
  action: 'hotel' | 'airbnb' | 'accommodation' | 'restaurant' | 'weather' | 'flight' | 'rail' | 'search',
  destination?: string
): string {
  const messages: Record<string, string> = {
    // 使用更明确的动词，避免被误判为目的地推荐
    hotel: destination ? `搜索${destination}的酒店` : '搜索酒店',
    airbnb: destination ? `搜索${destination}的Airbnb` : '搜索Airbnb',
    accommodation: destination ? `搜索${destination}的住宿` : '搜索住宿',
    restaurant: destination ? `搜索${destination}的餐厅` : '搜索餐厅',
    weather: destination ? `${destination}天气怎么样` : '天气怎么样',
    flight: '搜索航班',
    rail: '查询火车',
    search: destination ? `搜索${destination}信息` : '搜索信息',
  };

  return messages[action] || action;
}

/**
 * 检查路由结果是否正确
 * 
 * 用于验证 API 响应是否符合预期
 */
export function validateRouting(
  response: ChatResponse,
  expectedTarget: RoutingTarget
): {
  isValid: boolean;
  reason?: string;
  warning?: string;
} {
  const actualTarget = response.routing?.target;

  if (!actualTarget) {
    return {
      isValid: false,
      reason: '响应中没有路由信息',
    };
  }

  if (actualTarget === expectedTarget) {
    return { isValid: true };
  }

  // 特殊处理：hotel 路由可能返回 airbnb 或 hotels
  if (expectedTarget === 'hotel') {
    if (actualTarget === 'airbnb' || actualTarget === 'accommodation') {
      return {
        isValid: true,
        warning: `路由到 ${actualTarget}，但这是可接受的（酒店搜索可能优先使用 Airbnb）`,
      };
    }
  }

  return {
    isValid: false,
    reason: `路由目标不匹配：期望 ${expectedTarget}，实际 ${actualTarget}`,
  };
}

/**
 * 提取响应数据
 * 
 * 根据路由目标提取相应的数据
 */
export function extractResponseData(response: ChatResponse): {
  hotels?: any[];
  airbnbListings?: any[];
  restaurants?: any[];
  weather?: any;
  searchResults?: any[];
  flights?: any[];
  railRoutes?: any[];
  recommendations?: any[];
  plans?: any[];
} {
  const target = response.routing?.target;

  return {
    hotels: response.hotels,
    airbnbListings: response.airbnbListings,
    restaurants: response.restaurants,
    weather: response.weather,
    searchResults: response.searchResults,
    flights: response.flights,
    railRoutes: response.railRoutes,
    recommendations: response.recommendations,
    plans: response.plans,
  };
}

/**
 * 检查是否有数据返回
 */
export function hasResponseData(response: ChatResponse): boolean {
  const data = extractResponseData(response);
  return !!(
    data.hotels?.length ||
    data.airbnbListings?.length ||
    data.restaurants?.length ||
    data.weather ||
    data.searchResults?.length ||
    data.flights?.length ||
    data.railRoutes?.length ||
    data.recommendations?.length ||
    data.plans?.length
  );
}

/**
 * 获取主要回复消息
 * 
 * 优先使用 reply（自动适配语言），如果没有则使用 messageCN 或 message
 */
export function getDisplayMessage(response: ChatResponse, userLanguage: 'zh' | 'en' = 'zh'): string {
  return (
    response.reply ||
    (userLanguage === 'zh' ? response.messageCN : response.message) ||
    response.messageCN ||
    response.message ||
    '收到回复，但内容为空'
  );
}
