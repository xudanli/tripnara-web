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

export interface ArrangeItineraryInsertGapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayNumber: number;
  submitting?: boolean;
  onSubmit: (payload: { startTime: string; endTime: string; label?: string }) => void;
}

export function ArrangeItineraryInsertGapDialog({
  open,
  onOpenChange,
  dayNumber,
  submitting = false,
  onSubmit,
}: ArrangeItineraryInsertGapDialogProps) {
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [label, setLabel] = useState('休息 / 咖啡');

  useEffect(() => {
    if (!open) return;
    setStartTime('14:00');
    setEndTime('15:00');
    setLabel('休息 / 咖啡');
  }, [open, dayNumber]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>插入空档 · 第 {dayNumber} 天</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gap-start">开始</Label>
              <Input
                id="gap-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gap-end">结束</Label>
              <Input
                id="gap-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gap-label">说明</Label>
            <Input
              id="gap-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="休息 / 咖啡"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            disabled={submitting || !startTime || !endTime}
            onClick={() =>
              onSubmit({
                startTime,
                endTime,
                label: label.trim() || undefined,
              })
            }
          >
            {submitting ? '插入中…' : '插入空档'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
