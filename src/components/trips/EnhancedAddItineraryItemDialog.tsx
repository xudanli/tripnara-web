/**
 * 增强版添加行程项对话框
 * 
 * 融合了"找点"功能，用户可以在时间轴中直接：
 * - 搜索地点（关键词搜索）
 * - 查找附近地点（基于GPS）
 * - 获取推荐地点（基于行程）
 * - 按类型筛选
 * - 设置时间并添加到行程
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { itineraryItemsApi } from '@/api/trips';
import { placesApi } from '@/api/places';
import type { CreateItineraryItemRequest, ItineraryItemType, TripDay } from '@/types/trip';
import { getTimezoneByCountry, localTimeToUTC } from '@/utils/timezone';
import type { PlaceWithDistance, PlaceCategory } from '@/types/places-routes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
// ScrollArea 已移除，使用原生 overflow-y-auto 实现滚动
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MapPin, 
  Utensils, 
  Coffee, 
  Car, 
  Search,
  Star,
  Clock,
  Info,
  Plus,
  Navigation,
  Sparkles,
  X,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { getDefaultCostCategory } from '@/hooks';
import { DollarSign } from 'lucide-react';
import type { CostCategory } from '@/types/trip';
import { EmptyStateCard } from '@/components/ui/empty-state-images';

// ==================== 类型定义 ====================

interface EnhancedAddItineraryItemDialogProps {
  tripDay: TripDay;
  tripId: string;
  countryCode?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** 初始搜索模式 */
  initialSearchMode?: SearchMode;
  /** 初始位置（用于附近搜索） */
  initialLocation?: { lat: number; lng: number };
  /** 初始类别筛选 */
  initialCategory?: PlaceCategory | 'all';
  /** 行程项ID（用于基于行程项搜索附近POI） */
  itemId?: string;
  /** 插入用餐模式：预填用餐类型、时间和备注（如午餐 12:00-13:00、晚餐 18:00-19:00） */
  initialInsertMeal?: {
    itemType: ItineraryItemType;
    startTime: string;
    endTime: string;
    note?: string; // '午餐' | '晚餐' 等
  };
  /** @deprecated 使用 initialInsertMeal 替代 */
  initialInsertLunch?: {
    itemType: ItineraryItemType;
    startTime: string;
    endTime: string;
  };
}

interface ItemTypeOption {
  value: ItineraryItemType;
  label: string;
  icon: typeof MapPin;
  description: string;
}

type SearchMode = 'search' | 'nearby' | 'recommend';

// ==================== 配置 ====================

const ITEM_TYPE_OPTIONS: ItemTypeOption[] = [
  {
    value: 'ACTIVITY',
    label: '景点/活动',
    icon: MapPin,
    description: '参观景点、体验活动',
  },
  {
    value: 'MEAL_ANCHOR',
    label: '固定用餐',
    icon: Utensils,
    description: '预约餐厅、重要用餐',
  },
  {
    value: 'MEAL_FLOATING',
    label: '灵活用餐',
    icon: Coffee,
    description: '随机用餐、小吃',
  },
  {
    value: 'REST',
    label: '休息',
    icon: Coffee,
    description: '酒店休息、自由时间',
  },
  {
    value: 'TRANSIT',
    label: '交通',
    icon: Car,
    description: '火车、飞机、巴士等',
  },
];

const CATEGORY_OPTIONS: { value: PlaceCategory | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'all' },
  { value: 'ATTRACTION', labelKey: 'attraction' },
  { value: 'RESTAURANT', labelKey: 'restaurant' },
  { value: 'CAFE', labelKey: 'cafe' },
  { value: 'BAR', labelKey: 'bar' },
  { value: 'SHOPPING', labelKey: 'shopping' },
  { value: 'HOTEL', labelKey: 'hotel' },
  { value: 'MUSEUM', labelKey: 'museum' },
  { value: 'PARK', labelKey: 'park' },
  { value: 'TRANSPORT', labelKey: 'transport' },
  { value: 'TRANSIT_HUB', labelKey: 'transitHub' },
  { value: 'OTHER', labelKey: 'other' },
];

// ==================== 工具函数 ====================

// 根据日期判断季节（北半球）
const getSeason = (date: Date): 'spring' | 'summer' | 'autumn' | 'winter' => {
  const month = date.getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter'; // 12, 1, 2
};

