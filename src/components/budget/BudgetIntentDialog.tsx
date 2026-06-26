import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { BUDGET_INTENT_PRESETS } from '@/lib/trip-budget-structure';
import { formatCurrency } from '@/utils/format';

interface BudgetIntentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  currentTotal?: number;
  saving: boolean;
  onSave: (total: number, currency?: string) => Promise<void>;
}

export default function BudgetIntentDialog({
  open,
  onOpenChange,
  currency,
  currentTotal,
  saving,
  onSave,
}: BudgetIntentDialogProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const [input, setInput] = useState('');

  useEffect(() => {
    if (open && currentTotal) setInput(String(currentTotal));
    if (open && !currentTotal) setInput('');
  }, [open, currentTotal]);

  const handlePreset = async (amount: number) => {
    setInput(String(amount));
    await onSave(amount, currency);
    onOpenChange(false);
  };

  const handleSave = async () => {
    const n = Number(input);
    if (!n || n < 100) return;
    await onSave(n, currency);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isZh ? '总预算' : 'Total budget'}</DialogTitle>
          <DialogDescription>
            {isZh ? '这次旅行准备花多少钱' : 'How much you plan to spend on this trip'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex flex-wrap gap-1.5">
            {BUDGET_INTENT_PRESETS.map((amount) => (
              <Button
                key={amount}
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 text-xs tabular-nums',
                  currentTotal === amount && 'border-slate-900 bg-slate-50 font-medium',
                )}
                disabled={saving}
                onClick={() => handlePreset(amount)}
              >
                {formatCurrency(amount, currency)}
              </Button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{isZh ? '自定义金额' : 'Custom amount'}</Label>
            <Input
              type="number"
              min={100}
              className="h-9 text-sm tabular-nums"
              placeholder={isZh ? '输入金额' : 'Enter amount'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {isZh ? '取消' : 'Cancel'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-foreground hover:bg-foreground/90 text-background"
            disabled={saving || !input || Number(input) < 100}
            onClick={handleSave}
          >
            {isZh ? '保存' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
