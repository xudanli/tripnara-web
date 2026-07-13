import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
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
import CascadeConfirmDialog from '@/components/trips/CascadeConfirmDialog';
import {
  resolveItineraryRequiresConfirmation,
  type ItineraryRequiresConfirmation,
} from '@/lib/itinerary-cascade-confirm.util';
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
import { AlertCircle, Info, DollarSign, Navigation, CalendarCheck, Link2 } from 'lucide-react';
import { ITINERARY_ITEM_TYPE_OPTIONS } from '@/lib/itinerary-item-type-display';
import { ItinerarySpecialDisplayRoleField } from '@/components/trips/ItinerarySpecialDisplayRoleField';
import { extractHmFromWindow } from '@/lib/itinerary-item-card-format';
import { buildAirportLandingUtcTimes } from '@/lib/itinerary-item-cross-day-form';
import {
  applySpecialDisplayRoleDefaults,
  buildSpecialDisplayMetadata,
  findTripDayIdForIsoEnd,
  getItineraryRoleEndTimeLabel,
  getItineraryRoleStartTimeLabel,
  itineraryRoleSupportsCrossDay,
  itineraryRoleUsesDepartureTime,
  itineraryRoleUsesLandingTime,
  itineraryRoleUsesSingleHubMoment,
  normalizeTripDayDateKey,
  resolveItinerarySpecialDisplayRole,
  type ItinerarySpecialDisplayRole,
} from '@/lib/itinerary-special-display';
import {
  buildItineraryItemNoteForSave,
  parseTepItemNoteForForm,
  readTepFlexFormFromNote,
  type TepFlexFormValues,
} from '@/lib/tep-item-note.util';
import {
  resolveTepFlexibilityItemKind,
  shouldShowTepFlexibilityEditor,
} from '@/lib/tep-flexibility-item.util';
import { TepFlexibilityFields } from '@/components/plan-studio/tep/TepFlexibilityFields';
import { getEndDayOptions } from '@/lib/itinerary-item-cross-day-form';
import { CalendarDays } from 'lucide-react';

// 行程类型选项（与 time轴列表统一）
const ITEM_TYPE_OPTIONS = ITINERARY_ITEM_TYPE_OPTIONS;

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

interface TripDayInfo {
  id: string;
  date: string; // YYYY-MM-DD 格式
}

function resolveItemIsoTime(item: ItineraryItem, field: 'startTime' | 'endTime'): string | undefined {
  const direct = item[field];
  if (typeof direct === 'string' && direct.trim()) return direct;
  const snakeKey = field === 'startTime' ? 'start_time' : 'end_time';
  const snake = (item as Record<string, unknown>)[snakeKey];
  return typeof snake === 'string' && snake.trim() ? snake : undefined;
}

interface EditItineraryItemDialogProps {
  item: ItineraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
  /** 目的地时区（IANA 格式，如 "Atlantic/Reykjavik"），用于正确转换时间 */
  timezone?: string;
  /** @deprecated 后端已自动处理跨天 tripDayId 更新，此参数不再需要 */
  tripDays?: TripDayInfo[];
  /** @deprecated 后端已自动处理跨天 tripDayId 更新，此参数不再需要 */
  currentTripDayId?: string;
  /** 冰岛自驾 TEP：展示弹性标签编辑 */
  tepFlexibilityEnabled?: boolean;
}

