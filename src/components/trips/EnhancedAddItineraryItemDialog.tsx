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
import { MapPin, Utensils, Coffee, Car, Search, Star, Clock, Plus, Navigation, Sparkles, X, ChevronLeft, CalendarDays, LocateFixed, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { getDefaultCostCategory } from '@/hooks';
import { DollarSign } from 'lucide-react';
import type { CostCategory } from '@/types/trip';
import { EmptyStateCard } from '@/components/ui/empty-state-images';
import {
  ITINERARY_ITEM_TYPE_DISPLAY,
  ITINERARY_ITEM_TYPE_OPTIONS,
} from '@/lib/itinerary-item-type-display';
import {
  applyHotelCrossDayDefaults,
  buildAirportLandingUtcTimes,
  buildItineraryItemUtcTimes,
  getEndDayOptions,
  isAirportHubPlace,
  itineraryItemSupportsCrossDay,
} from '@/lib/itinerary-item-cross-day-form';
import { ItinerarySpecialDisplayRoleField } from '@/components/trips/ItinerarySpecialDisplayRoleField';
import {
  applySpecialDisplayRoleDefaults,
  buildSpecialDisplayMetadata,
  inferItinerarySpecialDisplayRole,
  itineraryRoleSupportsCrossDay,
  itineraryRoleUsesDepartureTime,
  itineraryRoleUsesLandingTime,
  itineraryRoleUsesSingleHubMoment,
  getItineraryRoleEndTimeLabel,
  getItineraryRoleStartTimeLabel,
  mergeTimelineDisplayRoleIntoNote,
  stripTimelineDisplayRoleFromNote,
  type ItinerarySpecialDisplayRole,
} from '@/lib/itinerary-special-display';

// ==================== 类型定义 ====================

interface EnhancedAddItineraryItemDialogProps {
  tripDay: TripDay;
  tripId: string;
  /** 整趟日程，用于跨天结束日期选择 */
  tripDays?: TripDay[];
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

// ==================== 配置 ====================

const SEARCH_MODE_OPTIONS: Array<{
  value: SearchMode;
  label: string;
  description: string;
  icon: typeof Search;
}> = [
  {
    value: 'search',
    label: '搜索',
    description: '按名称查找地点',
    icon: Search,
  },
  {
    value: 'nearby',
    label: '附近',
    description: '基于当前位置或选中地点',
    icon: Navigation,
  },
  {
    value: 'recommend',
    label: '推荐',
    description: '按行程目的地推荐',
    icon: Sparkles,
  },
];

type SearchMode = 'search' | 'nearby' | 'recommend';

const MANUAL_ITEM_SHORTCUTS = (['REST', 'TRANSIT', 'MEAL_FLOATING'] as const).map((type) => ({
  type,
  ...ITINERARY_ITEM_TYPE_DISPLAY[type],
}));

const ITEM_TYPE_OPTIONS = ITINERARY_ITEM_TYPE_OPTIONS;

const CATEGORY_OPTIONS: { value: PlaceCategory | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'all' },
  { value: 'ATTRACTION', labelKey: 'attraction' },
  { value: 'RESTAURANT', labelKey: 'restaurant' },
  { value: 'SHOPPING', labelKey: 'shopping' },
  { value: 'HOTEL', labelKey: 'hotel' },
  { value: 'TRANSIT_HUB', labelKey: 'transitHub' },
  { value: 'HOSPITAL', labelKey: 'hospital' },
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

const formatTripDayLabel = (dateText: string): string => {
  if (!dateText) return '未选择日期';
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(date);
};

const formatDistanceLabel = (distance?: number): string | null => {
  if (!distance || distance <= 0) return null;
  return distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`;
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
  tripDays = [],
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
  const [landingTime, setLandingTime] = useState('10:00');
  const [endTripDayId, setEndTripDayId] = useState(tripDay.id);
  const [displayRole, setDisplayRole] = useState<ItinerarySpecialDisplayRole>('normal');
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

  const endDayOptions = useMemo(
    () => getEndDayOptions(tripDays.length > 0 ? tripDays : [tripDay], tripDay.id),
    [tripDays, tripDay],
  );

  const supportsCrossDay = useMemo(
    () =>
      itineraryRoleSupportsCrossDay(displayRole) ||
      itineraryItemSupportsCrossDay(
        itemType,
        selectedPlace?.category,
        costCategory,
        displayRole,
      ),
    [itemType, selectedPlace?.category, costCategory, displayRole],
  );

  const isHotelLike = displayRole === 'hotel';
  const isTransit = itemType === 'TRANSIT';
  const isLandingPointMode = itineraryRoleUsesLandingTime(displayRole);
  const isDeparturePointMode = itineraryRoleUsesDepartureTime(displayRole);
  const isHubMomentMode = itineraryRoleUsesSingleHubMoment(displayRole);
  const supportsLandingArriveDay =
    isLandingPointMode && endDayOptions.length > 1;
  const supportsDepartureDay =
    isDeparturePointMode && endDayOptions.length > 1;
  const startTimeLabel = getItineraryRoleStartTimeLabel(displayRole);
  const endTimeLabel = getItineraryRoleEndTimeLabel(displayRole);

  const resolveItemTimes = () => {
    const endDay =
      endDayOptions.find((d) => d.id === endTripDayId) ??
      endDayOptions[endDayOptions.length - 1] ??
      tripDay;

    if (isHubMomentMode) {
      const hubHm = landingTime.trim();
      return buildAirportLandingUtcTimes(endDay.date, hubHm, timezone);
    }

    return buildItineraryItemUtcTimes(
      tripDay.date,
      endDay.date,
      startTime,
      endTime,
      timezone,
    );
  };

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
    setLandingTime('10:00');
    setEndTripDayId(tripDay.id);
    setDisplayRole('normal');
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
  }, [userLocation, tripDay.id]);

  const applyDisplayRole = useCallback(
    (role: ItinerarySpecialDisplayRole) => {
      setDisplayRole(role);
      const defaults = applySpecialDisplayRoleDefaults(
        role,
        tripDays.length > 0 ? tripDays : [tripDay],
        tripDay.id,
      );
      if (defaults.itemType) setItemType(defaults.itemType);
      if (defaults.costCategory) setCostCategory(defaults.costCategory);
      if (defaults.showCostFields) setShowCostFields(true);
      if (defaults.startTime) setStartTime(defaults.startTime);
      if (defaults.endTime) setEndTime(defaults.endTime);
      if (defaults.endTripDayId) setEndTripDayId(defaults.endTripDayId);
      if (defaults.landingTime) setLandingTime(defaults.landingTime);
    },
    [tripDay, tripDays],
  );

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
  }, [open, resetForm, initialSearchMode, initialLocation, initialCategory, initialInsertMeal, initialInsertLunch, tripDay.id]);

  useEffect(() => {
    if (!supportsCrossDay && endTripDayId !== tripDay.id) {
      setEndTripDayId(tripDay.id);
    }
  }, [supportsCrossDay, endTripDayId, tripDay.id]);

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
          const nearbySupportedCategories: Partial<Record<PlaceCategory, string>> = {
            ATTRACTION: 'ATTRACTION',
            RESTAURANT: 'RESTAURANT',
            HOTEL: 'HOTEL',
          };
          const apiCategory = category !== 'all' ? nearbySupportedCategories[category] : undefined;
          
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
            GAS_STATION: 'TRANSIT_HUB',
            REST_AREA: 'TRANSIT_HUB',
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
              category: apiToPlaceCategory[poi.category] || 'TRANSIT_HUB',
              address: poi.address,
              rating: poi.rating,
              latitude: poi.lat,
              longitude: poi.lng,
              distance: poi.distanceMeters,
              metadata,
            };
          });
        } else if (userLocation) {
          const nearbySupportedCategories: Partial<Record<PlaceCategory, string>> = {
            ATTRACTION: 'ATTRACTION',
            RESTAURANT: 'RESTAURANT',
            HOTEL: 'HOTEL',
          };
          const apiCategory = category !== 'all' ? nearbySupportedCategories[category] : undefined;
          
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
            GAS_STATION: 'TRANSIT_HUB',
            REST_AREA: 'TRANSIT_HUB',
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
              category: apiToPlaceCategory[poi.category] || 'TRANSIT_HUB',
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
        
        const recommendCategory = category !== 'all' ? category : undefined;
        
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

  useEffect(() => {
    if (open && initialCategory === 'HOTEL') {
      applyDisplayRole('hotel');
    }
  }, [open, initialCategory, applyDisplayRole]);

  // 选择地点，进入配置模式
  const handleSelectPlace = (place: PlaceWithDistance) => {
    setSelectedPlace(place);
    setViewMode('configure');

    const inferredRole = inferItinerarySpecialDisplayRole({
      Place: place,
      type: itemType,
      costCategory: costCategory || undefined,
      note,
    });
    const isLastTripDay =
      tripDays.length > 0 && tripDay.id === tripDays[tripDays.length - 1].id;

    if (
      isLastTripDay &&
      (isAirportHubPlace(place) || place.category === 'TRANSIT_HUB')
    ) {
      applyDisplayRole('departure_point');
    } else {
      applyDisplayRole(inferredRole);
    }

    // 根据地点类型自动设置行程类型（非特殊角色时）
    if (inferredRole === 'normal' && !isLastTripDay) {
      if (place.category === 'RESTAURANT') {
        setItemType('MEAL_ANCHOR');
      } else if (place.category === 'HOTEL') {
        applyDisplayRole('hotel');
      } else if (place.category === 'TRANSIT_HUB' || isAirportHubPlace(place)) {
        applyDisplayRole('landing_point');
      } else {
        setItemType('ACTIVITY');
      }
    } else if (inferredRole === 'normal' && isLastTripDay) {
      if (place.category === 'RESTAURANT') {
        setItemType('MEAL_ANCHOR');
      } else if (place.category === 'HOTEL') {
        applyDisplayRole('hotel');
      } else if (!isAirportHubPlace(place) && place.category !== 'TRANSIT_HUB') {
        setItemType('ACTIVITY');
      }
    }

    // 根据典型时长自动设置结束时间（酒店/租车/落地预设已设置则跳过）
    const typicalDuration = (place as any).typicalDuration || place.metadata?.typicalDuration;
    if (
      typicalDuration &&
      inferredRole === 'normal' &&
      place.category !== 'HOTEL'
    ) {
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

    if (isHubMomentMode) {
      if (!landingTime.trim()) {
        setError(isDeparturePointMode ? '请填写值机时间' : '请填写落地时间');
        return;
      }
    } else if (!startTime || !endTime) {
      setError('请设置开始和结束时间');
      return;
    }

    const { startTimeUTC, endTimeUTC, startMs, endMs } = resolveItemTimes();

    if (endMs <= startMs) {
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
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        note: mergeTimelineDisplayRoleIntoNote(note.trim(), displayRole) || undefined,
        metadata: buildSpecialDisplayMetadata(displayRole),
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

    if (isHubMomentMode) {
      if (!landingTime.trim()) {
        setError(isDeparturePointMode ? '请填写值机时间' : '请填写落地时间');
        return;
      }
    } else if (!startTime || !endTime) {
      setError('请设置开始和结束时间');
      return;
    }

    const { startTimeUTC, endTimeUTC, startMs, endMs } = resolveItemTimes();

    if (endMs <= startMs) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data: CreateItineraryItemRequest = {
        tripDayId: tripDay.id,
        type: itemType,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        note: mergeTimelineDisplayRoleIntoNote(note.trim(), displayRole) || undefined,
        metadata: buildSpecialDisplayMetadata(displayRole),
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
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        {/* 固定头部 - 显示目标日期 */}
        <DialogHeader className="border-b bg-slate-50 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-slate-900 p-2 text-white">
              <Plus className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">添加行程项</DialogTitle>
              <DialogDescription className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1.5 bg-white font-medium text-slate-700">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatTripDayLabel(tripDay.date)}
                </Badge>
                <span className="text-xs text-muted-foreground">先选地点，也可以直接添加休息、交通或用餐</span>
          </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 主内容区 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === 'browse' ? (
            /* 浏览模式：找点 */
            <div className="flex h-full min-h-0 flex-col bg-white">
              {/* 搜索模式切换 */}
              <div className="flex-shrink-0 border-b bg-white px-6 py-4">
                <Tabs value={searchMode} onValueChange={(v) => handleModeChange(v as SearchMode)}>
                  <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                    {SEARCH_MODE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <TabsTrigger
                          key={option.value}
                          value={option.value}
                          className="h-auto flex-col items-start gap-1 rounded-md px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </span>
                          <span className="hidden text-xs font-normal text-muted-foreground sm:block">
                            {option.description}
                          </span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-shrink-0 space-y-3 border-b bg-white px-6 py-4">
                {/* 搜索框（仅搜索模式显示） */}
                {searchMode === 'search' ? (
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log('[EnhancedAddItineraryItemDialog] 输入框变化:', value);
                        setSearchQuery(value);
                      }}
                      placeholder="搜索地点名称..."
                      className="h-11 rounded-lg border-slate-200 pl-11 text-base shadow-sm"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {searchMode === 'nearby' ? (
                        <LocateFixed className="h-5 w-5 text-slate-500" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-slate-500" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-950">
                          {searchMode === 'nearby' ? '查找附近可加入的地点' : '获取目的地推荐'}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {searchMode === 'nearby'
                            ? itemId
                              ? '基于当前行程项周边 5 公里'
                              : userLocation
                              ? '基于当前位置周边 5 公里'
                              : '需要授权位置后使用'
                            : countryCode
                            ? `按 ${countryCode.toUpperCase()} 行程目的地筛选`
                            : '需要行程目的地国家代码'}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch(searchQuery, searchMode, selectedCategory)}
                      disabled={searching || (searchMode === 'nearby' && !userLocation && !itemId)}
                    >
                      {searching ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      刷新
                    </Button>
                  </div>
                )}

                {/* 搜索范围切换 */}
                {searchMode === 'search' && userLocation && countryCode && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">搜索范围</span>
                    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
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
                            "rounded-md px-3 py-1.5 text-xs transition-colors",
                            searchScope === 'current'
                              ? "bg-white text-slate-950 shadow-sm font-medium"
                              : "text-slate-600 hover:text-slate-950"
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
                            "rounded-md px-3 py-1.5 text-xs transition-colors",
                            searchScope === 'destination'
                              ? "bg-white text-slate-950 shadow-sm font-medium"
                              : "text-slate-600 hover:text-slate-950"
                          )}
                        >
                          行程目的地
                        </button>
                      </div>
                  </div>
                )}

              {/* 类型筛选 */}
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                  <div className="flex gap-2 overflow-x-auto pb-1">
                  {CATEGORY_OPTIONS.map(({ value, labelKey }) => (
                    <Button
                      key={value}
                      variant={selectedCategory === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleCategoryChange(value)}
                        className={cn(
                          "h-8 shrink-0 rounded-full px-4 text-xs",
                          selectedCategory === value
                            ? "bg-slate-950 text-white hover:bg-slate-800"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                    >
                      {t(`planStudio.placesTab.categories.${labelKey}`)}
                    </Button>
                  ))}
                  </div>
                </div>
              </div>

              {/* 搜索结果 - 固定最大高度实现滚动 */}
              <div className="min-h-[360px] flex-1 overflow-y-auto bg-slate-50/50 px-6 py-4">
                {searching ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-white">
                    <LogoLoading size={32} />
                    <span className="text-sm text-muted-foreground">搜索中...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3 pb-4">
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
                        className="cursor-pointer border-slate-200 bg-white transition-all hover:border-slate-400 hover:shadow-sm"
                        onClick={() => handleSelectPlace(place)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                <span className="truncate font-semibold text-slate-950">
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
                                  <Badge variant="outline" className="h-5 border-slate-200 bg-slate-50 text-xs">
                                    {place.category}
                                  </Badge>
                                )}
                                {(() => {
                                  // 格式化开放时间（根据行程日期应用季节过滤）
                                  const openingHours = place.metadata?.openingHours || (place as any).openingHours;
                                  const formattedHours = formatOpeningHours(openingHours, tripDay.date);
                                  return formattedHours ? (
                                    <span className="flex items-center gap-1 text-gate-allow-foreground">
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
                                  <span className="flex items-center gap-1">
                                    <Navigation className="w-3 h-3" />
                                    {formatDistanceLabel(place.distance)}
                                  </span>
                                )}
                              </div>
                              {place.address && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {place.address}
                                </p>
                              )}
                            </div>
                            <Button size="sm" variant="outline" className="flex-shrink-0 rounded-full">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed bg-white">
                    <EmptyStateCard
                      type="no-recommended-places"
                      title={
                        searchMode === 'search'
                          ? '输入关键词搜索地点'
                          : searchMode === 'nearby'
                          ? userLocation || itemId ? '暂无附近地点' : '无法获取位置信息'
                          : '暂无推荐地点'
                      }
                      description={
                        searchMode === 'search'
                          ? '试试景点、餐厅、酒店或地标名称，也可以直接手动添加。'
                          : searchMode === 'nearby'
                          ? '可以切换类别，或使用底部快捷项先记录交通、休息和用餐。'
                          : '可以切换类别刷新推荐，或通过搜索精确查找地点。'
                      }
                      imageWidth={112}
                      imageHeight={112}
                      className="py-8"
                    />
                  </div>
                )}
              </div>

              {/* 手动添加区域 */}
              <div className="flex-shrink-0 border-t bg-white px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-950">不需要绑定地点？</p>
                    <p className="text-xs text-muted-foreground">直接添加一个时间块，之后也可以再补地点。</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                    {MANUAL_ITEM_SHORTCUTS.map((shortcut) => {
                      const Icon = shortcut.icon;
                      return (
                        <Button
                          key={shortcut.type}
                          variant="outline"
                          size="sm"
                          onClick={() => handleManualAdd(shortcut.type)}
                          className="h-auto justify-start gap-2 rounded-lg px-3 py-2"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-left">
                            <span className="block text-sm font-medium">{shortcut.label}</span>
                            <span className="hidden text-xs font-normal text-muted-foreground md:block">
                              {shortcut.description}
                            </span>
                          </span>
                        </Button>
                      );
                    })}
                  </div>
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
                  <Card className="bg-muted/15 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-muted-foreground">
                              {selectedPlace.nameCN || selectedPlace.nameEN}
                            </span>
                          </div>
                          {selectedPlace.address && (
                            <p className="text-xs text-muted-foreground ml-6">
                              {selectedPlace.address}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleBackToBrowse}
                          className="text-muted-foreground hover:text-muted-foreground hover:bg-muted/15"
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

                <ItinerarySpecialDisplayRoleField
                  value={displayRole}
                  onChange={applyDisplayRole}
                />

                {/* 跨天结束日（酒店 / 租车） */}
                {supportsCrossDay && !isHubMomentMode && endDayOptions.length > 1 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {displayRole === 'car_rental' ? '还车日期' : '结束日期'}
                    </Label>
                    <Select value={endTripDayId} onValueChange={setEndTripDayId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择结束日期" />
                      </SelectTrigger>
                      <SelectContent>
                        {endDayOptions.map((day, index) => (
                          <SelectItem key={day.id} value={day.id}>
                            {formatTripDayLabel(day.date)}
                            {index === 0 ? '（入住/出发日）' : index === 1 ? '（次日）' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {displayRole === 'hotel'
                        ? '酒店通常当晚入住、次日退房；也可选择更晚的退房日。'
                        : displayRole === 'car_rental'
                          ? '选择还车日期，时间轴将在还车日显示还车卡。'
                          : '长途交通可跨天抵达，请选择抵达日期。'}
                    </p>
                  </div>
                )}

                {supportsLandingArriveDay && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      抵达日期
                    </Label>
                    <Select value={endTripDayId} onValueChange={setEndTripDayId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择抵达日期" />
                      </SelectTrigger>
                      <SelectContent>
                        {endDayOptions.map((day) => (
                          <SelectItem key={day.id} value={day.id}>
                            {formatTripDayLabel(day.date)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      航班跨日抵达时，选择落地所在日期。
                    </p>
                  </div>
                )}

                {supportsDepartureDay && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      出发日期
                    </Label>
                    <Select value={endTripDayId} onValueChange={setEndTripDayId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择出发日期" />
                      </SelectTrigger>
                      <SelectContent>
                        {endDayOptions.map((day) => (
                          <SelectItem key={day.id} value={day.id}>
                            {formatTripDayLabel(day.date)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isHubMomentMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="landingTime" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {isDeparturePointMode ? '值机时间' : '落地时间'}
                    </Label>
                    <Input
                      id="landingTime"
                      type="time"
                      value={landingTime}
                      onChange={(e) => setLandingTime(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {isDeparturePointMode
                        ? '只需填写到机场值机/抵达时刻；系统会按此后约 30 分钟作为出发缓冲，用于与前序交通衔接。'
                        : '只需填写航班落地时刻；系统会按落地后约 30 分钟作为离站时间用于交通衔接。'}
                    </p>
                  </div>
                ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {startTimeLabel}
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
                      {endTimeLabel}
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
                )}

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
                  <div className="text-sm text-gate-reject-foreground bg-gate-reject px-3 py-2 rounded-md">
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
