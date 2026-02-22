/**
 * Planning Assistant V2 - 将推荐住宿加入行程
 * 选择入住日期，创建无 placeId 的行程项（note 承载名称、地址、链接）
 * 流程：先 GET 检查当天是否已有住宿 → 若有则弹窗确认是否替换 → 替换则 DELETE + POST，否则直接 POST
 */

import { useState, useMemo, useEffect } from 'react';
import { itineraryItemsApi } from '@/api/trips';
import type { CreateItineraryItemRequest, ItineraryItemDetail, TripDetail } from '@/types/trip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDayDate } from '@/utils/format';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Accommodation } from '@/api/planning-assistant-v2';

/** 获取行程项展示名称（Place 或 note 首行） */
function getItemDisplayName(item: ItineraryItemDetail): string {
  const place = item.Place;
  if (place?.nameCN?.trim()) return place.nameCN;
  if (place?.nameEN?.trim()) return place.nameEN;
  return item.note?.split('\n')[0]?.trim() || item.type || '未知';
}

interface AddAccommodationToTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accommodation: Accommodation;
  tripId: string;
  tripInfo: TripDetail;
  onSuccess?: () => void;
}

/** 从价格字符串解析数字（如 "¥800/晚" -> 800） */
function parsePriceToNumber(price?: string): number | undefined {
  if (!price) return undefined;
  const match = price.match(/[\d,]+(?:\.\d+)?/);
  return match ? parseFloat(match[0].replace(/,/g, '')) : undefined;
}

export function AddAccommodationToTripDialog({
  open,
  onOpenChange,
  accommodation,
  tripId,
  tripInfo,
  onSuccess,
}: AddAccommodationToTripDialogProps) {
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  /** 当天已有住宿时，弹窗确认是否替换 */
  const [replaceConfirm, setReplaceConfirm] = useState<{ existing: ItineraryItemDetail } | null>(null);

  const displayName = accommodation.nameCN || accommodation.nameEN || accommodation.name;

  const days = useMemo(() => tripInfo.TripDay || [], [tripInfo.TripDay]);
  const defaultDayId = useMemo(() => {
    if (!accommodation.checkIn || days.length === 0) return days[0]?.id ?? '';
    const checkInDate = accommodation.checkIn.slice(0, 10);
    const match = days.find((d) => d.date.slice(0, 10) === checkInDate);
    return match?.id ?? days[0]?.id ?? '';
  }, [accommodation.checkIn, days]);

  useEffect(() => {
    if (open && days.length > 0) {
      setSelectedDayId(defaultDayId);
      setReplaceConfirm(null);
    }
  }, [open, defaultDayId, days.length]);

  const effectiveDayId = selectedDayId || defaultDayId;
  const selectedDay = days.find((d) => d.id === effectiveDayId);

  const buildCreateData = (): CreateItineraryItemRequest | null => {
    if (!selectedDay) return null;
    const dateStr = selectedDay.date.slice(0, 10);
    const startTime = `${dateStr}T15:00:00.000Z`;
    let endDate: string;
    if (accommodation.checkOut) {
      endDate = accommodation.checkOut.slice(0, 10);
    } else {
      const next = new Date(dateStr);
      next.setDate(next.getDate() + 1);
      endDate = next.toISOString().slice(0, 10);
    }
    const endTime = `${endDate}T11:00:00.000Z`;
    const noteLines: string[] = [displayName];
    if (accommodation.address) noteLines.push(`地址: ${accommodation.address}`);
    if (accommodation.url) noteLines.push(`链接: ${accommodation.url}`);
    const data: CreateItineraryItemRequest = {
      tripDayId: selectedDay.id,
      type: 'ACTIVITY',
      costCategory: 'ACCOMMODATION',
      startTime,
      endTime,
      note: noteLines.join('\n'),
    };
    const estimatedCost = parsePriceToNumber(accommodation.price);
    if (estimatedCost != null) {
      data.estimatedCost = estimatedCost;
      data.currency = 'CNY';
    }
    return data;
  };

  const doCreate = async () => {
    const data = buildCreateData();
    if (!data) return;
    const result = await itineraryItemsApi.create(data);
    if (result && typeof result === 'object' && 'item' in result && result.warnings?.length) {
      toast.warning(`已添加，但有 ${result.warnings.length} 个提示`);
    } else {
      toast.success(`已将 ${displayName} 加入行程`);
    }
    onSuccess?.();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!selectedDay) return;
    setSubmitting(true);
    try {
      const items = await itineraryItemsApi.getAll(selectedDay.id, true, 'ACCOMMODATION');
      const accommodationItems = items.filter((i) => i.costCategory === 'ACCOMMODATION');
      const existing = accommodationItems[0];

      if (existing) {
        setReplaceConfirm({ existing });
        return;
      }
      await doCreate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '添加失败，请重试';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplaceConfirm = async () => {
    if (!replaceConfirm) return;
    setSubmitting(true);
    try {
      await itineraryItemsApi.delete(replaceConfirm.existing.id);
      await doCreate();
      setReplaceConfirm(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '替换失败，请重试';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            加入行程
          </DialogTitle>
          <DialogDescription>
            将 {displayName} 添加到行程的哪一天？
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>入住日期</Label>
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
                    第 {idx + 1} 天 · {formatDayDate(d.date)}
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

    <AlertDialog open={!!replaceConfirm} onOpenChange={(open) => !open && setReplaceConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>当天已有住宿</AlertDialogTitle>
          <AlertDialogDescription>
            当天已有住宿「{replaceConfirm ? getItemDisplayName(replaceConfirm.existing) : ''}」，是否替换为「{displayName}」？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
          <Button onClick={handleReplaceConfirm} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                替换中...
              </>
            ) : (
              '替换'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
