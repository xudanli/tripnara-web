/**
 * Planning Assistant V2 - 将火车路线加入行程
 * 选择日期，创建 type: TRANSIT、costCategory: TRANSPORTATION 的行程项（note 承载车次、起终点、时间）
 */

import { useState, useMemo, useEffect } from 'react';
import { itineraryItemsApi } from '@/api/trips';
import type { CreateItineraryItemRequest, TripDetail } from '@/types/trip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Train, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { RailRouteItem } from './RailRouteList';

function getTrainLegs(legs?: RailRouteItem['legs']) {
  if (!legs) return [];
  return legs.filter((l) => !l.walking);
}

/** 从 ISO 字符串提取日期 YYYY-MM-DD */
function extractDate(iso?: string): string | null {
  if (!iso) return null;
  try {
    return iso.slice(0, 10);
  } catch {
    return null;
  }
}

/** 从 ISO 字符串提取时间 HH:mm（保持原始时区的小时分钟） */
function extractTime(iso?: string): string {
  if (!iso) return '09:00';
  const match = iso.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '09:00';
}

/** 从 ISO 提取时间+时区（如 17:36:00+01:00），保留原始时区 */
function extractTimeAndTimezone(iso?: string): string {
  if (!iso) return '09:00:00.000Z';
  const afterT = iso.split('T')[1];
  if (afterT && /^\d{2}:\d{2}/.test(afterT)) {
    if (/[Z+-]/.test(afterT)) return afterT;
    if (afterT.length >= 8) return afterT;
    return extractTime(iso) + ':00.000Z';
  }
  return extractTime(iso) + ':00.000Z';
}

/** 比较两个 HH:mm 时间，返回 true 表示 a < b */
function isTimeBefore(a: string, b: string): boolean {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return ah < bh || (ah === bh && am < bm);
}

/** 日期加一天 */
function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface AddRailToTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: RailRouteItem;
  tripId: string;
  tripInfo: TripDetail;
  onSuccess?: () => void;
}

export function AddRailToTripDialog({
  open,
  onOpenChange,
  route,
  tripId,
  tripInfo,
  onSuccess,
}: AddRailToTripDialogProps) {
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const trainLegs = getTrainLegs(route.legs);
  const depIso = route.departure || trainLegs[0]?.departure;
  const arrIso = route.arrival || trainLegs[trainLegs.length - 1]?.arrival;
  const hasValidSchedule = !!(depIso || arrIso);
  const isGuideCard = !hasValidSchedule; // 巴黎↔伦敦等：无真实车次，仅保存路线+预订链接
  const firstLine = trainLegs[0]?.line?.name || trainLegs[0]?.line?.productName;
  const displayName = `${route.origin} → ${route.destination}`;

  const days = useMemo(() => tripInfo.TripDay || [], [tripInfo.TripDay]);
  const defaultDayId = useMemo(() => {
    const routeDate = extractDate(depIso);
    if (!routeDate || days.length === 0) return days[0]?.id ?? '';
    const match = days.find((d) => d.date.slice(0, 10) === routeDate);
    return match?.id ?? days[0]?.id ?? '';
  }, [depIso, days]);

  useEffect(() => {
    if (open && days.length > 0) {
      setSelectedDayId(defaultDayId);
    }
  }, [open, defaultDayId, days.length]);

  const effectiveDayId = selectedDayId || defaultDayId;
  const selectedDay = days.find((d) => d.id === effectiveDayId);

  const handleSubmit = async () => {
    if (!selectedDay) return;
    setSubmitting(true);
    try {
      const dateStr = selectedDay.date.slice(0, 10);
      let startTime: string;
      let endTime: string;
      let isOvernight = false;

      if (isGuideCard) {
        // 引导卡片：无真实车次，使用占位时间 09:00-12:00
        startTime = `${dateStr}T09:00:00.000Z`;
        endTime = `${dateStr}T12:00:00.000Z`;
      } else {
        const depTime = extractTime(depIso);
        const arrTime = extractTime(arrIso);
        const depTimeTz = extractTimeAndTimezone(depIso);
        const arrTimeTz = extractTimeAndTimezone(arrIso);
        startTime = `${dateStr}T${depTimeTz}`;
        let endDateStr = dateStr;
        const arrDate = extractDate(arrIso);
        if (arrDate && arrDate !== dateStr) {
          endDateStr = arrDate;
        } else if (isTimeBefore(arrTime, depTime)) {
          endDateStr = addOneDay(dateStr);
        }
        endTime = `${endDateStr}T${arrTimeTz}`;
        isOvernight = isTimeBefore(arrTime, depTime) || (arrDate !== null && arrDate !== dateStr);
      }

      const noteLines: string[] = [firstLine ? `${firstLine}，${displayName}` : displayName];
      if (route.note) noteLines.push(route.note);
      if (!isGuideCard && route.price) noteLines.push(`票价: ${route.price.amount} ${route.price.currency}`);

      const data: CreateItineraryItemRequest = {
        tripDayId: selectedDay.id,
        type: 'TRANSIT',
        costCategory: 'TRANSPORTATION',
        startTime,
        endTime,
        placeName: displayName,
        note: noteLines.join('\n'),
        metadata: {
          source: 'rail',
          isOvernightRail: isOvernight,
          lineName: firstLine || undefined,
          isGuideCard: isGuideCard,
        },
      };

      if (route.bookingUrl) {
        data.externalUrl = route.bookingUrl;
      }
      if (!isGuideCard && route.price?.amount) {
        data.estimatedCost = route.price.amount;
        data.currency = route.price.currency;
      }

      const result = await itineraryItemsApi.create(data);
      if (result && typeof result === 'object' && 'item' in result && result.warnings?.length) {
        toast.warning(`已添加，但有 ${result.warnings.length} 个提示`);
      } else {
        toast.success(`已将 ${displayName} 加入行程`);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '添加失败，请重试';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Train className="w-5 h-5" />
            加入行程
          </DialogTitle>
          <DialogDescription>
            {isGuideCard ? (
              <>将 {displayName} 添加为行程占位（含预订链接），请通过 Eurostar 官网查询实时车次。</>
            ) : (
              <>将 {displayName} 添加到行程的哪一天？</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>出发日期</Label>
            <Select
              value={effectiveDayId}
              onValueChange={setSelectedDayId}
              disabled={days.length <= 1}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择日期" />
              </SelectTrigger>
              <SelectContent>
                {days.map((d, idx) => (
                  <SelectItem key={d.id} value={d.id}>
                    第 {idx + 1} 天 · {d.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedDay || submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                添加中...
              </>
            ) : (
              '确认添加'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
