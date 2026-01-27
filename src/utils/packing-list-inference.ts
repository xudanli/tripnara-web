/**
 * 打包清单参数推断工具
 * 根据行程数据自动推断生成打包清单所需的参数
 */

import type { TripDetail } from '@/types/trip';
import { inferSeasonFromMonth, type Season } from '@/config/season-rules';
import { 
  getRouteSignaturesByCountry, 
  type RouteType, 
  type RouteSignature 
} from '@/config/route-signatures';

export type UserType = 
  | 'first_timer'          // 首次旅行者
  | 'photographer'         // 摄影师
  | 'adventurer'           // 冒险者
  | 'family_with_kids'     // 带孩子的家庭
  | 'budget_backpacker'    // 预算背包客
  | 'cultural_explorer'    // 文化探索者
  | 'luxury_traveler';     // 豪华旅行者

export interface PackingListInferenceResult {
  season: Season;
  route: RouteType;
  userType: UserType;
  activities: string[];
}

/**
 * 根据行程日期推断季节
 * @param startDate 行程开始日期（ISO 8601 格式）
 * @param destination 目的地代码（如 'IS'）
 * @returns 季节枚举值
 */
export const inferSeason = (
  startDate: string,
  destination?: string
): Season => {
  const date = new Date(startDate);
  const month = date.getMonth() + 1; // 1-12
  const countryCode = destination || 'IS';
  
  return inferSeasonFromMonth(month, countryCode);
};

/**
 * 从行程中提取地点列表
 */
export const extractPlacesFromTrip = (trip: TripDetail): Array<{
  nameCN?: string;
  nameEN?: string;
  address?: string;
  category?: string;
}> => {
  const places: any[] = [];
  
  trip.TripDay?.forEach(day => {
    day.ItineraryItem?.forEach(item => {
      if (item.Place) {
        places.push({
          nameCN: item.Place.nameCN,
          nameEN: item.Place.nameEN,
          address: item.Place.address,
          category: item.Place.category,
        });
      }
    });
  });
  
  return places;
};

/**
 * 从行程中提取活动类型
 */
export const extractActivitiesFromTrip = (trip: TripDetail): string[] => {
  const activities: string[] = [];
  
  trip.TripDay?.forEach(day => {
    day.ItineraryItem?.forEach(item => {
      // 从行程项类型推断
      if (item.type === 'ACTIVITY' && item.Place) {
        const category = item.Place.category?.toLowerCase() || '';
        const nameCN = (item.Place.nameCN || '').toLowerCase();
        const nameEN = (item.Place.nameEN || '').toLowerCase();
        
        if (category) activities.push(category);
        if (nameCN) activities.push(nameCN);
        if (nameEN) activities.push(nameEN);
      }
      
      // 从行程项备注推断
      if (item.note) {
        activities.push(item.note.toLowerCase());
      }
    });
  });
  
  return activities;
};

/**
 * 根据行程数据推断路线类型
 * @param trip 行程详情
 * @returns 路线类型枚举值
 */
export const inferRouteType = (trip: TripDetail): RouteType => {
  const destination = trip.destination || 'IS';
  const days = trip.TripDay?.length || 0;
  
  // 策略1：基于行程天数（快速判断）
  if (days <= 2) {
    // 短途行程，可能是黄金圈
    return 'golden_circle';
  }
  
  // 策略2：基于访问地点（需要从行程项中提取）
  const places = extractPlacesFromTrip(trip);
  if (places.length === 0) {
    // 如果没有地点信息，基于天数推断
    if (days >= 7 && days <= 14) {
      return 'full_ring_road';
    }
    return 'custom';
  }
  
  // 策略3：匹配已知路线特征
  const routeSignatures = getRouteSignaturesByCountry(destination);
  
  // 构建地点文本（用于关键词匹配）
  const placeText = places.map(p => 
    `${p.nameCN || ''} ${p.nameEN || ''} ${p.address || ''}`
  ).join(' ').toLowerCase();
  
  // 按优先级排序匹配
  const matches: Array<{ routeType: RouteType; score: number; priority: number }> = [];
  
  for (const signature of routeSignatures) {
    let score = 0;
    
    // 关键词匹配
    const keywordMatches = signature.keywords.filter(kw => 
      placeText.includes(kw.toLowerCase())
    ).length;
    if (keywordMatches > 0) {
      score += keywordMatches * 10; // 每个关键词匹配得10分
    }
    
    // 天数匹配
    if (signature.typicalDays.includes(days)) {
      score += 5; // 天数匹配得5分
    }
    
    if (score > 0) {
      matches.push({
        routeType: signature.routeType,
        score,
        priority: signature.priority,
      });
    }
  }
  
  // 按分数和优先级排序
  if (matches.length > 0) {
    matches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // 分数高的优先
      }
      return b.priority - a.priority; // 优先级高的优先
    });
    return matches[0].routeType;
  }
  
  // 策略4：基于天数降级推断
  if (days >= 7 && days <= 14) {
    return 'full_ring_road';
  }
  
  // 降级：无法推断
  return 'custom';
};

