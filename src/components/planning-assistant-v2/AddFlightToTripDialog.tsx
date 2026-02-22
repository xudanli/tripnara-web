/**
 * Planning Assistant V2 - 将航班加入行程
 * 选择日期，创建 type: TRANSIT、costCategory: TRANSPORTATION 的行程项
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
import { Plane, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDayDate } from '@/utils/format';

/** 从原始航班数据提取展示信息 */
function getFlightInfo(raw: any) {
  const origin = raw.origin || raw.itineraries?.[0]?.segments?.[0]?.departure?.iataCode || '—';
  const destination =
    raw.destination ||
    raw.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.iataCode ||
    '—';
  const depAt = raw.departureTime || raw.itineraries?.[0]?.segments?.[0]?.departure?.at;
  const arrAt = raw.arrivalTime || raw.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.at;
  const airline = raw.airline || raw.itineraries?.[0]?.segments?.[0]?.carrierCode;
  const flightNum = raw.flightNumber || raw.itineraries?.[0]?.segments?.[0]?.number;
  const priceAmount = raw.price?.total ?? raw.price?.amount;
  const priceCurrency = raw.price?.currency;
  return { origin, destination, depAt, arrAt, airline, flightNum, priceAmount, priceCurrency };
}

function extractDate(iso?: string): string | null {
  if (!iso) return null;
  try {
    return iso.slice(0, 10);
  } catch {
    return null;
  }
}

function extractTime(iso?: string): string {
  if (!iso) return '09:00';
  const match = iso.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '09:00';
}

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

interface AddFlightToTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flight: any;
  tripId: string;
  tripInfo: TripDetail;
  onSuccess?: () => void;
}

export function AddFlightToTripDialog({
  open,
  onOpenChange,
  flight,
  tripId,
  tripInfo,
  onSuccess,
}: AddFlightToTripDialogProps) {
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const { origin, destination, depAt, arrAt, airline, flightNum, priceAmount, priceCurrency } =
    getFlightInfo(flight);
  const displayName = `${origin} → ${destination}`;

  const days = useMemo(() => tripInfo.TripDay || [], [tripInfo.TripDay]);
  const defaultDayId = useMemo(() => {
    const routeDate = extractDate(depAt);
    if (!routeDate || days.length === 0) return days[0]?.id ?? '';
    const match = days.find((d) => d.date.slice(0, 10) === routeDate);
    return match?.id ?? days[0]?.id ?? '';
  }, [depAt, days]);

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
      const depTimeTz = extractTimeAndTimezone(depAt);
      const arrTimeTz = extractTimeAndTimezone(arrAt);
      const startTime = `${dateStr}T${depTimeTz}`;
      const arrDate = extractDate(arrAt);
      const endDateStr = arrDate && arrDate !== dateStr ? arrDate : dateStr;
      const endTime = `${endDateStr}T${arrTimeTz}`;

      const noteLines: string[] = [
        airline && flightNum ? `${airline} ${flightNum}，${displayName}` : displayName,
      ];
      if (priceAmount != null && priceCurrency) {
        noteLines.push(`票价: ${priceAmount} ${priceCurrency}`);
      }

      const data: CreateItineraryItemRequest = {
        tripDayId: selectedDay.id,
        type: 'TRANSIT',
        costCategory: 'TRANSPORTATION',
        startTime,
        endTime,
        placeName: displayName,
        note: noteLines.join('\n'),
        metadata: {
          source: 'flight',
          airline: airline || undefined,
          flightNumber: flightNum || undefined,
        },
      };

      if (flight.bookingUrl) {
        data.externalUrl = flight.bookingUrl;
      }
      if (priceAmount != null && typeof priceAmount === 'number') {
        data.estimatedCost = priceAmount;
        data.currency = priceCurrency || 'EUR';
      } else if (typeof priceAmount === 'string' && !isNaN(parseFloat(priceAmount))) {
        data.estimatedCost = parseFloat(priceAmount);
        data.currency = priceCurrency || 'EUR';
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
            <Plane className="w-5 h-5" />
            加入行程
          </DialogTitle>
          <DialogDescription>将 {displayName} 添加到行程的哪一天？</DialogDescription>
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
  );
}
