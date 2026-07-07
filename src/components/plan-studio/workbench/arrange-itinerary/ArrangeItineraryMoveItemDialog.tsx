import { useEffect, useState } from 'react';
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

export interface ArrangeItineraryMoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemLabel: string;
  dayCount: number;
  initialDayIndex: number;
  initialStartTime?: string;
  initialEndTime?: string;
  submitting?: boolean;
  onSubmit: (payload: { dayIndex: number; startTime: string; endTime: string }) => void;
}

export function ArrangeItineraryMoveItemDialog({
  open,
  onOpenChange,
  itemLabel,
  dayCount,
  initialDayIndex,
  initialStartTime = '10:30',
  initialEndTime = '12:00',
  submitting = false,
  onSubmit,
}: ArrangeItineraryMoveItemDialogProps) {
  const [dayIndex, setDayIndex] = useState(initialDayIndex + 1);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);

  useEffect(() => {
    if (!open) return;
    setDayIndex(initialDayIndex + 1);
    setStartTime(initialStartTime);
    setEndTime(initialEndTime);
  }, [open, initialDayIndex, initialStartTime, initialEndTime]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分析移动影响</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          调整「{itemLabel}」的时段后，将生成移动草案供确认（不直接改行程）。
        </p>
        <div className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label>目标天</Label>
            <Select value={String(dayIndex)} onValueChange={(value) => setDayIndex(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: dayCount }, (_, index) => (
                  <SelectItem key={index + 1} value={String(index + 1)}>
                    第 {index + 1} 天
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="move-start">开始</Label>
              <Input
                id="move-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="move-end">结束</Label>
              <Input
                id="move-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            disabled={submitting || !startTime || !endTime}
            onClick={() => onSubmit({ dayIndex, startTime, endTime })}
          >
            {submitting ? '分析中…' : '生成移动草案'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
