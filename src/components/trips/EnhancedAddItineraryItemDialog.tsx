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

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { itineraryItemsApi } from '@/api/trips';
import { placesApi } from '@/api/places';
import type { CreateItineraryItemRequest, ItineraryItemType, TripDay } from '@/types/trip';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Plus,
  Navigation,
  Sparkles,
  X,
  ChevronLeft,
} from 'lucide-react';
// cn 已移除 - 未使用
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { checkTimeOverlap, formatTimeOverlapError } from '@/utils/itinerary-time-validation';
import { getDefaultCostCategory } from '@/hooks';
import { DollarSign } from 'lucide-react';
import type { CostCategory } from '@/types/trip';

// ==================== 类型定义 ====================

interface EnhancedAddItineraryItemDialogProps {
  tripDay: TripDay;
  tripId: string;
  countryCode?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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
  { value: 'SHOPPING', labelKey: 'shopping' },
  { value: 'HOTEL', labelKey: 'hotel' },
  { value: 'TRANSIT_HUB', labelKey: 'transitHub' },
];

// ==================== 组件 ====================

export function EnhancedAddItineraryItemDialog({
  tripDay,
  tripId,
  countryCode,
  open,
  onOpenChange,
  onSuccess,
}: EnhancedAddItineraryItemDialogProps) {
  const { t } = useTranslation();
  
  // 视图模式：'browse' 浏览地点 | 'configure' 配置时间
  const [viewMode, setViewMode] = useState<'browse' | 'configure'>('browse');
  
  // 搜索模式
  const [searchMode, setSearchMode] = useState<SearchMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | 'all'>('all');
  const [searchResults, setSearchResults] = useState<PlaceWithDistance[]>([]);
  const [searching, setSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
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
  const [currency, setCurrency] = useState<string>('CNY');
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

  // 获取用户位置
  useEffect(() => {
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
  }, []);

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
    setCurrency('CNY');
    setCostCategory('');
    setCostNote('');
    setIsPaid(false);
    setShowCostFields(false);
  }, []);

  // 打开时重置表单
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

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
        const searchParams = {
          q: query,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
          limit: 20,
          type: category !== 'all' ? category : undefined,
          countryCode,
        };
        console.log('[EnhancedAddItineraryItemDialog] 搜索请求参数:', searchParams);
        results = await placesApi.searchPlaces(searchParams);
        console.log('[EnhancedAddItineraryItemDialog] 搜索结果:', {
          count: results?.length || 0,
          results: results,
          isArray: Array.isArray(results),
        });
      } else if (mode === 'nearby') {
        results = await placesApi.getNearbyPlaces({
          lat: userLocation!.lat,
          lng: userLocation!.lng,
          radius: 5000,
          type: category !== 'all' ? category : undefined,
          countryCode,
        });
      } else if (mode === 'recommend') {
        const recommendations = await placesApi.getRecommendations({
          tripId,
          limit: 20,
        });
        results = recommendations.map((p: any) => ({
          id: p.id,
          nameCN: p.nameCN,
          nameEN: p.nameEN,
          category: p.category,
          latitude: p.latitude,
          longitude: p.longitude,
          address: p.address,
          rating: p.rating,
          metadata: p.metadata,
          distance: 0,
        })) as PlaceWithDistance[];
      }

      console.log('[EnhancedAddItineraryItemDialog] 设置搜索结果:', {
        count: results?.length || 0,
        results: results,
      });
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
  }, [userLocation, countryCode, tripId, t]);

  // 监听搜索词变化（仅搜索模式）
  useEffect(() => {
    if (searchMode === 'search' && debouncedQuery.length >= 2) {
      handleSearch(debouncedQuery, searchMode, selectedCategory);
    }
  }, [debouncedQuery, searchMode, selectedCategory, handleSearch]);

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

  // 提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlace) {
      setError('请选择一个地点');
      return;
    }

    if (!startTime || !endTime) {
      setError('请设置开始和结束时间');
      return;
    }

    // 构建完整的日期时间
    const dayDate = new Date(tripDay.date);
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startDateTime = new Date(dayDate);
    startDateTime.setHours(startHour, startMin, 0, 0);
    
    const endDateTime = new Date(dayDate);
    endDateTime.setHours(endHour, endMin, 0, 0);

    if (endDateTime <= startDateTime) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    // ✅ 检查时间重叠（严格阻止，不允许边界重叠）
    const existingItems = (tripDay.ItineraryItem || []).map(item => ({
      id: item.id,
      startTime: item.startTime,
      endTime: item.endTime,
      note: item.note || undefined,
      type: item.type,
      Place: item.Place ? {
        nameCN: item.Place.nameCN || undefined,
        nameEN: item.Place.nameEN || undefined,
      } : undefined,
    }));
    const overlaps = checkTimeOverlap(
      { startTime: startDateTime, endTime: endDateTime },
      existingItems,
      false // 不允许边界重叠（严格模式）
    );

    if (overlaps.length > 0) {
      setError(formatTimeOverlapError(overlaps));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data: CreateItineraryItemRequest = {
        tripDayId: tripDay.id,
        type: itemType,
        placeId: selectedPlace.id,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
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
        if (currency) {
          data.currency = currency;
        }
        if (costCategory) {
          data.costCategory = costCategory as CostCategory;
        }
        if (costNote.trim()) {
          data.costNote = costNote.trim();
        }
        data.isPaid = isPaid;
      }

      await itineraryItemsApi.create(data);
      
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

    if (!startTime || !endTime) {
      setError('请设置开始和结束时间');
      return;
    }

    const dayDate = new Date(tripDay.date);
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startDateTime = new Date(dayDate);
    startDateTime.setHours(startHour, startMin, 0, 0);
    
    const endDateTime = new Date(dayDate);
    endDateTime.setHours(endHour, endMin, 0, 0);

    if (endDateTime <= startDateTime) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    // ✅ 检查时间重叠（严格阻止，不允许边界重叠）
    const existingItems = (tripDay.ItineraryItem || []).map(item => ({
      id: item.id,
      startTime: item.startTime,
      endTime: item.endTime,
      note: item.note || undefined,
      type: item.type,
      Place: item.Place ? {
        nameCN: item.Place.nameCN || undefined,
        nameEN: item.Place.nameEN || undefined,
      } : undefined,
    }));
    const overlaps = checkTimeOverlap(
      { startTime: startDateTime, endTime: endDateTime },
      existingItems,
      false // 不允许边界重叠（严格模式）
    );

    if (overlaps.length > 0) {
      setError(formatTimeOverlapError(overlaps));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data: CreateItineraryItemRequest = {
        tripDayId: tripDay.id,
        type: itemType,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
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
        if (currency) {
          data.currency = currency;
        }
        if (costCategory) {
          data.costCategory = costCategory as CostCategory;
        }
        if (costNote.trim()) {
          data.costNote = costNote.trim();
        }
        data.isPaid = isPaid;
      }

      await itineraryItemsApi.create(data);
      
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
        <div className="flex-1 overflow-hidden">
          {viewMode === 'browse' ? (
            /* 浏览模式：找点 */
            <div className="flex flex-col h-full">
              {/* 搜索模式切换 */}
              <div className="px-6 pt-4">
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
                <div className="px-6 pt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索地点名称..."
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* 类型筛选 */}
              <div className="px-6 pt-3 pb-2">
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

              {/* 搜索结果 */}
              <ScrollArea className="flex-1 px-6">
                {searching ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner className="w-6 h-6" />
                    <span className="ml-2 text-sm text-muted-foreground">搜索中...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2 pb-4">
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
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {searchMode === 'search' 
                        ? '输入关键词搜索地点'
                        : searchMode === 'nearby'
                        ? userLocation ? '暂无附近地点' : '无法获取位置信息'
                        : '暂无推荐地点'}
                    </p>
                  </div>
                )}
              </ScrollArea>

              {/* 手动添加区域 */}
              <div className="px-6 py-4 border-t bg-gray-50">
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
              <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
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
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="currency" className="text-xs">货币</Label>
                          <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CNY">CNY (人民币)</SelectItem>
                              <SelectItem value="USD">USD (美元)</SelectItem>
                              <SelectItem value="EUR">EUR (欧元)</SelectItem>
                              <SelectItem value="JPY">JPY (日元)</SelectItem>
                              <SelectItem value="GBP">GBP (英镑)</SelectItem>
                            </SelectContent>
                          </Select>
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
