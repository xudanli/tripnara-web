import { useState, useEffect, useMemo } from 'react';
import { itineraryItemsApi } from '@/api/trips';
import { placesApi } from '@/api/places';
import { trailsApi } from '@/api/trails';
import type { CreateItineraryItemRequest, ItineraryItemType } from '@/types/trip';
import type { TripDetail } from '@/types/trip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { MapPin, Calendar, Clock, Mountain, Utensils, Coffee, Car, Hotel, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CreateItineraryItemDialogProps {
  tripDayId: string;
  trip?: TripDetail | null; // ✅ 新增：用于获取日期和设置默认时间
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ✅ 行程类型配置（图标 + 名称）
const typeConfig: Record<ItineraryItemType, { label: string; icon: typeof MapPin; description: string }> = {
  ACTIVITY: { label: '游玩活动', icon: MapPin, description: '景点、博物馆、公园等' },
  MEAL_ANCHOR: { label: '必吃大餐', icon: Utensils, description: '需要订位的餐厅' },
  MEAL_FLOATING: { label: '随便吃吃', icon: Coffee, description: '小吃、咖啡、简餐' },
  REST: { label: '休息/咖啡', icon: Coffee, description: '休息、咖啡、茶歇' },
  TRANSIT: { label: '交通移动', icon: Car, description: '乘车、步行、换乘' },
};

