/**
 * 冰岛信息源参数推断工具
 * 
 * 根据行程数据动态推断冰岛信息源API的调用参数，避免硬编码
 */

import type { TripDetail, ItineraryItem } from '@/types/trip';
import type { GetWeatherParams, GetSafetyParams, GetRoadConditionsParams } from '@/types/iceland-info';

/**
 * 从行程中提取F路编号
 * 
 * 从行程项的 Place 信息中提取F路编号（如 F208, F26 等）
 */
export function extractFRoadsFromTrip(trip: TripDetail | null): string[] {
  if (!trip?.TripDay) {
    return [];
  }

  const fRoads = new Set<string>();

  // 遍历所有行程项
  for (const day of trip.TripDay) {
    for (const item of day.ItineraryItem || []) {
      const place = item.Place;
      if (!place) continue;

      // 从多个可能的字段中提取F路信息
      const sources = [
        place.nameCN,
        place.nameEN,
        place.address,
        place.description,
        (place as any).metadata?.fRoad,
        (place as any).metadata?.fRoadNumber,
        (place as any).metadata?.tags,
        item.note,
      ].filter(Boolean);

      // 匹配F路编号模式（F + 数字，如 F208, F26, F910）
      const fRoadPattern = /F\s*(\d{1,4})/gi;
      
      for (const source of sources) {
        if (typeof source === 'string') {
          const matches = source.matchAll(fRoadPattern);
          for (const match of matches) {
            const fRoadNumber = `F${match[1]}`;
            fRoads.add(fRoadNumber);
          }
        } else if (Array.isArray(source)) {
          // 如果是数组（如 tags），遍历每个元素
          for (const tag of source) {
            if (typeof tag === 'string') {
              const matches = tag.matchAll(fRoadPattern);
              for (const match of matches) {
                const fRoadNumber = `F${match[1]}`;
                fRoads.add(fRoadNumber);
              }
            }
          }
        }
      }
    }
  }

  return Array.from(fRoads);
}

/**
 * 从行程中推断高地区域
 * 
 * 根据行程地点推断应该查询哪个高地区域的天气
 */
export function inferHighlandRegion(trip: TripDetail | null): 'centralhighlands' | 'southhighlands' | 'northhighlands' | undefined {
  if (!trip?.TripDay) {
    return undefined;
  }

  // 高地区域关键词映射
  const regionKeywords: Record<string, Array<'centralhighlands' | 'southhighlands' | 'northhighlands'>> = {
    // 中央高地
    centralhighlands: [
      'landmannalaugar', '兰德曼纳劳卡',
      'sprengisandur', '斯普伦吉桑杜尔',
      'askja', '阿斯恰',
      'central highlands', '中央高地',
    ],
    // 南部高地
    southhighlands: [
      'landmannalaugar', '兰德曼纳劳卡',
      'þórsmörk', 'thorsmork', '索斯莫克',
      'south highlands', '南部高地',
      'fimmvörðuháls', '菲姆沃杜哈尔斯',
    ],
    // 北部高地
    northhighlands: [
      'askja', '阿斯恰',
      'kverkfjöll', '克韦尔克菲约尔',
      'north highlands', '北部高地',
    ],
  };

  // 收集所有地点文本
  const placeTexts: string[] = [];
  for (const day of trip.TripDay) {
    for (const item of day.ItineraryItem || []) {
      const place = item.Place;
      if (place) {
        placeTexts.push(
          place.nameCN || '',
          place.nameEN || '',
          place.address || '',
          item.note || '',
        );
      }
    }
  }

  const combinedText = placeTexts.join(' ').toLowerCase();

  // 计算每个区域的匹配分数
  const regionScores: Record<string, number> = {
    centralhighlands: 0,
    southhighlands: 0,
    northhighlands: 0,
  };

  for (const [region, keywords] of Object.entries(regionKeywords)) {
    for (const keyword of keywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        regionScores[region]++;
      }
    }
  }

  // 返回得分最高的区域
  const maxScore = Math.max(...Object.values(regionScores));
  if (maxScore === 0) {
    return undefined; // 没有匹配到任何区域
  }

  const topRegion = Object.entries(regionScores).find(
    ([, score]) => score === maxScore
  )?.[0] as 'centralhighlands' | 'southhighlands' | 'northhighlands' | undefined;

  return topRegion;
}

