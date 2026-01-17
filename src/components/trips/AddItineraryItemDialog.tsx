/**
 * 添加行程项对话框
 * 
 * 允许用户在日程表中直接添加新的行程项
 * 支持：
 * - 选择行程类型（活动、用餐、休息、交通）
 * - 搜索并选择地点
 * - 自定义时间
 * - 添加备注
 */

import { useState, useEffect, useCallback } from 'react';
import { itineraryItemsApi } from '@/api/trips';
import { placesApi } from '@/api/places';
import type { CreateItineraryItemRequest, ItineraryItemType, TripDay } from '@/types/trip';
import type { PlaceWithDistance } from '@/types/places-routes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
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
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

// ==================== 类型定义 ====================

interface AddItineraryItemDialogProps {
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

// ==================== 组件 ====================

export function AddItineraryItemDialog({
  tripDay,
  tripId,
  countryCode,
  open,
  onOpenChange,
  onSuccess,
}: AddItineraryItemDialogProps) {
  // 表单状态
  const [itemType, setItemType] = useState<ItineraryItemType>('ACTIVITY');
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithDistance | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [note, setNote] = useState('');
  
  // 搜索状态
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceWithDistance[]>([]);
  const [searching, setSearching] = useState(false);
  
  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // 重置表单
  const resetForm = useCallback(() => {
    setItemType('ACTIVITY');
    setSelectedPlace(null);
    setStartTime('09:00');
    setEndTime('10:00');
    setNote('');
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  }, []);

  // 打开时重置表单
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  // 搜索地点
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchPlaces = async () => {
      setSearching(true);
      try {
        const results = await placesApi.search({
          query: debouncedQuery,
          country: countryCode,
          limit: 10,
        });
        setSearchResults(results);
      } catch (err) {
        console.error('Search places failed:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    searchPlaces();
  }, [debouncedQuery, countryCode]);

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证
    if (itemType === 'ACTIVITY' && !selectedPlace) {
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

    // 验证时间逻辑
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
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        note: note.trim() || undefined,
      };

      // 如果选择了地点，添加 placeId
      if (selectedPlace) {
        data.placeId = selectedPlace.id;
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

  // 获取当前类型配置
  const currentTypeOption = ITEM_TYPE_OPTIONS.find(o => o.value === itemType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            添加行程项
          </DialogTitle>
          <DialogDescription>
            添加到 {tripDay.date} - 第{tripDay.dayNumber}天
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 类型选择 */}
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

          {/* 地点搜索 - 仅活动和用餐类型显示 */}
          {(itemType === 'ACTIVITY' || itemType === 'MEAL_ANCHOR' || itemType === 'MEAL_FLOATING') && (
            <div className="space-y-2">
              <Label>选择地点 {itemType === 'ACTIVITY' && <span className="text-red-500">*</span>}</Label>
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={searchOpen}
                    className="w-full justify-between"
                  >
                    {selectedPlace ? (
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate">{selectedPlace.nameCN || selectedPlace.nameEN}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">搜索地点...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="输入地点名称搜索..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      {searching ? (
                        <div className="py-6 text-center">
                          <Spinner className="w-4 h-4 mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">搜索中...</p>
                        </div>
                      ) : searchResults.length === 0 ? (
                        <CommandEmpty>
                          {searchQuery.length < 2 ? '请输入至少2个字符' : '未找到相关地点'}
                        </CommandEmpty>
                      ) : (
                        <CommandGroup heading="搜索结果">
                          {searchResults.map((place) => (
                            <CommandItem
                              key={place.id}
                              value={place.id.toString()}
                              onSelect={() => {
                                setSelectedPlace(place);
                                setSearchOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-start gap-3 w-full">
                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">
                                      {place.nameCN || place.nameEN}
                                    </span>
                                    {place.rating && (
                                      <span className="flex items-center text-xs text-amber-500">
                                        <Star className="w-3 h-3 mr-0.5 fill-current" />
                                        {place.rating.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                  {place.nameEN && place.nameCN && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {place.nameEN}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground truncate">
                                    {place.category}
                                    {place.typicalDuration && ` · 约${Math.round(place.typicalDuration / 60)}分钟`}
                                  </p>
                                </div>
                                {selectedPlace?.id === place.id && (
                                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* 时间设置 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">
                <Clock className="w-3 h-3 inline mr-1" />
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
              <Label htmlFor="endTime">
                <Clock className="w-3 h-3 inline mr-1" />
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

          {/* 错误提示 */}
          {error && (
            <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
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
                  添加
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddItineraryItemDialog;
