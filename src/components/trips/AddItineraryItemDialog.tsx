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
import { formatValidationMessage } from '@/utils/openingHoursFormatter';
import { formatDayDate } from '@/utils/format';
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
  Star,
  Clock,
  Plus,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { useItineraryValidation } from '@/hooks';
import { AlertTriangle, Info, AlertCircle, DollarSign } from 'lucide-react';
import type { CostCategory } from '@/types/trip';
import { ITINERARY_ITEM_TYPE_OPTIONS } from '@/lib/itinerary-item-type-display';

// ==================== 类型定义 ====================

interface AddItineraryItemDialogProps {
  tripDay: TripDay;
  tripId: string;
  countryCode?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ITEM_TYPE_OPTIONS = ITINERARY_ITEM_TYPE_OPTIONS;

// ==================== 组件 ====================

export function AddItineraryItemDialog({
  tripDay,
  tripId: _tripId,
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
  
  // 费用相关状态
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [actualCost, setActualCost] = useState<string>('');
  const [currency, setCurrency] = useState<string>('CNY');
  const [costCategory, setCostCategory] = useState<CostCategory | ''>('');
  const [costNote, setCostNote] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [showCostFields, setShowCostFields] = useState<boolean>(false);
  
  // 搜索状态
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceWithDistance[]>([]);
  const [searching, setSearching] = useState(false);
  
  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 校验相关状态
  const [validationResult, setValidationResult] = useState<{
    errors: any[];
    warnings: any[];
    infos: any[];
    travelInfo?: any;
  } | null>(null);
  const [forceCreate, setForceCreate] = useState(false);
  const { validate, validating } = useItineraryValidation();

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
    setValidationResult(null);
    setForceCreate(false);
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
        const results = await placesApi.searchPlaces({
          q: debouncedQuery,
          countryCode,
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

    // ✅ 后端预校验（包含交通时间、距离等智能校验）
    setSubmitting(true);
    setError(null);
    setValidationResult(null);

    try {
      const validationData: CreateItineraryItemRequest = {
        tripDayId: tripDay.id,
        type: itemType,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        note: note.trim() || undefined,
      };

      if (selectedPlace) {
        validationData.placeId = selectedPlace.id;
      }

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
          setSubmitting(false);
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
            setSubmitting(false);
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
      console.warn('[AddItineraryItemDialog] 预校验失败，使用前端校验:', validationError);
    }

    try {
      const data: CreateItineraryItemRequest = {
        tripDayId: tripDay.id,
        type: itemType,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        note: note.trim() || undefined,
        forceCreate: forceCreate, // 如果用户确认，强制创建
      };

      // 如果选择了地点，添加 placeId
      if (selectedPlace) {
        data.placeId = selectedPlace.id;
      }
      
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

      const result = await itineraryItemsApi.create(data);
      
      // 处理增强版响应（包含 warnings、travelInfo）
      if (result && typeof result === 'object' && 'item' in result) {
        // 如果有警告但已创建成功，显示提示
        if (result.warnings && result.warnings.length > 0) {
          toast.warning(`行程项已添加，但有 ${result.warnings.length} 个警告`, {
            description: formatValidationMessage(result.warnings[0].message, result.warnings[0].details),
          });
        }
      }
      
      toast.success('行程项添加成功', {
        description: '行程项已添加到您的行程中',
        duration: 3000,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Create itinerary item failed:', err);
      const errorMessage = err.message || '添加失败，请重试';
      setError(errorMessage);
      toast.error('添加失败', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 获取当前类型配置
  const currentTypeOption = ITEM_TYPE_OPTIONS.find(o => o.value === itemType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden [&>button]:hidden" style={{ display: 'flex' }}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            添加行程项
          </DialogTitle>
          <DialogDescription>
            添加到 {formatDayDate(tripDay.date)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
            <div className="space-y-4">
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
                                    {place.physicalMetadata?.estimated_duration_min != null &&
                                      ` · 约${Math.round(place.physicalMetadata.estimated_duration_min)}分钟`}
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

          {/* 校验结果：错误 */}
          {validationResult && validationResult.errors.length > 0 && (
            <div className="space-y-2">
              {validationResult.errors.map((err, idx) => (
                <div key={idx} className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">{formatValidationMessage(err.message, err.details)}</p>
                      {err.suggestions && err.suggestions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {err.suggestions.map((suggestion: { description?: string }, sIdx: number) => (
                            <p key={sIdx} className="text-xs text-red-700">
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
                          {warning.suggestions.map((suggestion: { description?: string }, sIdx: number) => (
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
                <div key={idx} className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">{formatValidationMessage(info.message, info.details)}</p>
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

            {/* 错误提示（兼容旧代码） */}
            {error && !validationResult && (
              <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            </div>
          </div>

          {/* 提交按钮 - 固定在底部 */}
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting || validating}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || validating || (validationResult?.errors.length ?? 0) > 0}
            >
              {submitting || validating ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  {validating ? '校验中...' : '添加中...'}
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