/**
 * 从行程中推断安全信息查询区域
 * 
 * 根据行程路线推断应该查询哪个区域的安全信息
 */
export function inferSafetyRegion(trip: TripDetail | null): string | undefined {
  if (!trip?.TripDay) {
    return undefined;
  }

  // 检查是否包含高地区域
  const highlandRegion = inferHighlandRegion(trip);
  if (highlandRegion) {
    // 将高地区域转换为安全信息API的区域格式
    return highlandRegion === 'centralhighlands' 
      ? 'highlands' 
      : highlandRegion === 'southhighlands'
      ? 'highlands'
      : 'highlands';
  }

  // 如果没有明确的高地区域，检查是否有F路
  const fRoads = extractFRoadsFromTrip(trip);
  if (fRoads.length > 0) {
    // 如果有F路，默认查询高地区域
    return 'highlands';
  }

  // 默认返回 undefined，让API使用默认区域
  return undefined;
}

/**
 * 推断天气查询参数
 */
export function inferWeatherParams(trip: TripDetail | null): GetWeatherParams | undefined {
  if (!trip?.TripDay || trip.TripDay.length === 0) {
    return undefined;
  }

  // 优先使用高地区域
  const region = inferHighlandRegion(trip);
  if (region) {
    return {
      region,
      includeWindDetails: true, // 冰岛高地建议包含详细风速信息
    };
  }

  // 如果没有明确区域，尝试从行程地点提取坐标
  const places: Array<{ lat: number; lng: number }> = [];
  for (const day of trip.TripDay) {
    for (const item of day.ItineraryItem || []) {
      const place = item.Place;
      if (place) {
        const lat = (place as any).latitude || (place as any).lat || (place as any).metadata?.location?.lat;
        const lng = (place as any).longitude || (place as any).lng || (place as any).metadata?.location?.lng;
        if (lat && lng && typeof lat === 'number' && typeof lng === 'number') {
          places.push({ lat, lng });
        }
      }
    }
  }

  // 如果有坐标，使用平均坐标
  if (places.length > 0) {
    const avgLat = places.reduce((sum, p) => sum + p.lat, 0) / places.length;
    const avgLng = places.reduce((sum, p) => sum + p.lng, 0) / places.length;
    return {
      lat: avgLat,
      lng: avgLng,
      includeWindDetails: true,
    };
  }

  // 默认返回 undefined，让API使用默认区域
  return undefined;
}

/**
 * 推断安全信息查询参数
 */
export function inferSafetyParams(trip: TripDetail | null): GetSafetyParams | undefined {
  if (!trip?.TripDay) {
    return undefined;
  }

  const region = inferSafetyRegion(trip);
  
  // 检查是否有F路，如果有，可能需要查询道路相关的警报
  const fRoads = extractFRoadsFromTrip(trip);
  const alertType = fRoads.length > 0 ? 'road' as const : undefined;

  return {
    region,
    alertType,
  };
}

/**
 * 推断F路路况查询参数
 */
export function inferRoadConditionsParams(trip: TripDetail | null): GetRoadConditionsParams | undefined {
  if (!trip?.TripDay) {
    return undefined;
  }

  const fRoads = extractFRoadsFromTrip(trip);
  
  if (fRoads.length === 0) {
    // 如果没有找到F路，返回空对象（查询所有F路）
    return {};
  }

  // 返回找到的F路编号
  return {
    fRoads: fRoads.join(','),
  };
}

/**
 * 推断所有冰岛信息源查询参数
 */
export function inferIcelandInfoParams(trip: TripDetail | null): {
  weather?: GetWeatherParams;
  safety?: GetSafetyParams;
  roadConditions?: GetRoadConditionsParams;
} {
  return {
    weather: inferWeatherParams(trip),
    safety: inferSafetyParams(trip),
    roadConditions: inferRoadConditionsParams(trip),
  };
}
