import { useState, useEffect } from 'react';
import { itineraryItemsApi } from '@/api/trips';
import type { ItineraryItem, UpdateItineraryItemRequest, ItineraryItemType, CostCategory, TravelMode, BookingStatus } from '@/types/trip';
import { utcToDatetimeLocal, datetimeLocalToUTC } from '@/utils/timezone';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Info, DollarSign, MapPin, Utensils, Coffee, Car, Navigation, CalendarCheck, Link2 } from 'lucide-react';

// 行程类型选项
const ITEM_TYPE_OPTIONS: { value: ItineraryItemType; label: string; icon: typeof MapPin }[] = [
  { value: 'ACTIVITY', label: '景点/活动', icon: MapPin },
  { value: 'MEAL_ANCHOR', label: '固定用餐', icon: Utensils },
  { value: 'MEAL_FLOATING', label: '灵活用餐', icon: Coffee },
  { value: 'REST', label: '休息', icon: Coffee },
  { value: 'TRANSIT', label: '交通', icon: Car },
];

// 交通方式选项
const TRAVEL_MODE_OPTIONS: { value: TravelMode; label: string; icon: string }[] = [
  { value: 'DRIVING', label: '驾车', icon: '🚗' },
  { value: 'WALKING', label: '步行', icon: '🚶' },
  { value: 'TRANSIT', label: '公交', icon: '🚌' },
  { value: 'TRAIN', label: '高铁', icon: '🚄' },
  { value: 'FLIGHT', label: '飞机', icon: '✈️' },
  { value: 'FERRY', label: '轮渡', icon: '⛴️' },
  { value: 'BICYCLE', label: '骑行', icon: '🚴' },
  { value: 'TAXI', label: '出租车', icon: '🚕' },
];

// 预订状态选项
const BOOKING_STATUS_OPTIONS: { value: BookingStatus; label: string; icon: string }[] = [
  { value: 'BOOKED', label: '已预订', icon: '✅' },
  { value: 'NEED_BOOKING', label: '待预订', icon: '📅' },
  { value: 'NO_BOOKING', label: '无需预订', icon: '✓' },
];

interface EditItineraryItemDialogProps {
  item: ItineraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** 目的地时区（IANA 格式，如 "Atlantic/Reykjavik"），用于正确转换时间 */
  timezone?: string;
}

