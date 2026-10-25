import { useEffect, useState } from 'react';
import type { AttractionExploreCandidate } from '@/types/attraction-explore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ArrangeItineraryPlaceCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: AttractionExploreCandidate | null;
  /** 0-based 当前选中天 */
  initialDayIndex: number;
  dayCount: number;
  submitting?: boolean;
  onSubmit: (payload: {
    dayIndex: number;
    startTime: string;
    endTime: string;
  }) => void;
}

export function ArrangeItineraryPlaceCandidateDialog({
  open,
  onOpenChange,
  candidate,
  initialDayIndex,
  dayCount,
  submitting = false,
  onSubmit,
}: ArrangeItineraryPlaceCandidateDialogProps) {
  const safeDayCount = Math.max(1, dayCount);
  const [dayIndex, setDayIndex] = useState(
    Math.min(Math.max(0, initialDayIndex), safeDayCount - 1),
  );
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');

  useEffect(() => {
    if (!open) return;
    setDayIndex(Math.min(Math.max(0, initialDayIndex), safeDayCount - 1));
    setStartTime('10:00');
    setEndTime('11:30');
  }, [open, initialDayIndex, safeDayCount, candidate?.id]);

  const canSubmit = Boolean(candidate) && startTime && endTime && startTime < endTime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>排入行程</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-sm font-medium text-foreground">
              {candidate?.name ?? '候选景点'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              选择要放入的日期与时间段
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>日期</Label>
            <Select
              value={String(dayIndex)}
              onValueChange={(value) => setDayIndex(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择日期" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: safeDayCount }, (_, index) => (
                  <SelectItem key={index} value={String(index)}>
                    第 {index + 1} 天
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="place-candidate-start">开始</Label>
              <Input
                id="place-candidate-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="place-candidate-end">结束</Label>
              <Input
                id="place-candidate-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>
          {startTime && endTime && startTime >= endTime ? (
            <p className="text-[11px] text-destructive">结束时间需晚于开始时间</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            disabled={submitting || !canSubmit}
            onClick={() => onSubmit({ dayIndex, startTime, endTime })}
          >
            {submitting ? '排入中…' : '确认排入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
