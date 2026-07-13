import { useState, useEffect, useMemo } from 'react';
import { itineraryItemsApi } from '@/api/trips';
import { placesApi } from '@/api/places';
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
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { MapPin, Calendar, Clock, Utensils, Coffee, Car, Hotel, Sparkles, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ITINERARY_ITEM_TYPE_DISPLAY } from '@/lib/itinerary-item-type-display';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatValidationMessage } from '@/utils/openingHoursFormatter';
import { useItineraryValidation, getDefaultCostCategory } from '@/hooks';
import { AlertTriangle, Info, AlertCircle, DollarSign } from 'lucide-react';
import type { CostCategory } from '@/types/trip';

interface CreateItineraryItemDialogProps {
  tripDayId: string;
  trip?: TripDetail | null; // ✅ 新增：用于获取日期和设置默认时间
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const typeConfig = ITINERARY_ITEM_TYPE_DISPLAY;

export function CreateItineraryItemDialog({
  tripDayId,
  trip,
  open,
  onOpenChange,
  onSuccess,
}: CreateItineraryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 校验相关状态
  const [validationResult, setValidationResult] = useState<{
    errors: any[];
    warnings: any[];
    infos: any[];
    travelInfo?: any;
  } | null>(null);
  const [forceCreate, setForceCreate] = useState(false);
  
  // 校验 Hook
  const { validate, validating } = useItineraryValidation();
  const [formData, setFormData] = useState<CreateItineraryItemRequest>({
    tripDayId,
    type: 'ACTIVITY',
    startTime: '',
    endTime: '',
    note: '',
  });
  
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
    if (!costCategory && formData.type) {
      const defaultCategory = getDefaultCostCategory(formData.type) as CostCategory;
      setCostCategory(defaultCategory);
    }
  }, [formData.type, costCategory]);

  // ✅ 地点搜索相关状态
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<any[]>([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ id: number; name: string } | null>(null);

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
      });
      setSelectedPlace(null);
      setPlaceSearchQuery('');
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
      // 验证时间
      if (!formData.startTime || !formData.endTime) {
        setError('请设置开始和结束时间');
        setLoading(false);
        return;
      }

      const startDateTime = new Date(formData.startTime);
      const endDateTime = new Date(formData.endTime);

      if (endDateTime <= startDateTime) {
        setError('结束时间必须晚于开始时间');
        setLoading(false);
        return;
      }

      // ✅ 后端预校验（包含交通时间、距离等智能校验）
      try {
        const validationData: CreateItineraryItemRequest = {
          tripDayId: tripDayId,
          type: formData.type,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          note: formData.note?.trim() || undefined,
          placeId: selectedPlace?.id,
        };

        // 执行预校验
        const validation = await validate(validationData);
        
        if (validation) {
          // 检查是否有错误
          if (validation.errors && validation.errors.length > 0) {
            const errorMessages = validation.errors
              .map(e => formatValidationMessage(e.message, e.details))
              .join('\n');
            setError(errorMessages);
            setValidationResult({
              errors: validation.errors,
              warnings: validation.warnings || [],
              infos: validation.infos || [],
              travelInfo: validation.travelInfo,
            });
            setLoading(false);
            return;
          }

          // 检查是否需要确认（有警告）
          if (validation.requiresConfirmation && validation.warnings && validation.warnings.length > 0) {
            if (!forceCreate) {
              // 显示警告，等待用户确认
              setValidationResult({
                errors: [],
                warnings: validation.warnings,
                infos: validation.infos || [],
                travelInfo: validation.travelInfo,
              });
              setLoading(false);
              return;
            }
          }

          // 保存校验结果（用于显示交通信息等）
          setValidationResult({
            errors: [],
            warnings: validation.warnings || [],
            infos: validation.infos || [],
            travelInfo: validation.travelInfo,
          });
        }
      } catch (validationError: any) {
        // 校验失败，继续使用前端校验结果
        console.warn('[CreateItineraryItemDialog] 预校验失败，使用前端校验:', validationError);
      }

      const submitData: CreateItineraryItemRequest = {
        ...formData,
        tripDayId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        placeId: selectedPlace?.id,
        note: formData.note || undefined,
        forceCreate: forceCreate, // 如果用户确认，强制创建
      };
      
      // 添加费用字段（如果有填写）
      if (showCostFields) {
        if (estimatedCost) {
          submitData.estimatedCost = parseFloat(estimatedCost);
        }
        if (actualCost) {
          submitData.actualCost = parseFloat(actualCost);
        }
        if (currency) {
          submitData.currency = currency;
        }
        if (costCategory) {
          submitData.costCategory = costCategory as CostCategory;
        }
        if (costNote.trim()) {
          submitData.costNote = costNote.trim();
        }
        submitData.isPaid = isPaid;
      }

      const result = await itineraryItemsApi.create(submitData);
      
      // 处理增强版响应（包含 warnings、travelInfo）
      if (result && typeof result === 'object' && 'item' in result) {
        // 如果有警告但已创建成功，显示提示
        if (result.warnings && result.warnings.length > 0) {
          toast.warning(`行程项已添加，但有 ${result.warnings.length} 个警告`, {
            description: result.warnings[0].message,
          });
        }
      }
      
      // ✅ 成功提示（带图标和类型信息）
      const typeLabel = typeConfig[formData.type].label;
      const placeName = selectedPlace?.name || '新行程项';
      toast.success(`已成功添加 ${placeName} ${typeLabel}`, {
        description: '行程项已添加到您的行程中'
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const errorMessage = err.message || '创建行程项失败';
      setError(errorMessage);
      toast.error(errorMessage, { description: '请根据提示调整后重试' });
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden [&>button]:hidden !grid-rows-[auto_1fr_auto]" onKeyDown={handleKeyDown}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>添加行程项</DialogTitle>
          <DialogDescription>填写行程项信息，系统会自动校验和优化</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
            <div className="space-y-6">
            {/* 校验结果：错误 */}
            {validationResult && validationResult.errors.length > 0 && (
              <div className="space-y-2">
                {validationResult.errors.map((err, idx) => (
                  <div key={idx} className="rounded-lg bg-gate-reject border border-gate-reject-border p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-gate-reject-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gate-reject-foreground">{formatValidationMessage(err.message, err.details)}</p>
                        {err.suggestions && err.suggestions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {err.suggestions.map((suggestion: any, sIdx: number) => (
                              <p key={sIdx} className="text-xs text-gate-reject-foreground">
                                💡 {suggestion.description}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 校验结果：警告（需要确认） */}
            {validationResult && validationResult.warnings.length > 0 && !forceCreate && (
              <div className="space-y-2">
                {validationResult.warnings.map((warning, idx) => (
                  <div key={idx} className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">{formatValidationMessage(warning.message, warning.details)}</p>
                      {warning.suggestions && warning.suggestions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {warning.suggestions.map((suggestion: any, sIdx: number) => (
                            <p key={sIdx} className="text-xs text-yellow-700">
                              💡 {suggestion.description}
                            </p>
                          ))}
                        </div>
                      )}
                        {warning.details?.suggestedStartTime && (
                          <p className="text-xs text-yellow-700 mt-1">
                            建议开始时间: {new Date(warning.details.suggestedStartTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id="force-create"
                    checked={forceCreate}
                    onChange={(e) => setForceCreate(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="force-create" className="text-muted-foreground cursor-pointer">
                    我已了解风险，仍要添加
                  </label>
                </div>
              </div>
            )}

            {/* 校验结果：信息提示 */}
            {validationResult && validationResult.infos.length > 0 && (
              <div className="space-y-2">
                {validationResult.infos.map((info, idx) => (
                  <div key={idx} className="rounded-lg bg-muted/15 border border-border p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">{formatValidationMessage(info.message, info.details)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 交通信息 */}
            {validationResult?.travelInfo && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-medium text-gray-800">交通信息</p>
                </div>
                <div className="space-y-1 text-xs text-gray-700">
                  {validationResult.travelInfo.fromPlace && validationResult.travelInfo.toPlace && (
                    <p>
                      {validationResult.travelInfo.fromPlace} → {validationResult.travelInfo.toPlace}
                    </p>
                  )}
                  <p>
                    距离: {validationResult.travelInfo.straightDistance} km
                    {validationResult.travelInfo.roadDistance && ` (道路 ${validationResult.travelInfo.roadDistance} km)`}
                  </p>
                  <p>
                    预计时长: {validationResult.travelInfo.estimatedDuration} 分钟
                    {validationResult.travelInfo.recommendedTransport && ` (${validationResult.travelInfo.recommendedTransport})`}
                  </p>
                  {validationResult.travelInfo.availableTime !== undefined && (
                    <p>可用时间: {validationResult.travelInfo.availableTime} 分钟</p>
                  )}
                </div>
              </div>
            )}

            {/* 错误提示：校验错误在 validationResult 中展示，此处展示 API/创建失败等错误 */}
            {error && (!validationResult || validationResult.errors.length === 0) && (
              <div className="rounded-lg border border-gate-reject-border bg-gate-reject p-3 text-sm text-gate-reject-foreground flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{formatValidationMessage(error)}</span>
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
                <div className="rounded-lg border border-border bg-muted/15 p-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hotel className="w-4 h-4" />
                    <span>提示：预约用餐通常需要提前预订，建议关联具体餐厅地点</span>
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
            </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || validating}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading || validating || (validationResult?.errors.length ?? 0) > 0}>
              {loading || validating ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  {validating ? '校验中...' : '创建中...'}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  创建行程项
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
