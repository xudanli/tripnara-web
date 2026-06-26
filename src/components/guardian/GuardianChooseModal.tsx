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
import { cn } from '@/lib/utils';
import { Scale } from 'lucide-react';

export interface GuardianChooseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** 软约束取舍点（negotiation humanDecisionPoints 或 presentation 衍生） */
  points: string[];
  /** 可选：每点对应选项文案；缺省时 points 本身作为可选项 */
  options?: string[];
  onConfirm?: (selectedIndex: number, selectedText: string) => void;
  confirmLabel?: string;
}

/**
 * 软约束 CHOOSE 交互 — 不可覆盖 Abu 硬 BLOCK（调用方需自行门控）。
 */
export function GuardianChooseModal({
  open,
  onOpenChange,
  title = '需要您做出选择',
  description = '以下为价值取舍点，请选择您更倾向的方向。',
  points,
  options,
  onConfirm,
  confirmLabel = '确认选择',
}: GuardianChooseModalProps) {
  const choices = options?.length ? options : points;
  const [selected, setSelected] = useState<string>('');

  const handleConfirm = () => {
    if (!selected) return;
    const idx = choices.indexOf(selected);
    onConfirm?.(idx >= 0 ? idx : 0, selected);
    onOpenChange(false);
    setSelected('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSelected('');
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {points.length > 1 && !options ? (
          <ul className="text-sm text-muted-foreground space-y-1 border rounded-md p-3 bg-muted/30">
            {points.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary shrink-0">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <RadioGroup value={selected} onValueChange={setSelected} className="gap-2">
          {choices.map((choice, i) => (
            <div
              key={i}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 cursor-pointer',
                selected === choice && 'border-primary bg-primary/5',
              )}
            >
              <RadioGroupItem value={choice} id={`guardian-choose-${i}`} className="mt-0.5" />
              <Label
                htmlFor={`guardian-choose-${i}`}
                className="text-sm font-normal leading-snug cursor-pointer flex-1"
              >
                {choice}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!selected}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
