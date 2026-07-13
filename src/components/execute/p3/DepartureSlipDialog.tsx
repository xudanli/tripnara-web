import { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';

export type DepartureSlipDelayOption = 'still_here' | '15' | '30' | '45';

export interface DepartureSlipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting?: boolean;
  onSubmit: (input: { delayMinutes: number; stillAtPoi: boolean }) => void | Promise<void>;
}

const DELAY_OPTIONS: Array<{ id: DepartureSlipDelayOption; label: string; delayMinutes: number; stillAtPoi: boolean }> = [
  { id: 'still_here', label: '仍在当前地点（未出发）', delayMinutes: 0, stillAtPoi: true },
  { id: '15', label: '晚了 15 分钟', delayMinutes: 15, stillAtPoi: false },
  { id: '30', label: '晚了 30 分钟', delayMinutes: 30, stillAtPoi: false },
  { id: '45', label: '晚了 45 分钟', delayMinutes: 45, stillAtPoi: false },
];

export function DepartureSlipDialog({
  open,
  onOpenChange,
  submitting = false,
  onSubmit,
}: DepartureSlipDialogProps) {
  const [selected, setSelected] = useState<DepartureSlipDelayOption>('still_here');

  const handleSubmit = async () => {
    const option = DELAY_OPTIONS.find((item) => item.id === selected) ?? DELAY_OPTIONS[0];
    await onSubmit({
      delayMinutes: option.delayMinutes,
      stillAtPoi: option.stillAtPoi,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>我晚了</DialogTitle>
          <DialogDescription>请选择实际情况，系统将重新评估后续行程。</DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selected}
          onValueChange={(value) => setSelected(value as DepartureSlipDelayOption)}
          className="space-y-2"
        >
          {DELAY_OPTIONS.map((option) => (
            <div
              key={option.id}
              className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5"
            >
              <RadioGroupItem value={option.id} id={`slip-${option.id}`} />
              <Label htmlFor={`slip-${option.id}`} className="text-sm font-normal cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                正在评估…
              </>
            ) : (
              '提交'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