export function EditItineraryItemDialog({
  item,
  open,
  onOpenChange,
  onSuccess,
  timezone = 'UTC',
}: EditItineraryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [originalStartTime, setOriginalStartTime] = useState<string>('');
  const [showCostFields, setShowCostFields] = useState(false);
  const [showTravelFields, setShowTravelFields] = useState(false);
  const [showBookingFields, setShowBookingFields] = useState(false);
  const [formData, setFormData] = useState<UpdateItineraryItemRequest & {
    travelFromPreviousDuration?: number;
    travelFromPreviousDistance?: number;
    travelMode?: TravelMode;
    bookingStatus?: BookingStatus;
    bookingConfirmation?: string;
    bookingUrl?: string;
    bookedAt?: string;
  }>({
    type: item.type,
    startTime: item.startTime ? utcToDatetimeLocal(item.startTime, timezone) : '',
    endTime: item.endTime ? utcToDatetimeLocal(item.endTime, timezone) : '',
    note: item.note || '',
    estimatedCost: item.estimatedCost || undefined,
    actualCost: item.actualCost || undefined,
    costCategory: item.costCategory || undefined,
    costNote: item.costNote || '',
    isPaid: item.isPaid || false,
    // 交通信息
    travelFromPreviousDuration: item.travelFromPreviousDuration || undefined,
    travelFromPreviousDistance: item.travelFromPreviousDistance || undefined,
    travelMode: item.travelMode || undefined,
    // 预订信息
    bookingStatus: item.bookingStatus || undefined,
    bookingConfirmation: item.bookingConfirmation || '',
    bookingUrl: item.bookingUrl || '',
    bookedAt: item.bookedAt ? utcToDatetimeLocal(item.bookedAt, timezone) : '',
  });

  useEffect(() => {
    if (open && item) {
      // 使用目的地时区转换时间
      const startTime = item.startTime ? utcToDatetimeLocal(item.startTime, timezone) : '';
      const hasCostData = !!(item.estimatedCost || item.actualCost || item.costCategory || item.costNote);
      const hasTravelData = !!(item.travelFromPreviousDuration || item.travelFromPreviousDistance || item.travelMode);
      const hasBookingData = !!(item.bookingStatus || item.bookingConfirmation || item.bookingUrl);
      setFormData({
        type: item.type,
        startTime,
        endTime: item.endTime ? utcToDatetimeLocal(item.endTime, timezone) : '',
        note: item.note || '',
        estimatedCost: item.estimatedCost || undefined,
        actualCost: item.actualCost || undefined,
        costCategory: item.costCategory || undefined,
        costNote: item.costNote || '',
        isPaid: item.isPaid || false,
        // 交通信息
        travelFromPreviousDuration: item.travelFromPreviousDuration || undefined,
        travelFromPreviousDistance: item.travelFromPreviousDistance || undefined,
        travelMode: item.travelMode || undefined,
        // 预订信息
        bookingStatus: item.bookingStatus || undefined,
        bookingConfirmation: item.bookingConfirmation || '',
        bookingUrl: item.bookingUrl || '',
        bookedAt: item.bookedAt ? utcToDatetimeLocal(item.bookedAt, timezone) : '',
      });
      setOriginalStartTime(startTime);
      setShowCostFields(hasCostData);
      setShowTravelFields(hasTravelData);
      setShowBookingFields(hasBookingData);
      setError(null);
      setWarning(null);
    }
  }, [item, open, timezone]);

  // 检测开始时间是否改变（用于显示智能调整提示）
  const startTimeChanged = formData.startTime !== originalStartTime;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. 更新基本信息（使用目的地时区转换时间为 UTC）
      const updateData: UpdateItineraryItemRequest = {
        type: formData.type,
        startTime: formData.startTime ? datetimeLocalToUTC(formData.startTime, timezone) : undefined,
        endTime: formData.endTime ? datetimeLocalToUTC(formData.endTime, timezone) : undefined,
        note: formData.note || undefined,
      };

      // 添加费用字段（如果有填写）
      if (showCostFields) {
        if (formData.estimatedCost) {
          updateData.estimatedCost = formData.estimatedCost;
        }
        if (formData.actualCost) {
          updateData.actualCost = formData.actualCost;
        }
        if (formData.costCategory) {
          updateData.costCategory = formData.costCategory;
        }
        if (formData.costNote) {
          updateData.costNote = formData.costNote;
        }
        updateData.isPaid = formData.isPaid;
      }

      await itineraryItemsApi.update(item.id, updateData);

      // 2. 更新交通信息（如果有修改）
      if (showTravelFields) {
        await itineraryItemsApi.updateTravelInfo(item.id, {
          travelFromPreviousDuration: formData.travelFromPreviousDuration,
          travelFromPreviousDistance: formData.travelFromPreviousDistance,
          travelMode: formData.travelMode,
        });
      }

      // 3. 更新预订信息（如果有修改）
      if (showBookingFields) {
        await itineraryItemsApi.updateBooking(item.id, {
          bookingStatus: formData.bookingStatus,
          bookingConfirmation: formData.bookingConfirmation || undefined,
          bookingUrl: formData.bookingUrl || undefined,
          bookedAt: formData.bookedAt ? datetimeLocalToUTC(formData.bookedAt, timezone) : undefined,
        });
      }
      
      // 更新成功，调用成功回调（会重新加载当天的行程项以获取最新时间）
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const errorMessage = err.message || '更新行程项失败';
      
      // 检查是否是时间不合理的警告（包含"时间可能不合理"或"建议开始时间"等关键词）
      if (errorMessage.includes('时间可能不合理') || errorMessage.includes('建议开始时间') || errorMessage.includes('预计需要')) {
        setWarning(errorMessage);
        setError(null);
      } else {
        setError(errorMessage);
        setWarning(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>编辑行程项</DialogTitle>
          <DialogDescription>
            {item.Place?.nameCN || item.Trail?.nameCN || item.type}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {warning && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            )}

            {startTimeChanged && !warning && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  更新开始时间后，系统会根据实际距离和交通方式自动计算旅行时间，并智能调整后续行程项的时间。
                </span>
              </div>
            )}

            {/* 行程类型 */}
            <div className="space-y-2">
              <Label>行程类型</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v as ItineraryItemType })}
              >
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
            </div>

            {/* 时间 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">开始时间</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, startTime: e.target.value });
                    // 清除之前的警告
                    if (warning) setWarning(null);
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">结束时间</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime || ''}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* 备注 */}
            <div className="space-y-2">
              <Label htmlFor="note">备注</Label>
              <Textarea
                id="note"
                value={formData.note || ''}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="添加备注信息"
                rows={2}
              />
            </div>

            {/* 费用信息（可选） */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  费用信息
                </Label>
                <button
                  type="button"
                  onClick={() => setShowCostFields(!showCostFields)}
                  className="text-sm text-primary hover:underline"
                >
                  {showCostFields ? '隐藏' : '编辑费用'}
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
                        value={formData.estimatedCost || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          estimatedCost: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
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
                        value={formData.actualCost || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          actualCost: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="costCategory" className="text-xs">费用分类</Label>
                    <Select 
                      value={formData.costCategory || ''} 
                      onValueChange={(v) => setFormData({ ...formData, costCategory: v as CostCategory })}
                    >
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
                      value={formData.costNote || ''}
                      onChange={(e) => setFormData({ ...formData, costNote: e.target.value })}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPaid"
                      checked={formData.isPaid || false}
                      onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isPaid" className="text-xs text-muted-foreground cursor-pointer">
                      已支付
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 交通信息（可选） */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  交通信息
                </Label>
                <button
                  type="button"
                  onClick={() => setShowTravelFields(!showTravelFields)}
                  className="text-sm text-primary hover:underline"
                >
                  {showTravelFields ? '隐藏' : '编辑交通'}
                </button>
              </div>
              
              {showTravelFields && (
                <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                  <div className="space-y-1">
                    <Label className="text-xs">交通方式</Label>
                    <Select 
                      value={formData.travelMode || ''} 
                      onValueChange={(v) => setFormData({ ...formData, travelMode: v as TravelMode })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择交通方式" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAVEL_MODE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="travelDuration" className="text-xs">交通时间（分钟）</Label>
                      <Input
                        id="travelDuration"
                        type="number"
                        min="0"
                        placeholder="如：30"
                        value={formData.travelFromPreviousDuration || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          travelFromPreviousDuration: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="travelDistance" className="text-xs">交通距离（米）</Label>
                      <Input
                        id="travelDistance"
                        type="number"
                        min="0"
                        placeholder="如：5000"
                        value={formData.travelFromPreviousDistance || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          travelFromPreviousDistance: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">从上一地点到此处的交通信息</p>
                </div>
              )}
            </div>

            {/* 预订信息（可选） */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4" />
                  预订信息
                </Label>
                <button
                  type="button"
                  onClick={() => setShowBookingFields(!showBookingFields)}
                  className="text-sm text-primary hover:underline"
                >
                  {showBookingFields ? '隐藏' : '编辑预订'}
                </button>
              </div>
              
              {showBookingFields && (
                <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                  <div className="space-y-1">
                    <Label className="text-xs">预订状态</Label>
                    <Select 
                      value={formData.bookingStatus || ''} 
                      onValueChange={(v) => setFormData({ ...formData, bookingStatus: v as BookingStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择预订状态" />
                      </SelectTrigger>
                      <SelectContent>
                        {BOOKING_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="bookingConfirmation" className="text-xs">预订确认号</Label>
                    <Input
                      id="bookingConfirmation"
                      placeholder="如：ABC123456"
                      value={formData.bookingConfirmation || ''}
                      onChange={(e) => setFormData({ ...formData, bookingConfirmation: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="bookingUrl" className="text-xs flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      预订链接
                    </Label>
                    <Input
                      id="bookingUrl"
                      type="url"
                      placeholder="https://booking.com/xxx"
                      value={formData.bookingUrl || ''}
                      onChange={(e) => setFormData({ ...formData, bookingUrl: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="bookedAt" className="text-xs">预订时间</Label>
                    <Input
                      id="bookedAt"
                      type="datetime-local"
                      value={formData.bookedAt || ''}
                      onChange={(e) => setFormData({ ...formData, bookedAt: e.target.value })}
                    />
                  </div>
                </div>
              )}
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
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

