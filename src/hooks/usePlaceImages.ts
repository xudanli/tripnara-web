/**
 * 地点图片批量加载 Hook
 * 
 * 用于在行程列表页面批量加载地点图片
 * 
 * 使用示例：
 * ```tsx
 * const { images, loading, error } = usePlaceImages(places);
 * 
 * // 获取单个地点的图片
 * const photo = images.get(placeId);
 * ```
 * 
 * 性能优化：
 * - 使用 loadedPlaceIds 避免重复请求相同地点
 * - 使用 placeIdsKey 作为稳定的依赖项，避免数组引用变化导致的重复调用
 * - 使用 AbortController 取消未完成的请求
 * 
 * 注意：已改为从上传 API 获取图片，不再使用 Unsplash API
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { uploadApi } from '@/api/upload';
import type { PlaceImageInfo } from '@/types/place-image';

interface PlaceInfo {
  id: number;
  nameCN?: string;
  nameEN?: string | null;
  category?: string;
}

interface UsePlaceImagesResult {
  /** 图片映射：placeId -> PlaceImageInfo[]（图片列表） */
  images: Map<number, PlaceImageInfo[]>;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 统计信息 */
  stats: {
    total: number;
    found: number;
    failed: number;
  } | null;
  /** 手动刷新 */
  refresh: () => void;
}

/**
 * 批量加载地点图片的 Hook
 * 
 * @param places - 地点列表
 * @param options - 配置选项
 * @returns 图片数据和状态
 */
export function usePlaceImages(
  places: PlaceInfo[],
  options: {
    /** 是否启用（可用于条件加载） */
    enabled?: boolean;
    /** 国家/地区（用于提高搜索准确度） */
    country?: string;
  } = {}
): UsePlaceImagesResult {
  const { enabled = true } = options;
  
  const [images, setImages] = useState<Map<number, PlaceImageInfo[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UsePlaceImagesResult['stats']>(null);
  
  // 用于避免重复请求
  const loadedPlaceIds = useRef<Set<number>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 保存 places 的引用，避免依赖数组引用变化
  const placesRef = useRef<PlaceInfo[]>(places);
  placesRef.current = places;
  
  // 使用 ref 跟踪上一次的 key，避免不必要的重新计算
  const prevKeyRef = useRef<string>('');
  
  // 生成稳定的 key，只有当地点 ID 集合变化时才改变
  // 通过比较实际的 ID 字符串来判断是否变化
  const currentIdsString = places
    .filter(p => p.id)
    .map(p => p.id)
    .sort((a, b) => a - b)
    .join(',');
  
  const placeIdsKey = useMemo(() => {
    // 只有当 ID 字符串真正改变时才更新 key
    if (currentIdsString !== prevKeyRef.current) {
      prevKeyRef.current = currentIdsString;
    }
    return prevKeyRef.current;
  }, [currentIdsString]);

  const loadImages = useCallback(async () => {
    const currentPlaces = placesRef.current;
    
    if (!enabled || currentPlaces.length === 0) {
      return;
    }

    // 过滤出未加载过的地点
    const newPlaces = currentPlaces.filter(
      p => p.id && !loadedPlaceIds.current.has(p.id)
    );

    if (newPlaces.length === 0) {
      return;
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      console.log('[usePlaceImages] 开始加载图片:', {
        newPlacesCount: newPlaces.length,
        alreadyLoadedCount: loadedPlaceIds.current.size,
      });
      
      // 并行获取所有地点的图片
      const imagePromises = newPlaces.map(async (place) => {
        try {
          const data = await uploadApi.getPlaceImages(place.id);
          return {
            placeId: place.id,
            images: data.images,
            success: true,
          };
        } catch (err: any) {
          // 如果获取失败，返回空数组（可能是该地点还没有上传图片）
          console.warn(`[usePlaceImages] 获取地点 ${place.id} 的图片失败:`, err.message);
          return {
            placeId: place.id,
            images: [] as PlaceImageInfo[],
            success: false,
          };
        }
      });

      const results = await Promise.all(imagePromises);

      // 统计信息
      const found = results.filter(r => r.success && r.images.length > 0).length;
      const failed = results.filter(r => !r.success).length;

      setImages(prev => {
        const newMap = new Map(prev);
        results.forEach(result => {
          if (result.placeId) {
            newMap.set(result.placeId, result.images);
            loadedPlaceIds.current.add(result.placeId);
          }
        });
        return newMap;
      });

      setStats({
        total: newPlaces.length,
        found,
        failed,
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || '加载图片失败');
        console.error('[usePlaceImages] 加载失败:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // 当地点 ID 集合变化时加载新图片
  // 使用 placeIdsKey 作为依赖，但不包括 loadImages，避免循环依赖
  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeIdsKey]); // 只依赖 placeIdsKey，loadImages 通过闭包访问

  // 清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const refresh = useCallback(() => {
    loadedPlaceIds.current.clear();
    setImages(new Map());
    loadImages();
  }, [loadImages]);

  return {
    images,
    loading,
    error,
    stats,
    refresh,
  };
}

/**
 * 从行程数据中提取地点列表
 * 
 * @param tripDays - 行程天列表
 * @returns 地点列表（去重）
 */
export function extractPlacesFromTrip(
  tripDays: Array<{
    ItineraryItem: Array<{
      Place?: {
        id: number;
        nameCN?: string;
        nameEN?: string | null;
        category?: string;
      } | null;
    }>;
  }>
): PlaceInfo[] {
  const placeMap = new Map<number, PlaceInfo>();

  tripDays.forEach(day => {
    day.ItineraryItem.forEach(item => {
      if (item.Place && item.Place.id) {
        placeMap.set(item.Place.id, {
          id: item.Place.id,
          nameCN: item.Place.nameCN,
          nameEN: item.Place.nameEN,
          category: item.Place.category,
        });
      }
    });
  });

  return Array.from(placeMap.values());
}

export default usePlaceImages;
