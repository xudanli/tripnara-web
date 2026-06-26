import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  SheetLayerDialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { itineraryItemsApi } from '@/api/trips';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import type { FeasibilityTravelTimingViewModel } from '@/lib/feasibility-travel-timing';
import {
  computeArriveHm,
  computeGapMinutes,
  hmToIsoOnDay,
} from '@/lib/feasibility-travel-timing';
import { extractHmFromWindow } from '@/lib/itinerary-item-card-format';
import { toast } from 'sonner';

interface FeasibilityTravelTimingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  view: FeasibilityTravelTimingViewModel;
  trip: TripDetail | null;
  dayItems: ItineraryItemDetail[];
  onSaved?: () => void;
}

function findItem(items: ItineraryItemDetail[], id?: string) {
  if (!id) return undefined;
  return items.find((item) => item.id === id);
}

export function FeasibilityTravelTimingDialog({
  open,
  onOpenChange,
  tripId,
  view,
  trip,
  dayItems,
  onSaved,
}: FeasibilityTravelTimingDialogProps) {
  const timezone = view.timezone;
  const fromItem = findItem(dayItems, view.fromItemId);
  const toItem = findItem(dayItems, view.toItemId);

  const dayDate =
    trip?.TripDay?.[view.fromDayNumber - 1]?.date ??
    trip?.TripDay?.[0]?.date ??
    '';
  const activityDayDate =
    trip?.TripDay?.[view.toDayNumber - 1]?.date ??
    dayDate;

  const initialDepart =
    view.departAtLabel ??
    (fromItem?.endTime ? extractHmFromWindow(fromItem.endTime, timezone) : '08:00');
  const initialStart =
    view.activityStartLabel ??
    (toItem?.startTime ? extractHmFromWindow(toItem.startTime, timezone) : '09:00');

  const [departHm, setDepartHm] = useState(initialDepart);
  const [startHm, setStartHm] = useState(initialStart);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDepartHm(initialDepart);
    setStartHm(initialStart);
  }, [open, initialDepart, initialStart]);

  const arriveHm = useMemo(
    () => computeArriveHm(departHm, view.travelMinutes),
    [departHm, view.travelMinutes],
  );

  const gapMinutes = useMemo(
    () => computeGapMinutes(departHm, startHm, view.travelMinutes),
    [departHm, startHm, view.travelMinutes],
  );

  const previewTone =
    gapMinutes < -5 ? 'too_early' : gapMinutes <= 30 ? 'tight' : 'ok';

  const previewMessage =
    previewTone === 'too_early'
      ? `改后仍不够：差约 ${Math.abs(Math.round(gapMinutes))} 分钟，建议将开始时间推迟到 ${arriveHm} 之后。`
      : previewTone === 'tight'
        ? `改后缓冲约 ${Math.round(gapMinutes)} 分钟，仍偏紧。`
        : `改后缓冲约 ${Math.round(gapMinutes)} 分钟，时间衔接合理。`;

  const canSave = Boolean(fromItem && toItem && dayDate);

  const handleSave = async () => {
    if (!fromItem || !toItem || !dayDate) {
      toast.error('未找到对应行程项，请前往时间轴手动编辑');
      return;
    }

    const endIso = hmToIsoOnDay(dayDate, departHm, timezone);
    const startIso = hmToIsoOnDay(activityDayDate, startHm, timezone);
    if (!endIso || !startIso) {
      toast.error('时间格式无效');
      return;
    }

    try {
      setSaving(true);
      await itineraryItemsApi.update(fromItem.id, { endTime: endIso });
      await itineraryItemsApi.update(toItem.id, { startTime: startIso });
      toast.success('已保存时间');
      window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败，请稍后在时间轴重试';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetLayerDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>安排出发时间</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {view.fromPlaceLabel} → {view.toPlaceLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="feasibility-depart-hm" className="text-xs">退房时间</Label>
            <Input
              id="feasibility-depart-hm"
              type="time"
              value={departHm}
              onChange={(e) => setDepartHm(e.target.value)}
              className="font-mono-brand"
            />
          </div>

          <p className="text-xs text-muted-foreground font-mono-brand">
            路上{' '}
            {view.travelDistanceLabel ? `${view.travelDistanceLabel} · ` : ''}
            {view.travelMinutes > 0 ? `约 ${view.travelMinutes} 分钟` : '耗时待确认'}
          </p>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">预计抵达</span>
            <span className="font-mono-brand font-medium">{arriveHm}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feasibility-start-hm" className="text-xs">下一站开始时间</Label>
            <Input
              id="feasibility-start-hm"
              type="time"
              value={startHm}
              onChange={(e) => setStartHm(e.target.value)}
              className="font-mono-brand"
            />
          </div>

          <p
            className={cn(
              'text-xs rounded-md border px-3 py-2 leading-relaxed',
              previewTone === 'too_early'
                ? 'border-gate-suggest-border bg-gate-suggest/25 text-gate-suggest-foreground'
                : previewTone === 'tight'
                  ? 'border-gate-suggest-border/80 bg-gate-suggest/15 text-muted-foreground'
                  : 'border-gate-allow-border bg-gate-allow/15 text-muted-foreground',
            )}
          >
            {previewMessage}
          </p>

          {!canSave && (
            <p className="text-xs text-muted-foreground">
              未能自动匹配行程项，请使用「在时间轴调整」手动编辑。
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave || saving}>
            {saving ? '保存中…' : '保存并重新检查'}
          </Button>
        </DialogFooter>
      </SheetLayerDialogContent>
    </Dialog>
  );
}