/**
 * 根据行程数据和用户信息推断用户类型
 * @param trip 行程详情
 * @param userProfile 用户画像（可选）
 * @returns 用户类型枚举值
 */
export const inferUserType = (
  trip: TripDetail,
  userProfile?: {
    previousTrips?: number;
    preferences?: string[];
    budgetLevel?: 'low' | 'medium' | 'high';
  }
): UserType => {
  // 策略1：基于用户历史（如果有）
  if (userProfile?.previousTrips === 0) {
    return 'first_timer';
  }
  
  // 策略2：基于预算水平
  const dailyBudget = trip.budgetConfig?.dailyBudget || 
    (trip.budgetConfig?.totalBudget && trip.TripDay?.length 
      ? trip.budgetConfig.totalBudget / trip.TripDay.length 
      : 0);
  
  if (dailyBudget > 0) {
    if (dailyBudget < 500) {
      return 'budget_backpacker';
    }
    if (dailyBudget > 2000) {
      return 'luxury_traveler';
    }
  }
  
  // 策略3：基于行程活动类型
  const activities = extractActivitiesFromTrip(trip);
  const activitiesText = activities.join(' ');
  
  // 检查是否有摄影相关活动
  const photographyKeywords = ['photo', 'photography', '摄影', 'aurora', '极光', 'northern lights'];
  const hasPhotography = photographyKeywords.some(kw => 
    activitiesText.includes(kw.toLowerCase())
  );
  if (hasPhotography) {
    return 'photographer';
  }
  
  // 检查是否有冒险活动
  const adventureKeywords = [
    'hiking', '徒步', 'trekking',
    'climbing', '攀岩', 'mountaineering',
    'rafting', '漂流', 'kayaking',
    'adventure', '冒险',
  ];
  const hasAdventure = adventureKeywords.some(kw => 
    activitiesText.includes(kw.toLowerCase())
  );
  if (hasAdventure) {
    return 'adventurer';
  }
  
  // 检查是否有文化相关活动
  const culturalKeywords = [
    'museum', '博物馆',
    'church', '教堂', 'cathedral',
    'cultural', '文化', 'heritage',
    'history', '历史',
  ];
  const hasCultural = culturalKeywords.some(kw => 
    activitiesText.includes(kw.toLowerCase())
  );
  if (hasCultural) {
    return 'cultural_explorer';
  }
  
  // 策略4：基于旅行者配置
  const hasChildren = trip.pacingConfig?.travelers?.some(t => t.type === 'CHILD');
  if (hasChildren) {
    return 'family_with_kids';
  }
  
  // 降级：默认首次旅行者
  return 'first_timer';
};

/**
 * 判断是否支持模板模式
 * @param destination 目的地代码（如 'IS', 'US', 'JP'）
 * @returns 是否支持模板模式
 */
export const isTemplateSupported = (destination: string): boolean => {
  // 支持模板的国家列表（后续扩展）
  const supportedCountries = ['IS']; // 目前只有冰岛
  
  return supportedCountries.includes(destination);
};

/**
 * 综合推断：根据行程数据推断所有打包清单参数
 * @param trip 行程详情
 * @param userProfile 用户画像（可选）
 * @param userOverrides 用户手动覆盖的参数（可选）
 * @returns 推断结果
 */
export const inferPackingListParams = (
  trip: TripDetail,
  userProfile?: {
    previousTrips?: number;
    preferences?: string[];
    budgetLevel?: 'low' | 'medium' | 'high';
  },
  userOverrides?: Partial<{
    season: Season;
    route: RouteType;
    userType: UserType;
    activities: string[];
  }>
): PackingListInferenceResult => {
  const destination = trip.destination || 'IS';
  
  // 自动推断参数（如果用户未提供）
  const season = userOverrides?.season || inferSeason(trip.startDate, destination);
  const route = userOverrides?.route || inferRouteType(trip);
  const userType = userOverrides?.userType || inferUserType(trip, userProfile);
  const activities = userOverrides?.activities || extractActivitiesFromTrip(trip);
  
  return {
    season,
    route,
    userType,
    activities,
  };
};