export function EditItineraryItemDialog({
  item,
  open,
  onOpenChange,
  onSuccess,
  timezone = 'UTC',
  tripDays = [],
  currentTripDayId,
  tepFlexibilityEnabled = false,
}: EditItineraryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [originalStartTime, setOriginalStartTime] = useState<string>('');
  const [displayRole, setDisplayRole] = useState<ItinerarySpecialDisplayRole>('normal');
  const [endTripDayId, setEndTripDayId] = useState('');
  const [landingTime, setLandingTime] = useState('10:00');
  const [showCostFields, setShowCostFields] = useState(false);
  const [showTravelFields, setShowTravelFields] = useState(false);
  const [showBookingFields, setShowBookingFields] = useState(false);
  // 级联影响确认弹窗
  const [showCascadeConfirm, setShowCascadeConfirm] = useState(false);
  const [cascadeConfirmation, setCascadeConfirmation] = useState<ItineraryRequiresConfirmation | null>(
    null
  );
  const [tepFlexForm, setTepFlexForm] = useState<TepFlexFormValues>(() =>
    readTepFlexFormFromNote(item.note),
  );
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

  const tepFlexItemKind = useMemo(
    () =>
      resolveTepFlexibilityItemKind({
        itemType: formData.type ?? item.type,
        displayRole,
        costCategory: formData.costCategory ?? item.costCategory,
      }),
    [displayRole, formData.costCategory, formData.type, item.costCategory, item.type],
  );
  const showTepFlexFields = tepFlexibilityEnabled && shouldShowTepFlexibilityEditor(tepFlexItemKind);

  const tripDaysFingerprint = useMemo(
    () =>
      tripDays
        .map((d) => `${d.id}:${normalizeTripDayDateKey(d.date)}`)
        .join('|'),
    [tripDays],
  );
  const formInitKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      formInitKeyRef.current = null;
      return;
    }
    if (!item) return;

    const initKey = `${item.id}|${timezone}|${tripDaysFingerprint}|${currentTripDayId ?? ''}`;
    if (formInitKeyRef.current === initKey) return;
    formInitKeyRef.current = initKey;

    // 使用目的地时区转换时间
    const itemStartTime = resolveItemIsoTime(item, 'startTime');
    const itemEndTime = resolveItemIsoTime(item, 'endTime');
    const startTime = itemStartTime ? utcToDatetimeLocal(itemStartTime, timezone) : '';
    const endTimeLocal = itemEndTime ? utcToDatetimeLocal(itemEndTime, timezone) : '';
    const hasCostData = !!(item.estimatedCost || item.actualCost || item.costCategory || item.costNote);
    const hasTravelData = !!(item.travelFromPreviousDuration || item.travelFromPreviousDistance || item.travelMode);
    const hasBookingData = !!(item.bookingStatus || item.bookingConfirmation || item.bookingUrl);
    const resolvedRole = resolveItinerarySpecialDisplayRole(item);
    const parsedNote = parseTepItemNoteForForm(item.note);
    const noteForForm = parsedNote.userNote;
    setTepFlexForm(readTepFlexFormFromNote(item.note));
    const tripDayRows = tripDays.map((d) => ({ id: d.id, date: d.date }));
    const endDayId =
      findTripDayIdForIsoEnd(itemEndTime, tripDayRows) ??
      currentTripDayId ??
      item.tripDayId ??
      tripDays[0]?.id ??
      '';

    setFormData({
      type: item.type,
      startTime,
      endTime: endTimeLocal,
      note: noteForForm,
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
    setDisplayRole(resolvedRole);
    setEndTripDayId(endDayId);
    setLandingTime(
      itemStartTime ? extractHmFromWindow(itemStartTime, timezone) : '10:00',
    );
    setOriginalStartTime(startTime);
    setShowCostFields(hasCostData);
    setShowTravelFields(hasTravelData);
    setShowBookingFields(hasBookingData);
    setError(null);
    setWarning(null);
  }, [item, open, timezone, tripDaysFingerprint, currentTripDayId, tripDays]);

  const startTripDayId =
    currentTripDayId ?? item.tripDayId ?? tripDays[0]?.id ?? '';
  const endDayOptions = useMemo(
    () =>
      getEndDayOptions(
        tripDays.map((d) => ({ id: d.id, date: d.date, ItineraryItem: [] })),
        startTripDayId,
      ),
    [tripDays, startTripDayId],
  );
  const isLandingPointMode = itineraryRoleUsesLandingTime(displayRole);
  const isDeparturePointMode = itineraryRoleUsesDepartureTime(displayRole);
  const isHubMomentMode = itineraryRoleUsesSingleHubMoment(displayRole);
  const supportsCrossDayEnd =
    itineraryRoleSupportsCrossDay(displayRole) && endDayOptions.length > 1;
  const supportsLandingArriveDay =
    isLandingPointMode && endDayOptions.length > 1;
  const supportsDepartureDay =
    isDeparturePointMode && endDayOptions.length > 1;
  const startTimeLabel = getItineraryRoleStartTimeLabel(displayRole);
  const endTimeLabel = getItineraryRoleEndTimeLabel(displayRole);

  const applyDisplayRole = (role: ItinerarySpecialDisplayRole) => {
    setDisplayRole(role);
    const defaults = applySpecialDisplayRoleDefaults(
      role,
      tripDays.map((d) => ({ id: d.id, date: d.date, ItineraryItem: [] })),
      startTripDayId,
    );
    setFormData((prev) => ({
      ...prev,
      type: defaults.itemType ?? prev.type,
      costCategory: defaults.costCategory ?? prev.costCategory,
    }));
    if (defaults.showCostFields) setShowCostFields(true);
    if (defaults.endTripDayId) setEndTripDayId(defaults.endTripDayId);
    if (defaults.landingTime) setLandingTime(defaults.landingTime);
  };

  const handleEndTripDayChange = (dayId: string) => {
    setEndTripDayId(dayId);
    const day = tripDays.find((d) => d.id === dayId);
    if (!day || !formData.endTime) return;
    const timePart = formData.endTime.includes('T')
      ? formData.endTime.split('T')[1]
      : '10:00';
    const dateKey = normalizeTripDayDateKey(day.date);
    setFormData({ ...formData, endTime: `${dateKey}T${timePart}` });
  };

  // 检测开始时间是否改变（用于显示智能调整提示）
  const startTimeChanged = formData.startTime !== originalStartTime;

  // 执行更新（支持强制更新和级联模式选择）
  const doUpdate = async (forceCreate: boolean = false, cascadeMode?: 'auto' | 'none') => {
    setLoading(true);
    setError(null);

    try {
      // 后端会自动检测跨日期调整并更新 tripDayId，前端无需手动计算
      // 只需发送 startTime 和 cascadeMode，后端会处理 tripDayId 的更新

      // 1. 更新基本信息（使用目的地时区转换时间为 UTC）
      let startTimeUtc: string | undefined;
      let endTimeUtc: string | undefined;

      if (isHubMomentMode) {
        const arriveDay =
          tripDays.find((d) => d.id === endTripDayId) ??
          tripDays.find((d) => d.id === startTripDayId);
        if (!landingTime.trim()) {
          setError(isDeparturePointMode ? '请填写值机时间' : '请填写落地时间');
          setLoading(false);
          return;
        }
        if (!arriveDay) {
          setError(isDeparturePointMode ? '无法确定出发日期' : '无法确定落地日期');
          setLoading(false);
          return;
        }
        const built = buildAirportLandingUtcTimes(
          arriveDay.date,
          landingTime.trim(),
          timezone,
        );
        startTimeUtc = built.startTimeUTC;
        endTimeUtc = built.endTimeUTC;
      } else {
        startTimeUtc = formData.startTime
          ? datetimeLocalToUTC(formData.startTime, timezone)
          : undefined;
        endTimeUtc = formData.endTime
          ? datetimeLocalToUTC(formData.endTime, timezone)
          : undefined;
      }

      const updateData: UpdateItineraryItemRequest = {
        type: formData.type,
        startTime: startTimeUtc,
        endTime: endTimeUtc,
        note: buildItineraryItemNoteForSave({
          userNote: formData.note,
          displayRole,
          tepForm: tepFlexForm,
          tepEnabled: showTepFlexFields,
        }),
        metadata: buildSpecialDisplayMetadata(displayRole, item.metadata ?? undefined),
        forceCreate, // 强制更新标志
        // 级联调整模式：'auto' 调整后续（默认） | 'none' 只调整当前项
        // 只有在用户明确选择时才发送，否则使用后端默认值 'auto'
        cascadeMode: cascadeMode || undefined,
      };
      
      console.log('[EditItineraryItemDialog] 发送更新请求:', updateData);

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
      
      // 更新成功，调用成功回调（会重新加载所有天的行程项以获取最新数据）
      // loadTrip 会先清除所有天的数据，然后重新加载，确保跨天移动后数据正确
      toast.success('行程项已更新', {
        description: '您的行程项信息已成功保存',
        duration: 3000,
      });
      await onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const errorMessage = err.message || '更新行程项失败';

      const confirmation = resolveItineraryRequiresConfirmation(err);
      const isTimeWarning =
        errorMessage.includes('时间可能不合理') ||
        errorMessage.includes('建议开始时间') ||
        errorMessage.includes('预计需要');

      if (confirmation && !forceCreate) {
        setCascadeConfirmation(confirmation);
        setShowCascadeConfirm(true);
        setError(null);
        setWarning(null);
      } else if (isTimeWarning) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doUpdate(false);
  };

  // 确认级联更新（调整后续行程项）
  const handleConfirmCascadeAuto = async () => {
    setShowCascadeConfirm(false);
    await doUpdate(true, 'auto');
  };

  // 只调整当前项（不影响后续）
  const handleConfirmCascadeNone = async () => {
    setShowCascadeConfirm(false);
    await doUpdate(true, 'none');
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
              <div className="rounded-lg border border-gate-reject-border bg-gate-reject p-3 text-sm text-gate-reject-foreground flex items-start gap-2">
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
              <div className="rounded-lg border border-border bg-muted/15 p-3 text-sm text-muted-foreground flex items-start gap-2">
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

            <ItinerarySpecialDisplayRoleField
              value={displayRole}
              onChange={applyDisplayRole}
            />

            {supportsCrossDayEnd && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {displayRole === 'car_rental' ? '还车日期' : '退房日期'}
                </Label>
                <Select value={endTripDayId} onValueChange={handleEndTripDayChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择结束日期" />
                  </SelectTrigger>
                  <SelectContent>
                    {endDayOptions.map((day) => (
                      <SelectItem key={day.id} value={day.id}>
                        {normalizeTripDayDateKey(day.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                        {normalizeTripDayDateKey(day.date)}
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
                        {normalizeTripDayDateKey(day.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isHubMomentMode ? (
              <div className="space-y-2">
                <Label htmlFor="landingTime">
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
                    ? '只需填写到机场值机/抵达时刻；系统会按此后约 30 分钟作为出发缓冲。'
                    : '只需填写落地时刻；系统会按落地后约 30 分钟作为离站缓冲。'}
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">{startTimeLabel}</Label>
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
                <Label htmlFor="endTime">{endTimeLabel}</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime || ''}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>
            )}

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

            {showTepFlexFields && tepFlexItemKind ? (
              <TepFlexibilityFields
                value={tepFlexForm}
                onChange={setTepFlexForm}
                itemKind={tepFlexItemKind}
              />
            ) : null}

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
                  
                  {formData.bookingStatus === 'BOOKED' && (
                    <>
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
                    </>
                  )}
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
              {loading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* 级联影响确认弹窗 */}
      <CascadeConfirmDialog
        open={showCascadeConfirm}
        onOpenChange={setShowCascadeConfirm}
        confirmation={cascadeConfirmation}
        loading={loading}
        onConfirmAuto={handleConfirmCascadeAuto}
        onConfirmNone={handleConfirmCascadeNone}
      />
    </Dialog>
  );
}