// 解析包含季节信息的开放时间字符串
const parseSeasonalHours = (text: string, targetDate: Date): string | null => {
  // 匹配格式：全年24小时开放 (游客中心开放时间: 夏季9:00-18:00, 冬季10:00-16:00)
  const seasonalMatch = text.match(/(夏季|春天|春季|summer|spring)[：:]\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/i);
  const winterMatch = text.match(/(冬季|冬天|winter)[：:]\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/i);
  
  const season = getSeason(targetDate);
  
  // 提取前面的描述（如 "全年24小时开放"）
  const prefixMatch = text.match(/^([^(（]+)/);
  const prefix = prefixMatch ? prefixMatch[1].trim() : '';
  
  // 根据季节返回对应时间
  if (season === 'winter' && winterMatch) {
    const hours = `${winterMatch[2]}-${winterMatch[3]}`;
    // 如果有前缀描述，保留它
    return prefix ? `${prefix} (${hours})` : hours;
  }
  if ((season === 'spring' || season === 'summer') && seasonalMatch) {
    const hours = `${seasonalMatch[2]}-${seasonalMatch[3]}`;
    // 如果有前缀描述，保留它
    return prefix ? `${prefix} (${hours})` : hours;
  }
  
  // 如果没有匹配到季节信息，返回原文本
  return text;
};

// 格式化开放时间（根据行程日期应用季节过滤）
const formatOpeningHours = (openingHours: any, tripDate: string): string | null => {
  if (!openingHours) return null;
  
  const targetDate = tripDate ? new Date(tripDate) : new Date();
  
  // 如果是字符串格式
  if (typeof openingHours === 'string') {
    // 检查是否包含季节信息
    if (openingHours.includes('夏季') || openingHours.includes('冬季') || 
        openingHours.includes('summer') || openingHours.includes('winter')) {
      return parseSeasonalHours(openingHours, targetDate);
    }
    return openingHours;
  }
  
  // 如果是对象格式，优先使用 text 字段
  if (typeof openingHours === 'object' && openingHours.text) {
    const text = openingHours.text;
    if (typeof text === 'string' && (text.includes('夏季') || text.includes('冬季') || 
        text.includes('summer') || text.includes('winter'))) {
      return parseSeasonalHours(text, targetDate);
    }
    return text;
  }
  
  return null;
};

// ==================== 组件 ====================

export function EnhancedAddItineraryItemDialog({
  tripDay,
  tripId,
  countryCode,
  open,
  onOpenChange,
  onSuccess,
  initialSearchMode,
  initialLocation,
  initialCategory,
  itemId,
  initialInsertMeal,
  initialInsertLunch,
}: EnhancedAddItineraryItemDialogProps) {
  const { t } = useTranslation();
  
  // 视图模式：'browse' 浏览地点 | 'configure' 配置时间
  const [viewMode, setViewMode] = useState<'browse' | 'configure'>('browse');
  
  // 搜索模式
  const [searchMode, setSearchMode] = useState<SearchMode>(initialSearchMode || 'search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | 'all'>(initialCategory || 'all');
  const [searchResults, setSearchResults] = useState<PlaceWithDistance[]>([]);
  const [searching, setSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(initialLocation || null);
  // 搜索范围：'current' 当前位置 | 'destination' 行程目的地
  const [searchScope, setSearchScope] = useState<'current' | 'destination'>('current');
  // 搜索结果警告（当选择行程目的地但结果距离很远时）
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  
  // 选中的地点
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithDistance | null>(null);
  
  // 时间配置
  const [itemType, setItemType] = useState<ItineraryItemType>('ACTIVITY');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [note, setNote] = useState('');
  
  // 费用相关状态
  const [showCostFields, setShowCostFields] = useState<boolean>(false);
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [actualCost, setActualCost] = useState<string>('');
  const [costCategory, setCostCategory] = useState<CostCategory | ''>('');
  const [costNote, setCostNote] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  
  // 当类型改变时，自动设置费用分类
  useEffect(() => {
    if (!costCategory && itemType) {
      const defaultCategory = getDefaultCostCategory(itemType) as CostCategory;
      setCostCategory(defaultCategory);
    }
  }, [itemType, costCategory]);
  
  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // 获取用户位置（如果没有提供初始位置）
  useEffect(() => {
    // 如果提供了初始位置，使用它；否则尝试获取用户位置
    if (initialLocation) {
      setUserLocation(initialLocation);
      return;
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('获取位置失败:', error);
        }
      );
    }
  }, [initialLocation]);

  // 重置表单
  const resetForm = useCallback(() => {
    setViewMode('browse');
    setSearchMode('search');
    setSearchQuery('');
    setSelectedCategory('all');
    setSearchResults([]);
    setSelectedPlace(null);
    setItemType('ACTIVITY');
    setStartTime('09:00');
    setEndTime('10:00');
    setNote('');
    setError(null);
    // 重置费用字段
    setEstimatedCost('');
    setActualCost('');
    setCostCategory('');
    setCostNote('');
    setIsPaid(false);
    setShowCostFields(false);
    // 重置搜索范围（默认使用当前位置，如果有的话）
    setSearchScope(userLocation ? 'current' : 'destination');
    setSearchWarning(null);
  }, [userLocation]);

  // 打开时重置表单或设置初始状态
  useEffect(() => {
    if (open) {
      const insertMeal = initialInsertMeal ?? (initialInsertLunch ? { ...initialInsertLunch, note: '午餐' as string } : null);
      if (insertMeal) {
        // 插入用餐模式：预填用餐类型、时间和备注，直接进入配置页
        setItemType(insertMeal.itemType);
        setStartTime(insertMeal.startTime);
        setEndTime(insertMeal.endTime);
        setNote(insertMeal.note ?? '午餐');
        setViewMode('configure');
        setSelectedCategory('RESTAURANT');
        setSelectedPlace(null);
        setSearchMode('search');
        setError(null);
      } else if (initialSearchMode && initialLocation) {
        // 如果提供了初始搜索模式和位置，设置它们
        setSearchMode(initialSearchMode);
        setUserLocation(initialLocation);
        setSearchScope('current');
        if (initialCategory) {
          setSelectedCategory(initialCategory);
        }
      } else {
        resetForm();
      }
    }
  }, [open, resetForm, initialSearchMode, initialLocation, initialCategory, initialInsertMeal, initialInsertLunch]);

  // 搜索地点
  const handleSearch = useCallback(async (query: string, mode: SearchMode, category: PlaceCategory | 'all') => {
    if (mode === 'search' && (!query.trim() || query.length < 2)) {
      setSearchResults([]);
      return;
    }

    if (mode === 'nearby' && !userLocation) {
      toast.error(t('planStudio.placesTab.needLocationForNearby'));
      return;
    }

    // 🔍 调试：打印 countryCode 值
    console.log('[EnhancedAddItineraryItemDialog] 搜索参数:', {
      query,
      mode,
      category,
      countryCode,
      hasCountryCode: !!countryCode,
    });

    setSearching(true);
    try {
      let results: PlaceWithDistance[] = [];

      if (mode === 'search') {
        const searchParams: any = {
          q: query,
          limit: 20,
          type: category !== 'all' ? category : undefined,
        };
        
        // 根据搜索范围决定使用哪个位置
        if (searchScope === 'current' && userLocation) {
          // 当前位置：使用用户位置，不限制国家
          searchParams.lat = userLocation.lat;
          searchParams.lng = userLocation.lng;
          // 不传递 countryCode，让后端根据位置智能搜索
        } else if (searchScope === 'destination' && countryCode) {
          // 行程目的地：不传递位置，只传递国家代码
          searchParams.countryCode = countryCode;
          // 明确不传递 lat/lng，避免后端使用用户位置计算距离
        }
        
        console.log('[EnhancedAddItineraryItemDialog] 搜索请求参数:', {
          ...searchParams,
          searchScope,
          hasUserLocation: !!userLocation,
          countryCode,
        });
        results = await placesApi.searchPlaces(searchParams);
        console.log('[EnhancedAddItineraryItemDialog] 搜索结果:', {
          count: results?.length || 0,
          results: results,
          isArray: Array.isArray(results),
        });
      } else if (mode === 'nearby') {
        // 优先使用新接口：基于行程项搜索附近POI
        if (itemId) {
          // 将 PlaceCategory 转换为 API 需要的类别字符串
          // API 支持的类别：ATTRACTION, RESTAURANT, HOTEL, GAS_STATION, REST_AREA
          // 注意：ItineraryItemRow 中"休息点"使用的是 'CAFE'，"加油站"使用的是 'TRANSPORT'
          // 这里需要特殊处理这些映射
          let apiCategory: string | undefined;
          if (category !== 'all') {
            // 特殊处理：ItineraryItemRow 传递的特殊值
            if (category === 'CAFE') {
              // ItineraryItemRow 中"休息点"使用 'CAFE'，映射为 'REST_AREA'
              apiCategory = 'REST_AREA';
            } else if (category === 'TRANSPORT') {
              // ItineraryItemRow 中"加油站"使用 'TRANSPORT'，映射为 'GAS_STATION'
              apiCategory = 'GAS_STATION';
            } else {
              // 标准映射
              const categoryMap: Record<PlaceCategory, string> = {
                ATTRACTION: 'ATTRACTION',
                RESTAURANT: 'RESTAURANT',
                HOTEL: 'HOTEL',
                CAFE: 'RESTAURANT', // 咖啡厅归类为餐厅（但通常会被上面的特殊处理拦截）
                BAR: 'RESTAURANT', // 酒吧归类为餐厅
                MUSEUM: 'ATTRACTION', // 博物馆归类为景点
                PARK: 'ATTRACTION', // 公园归类为景点
                SHOPPING: 'ATTRACTION', // 购物归类为景点
                TRANSPORT: 'REST_AREA', // 交通枢纽归类为休息点（但通常会被上面的特殊处理拦截）
                TRANSIT_HUB: 'REST_AREA', // 交通枢纽归类为休息点
                OTHER: 'ATTRACTION', // 其他归类为景点
              };
              apiCategory = categoryMap[category];
            }
          }
          
          const categories = apiCategory ? [apiCategory] : undefined;
          
          const nearbyPoiResults = await itineraryItemsApi.getNearbyPoi({
            itemId,
            radius: 5000,
            categories,
            limit: 20,
          });
          
          // 转换为 PlaceWithDistance 格式
          // API 返回的 category 可能是：ATTRACTION, RESTAURANT, HOTEL, GAS_STATION, REST_AREA
          // 需要映射回 PlaceCategory 类型
          const apiToPlaceCategory: Record<string, PlaceCategory> = {
            ATTRACTION: 'ATTRACTION',
            RESTAURANT: 'RESTAURANT',
            HOTEL: 'HOTEL',
            GAS_STATION: 'OTHER', // 加油站映射为 OTHER（因为 PlaceCategory 没有 GAS_STATION）
            REST_AREA: 'OTHER', // 休息点映射为 OTHER（因为 PlaceCategory 没有 REST_AREA）
          };
          
          results = nearbyPoiResults.map((poi) => {
            // 转换 openingHours 格式：API 返回 { open, close, openNow }，需要转换为 Record<string, string>
            let openingHours: Record<string, string> | undefined;
            if (poi.openingHours) {
              const hours = poi.openingHours;
              if (hours.open && hours.close) {
                openingHours = {
                  monday: `${hours.open}-${hours.close}`,
                  tuesday: `${hours.open}-${hours.close}`,
                  wednesday: `${hours.open}-${hours.close}`,
                  thursday: `${hours.open}-${hours.close}`,
                  friday: `${hours.open}-${hours.close}`,
                  saturday: `${hours.open}-${hours.close}`,
                  sunday: `${hours.open}-${hours.close}`,
                };
              }
            }
            
            // 构建 metadata，确保类型正确
            const metadata: any = {
              ...poi.metadata,
              // 保留原始 API 类别，以便显示
              originalCategory: poi.category,
            };
            
            // 只有在有 openingHours 时才添加
            if (openingHours) {
              metadata.openingHours = openingHours;
            }
            
            // 保留 openNow 信息（作为额外字段）
            if (poi.openingHours?.openNow !== undefined) {
              metadata.openNow = poi.openingHours.openNow;
            }
            
            return {
              id: poi.id,
              nameCN: poi.nameCN,
              nameEN: poi.nameEN,
              category: apiToPlaceCategory[poi.category] || 'OTHER',
              address: poi.address,
              rating: poi.rating,
              latitude: poi.lat,
              longitude: poi.lng,
              distance: poi.distanceMeters,
              metadata,
            };
          });
        } else if (userLocation) {
          // 如果没有 itemId，使用新接口的坐标模式
          // 将 PlaceCategory 转换为 API 需要的类别字符串
          let apiCategory: string | undefined;
          if (category !== 'all') {
            // 特殊处理：ItineraryItemRow 传递的特殊值
            if (category === 'CAFE') {
              apiCategory = 'REST_AREA';
            } else if (category === 'TRANSPORT') {
              apiCategory = 'GAS_STATION';
            } else {
              const categoryMap: Record<PlaceCategory, string> = {
                ATTRACTION: 'ATTRACTION',
                RESTAURANT: 'RESTAURANT',
                HOTEL: 'HOTEL',
                CAFE: 'RESTAURANT',
                BAR: 'RESTAURANT',
                MUSEUM: 'ATTRACTION',
                PARK: 'ATTRACTION',
                SHOPPING: 'ATTRACTION',
                TRANSPORT: 'REST_AREA',
                TRANSIT_HUB: 'REST_AREA',
                OTHER: 'ATTRACTION',
              };
              apiCategory = categoryMap[category];
            }
          }
          
          const categories = apiCategory ? [apiCategory] : undefined;
          
          const nearbyPoiResults = await itineraryItemsApi.getNearbyPoi({
            lat: userLocation.lat,
            lng: userLocation.lng,
            radius: 5000,
            categories,
            limit: 20,
          });
          
          // 转换为 PlaceWithDistance 格式
          const apiToPlaceCategory: Record<string, PlaceCategory> = {
            ATTRACTION: 'ATTRACTION',
            RESTAURANT: 'RESTAURANT',
            HOTEL: 'HOTEL',
            GAS_STATION: 'OTHER',
            REST_AREA: 'OTHER',
          };
          
          results = nearbyPoiResults.map((poi) => {
            // 转换 openingHours 格式
            let openingHours: Record<string, string> | undefined;
            if (poi.openingHours) {
              const hours = poi.openingHours;
              if (hours.open && hours.close) {
                openingHours = {
                  monday: `${hours.open}-${hours.close}`,
                  tuesday: `${hours.open}-${hours.close}`,
                  wednesday: `${hours.open}-${hours.close}`,
                  thursday: `${hours.open}-${hours.close}`,
                  friday: `${hours.open}-${hours.close}`,
                  saturday: `${hours.open}-${hours.close}`,
                  sunday: `${hours.open}-${hours.close}`,
                };
              }
            }
            
            const metadata: any = {
              ...poi.metadata,
              originalCategory: poi.category,
            };
            
            if (openingHours) {
              metadata.openingHours = openingHours;
            }
            
            if (poi.openingHours?.openNow !== undefined) {
              metadata.openNow = poi.openingHours.openNow;
            }
            
            return {
              id: poi.id,
              nameCN: poi.nameCN,
              nameEN: poi.nameEN,
              category: apiToPlaceCategory[poi.category] || 'OTHER',
              address: poi.address,
              rating: poi.rating,
              latitude: poi.lat,
              longitude: poi.lng,
              distance: poi.distanceMeters,
              metadata,
            };
          });
        } else {
          toast.error(t('planStudio.placesTab.needLocationForNearby'));
          setSearchResults([]);
          return;
        }
      } else if (mode === 'recommend') {
        // 使用新的推荐活动接口
        if (!countryCode) {
          toast.error('需要国家代码才能获取推荐活动，请先设置行程目的地');
          setSearchResults([]);
          return;
        }
        
        // 转换 category，只支持推荐接口的类别
        let recommendCategory: 'ATTRACTION' | 'RESTAURANT' | 'SHOPPING' | 'HOTEL' | undefined;
        if (category !== 'all') {
          // 只转换支持的类别，TRANSIT_HUB 不支持
          if (category === 'ATTRACTION' || category === 'RESTAURANT' || category === 'SHOPPING' || category === 'HOTEL') {
            recommendCategory = category;
          }
        }
        
        const recommendations = await placesApi.getRecommendedActivities({
          countryCode: countryCode.toUpperCase(),
          category: recommendCategory,
          limit: 20,
        });
        
        // 转换数据格式为 PlaceWithDistance
        results = recommendations.map((p) => ({
          id: p.id,
          nameCN: p.nameCN,
          nameEN: p.nameEN || undefined,
          category: p.category,
          address: p.address,
          rating: p.rating,
          distance: p.distance, // 推荐接口固定为 0
          metadata: {
            isOpen: p.isOpen,
            tags: p.tags,
            status: p.status,
          },
        })) as PlaceWithDistance[];
      }

      console.log('[EnhancedAddItineraryItemDialog] 设置搜索结果:', {
        count: results?.length || 0,
        results: results,
        searchScope,
        countryCode,
      });
      
      // 验证：如果选择"行程目的地"，检查结果地址中的国家信息
      if (mode === 'search' && searchScope === 'destination' && countryCode && results.length > 0) {
        // 国家代码到国家名称的映射（用于检查地址）
        const countryNameMap: Record<string, string[]> = {
          'IS': ['冰岛', 'Iceland', '冰島'],
          'JP': ['日本', 'Japan'],
          'CN': ['中国', 'China'],
          'US': ['美国', 'United States', 'USA'],
          'GB': ['英国', 'United Kingdom', 'UK'],
        };
        
        const countryNames = countryNameMap[countryCode] || [countryCode];
        const suspiciousResults = results.filter(r => {
          const address = (r.address || '').toLowerCase();
          // 如果地址中不包含目标国家的任何名称，可能是错误的结果
          return !countryNames.some(name => address.includes(name.toLowerCase()));
        });
        
        // 只有当大部分结果都不匹配时才显示警告
        if (suspiciousResults.length > results.length * 0.5) {
          console.warn('[EnhancedAddItineraryItemDialog] ⚠️ 检测到可能不匹配的结果:', {
            countryCode,
            suspiciousCount: suspiciousResults.length,
            totalCount: results.length,
            results: suspiciousResults.map(r => ({
              name: r.nameCN || r.nameEN,
              address: r.address,
            })),
          });
          setSearchWarning(`⚠️ 部分搜索结果可能不在 ${countryCode}，请检查后端 API 是否正确使用了国家代码过滤`);
        } else {
          setSearchWarning(null);
        }
      } else {
        setSearchWarning(null);
      }
      
      // 确保 results 是数组
      const validResults = Array.isArray(results) ? results : [];
      setSearchResults(validResults);
      
      // 如果没有结果，显示提示
      if (validResults.length === 0 && mode === 'search') {
        console.log('[EnhancedAddItineraryItemDialog] 未找到匹配的地点');
      }
    } catch (err: any) {
      console.error('[EnhancedAddItineraryItemDialog] 搜索错误:', err);
      console.error('[EnhancedAddItineraryItemDialog] 错误详情:', {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        url: err.config?.url,
      });
      
      // 根据错误类型显示不同的提示
      let errorMessage = err.message || t('planStudio.placesTab.searchFailed');
      if (err.code === 'ECONNABORTED') {
        errorMessage = '搜索超时，请稍后重试';
      } else if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        errorMessage = '无法连接到服务器，请检查网络连接';
      }
      
      toast.error(errorMessage);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [userLocation, countryCode, tripId, t, searchScope]);

  // 监听搜索词变化（仅搜索模式）
  useEffect(() => {
    console.log('[EnhancedAddItineraryItemDialog] 搜索词变化:', {
      searchMode,
      searchQuery,
      debouncedQuery,
      debouncedLength: debouncedQuery.length,
      selectedCategory,
    });
    
    if (searchMode === 'search') {
      if (debouncedQuery.length >= 2) {
        console.log('[EnhancedAddItineraryItemDialog] 触发搜索:', debouncedQuery);
        handleSearch(debouncedQuery, searchMode, selectedCategory);
      } else {
        // 搜索词少于2个字符时，清空搜索结果
        console.log('[EnhancedAddItineraryItemDialog] 搜索词太短，清空结果');
        setSearchResults([]);
      }
    }
  }, [debouncedQuery, searchMode, selectedCategory, handleSearch]);

  // 当对话框打开且提供了初始搜索模式时，自动执行搜索
  useEffect(() => {
    if (open && initialSearchMode === 'nearby' && userLocation && initialLocation) {
      // 延迟执行搜索，确保状态已更新
      const timer = setTimeout(() => {
        handleSearch('', 'nearby', 'all');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, initialSearchMode, userLocation, initialLocation, handleSearch]);

  // 切换搜索模式时触发搜索
  const handleModeChange = async (mode: SearchMode) => {
    setSearchMode(mode);
    setSearchQuery('');
    setSearchResults([]);
    
    if (mode === 'nearby' || mode === 'recommend') {
      await handleSearch('', mode, selectedCategory);
    }
  };

  // 切换类型筛选
  const handleCategoryChange = async (category: PlaceCategory | 'all') => {
    setSelectedCategory(category);
    if (searchMode === 'search' && searchQuery.length >= 2) {
      await handleSearch(searchQuery, searchMode, category);
    } else if (searchMode === 'nearby' || searchMode === 'recommend') {
      await handleSearch('', searchMode, category);
    }
  };

  // 选择地点，进入配置模式
  const handleSelectPlace = (place: PlaceWithDistance) => {
    setSelectedPlace(place);
    setViewMode('configure');
    
    // 根据地点类型自动设置行程类型
    if (place.category === 'RESTAURANT') {
      setItemType('MEAL_ANCHOR');
    } else if (place.category === 'HOTEL') {
      setItemType('REST');
    } else if (place.category === 'TRANSIT_HUB') {
      setItemType('TRANSIT');
    } else {
      setItemType('ACTIVITY');
    }
    
    // 根据典型时长自动设置结束时间
    const typicalDuration = (place as any).typicalDuration || place.metadata?.typicalDuration;
    if (typicalDuration) {
      const durationHours = Math.ceil(typicalDuration / 60);
      const [startHour] = startTime.split(':').map(Number);
      const endHour = Math.min(startHour + durationHours, 23);
      setEndTime(`${endHour.toString().padStart(2, '0')}:00`);
    }
  };

  // 返回浏览模式
  const handleBackToBrowse = () => {
    setViewMode('browse');
    setSelectedPlace(null);
    setError(null);
  };

  // 获取目的地时区
  const timezone = useMemo(() => getTimezoneByCountry(countryCode || ''), [countryCode]);

  // 提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[EnhancedAddItineraryItemDialog] handleSubmit called', { selectedPlace, startTime, endTime, timezone });
    
    if (!selectedPlace) {
      setError('请选择一个地点');
      return;
    }

    if (!startTime || !endTime) {
      setError('请设置开始和结束时间');
      return;
    }

    // 获取 TripDay 的日期（格式: 2026-01-26T00:00:00.000Z -> 2026-01-26）
    const dayDateStr = tripDay.date.split('T')[0];
    
    // 使用目的地时区构建正确的 UTC 时间
    const startTimeUTC = localTimeToUTC(dayDateStr, startTime, timezone);
    const endTimeUTC = localTimeToUTC(dayDateStr, endTime, timezone);
    
    // 用于本地校验的 Date 对象
    const startDateTime = new Date(startTimeUTC);
    const endDateTime = new Date(endTimeUTC);

    console.log('[EnhancedAddItineraryItemDialog] 时间转换:', {
      dayDateStr,
      startTime,
      endTime,
      timezone,
      startTimeUTC,
      endTimeUTC,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
    });

    if (endDateTime <= startDateTime) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data: CreateItineraryItemRequest = {
        tripDayId: tripDay.id,
        type: itemType,
        placeId: selectedPlace.id,
        startTime: startTimeUTC,  // 已经是正确的 UTC 时间
        endTime: endTimeUTC,      // 已经是正确的 UTC 时间
        note: note.trim() || undefined,
      };
      
      // 添加费用字段（如果有填写）
      if (showCostFields) {
        if (estimatedCost) {
          data.estimatedCost = parseFloat(estimatedCost);
        }
        if (actualCost) {
          data.actualCost = parseFloat(actualCost);
        }
        if (costCategory) {
          data.costCategory = costCategory as CostCategory;
        }
        if (costNote.trim()) {
          data.costNote = costNote.trim();
        }
        data.isPaid = isPaid;
      }

      console.log('[EnhancedAddItineraryItemDialog] 调用 API 创建行程项', data);
      await itineraryItemsApi.create(data);
      console.log('[EnhancedAddItineraryItemDialog] API 调用成功');
      
      // 注意：不再自动调用 Orchestrator
      // 原因：添加行程项是用户的确定性操作，不需要 AI 实时检查
      // AI 检查应该在用户主动触发时执行（如点击"检查行程"或"一键优化"）
      
      toast.success(t('planStudio.placesTab.addPlaceSuccess', { 
        placeName: selectedPlace.nameCN || selectedPlace.nameEN || ''
      }));
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Create itinerary item failed:', err);
      setError(err.message || '添加失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 手动添加（不选择地点）
  const handleManualAdd = (type: ItineraryItemType) => {
    setSelectedPlace(null);
    setItemType(type);
    setViewMode('configure');
  };

  // 手动添加提交
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[EnhancedAddItineraryItemDialog] handleManualSubmit called', { itemType, startTime, endTime, timezone });

    if (!startTime || !endTime) {
      setError('请设置开始和结束时间');
      return;
    }

    // 获取 TripDay 的日期（格式: 2026-01-26T00:00:00.000Z -> 2026-01-26）
    const dayDateStr = tripDay.date.split('T')[0];
    
    // 使用目的地时区构建正确的 UTC 时间
    const startTimeUTC = localTimeToUTC(dayDateStr, startTime, timezone);
    const endTimeUTC = localTimeToUTC(dayDateStr, endTime, timezone);
    
    // 用于本地校验的 Date 对象
    const startDateTime = new Date(startTimeUTC);
    const endDateTime = new Date(endTimeUTC);

    console.log('[EnhancedAddItineraryItemDialog] 时间转换 (手动添加):', {
      dayDateStr,
      startTime,
      endTime,
      timezone,
      startTimeUTC,
      endTimeUTC,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
    });

    if (endDateTime <= startDateTime) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data: CreateItineraryItemRequest = {
        tripDayId: tripDay.id,
        type: itemType,
        startTime: startTimeUTC,  // 已经是正确的 UTC 时间
        endTime: endTimeUTC,      // 已经是正确的 UTC 时间
        note: note.trim() || undefined,
      };
      
      // 添加费用字段（如果有填写）
      if (showCostFields) {
        if (estimatedCost) {
          data.estimatedCost = parseFloat(estimatedCost);
        }
        if (actualCost) {
          data.actualCost = parseFloat(actualCost);
        }
        if (costCategory) {
          data.costCategory = costCategory as CostCategory;
        }
        if (costNote.trim()) {
          data.costNote = costNote.trim();
        }
        data.isPaid = isPaid;
      }

      console.log('[EnhancedAddItineraryItemDialog] 调用 API 创建手动行程项', data);
      await itineraryItemsApi.create(data);
      console.log('[EnhancedAddItineraryItemDialog] API 调用成功');
      
      toast.success('行程项添加成功');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Create itinerary item failed:', err);
      setError(err.message || '添加失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const currentTypeOption = ITEM_TYPE_OPTIONS.find(o => o.value === itemType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0">
        {/* 固定头部 - 显示目标日期 */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            添加行程项
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="secondary" className="font-medium">
              {tripDay.date}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {/* 主内容区 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === 'browse' ? (
            /* 浏览模式：找点 */
            <div className="flex flex-col h-full min-h-0">
              {/* 搜索模式切换 */}
              <div className="px-6 pt-4 flex-shrink-0">
                <Tabs value={searchMode} onValueChange={(v) => handleModeChange(v as SearchMode)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="search" className="flex items-center gap-1.5">
                      <Search className="w-4 h-4" />
                      搜索
                    </TabsTrigger>
                    <TabsTrigger value="nearby" className="flex items-center gap-1.5">
                      <Navigation className="w-4 h-4" />
                      附近
                    </TabsTrigger>
                    <TabsTrigger value="recommend" className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      推荐
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* 搜索框（仅搜索模式显示） */}
              {searchMode === 'search' && (
                <div className="px-6 pt-3 flex-shrink-0 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log('[EnhancedAddItineraryItemDialog] 输入框变化:', value);
                        setSearchQuery(value);
                      }}
                      placeholder="搜索地点名称..."
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                  {/* 搜索范围切换 */}
                  {userLocation && countryCode && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">搜索范围：</span>
                      <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSearchScope('current');
                            // 如果当前有搜索词，重新搜索
                            if (searchQuery.length >= 2) {
                              handleSearch(searchQuery, searchMode, selectedCategory);
                            }
                          }}
                          className={cn(
                            "px-2 py-1 rounded text-xs transition-colors",
                            searchScope === 'current'
                              ? "bg-white text-gray-900 shadow-sm font-medium"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                        >
                          当前位置
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchScope('destination');
                            // 如果当前有搜索词，重新搜索
                            if (searchQuery.length >= 2) {
                              handleSearch(searchQuery, searchMode, selectedCategory);
                            }
                          }}
                          className={cn(
                            "px-2 py-1 rounded text-xs transition-colors",
                            searchScope === 'destination'
                              ? "bg-white text-gray-900 shadow-sm font-medium"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                        >
                          行程目的地
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 类型筛选 */}
              <div className="px-6 pt-3 pb-2 flex-shrink-0">
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(({ value, labelKey }) => (
                    <Button
                      key={value}
                      variant={selectedCategory === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleCategoryChange(value)}
                      className="h-7 text-xs"
                    >
                      {t(`planStudio.placesTab.categories.${labelKey}`)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 搜索结果 - 固定最大高度实现滚动 */}
              <div className="max-h-[calc(85vh-280px)] overflow-y-auto px-6">
                {searching ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <LogoLoading size={32} />
                    <span className="text-sm text-muted-foreground">搜索中...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2 pb-4">
                    {/* 搜索结果警告 */}
                    {searchWarning && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 mb-2">
                        <div className="flex items-start gap-2">
                          <span>⚠️</span>
                          <span>{searchWarning}</span>
                        </div>
                      </div>
                    )}
                    {searchResults.map((place) => (
                      <Card 
                        key={place.id} 
                        className="cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all"
                        onClick={() => handleSelectPlace(place)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                <span className="font-medium truncate">
                                  {place.nameCN || place.nameEN}
                                </span>
                                {place.rating && (
                                  <div className="flex items-center gap-0.5 text-amber-500">
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                    <span className="text-xs font-medium">{place.rating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {place.category && (
                                  <Badge variant="outline" className="text-xs h-5">
                                    {place.category}
                                  </Badge>
                                )}
                                {(() => {
                                  // 格式化开放时间（根据行程日期应用季节过滤）
                                  const openingHours = place.metadata?.openingHours || (place as any).openingHours;
                                  const formattedHours = formatOpeningHours(openingHours, tripDay.date);
                                  return formattedHours ? (
                                    <span className="flex items-center gap-1 text-emerald-600">
                                      <Clock className="w-3 h-3" />
                                      {formattedHours}
                                    </span>
                                  ) : null;
                                })()}
                                {((place as any).typicalDuration || place.metadata?.typicalDuration) && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    约{Math.round(((place as any).typicalDuration || place.metadata?.typicalDuration) / 60)}分钟
                                  </span>
                                )}
                                {place.distance && place.distance > 0 && (
                                  <span>
                                    {place.distance > 1000 
                                      ? `${(place.distance / 1000).toFixed(1)}km` 
                                      : `${place.distance}m`}
                                  </span>
                                )}
                              </div>
                              {place.address && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {place.address}
                                </p>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" className="flex-shrink-0">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyStateCard
                    type={searchMode === 'recommend' ? 'no-recommended-places' : 'no-recommended-places'}
                    title={
                      searchMode === 'search' 
                        ? '输入关键词搜索地点'
                        : searchMode === 'nearby'
                        ? userLocation ? '暂无附近地点' : '无法获取位置信息'
                        : '暂无推荐地点'
                    }
                    imageWidth={120}
                    imageHeight={120}
                    className="py-8"
                  />
                )}
              </div>

              {/* 手动添加区域 */}
              <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0">
                <p className="text-xs text-muted-foreground mb-2">或手动添加</p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleManualAdd('REST')}
                    className="h-8"
                  >
                    <Coffee className="w-4 h-4 mr-1.5" />
                    休息
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleManualAdd('TRANSIT')}
                    className="h-8"
                  >
                    <Car className="w-4 h-4 mr-1.5" />
                    交通
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleManualAdd('MEAL_FLOATING')}
                    className="h-8"
                  >
                    <Utensils className="w-4 h-4 mr-1.5" />
                    用餐
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* 配置模式：设置时间 */
            <form onSubmit={selectedPlace ? handleSubmit : handleManualSubmit} className="flex flex-col h-full">
              <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto max-h-[calc(85vh-200px)]">
                {/* 返回按钮 */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToBrowse}
                  className="mb-2 -ml-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  返回选择地点
                </Button>

                {/* 已选地点信息 */}
                {selectedPlace && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-900">
                              {selectedPlace.nameCN || selectedPlace.nameEN}
                            </span>
                          </div>
                          {selectedPlace.address && (
                            <p className="text-xs text-blue-700 ml-6">
                              {selectedPlace.address}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleBackToBrowse}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 行程类型选择 */}
                <div className="space-y-2">
                  <Label>行程类型</Label>
                  <Select value={itemType} onValueChange={(v) => setItemType(v as ItineraryItemType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPE_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {currentTypeOption && (
                    <p className="text-xs text-muted-foreground">{currentTypeOption.description}</p>
                  )}
                </div>

                {/* 时间设置 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      开始时间
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      结束时间
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* 备注 */}
                <div className="space-y-2">
                  <Label htmlFor="note">备注（可选）</Label>
                  <Textarea
                    id="note"
                    placeholder="添加备注信息..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* 费用信息（可选） */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      费用信息（可选）
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowCostFields(!showCostFields)}
                      className="text-sm text-primary hover:underline"
                    >
                      {showCostFields ? '隐藏' : '添加费用'}
                    </button>
                  </div>
                  
                  {showCostFields && (
                    <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="estimatedCost" className="text-xs">预估费用</Label>
                          <Input
                            id="estimatedCost"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={estimatedCost}
                            onChange={(e) => setEstimatedCost(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="actualCost" className="text-xs">实际费用</Label>
                          <Input
                            id="actualCost"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={actualCost}
                            onChange={(e) => setActualCost(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label htmlFor="costCategory" className="text-xs">费用分类</Label>
                        <Select value={costCategory} onValueChange={(v) => setCostCategory(v as CostCategory)}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择分类" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACCOMMODATION">住宿</SelectItem>
                            <SelectItem value="TRANSPORTATION">交通</SelectItem>
                            <SelectItem value="FOOD">餐饮</SelectItem>
                            <SelectItem value="ACTIVITIES">活动/门票</SelectItem>
                            <SelectItem value="SHOPPING">购物</SelectItem>
                            <SelectItem value="OTHER">其他</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label htmlFor="costNote" className="text-xs">费用备注</Label>
                        <Input
                          id="costNote"
                          placeholder="如：门票+缆车"
                          value={costNote}
                          onChange={(e) => setCostNote(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isPaid"
                          checked={isPaid}
                          onChange={(e) => setIsPaid(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <label htmlFor="isPaid" className="text-xs text-muted-foreground cursor-pointer">
                          已支付
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
                    {error}
                  </div>
                )}
              </div>

              {/* 底部按钮 */}
              <DialogFooter className="px-6 py-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      添加中...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      确认添加
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedAddItineraryItemDialog;