export function CreateItineraryItemDialog({
  tripDayId,
  trip,
  open,
  onOpenChange,
  onSuccess,
}: CreateItineraryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateItineraryItemRequest>({
    tripDayId,
    type: 'ACTIVITY',
    startTime: '',
    endTime: '',
    note: '',
  });

  // ✅ 地点搜索相关状态
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<any[]>([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ id: number; name: string } | null>(null);

  // ✅ 徒步路线搜索相关状态
  const [trailSearchOpen, setTrailSearchOpen] = useState(false);
  const [trailSearchQuery, setTrailSearchQuery] = useState('');
  const [trailSearchResults, setTrailSearchResults] = useState<any[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<{ id: number; name: string } | null>(null);

  // ✅ 获取当前日期，用于设置默认时间
  const currentDay = useMemo(() => {
    if (!trip) return null;
    return trip.TripDay?.find(day => day.id === tripDayId);
  }, [trip, tripDayId]);

  // ✅ 计算默认开始时间（当前时间或行程开始日期的上午9点）
  const getDefaultStartTime = (): string => {
    if (currentDay?.date) {
      const dayDate = new Date(currentDay.date);
      dayDate.setHours(9, 0, 0, 0);
      return format(dayDate, "yyyy-MM-dd'T'HH:mm");
    }
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return format(now, "yyyy-MM-dd'T'HH:mm");
  };

  // ✅ 计算默认结束时间（开始时间 + 2小时）
  const getDefaultEndTime = (startTime: string): string => {
    if (!startTime) return '';
    const start = new Date(startTime);
    start.setHours(start.getHours() + 2);
    return format(start, "yyyy-MM-dd'T'HH:mm");
  };

  useEffect(() => {
    if (open) {
      const defaultStartTime = getDefaultStartTime();
      const defaultEndTime = getDefaultEndTime(defaultStartTime);
      
      // 重置表单
      setFormData({
        tripDayId,
        type: 'ACTIVITY',
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        note: '',
        placeId: undefined,
        trailId: undefined,
      });
      setSelectedPlace(null);
      setSelectedTrail(null);
      setPlaceSearchQuery('');
      setTrailSearchQuery('');
      setError(null);
    }
  }, [open, tripDayId, currentDay]);

  // ✅ 地点搜索（防抖）
  useEffect(() => {
    if (!placeSearchQuery.trim() || !placeSearchOpen) {
      setPlaceSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPlaceSearchLoading(true);
        const results = await placesApi.autocompletePlaces({ q: placeSearchQuery, limit: 10 });
        setPlaceSearchResults(results || []);
      } catch (err) {
        console.error('Failed to search places:', err);
        setPlaceSearchResults([]);
      } finally {
        setPlaceSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [placeSearchQuery, placeSearchOpen]);

  // ✅ 徒步路线搜索（防抖）
  useEffect(() => {
    if (!trailSearchQuery.trim() || !trailSearchOpen || formData.type !== 'ACTIVITY') {
      setTrailSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        // 这里需要根据实际的 trails API 实现搜索
        // 暂时使用 getAll，实际应该使用搜索接口
        const results = await trailsApi.getAll({ limit: 10 });
        const filtered = results.data?.data?.filter((trail: any) =>
          trail.name?.toLowerCase().includes(trailSearchQuery.toLowerCase())
        ) || [];
        setTrailSearchResults(filtered);
      } catch (err) {
        console.error('Failed to search trails:', err);
        setTrailSearchResults([]);
      } finally {
        // setTrailSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [trailSearchQuery, trailSearchOpen, formData.type]);

  // ✅ 当开始时间改变时，自动更新结束时间
  useEffect(() => {
    if (formData.startTime && !formData.endTime) {
      const defaultEndTime = getDefaultEndTime(formData.startTime);
      setFormData(prev => ({ ...prev, endTime: defaultEndTime }));
    }
  }, [formData.startTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData: CreateItineraryItemRequest = {
        ...formData,
        tripDayId,
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : '',
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : '',
        placeId: selectedPlace?.id,
        trailId: selectedTrail?.id,
        note: formData.note || undefined,
      };

      await itineraryItemsApi.create(submitData);
      
      // ✅ 成功提示（带图标和类型信息）
      const typeLabel = typeConfig[formData.type].label;
      const placeName = selectedPlace?.name || '新行程项';
      toast.success(`已成功添加 ${placeName} ${typeLabel}`, {
        description: '行程项已添加到您的行程中'
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || '创建行程项失败');
    } finally {
      setLoading(false);
    }
  };

  // ✅ 处理键盘回车提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const TypeIcon = typeConfig[formData.type].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>添加行程项</DialogTitle>
          <DialogDescription>填写行程项信息，系统会自动校验和优化</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* ✅ 【基础信息】区域 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">基础信息</h3>
              </div>

              {/* 行程类型 - 带图标 */}
              <div className="space-y-2">
                <Label htmlFor="type" className="flex items-center gap-2">
                  <TypeIcon className="w-4 h-4" />
                  行程类型
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => {
                    setFormData({ ...formData, type: value as ItineraryItemType });
                    // 切换类型时清空地点和路线
                    if (value !== 'ACTIVITY') {
                      setSelectedTrail(null);
                      setFormData(prev => ({ ...prev, trailId: undefined }));
                    }
                  }}
                >
                  <SelectTrigger id="type" className="flex items-center gap-2">
                    <TypeIcon className="w-4 h-4 shrink-0" />
                    <SelectValue placeholder="选择行程类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([value, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={value} value={value} className="py-2">
                          <div className="flex items-start gap-2 w-full">
                            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium leading-tight">{config.label}</div>
                              <div className="text-xs text-muted-foreground leading-tight mt-0.5 text-left">{config.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* 时间字段 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    开始时间
                  </Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.startTime || ''}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    结束时间
                  </Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.endTime || ''}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* 地点选择 - 支持搜索和自动补全 */}
              {(formData.type === 'ACTIVITY' || formData.type === 'MEAL_ANCHOR' || formData.type === 'MEAL_FLOATING') && (
                <div className="space-y-2">
                  <Label htmlFor="place" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    选择地点
                    <span className="text-xs text-muted-foreground font-normal">（可选）</span>
                  </Label>
                  <Popover open={placeSearchOpen} onOpenChange={setPlaceSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !selectedPlace && "text-muted-foreground"
                        )}
                      >
                        {selectedPlace ? (
                          <span className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {selectedPlace.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">请输入地点名称，如"天安门"、"日月潭"</span>
                        )}
                        <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="搜索地点..."
                          value={placeSearchQuery}
                          onValueChange={setPlaceSearchQuery}
                        />
                        <CommandList>
                          {placeSearchLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">搜索中...</div>
                          ) : placeSearchResults.length === 0 && placeSearchQuery ? (
                            <CommandEmpty>未找到地点</CommandEmpty>
                          ) : placeSearchResults.length > 0 ? (
                            <CommandGroup>
                              {placeSearchResults.map((place: any) => {
                                // PlaceWithDistance 结构：{ id, nameCN, nameEN, category, ... }
                                const placeName = place.nameCN || place.nameEN || place.name || '未知地点';
                                const placeId = place.id;
                                return (
                                  <CommandItem
                                    key={placeId}
                                    value={placeId?.toString()}
                                    onSelect={() => {
                                      setSelectedPlace({ id: placeId, name: placeName });
                                      setPlaceSearchOpen(false);
                                      setPlaceSearchQuery('');
                                    }}
                                  >
                                    <CheckCircle2
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedPlace?.id === placeId ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <MapPin className="mr-2 h-4 w-4" />
                                    <div className="flex-1">
                                      <div className="font-medium">{placeName}</div>
                                      {place.description && (
                                        <div className="text-xs text-muted-foreground">{place.description}</div>
                                      )}
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          ) : (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              输入地点名称开始搜索
                            </div>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    如果关联了地点，系统会自动校验营业时间
                  </p>
                </div>
              )}

              {/* ✅ 住宿类型：显示入住/退房时间 */}
              {formData.type === 'MEAL_ANCHOR' && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Hotel className="w-4 h-4" />
                    <span>提示：必吃大餐通常需要提前预订，建议关联具体餐厅地点</span>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ 【更多设置（可选）】区域 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">更多设置（可选）</h3>
              </div>

              {/* 徒步路线 - 仅徒步活动时显示 */}
              {formData.type === 'ACTIVITY' && (
                <div className="space-y-2">
                  <Label htmlFor="trail" className="flex items-center gap-2">
                    <Mountain className="w-4 h-4" />
                    选择徒步路线
                    <span className="text-xs text-muted-foreground font-normal">（可选）</span>
                  </Label>
                  <Popover open={trailSearchOpen} onOpenChange={setTrailSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !selectedTrail && "text-muted-foreground"
                        )}
                      >
                        {selectedTrail ? (
                          <span className="flex items-center gap-2">
                            <Mountain className="w-4 h-4" />
                            {selectedTrail.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">选择路线，如"黄山西海大环线"</span>
                        )}
                        <Mountain className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="搜索徒步路线..."
                          value={trailSearchQuery}
                          onValueChange={setTrailSearchQuery}
                        />
                        <CommandList>
                          {trailSearchResults.length === 0 && trailSearchQuery ? (
                            <CommandEmpty>未找到路线</CommandEmpty>
                          ) : trailSearchResults.length > 0 ? (
                            <CommandGroup>
                              {trailSearchResults.map((trail: any) => (
                                <CommandItem
                                  key={trail.id}
                                  value={trail.id?.toString()}
                                  onSelect={() => {
                                    setSelectedTrail({ id: trail.id, name: trail.name });
                                    setTrailSearchOpen(false);
                                    setTrailSearchQuery('');
                                  }}
                                >
                                  <CheckCircle2
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedTrail?.id === trail.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <Mountain className="mr-2 h-4 w-4" />
                                  {trail.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ) : (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              输入路线名称开始搜索
                            </div>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    如果是徒步活动，可以关联徒步路线
                  </p>
                </div>
              )}

              {/* 备注 */}
              <div className="space-y-2">
                <Label htmlFor="note" className="flex items-center gap-2">
                  <span>📝</span>
                  备注
                  <span className="text-xs text-muted-foreground font-normal">（选填）</span>
                </Label>
                <Textarea
                  id="note"
                  value={formData.note || ''}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="可添加注意事项，如需预约、带装备等"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '创建中...' : '创建行程项'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
