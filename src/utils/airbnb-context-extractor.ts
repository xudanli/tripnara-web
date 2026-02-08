/**
 * Airbnb 上下文提取工具
 * 
 * 从对话上下文、推荐目的地、用户偏好中提取位置和日期信息
 */

import type { PlanningMessage, DestinationRecommendation } from '@/api/assistant';
import type { UserPreferenceSummaryResponse } from '@/api/assistant';

export interface ExtractedSearchParams {
  location: string;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  checkin?: string;
  checkout?: string;
}

/**
 * 从对话消息中提取日期信息
 */
function extractDatesFromMessage(message: string): { checkin?: string; checkout?: string } {
  // 匹配 YYYY-MM-DD 格式
  const datePattern = /(\d{4}-\d{2}-\d{2})/g;
  const dates = message.match(datePattern);
  
  if (!dates || dates.length === 0) {
    return {};
  }

  // 如果有两个日期，第一个是入住，第二个是退房
  if (dates.length >= 2) {
    return {
      checkin: dates[0],
      checkout: dates[1],
    };
  }

  // 如果只有一个日期，假设是入住日期
  // 可以根据上下文判断，这里简单处理
  return {
    checkin: dates[0],
  };
}

/**
 * 从对话消息中提取位置信息
 */
function extractLocationFromMessage(message: string): string | null {
  // 常见位置关键词模式
  const locationPatterns = [
    // 城市 + 国家格式：Reykjavik, Iceland
    /(?:在|去|到|位于)\s*([A-Za-z\u4e00-\u9fa5]+(?:\s*,\s*[A-Za-z\u4e00-\u9fa5]+)?)/,
    // 直接城市名：冰岛、Reykjavik
    /(?:去|在|到)\s*([A-Za-z\u4e00-\u9fa5]{2,})/,
  ];

  for (const pattern of locationPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * 从对话消息中提取人数信息
 */
function extractTravelersFromMessage(message: string): {
  adults?: number;
  children?: number;
  infants?: number;
} {
  const result: { adults?: number; children?: number; infants?: number } = {};

  // 匹配成人数量
  const adultsPatterns = [
    /(\d+)\s*(?:个|位|人|成人|大人)/,
    /(\d+)\s*adults?/i,
  ];
  for (const pattern of adultsPatterns) {
    const match = message.match(pattern);
    if (match) {
      result.adults = parseInt(match[1]);
      break;
    }
  }

  // 匹配儿童数量
  const childrenPatterns = [
    /(\d+)\s*(?:个|位|名)?(?:儿童|小孩|孩子)/,
    /(\d+)\s*children?/i,
  ];
  for (const pattern of childrenPatterns) {
    const match = message.match(pattern);
    if (match) {
      result.children = parseInt(match[1]);
      break;
    }
  }

  // 匹配婴儿数量
  const infantsPatterns = [
    /(\d+)\s*(?:个|位|名)?(?:婴儿|宝宝)/,
    /(\d+)\s*infants?/i,
  ];
  for (const pattern of infantsPatterns) {
    const match = message.match(pattern);
    if (match) {
      result.infants = parseInt(match[1]);
      break;
    }
  }

  return result;
}

/**
 * 从对话上下文提取 Airbnb 搜索参数
 */
export function extractAirbnbSearchParams(
  messages: PlanningMessage[],
  currentRecommendation?: DestinationRecommendation,
  userPreferences?: UserPreferenceSummaryResponse | null
): ExtractedSearchParams {
  // 默认值
  const defaultParams: ExtractedSearchParams = {
    location: '',
    adults: 2,
    children: 0,
    infants: 0,
    pets: 0,
  };

  // 1. 优先从推荐的目的地获取位置
  if (currentRecommendation) {
    defaultParams.location = currentRecommendation.nameCN || currentRecommendation.name || '';
  }

  // 2. 从用户偏好获取默认值
  if (userPreferences?.learnedPreferences) {
    const prefs = userPreferences.learnedPreferences;
    
    if (prefs.travelers?.adults) {
      defaultParams.adults = prefs.travelers.adults;
    }
    if (prefs.travelers?.children) {
      defaultParams.children = prefs.travelers.children;
    }
    
    // 如果有目的地偏好但还没有位置，使用偏好中的目的地
    if (!defaultParams.location && prefs.destination?.countries?.[0]) {
      defaultParams.location = prefs.destination.countries[0];
    }
  }

  // 3. 从最近的用户消息中提取信息
  const recentUserMessages = messages
    .filter(m => m.role === 'user')
    .slice(-3); // 只看最近3条消息

  for (const msg of recentUserMessages) {
    const content = msg.content;

    // 提取位置（如果还没有）
    if (!defaultParams.location) {
      const location = extractLocationFromMessage(content);
      if (location) {
        defaultParams.location = location;
      }
    }

    // 提取日期
    const dates = extractDatesFromMessage(content);
    if (dates.checkin && !defaultParams.checkin) {
      defaultParams.checkin = dates.checkin;
    }
    if (dates.checkout && !defaultParams.checkout) {
      defaultParams.checkout = dates.checkout;
    }

    // 提取人数
    const travelers = extractTravelersFromMessage(content);
    if (travelers.adults && !defaultParams.adults) {
      defaultParams.adults = travelers.adults;
    }
    if (travelers.children !== undefined && defaultParams.children === 0) {
      defaultParams.children = travelers.children;
    }
    if (travelers.infants !== undefined && defaultParams.infants === 0) {
      defaultParams.infants = travelers.infants;
    }
  }

  // 4. 如果没有位置，使用默认值
  if (!defaultParams.location) {
    defaultParams.location = 'Reykjavik, Iceland'; // 默认值，实际应该提示用户输入
  }

  // 5. 如果有入住日期但没有退房日期，尝试计算（假设住3-5天）
  if (defaultParams.checkin && !defaultParams.checkout) {
    const checkinDate = new Date(defaultParams.checkin);
    const checkoutDate = new Date(checkinDate);
    checkoutDate.setDate(checkoutDate.getDate() + 3); // 默认3天
    defaultParams.checkout = checkoutDate.toISOString().split('T')[0];
  }

  return defaultParams;
}

/**
 * 检查消息是否包含住宿需求
 */
export function hasAccommodationIntent(message: string): boolean {
  const accommodationKeywords = [
    '住宿', '酒店', 'airbnb', '民宿', '住处', '住的地方', '住宿推荐',
    'accommodation', 'hotel', 'lodging', 'stay', 'where to stay', 'book a room'
  ];

  const lowerMessage = message.toLowerCase();
  return accommodationKeywords.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
}
